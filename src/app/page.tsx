"use client";

import { useState, useRef, useEffect, useCallback, useSyncExternalStore } from "react";
import Board from "./components/Board/Board";
import Hand from "./components/Hand/Hand";
import MenuDialog from "./components/MenuDialog/MenuDialog";
import WinDialog from "./components/WinDialog/WinDialog";
import CardSelectionDialog from "./components/CardSelectionDialog/CardSelectionDialog";
import ConfirmationDialog from "./components/ConfirmationDialog/ConfirmationDialog";
import RewardSelectionDialog from "./components/RewardSelectionDialog/RewardSelectionDialog";
import { GameProvider, useGameContext } from "./context/GameContext";
import playSound, { loadSound, playLoadedSound, stopLoadedSound } from "./utils/sounds";
import CardGallery from "./components/CardGallery/CardGallery";
import MultiplayerDialog from "./components/MultiplayerDialog/MultiplayerDialog";
import AutoplayTimer from "./components/AutoplayTimer/AutoplayTimer";
import ModeDialog from "./components/ModeDialog/ModeDialog";
import Notice from "./components/Notice/Notice";
import { finishMultiplayer, multiplayer, useMultiplayer } from "./hooks/multiplayerSession";
import { useRoom } from "./hooks/useRoom";
import { codeFromUrl, loadSession, type RoomEvent } from "./utils/rooms";
import { generateCardsFromIds } from "./utils/general";
import Image from "next/image";
import SimpleDialog from "./components/SimpleDialog/SimpleDialog";
import textToSprite from "./utils/textToSprite";
import { optionsNav } from "./hooks/optionsNav";
import { installPreview } from "./utils/preview";

function GameContent() {
  const { turn, board, score, rules, tradeRule, currentEnemyHand, currentPlayerHand, isMenuOpen, isCardSelectionOpen, isCardGalleryOpen, isRewardSelectionOpen, winState, isSoundEnabled, isGameActive, currentPages, isCRTEffectActive, dispatch } = useGameContext();
  const victorySoundRef = useRef<HTMLAudioElement | undefined>(undefined);
  const bgmRef = useRef<HTMLAudioElement | undefined>(undefined);

  if (!bgmRef.current) {
    bgmRef.current = loadSound("bgm");
  }

  if (!victorySoundRef.current) {
    victorySoundRef.current = loadSound("victory");
  }

  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [confirmingQuit, setConfirmingQuit] = useState(false);
  const [isMultiplayerOpen, setIsMultiplayerOpen] = useState(false);

  /**
   * Which kind of game, asked before either screen is shown. Null is the
   * question itself; the single player title screen and the multiplayer lobby
   * are the two answers, and neither has to make room for the other.
   */
  const [mode, setMode] = useState<"single" | "multi" | null>(null);

  const openMultiplayer = () => { setMode("multi"); setIsMultiplayerOpen(true); };

  /**
   * Straight to multiplayer when the address carries a game code, or when a
   * seat is already stored. Following a shared link used to land on the title
   * screen with no sign that it was an invitation.
   *
   * In an effect rather than the initial state: the server has no address bar
   * and no localStorage, so deciding this during render made the first client
   * render disagree with the server's and React threw out the whole tree.
   */
  useEffect(() => {
    if (codeFromUrl() || loadSession()) openMultiplayer();
  }, []);

  /**
   * Multiplayer lives here rather than in the lobby, because the polling has to
   * keep running after the lobby closes — through card selection and the whole
   * game. Events are applied to the game from one place.
   */
  const { session } = useMultiplayer();

  /** Cards a player owns on the board — what they carry into a sudden death round */
  const ownedOnBoard = useCallback((owner: "red" | "blue") =>
    board.flatMap((row) => row).filter((cell) => cell?.currentOwner === owner).map((cell) => cell!.cardId),
    [board]);

  const applyRoomEvents = useCallback((events: RoomEvent[]) => {
    for (const event of events) {
      /**
       * Your own moves and hands come back on the poll, and were already
       * applied locally — acting on them again would double everything.
       *
       * Narrated events are different. 'start' is stamped with the host's seat
       * whoever it concerns, so skipping by author would leave the host never
       * learning the result of its own draw.
       */
      if (event.by === session?.seat && (event.type === "move" || event.type === "hand")) continue;

      if (event.type === "start") {
        // The room drew who opens. Each side sees itself as blue, so the same
        // draw is "blue" to the player it chose and "red" to the other.
        dispatch({ type: "SET_TURN", payload: event.first === session?.seat ? "blue" : "red" });
        multiplayer.setSeed(event.seed ?? null);
        continue;
      }

      if (event.type === "move" && event.move) {
        // Queued rather than applied here: the board owns placing a card, so a
        // move from the other player runs through exactly the same code as one
        // of your own, animations and sounds included
        multiplayer.queueMove({ cardId: event.move.cardId, row: event.move.row, col: event.move.col });
        continue;
      }

      if (event.type === "left") {
        /**
         * A guest who backed out before the game started only freed their
         * seat. The host stays where they are — the code has very likely been
         * read out to someone already — and the lobby goes back to waiting.
         */
        if (event.reopened) {
          if (session?.seat === "host") setIsMultiplayerOpen(true);
          continue;
        }

        // Otherwise they closed the room. Say so rather than leaving a turn
        // that will never come.
        void finishMultiplayer("Your opponent left the game.");
        return;
      }

      if (event.type === "rewards" && event.picks) {
        multiplayer.setIncomingRewards(event.picks as { id: number; position: number }[]);
        continue;
      }

      /**
       * A drawn game restarting under the sudden death rule. The hands are
       * derived from the board, which both clients already agree on, so nothing
       * is sent but the boundary itself and a fresh draw for who opens.
       */
      if (event.type === "sudden") {
        multiplayer.startNewRound();
        dispatch({ type: "SET_CURRENT_ENEMY_HAND", payload: currentEnemyHand.concat(generateCardsFromIds(ownedOnBoard("red"), "red")) });
        dispatch({ type: "SET_CURRENT_PLAYER_HAND", payload: currentPlayerHand.concat(generateCardsFromIds(ownedOnBoard("blue"), "blue")) });
        dispatch({ type: "SET_BOARD", payload: board.map(() => Array(3).fill(null)) });
        dispatch({ type: "SET_WIN_STATE", payload: null });
        dispatch({ type: "RESET_TURN" });
        dispatch({ type: "SET_SCORE", payload: [5, 5] });
        dispatch({ type: "SET_TURN", payload: event.first === session?.seat ? "blue" : "red" });
        // The seed is left alone: sudden death keeps the board's element
        // squares, so re-drawing them would move them mid-game
        continue;
      }

      if (event.type === "hand" && event.hand) {
        // The opponent is always the red side locally, whichever seat they hold
        const theirHand = generateCardsFromIds(event.hand, "red");
        dispatch({ type: "SET_ENEMY_HAND", payload: theirHand });
        dispatch({ type: "SET_CURRENT_ENEMY_HAND", payload: theirHand });
      }
    }
  }, [session?.seat, board, currentEnemyHand, currentPlayerHand, ownedOnBoard]);

  const { room } = useRoom({ session, onEvents: applyRoomEvents });

  useEffect(() => { multiplayer.setRoom(room); }, [room]);

  /**
   * The room vanished while playing — expired, or the other player closed it.
   * The board would otherwise sit there frozen, waiting for a turn that can
   * never arrive, so the game is put away and the menu comes back.
   */
  const hadSession = useRef(false);
  useEffect(() => {
    if (session) { hadSession.current = true; return; }
    if (!hadSession.current) return;
    hadSession.current = false;
    dispatch({ type: "RESET_GAME" });
    dispatch({ type: "SET_IS_GAME_ACTIVE", payload: false });
    dispatch({ type: "SET_IS_CARD_SELECTION_OPEN", payload: false });
    dispatch({ type: "SET_IS_MENU_OPEN", payload: true });
    // All the way back to the question. A finished game is the natural point to
    // choose again, and dropping straight into the lobby assumed the answer.
    setIsMultiplayerOpen(false);
    setMode(null);
  }, [session]);

  /**
   * Development only: shortcuts into states that otherwise take a whole match
   * to reach. `preview.rewards("direct")` in the console is the one worth
   * knowing — it is the only rule that sends cards both ways.
   */
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    installPreview(dispatch as (action: { type: string; payload?: unknown }) => void);
    console.info('Dev: preview.rewards("win" | "loss" | "direct" | "all")');
  }, []);

  // Development only: lets a browser test read whose turn each client believes
  // it is, which is otherwise only visible as a cursor being enabled
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    const w = window as unknown as { __turn?: string | null; __mp?: unknown; __rules?: unknown; __placed?: number; __score?: unknown; __owners?: unknown; __hands?: unknown };
    w.__turn = turn;
    w.__mp = multiplayer.get();
    w.__rules = { rules, tradeRule };
    w.__placed = board.flat().filter(Boolean).length;
    w.__score = score;
    w.__owners = board.flat().map((cell) => cell?.currentOwner?.[0] ?? "-").join("");
    w.__hands = { blue: currentPlayerHand.length, red: currentEnemyHand.length };
  });

  /**
   * The room's rules are the agreed ones, so both clients play by them.
   *
   * Without this the guest kept whatever its own enemy selection had rolled —
   * and the trade rule there is chosen at random — so the two could finish a
   * game with one player taking a single card and the other expecting to lose
   * all five.
   */
  useEffect(() => {
    if (!room?.rules) return;
    dispatch({ type: "SET_RULES", payload: room.rules.rules ?? [] });
    dispatch({ type: "SET_TRADE_RULE", payload: room.rules.tradeRule ?? null });
  }, [room?.rulesHash]);

  /** Rules agreed: hand over to the game's own card selection screen. */
  useEffect(() => {
    if (room?.phase !== "hands" || isGameActive) return;
    dispatch({ type: "SET_IS_MENU_OPEN", payload: false });
    dispatch({ type: "SET_IS_CARD_SELECTION_OPEN", payload: true });
  }, [room?.phase, isGameActive]);

  /** Both hands are in: the room says play, so the board opens. */
  useEffect(() => {
    if (room?.phase !== "playing" || isGameActive) return;
    dispatch({ type: "SET_IS_CARD_SELECTION_OPEN", payload: false });
    dispatch({ type: "SET_IS_GAME_ACTIVE", payload: true });
    playSound("spin", isSoundEnabled);
  }, [room?.phase]);

  useEffect(() => {
    if (winState) return;
    playLoadedSound(bgmRef.current, isSoundEnabled, true);
  }, [isSoundEnabled, isGameActive])


  useEffect(() => {
    const app = document.getElementById('app');
    const modal = document.getElementById('modal');
    if (app && modal) {
      const scaleApp = () => {
        /**
         * The canvas the whole game is laid out against. Everything is scaled
         * to fit it, so a smaller canvas means a bigger picture.
         *
         * Phones get a tighter one. The content is 813 x 569 at its largest —
         * the board with both hands beside it — so on desktop there is a wide
         * band of empty texture around it that a phone cannot afford. Reducing
         * the canvas spends that band on the game instead. Desktop keeps the
         * original, where the room is not in short supply and the margin is
         * part of how it looks.
         *
         * Keyed on the shorter side, which catches a phone in either
         * orientation and leaves tablets alone.
         */
        const MOBILE_MAX_SHORT_SIDE = 500;
        const DESKTOP = [950, 750];

        /**
         * 900 wide and 640 tall, arrived at by measuring rather than taste.
         *
         * Portrait is limited by width and landscape by height, so the two
         * numbers are independent. Width stops at 900 because the hand cursor
         * hangs 36 design pixels past the leftmost card and is not part of any
         * element's box: at 880 the content still fits and the cursor does not.
         * Height has more room to give, and 640 leaves the content 25 real
         * pixels clear of the top and bottom on a 390-tall screen.
         *
         * Worth about 5% on portrait and 17% on landscape.
         */
        const MOBILE = [900, 640];

        /**
         * A phone held upright puts the hands above and below the board rather
         * than either side of it, so the canvas only has to be as wide as the
         * board — 535 rather than the 813 the three-across layout needs — and
         * taller to hold the two rows. Worth about half again on the size of
         * everything, which is most of what makes a phone hard to play on.
         */
        const MOBILE_PORTRAIT = [620, 900];

        // The layout viewport stays stable while pinch-zooming, unlike innerWidth/innerHeight
        const windowWidth = document.documentElement.clientWidth;
        const windowHeight = document.documentElement.clientHeight;

        const onPhone = Math.min(windowWidth, windowHeight) < MOBILE_MAX_SHORT_SIDE;
        const override = process.env.NODE_ENV === "development"
          ? (window as unknown as { __canvas?: [number, number] }).__canvas
          : undefined;
        const portrait = windowHeight > windowWidth;
        const [originalWidth, originalHeight] = override
          ?? (onPhone ? (portrait ? MOBILE_PORTRAIT : MOBILE) : DESKTOP);

        const scale = Math.min(windowWidth / originalWidth, windowHeight / originalHeight);
        app.style.zoom = String(scale);
        modal.style.zoom = String(scale);

        /**
         * The bars pinned to the bottom edge live outside #app, because they
         * are pinned to the window rather than to the board. That put them
         * outside the zoom as well, so they kept their own size while
         * everything else grew and shrank around them.
         *
         * Scaled here rather than moved inside #app: #app is a centred column
         * narrower than the window, so moving them would drag them inwards to
         * its edges. Their offsets scale along with their size, so the gap to
         * the corner keeps pace too.
         *
         * Published as a custom property rather than written onto each element.
         * Setting it directly only reached what was on screen when the viewport
         * last changed, and the quit box and the clock appear when a game
         * starts — long after that — so they were left at their natural size.
         */
        document.documentElement.style.setProperty("--app-scale", String(scale));

        // Published so the styling can give a phone roomier rows to hit
        // without changing anything on desktop
        document.documentElement.dataset.phone = onPhone ? "true" : "false";
        // The stacked layout is the phone's portrait one only; a tablet keeps
        // the three-across board however it is held
        document.documentElement.dataset.stacked = onPhone && portrait ? "true" : "false";
      }

      // iOS ignores user-scalable=no, so block pinch zoom; the app scales itself anyway
      const preventGesture = (event: Event) => event.preventDefault();
      const preventPinch = (event: TouchEvent) => {
        if (event.touches.length > 1) event.preventDefault();
      };

      window.addEventListener('load', scaleApp);
      window.addEventListener('resize', scaleApp);
      document.addEventListener('gesturestart', preventGesture);
      document.addEventListener('gesturechange', preventGesture);
      document.addEventListener('touchmove', preventPinch, { passive: false });
      scaleApp();

      return () => {
        window.removeEventListener('load', scaleApp);
        window.removeEventListener('resize', scaleApp);
        document.removeEventListener('gesturestart', preventGesture);
        document.removeEventListener('gesturechange', preventGesture);
        document.removeEventListener('touchmove', preventPinch);
      };
    }
  }, []);

  const handleSoundToggle = () => {
    playSound("select", !isSoundEnabled);
    const toggle = (isSoundEnabled === false) ? true : false;

    if (toggle === false) {
      stopLoadedSound(bgmRef.current);
      stopLoadedSound(victorySoundRef.current);
    } else {
      if (!winState) {
        playLoadedSound(bgmRef.current, isSoundEnabled, true);
      }
    }

    dispatch({ type: "SET_IS_SOUND_ENABLED", payload: toggle });
  }

  const handleToggleCardGallery = () => {
    playSound("select", isSoundEnabled);
    dispatch({ type: "SET_PREVIEW_CARD_ID", payload: null });
    dispatch({ type: "SET_IS_CARD_GALLERY_OPEN", payload: !isCardGalleryOpen });
    currentPages.cardGallery = 1;
  }

  const handleToggleOptions = () => {
    playSound("select", isSoundEnabled);
    setIsOptionsOpen(!isOptionsOpen);
  }

  const handleToggleScanlines = () => {
    dispatch({ type: "SET_IS_CRT_EFFECT_ACTIVE", payload: !isCRTEffectActive });
  }

  useEffect(() => {
    if (isCRTEffectActive) {
      document.body.classList.add("crt-effect");
    } else {
      document.body.classList.remove("crt-effect");
    }
  }, [isCRTEffectActive]);

  // Expose the options panel to the menu's keyboard cursor
  const optionsFocus = useSyncExternalStore(optionsNav.subscribe, optionsNav.getFocus, () => null);

  useEffect(() => {
    optionsNav.actions.toggleOptions = handleToggleOptions;
    optionsNav.actions.toggleCRT = handleToggleScanlines;
    optionsNav.actions.toggleGallery = handleToggleCardGallery;
    optionsNav.actions.toggleSound = handleSoundToggle;
    optionsNav.actions.isOpen = () => isOptionsOpen;
    return () => {
      optionsNav.actions.toggleOptions = undefined;
      optionsNav.actions.toggleCRT = undefined;
      optionsNav.actions.toggleGallery = undefined;
      optionsNav.actions.toggleSound = undefined;
      optionsNav.actions.isOpen = undefined;
    };
  });

  return (
    <>
      <div
        id="app"
        className="max-w-4xl w-full h-full m-auto relative"
        data-screen={isMenuOpen && mode === null ? "mode" : undefined}
      >
        {isCardGalleryOpen && <CardGallery />}
        <div>
          {isMenuOpen && mode === null && (
            <ModeDialog onSingle={() => setMode("single")} onMultiplayer={openMultiplayer} />
          )}
          {isMenuOpen && mode === "single" && <MenuDialog onQuit={() => setMode(null)} />}
          {isCardSelectionOpen && <CardSelectionDialog />}
          <Notice />
          {isMultiplayerOpen && (
            <MultiplayerDialog
              onClose={() => setIsMultiplayerOpen(false)}
              onExit={() => { setIsMultiplayerOpen(false); setMode(null); }}
            />
          )}
        </div>
        <div className="flex h-full justify-center">
          <Hand className="order-1 flex items-center justify-center w-[150px] flex-shrink-0" player="red" />
          <Hand className="order-3 flex items-center justify-center w-[150px] flex-shrink-0" player="blue" />
          <Board className="order-2 grid justify-center items-center gap-1 w-[535px] flex-shrink-0 m-auto" />
        </div>
        {winState && !isRewardSelectionOpen && victorySoundRef.current && <WinDialog victorySound={victorySoundRef.current} bgm={bgmRef.current} />}
        {isRewardSelectionOpen && victorySoundRef.current && <RewardSelectionDialog victorySound={victorySoundRef.current} bgm={bgmRef.current} />}
      </div>

      {/* Quitting a game in progress. Only shown during a multiplayer game —
          the single-player one already has its own menu — and placed beside the
          options bar so it needs no new furniture on the board. */}
      {/* Not once the rewards are being handed over: leaving at that point
          would be a way to keep cards you had just lost. A refresh may still
          manage it — the cards move on each client rather than on the server —
          but there is no need to put a button on it. */}
      {session && isGameActive && !isRewardSelectionOpen && (
        <div className="absolute left-[1.5rem] bottom-[1.5rem] text-3xl z-10" data-app-scaled>
          <SimpleDialog metaTitle={null} dialog="quit">
            <button onClick={() => { playSound("select", isSoundEnabled); setConfirmingQuit(true); }}>
              {textToSprite("Quit")}
            </button>
          </SimpleDialog>

          {/* Quitting ends the other player's game too, so it asks first */}
          {confirmingQuit && (
            <ConfirmationDialog
              handleConfirmation={() => { setConfirmingQuit(false); void finishMultiplayer(null); }}
              handleDenial={() => { playSound("back", isSoundEnabled); setConfirmingQuit(false); }}
            />
          )}
        </div>
      )}

      {/* Above the board rather than below it: the bottom edge already carries
          Quit and the options bar, and three things along one edge is a lot to
          take in at a glance.

          The wrapper is not scaled and the box inside it is, so the centring is
          done against the real window while the box and its offset scale like
          everything else — a scaled `left: 50%` would be half of an already
          scaled width, which is not the middle of anything. */}
      {session && isGameActive && !isRewardSelectionOpen && (
        <div className="absolute inset-x-0 top-0 flex justify-center z-10 pointer-events-none">
          <div className="text-3xl mt-[1.5rem]" data-app-scaled>
            <AutoplayTimer />
          </div>
        </div>
      )}

      <div className="absolute right-[1.5rem] bottom-[1.5rem] text-3xl z-10 flex items-center" data-app-scaled>
        <SimpleDialog metaTitle={null} dialog="options" data-expanded={isOptionsOpen}>
          <div className="flex items-center h-full">
            <Image src="/assets/menu-expand.png?v=1" onClick={handleToggleOptions} onMouseEnter={() => optionsNav.actions.focusOption?.(0)} data-focused={optionsFocus === 0} className="my-0 mx-1 h-full" alt="Card Icon" width="27" height="27" />
            <Image src="/assets/screenicon.png" onClick={handleToggleScanlines} onMouseEnter={() => optionsNav.actions.focusOption?.(1)} data-focused={optionsFocus === 1} className="my-0 mx-1 h-full" alt="Card Icon" width="27" height="27" data-selected={isCardGalleryOpen} />
            <Image src="/assets/cardicon.png" onClick={handleToggleCardGallery} onMouseEnter={() => optionsNav.actions.focusOption?.(2)} data-focused={optionsFocus === 2} className="my-0 mx-1 h-full" alt="Card Icon" width="27" height="27" data-selected={isCardGalleryOpen} />
            <div onClick={handleSoundToggle} onMouseEnter={() => optionsNav.actions.focusOption?.(3)} data-focused={optionsFocus === 3} className="flex items-center m-0 h-full">
              <span className="ml-3 mr-3">{textToSprite("Sound")}</span>
              <div className="flex items-center">
                <span className={`${(!isSoundEnabled) ? "opacity-50" : ""} mr-3`}>{textToSprite("ON")}</span>
                <span className={`${(isSoundEnabled) ? "opacity-50" : ""} mr-3`}>{textToSprite("OFF")}</span>
              </div>
            </div>
          </div>
        </SimpleDialog>
      </div>
      <div id="modal"></div>
    </>
  );
}

export default function App() {
  return (
    <GameProvider>
      <GameContent />
    </GameProvider>
  );
}
