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
import InstallHint from "./components/InstallHint/InstallHint";
import Furniture from "./components/Furniture/Furniture";
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

  /**
   * Whether the install hint is on screen. It owns the cursor while it is, so
   * the mode dialog behind it stands its own down — two cursors at once reads
   * as a bug, and the keys would drive both.
   */
  const [installHintOpen, setInstallHintOpen] = useState(false);

  /**
   * The links bar's state lives here rather than in ModeDialog, because it and
   * the options bar have to know about each other: they sit on the same row and
   * on a narrow phone both open at once would overlap.
   */
  const [linksOpen, setLinksOpen] = useState(false);
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
  /**
   * Leaving a game in progress.
   *
   * Multiplayer hands the room back and lets the teardown below do the rest —
   * dropping the session is what returns both players to the menu, so doing any
   * of it here as well would only race that effect.
   *
   * Single player has no session to drop, so it performs the same teardown
   * directly. The steps match deliberately: a game abandoned from either mode
   * should leave the app in the same state, which is all the way back at the
   * question rather than in the menu of whichever mode was being played.
   */
  const quitGame = useCallback(() => {
    if (session) {
      void finishMultiplayer(null);
      return;
    }

    dispatch({ type: "RESET_GAME" });
    dispatch({ type: "SET_IS_GAME_ACTIVE", payload: false });
    dispatch({ type: "SET_IS_CARD_SELECTION_OPEN", payload: false });
    dispatch({ type: "SET_IS_MENU_OPEN", payload: true });
    setMode(null);
  }, [session, dispatch]);

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

  /**
   * The background music, and the one thing that must never play over the
   * victory fanfare.
   *
   * Normally the reward screen covers this: it holds the end of the game for as
   * long as the cards take to change hands, and stops both tracks itself on the
   * way out. **With no reward screen there is nothing in between.** `WinDialog`
   * resets the game the moment the board is done — under the "None" trade rule
   * there is nothing to award — `winState` goes back to null, and this effect
   * used to start the music straight over the top of the fanfare.
   *
   * So it waits for the fanfare to finish and comes in after it, which is the
   * order it has always had; there was simply always a screen doing the waiting
   * before.
   */
  useEffect(() => {
    if (winState) return;

    const victory = victorySoundRef.current;

    // A new game has begun. The last one's fanfare has had its moment, and
    // leaving it running would trail it over the opening of this one.
    if (isGameActive) {
      stopLoadedSound(victory);
      playLoadedSound(bgmRef.current, isSoundEnabled, true);
      return;
    }

    if (victory && !victory.paused) {
      const resume = () => playLoadedSound(bgmRef.current, isSoundEnabled, true);
      victory.addEventListener("ended", resume, { once: true });
      return () => victory.removeEventListener("ended", resume);
    }

    playLoadedSound(bgmRef.current, isSoundEnabled, true);
  }, [isSoundEnabled, isGameActive, winState])


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
         * than either side of it, so the canvas only has to hold the board
         * rather than the 813 the three-across layout needs, and be taller for
         * the two rows.
         *
         * 680 and not the board's own 535: the frame around it — the emblem
         * behind, the corner pieces, the logo across the middle — is drawn
         * overhanging the board on every side. Sized to the board alone that
         * frame hung off both edges of the screen.
         *
         * **What sets the number is the reward screen, not the board.** Its two
         * rows are five cards side by side and unoverlapped — 640 design pixels,
         * the widest thing anywhere in the app. The board's widest part is the
         * emblem behind it at 600, and the board's own box only 535. So 680
         * leaves the reward rows 20 design pixels either side and the emblem 40.
         *
         * It was 760, which was measured before the portrait board was fixed and
         * carried the slack from that. Anything below about 660 starts cutting
         * into the reward rows; freeing that would mean overlapping those cards
         * the way the hand does, which is a change to how the screen looks
         * rather than to how big it is.
         */
        const MOBILE_PORTRAIT = [680, 900];

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
    // Only one of the two bars along the bottom is ever open
    setLinksOpen(false);
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
            <ModeDialog onSingle={() => setMode("single")} onMultiplayer={openMultiplayer} cursorEnabled={!installHintOpen}
              linksOpen={linksOpen}
              onLinksToggle={() => {
                setLinksOpen((open) => !open);
                setIsOptionsOpen(false);
              }}
            />
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

      {/* Quitting a game in progress, in either mode, placed beside the options
          bar so it needs no new furniture on the board.

          It used to be multiplayer only, on the grounds that a single-player
          game has its own menu — but that menu is the one *before* a game, and
          once the board is up there is no way back to it. On a desktop that is
          survivable: Escape cancels, and there is always a refresh. On a phone
          there is no Escape, and an installed app has no address bar to reload
          from, so a single-player game could not be left at all. */}
      {/* Not once the rewards are being handed over: leaving at that point
          would be a way to keep cards you had just lost. A refresh may still
          manage it — the cards move on each client rather than on the server —
          but there is no need to put a button on it. */}
      {isGameActive && !isRewardSelectionOpen && (
        <Furniture className="fixed left-[var(--furniture-gap)] bottom-[var(--furniture-gap)] text-3xl z-10">
          <SimpleDialog metaTitle={null} dialog="quit">
            <button onClick={() => { playSound("select", isSoundEnabled); setConfirmingQuit(true); }}>
              {textToSprite("Quit")}
            </button>
          </SimpleDialog>

          {/* It asks first either way: in multiplayer because leaving ends the
              other player's game too, in single player because a board part
              way through is not a thing to discard on one stray tap. */}
          {confirmingQuit && (
            <ConfirmationDialog
              handleConfirmation={() => { setConfirmingQuit(false); quitGame(); }}
              handleDenial={() => { playSound("back", isSoundEnabled); setConfirmingQuit(false); }}
            />
          )}
        </Furniture>
      )}

      {/* The top right corner, laid out exactly like Quit and the options bar
          below it — same 1.5rem inset, same `data-app-scaled` — so the three
          read as the same kind of furniture pinned to the same margins.

          Centred at the top was tried first, and so was sitting it on the
          board's own top edge. Both need the offset worked out against
          something that moves: the first wants an unscaled wrapper to centre
          against the real window, the second wants the board's height in design
          pixels. A corner needs neither. This is the pattern already proven by
          the two boxes along the bottom. */}
      {session && isGameActive && !isRewardSelectionOpen && (
        <Furniture className="fixed right-[var(--furniture-gap)] top-[var(--furniture-gap)] text-3xl z-10 pointer-events-none">
          <AutoplayTimer />
        </Furniture>
      )}

      {/*
        * Back, on the two screens that stand between the title and a game: the
        * single player menu and the multiplayer lobby.
        *
        * Both already have their own way out inside the dialog, so this is not
        * about being stranded — it is that every other screen puts leaving in
        * the bottom-left corner, and these two did not. On a phone especially,
        * a corner that means "back" everywhere but here is worse than no
        * corner at all.
        *
        * It does exactly what the dialog's own control does, rather than a
        * second route with its own behaviour: the lobby hands the room back
        * through `onExit`'s path, which is what returns both players to the
        * menu.
        */}
      {isMenuOpen && mode === "single" && !isCardSelectionOpen && !isGameActive && (
        <Furniture className="fixed left-[var(--furniture-gap)] bottom-[var(--furniture-gap)] text-3xl z-10">
          <SimpleDialog metaTitle={null} dialog="quit">
            <button onClick={() => { playSound("back", isSoundEnabled); setMode(null); }}>
              {textToSprite("Home")}
            </button>
          </SimpleDialog>
        </Furniture>
      )}

      {isMultiplayerOpen && !isCardSelectionOpen && !isGameActive && (
        <Furniture className="fixed left-[var(--furniture-gap)] bottom-[var(--furniture-gap)] text-3xl z-10">
          <SimpleDialog metaTitle={null} dialog="quit">
            <button onClick={() => { playSound("back", isSoundEnabled); setIsMultiplayerOpen(false); setMode(null); }}>
              {textToSprite("Home")}
            </button>
          </SimpleDialog>
        </Furniture>
      )}

      {/* Only on the title screen. It is an aside about the app rather than
          part of the game, so it has no business over a board — and the title
          screen is where someone is most likely to be deciding whether to keep
          this around. */}
      {isMenuOpen && mode === null && <InstallHint onOpenChange={setInstallHintOpen} />}

      {/* z-11 rather than z-10, so the bar stays reachable over the card
          gallery's dim — the gallery is z-11 too, and this comes after #app in
          the document, so an equal z-index leaves this one on top. The CRT
          scanlines are also 11 and are `body::after`, later still, so they keep
          their place over everything. */}
      <Furniture className="fixed right-[var(--furniture-gap)] bottom-[var(--furniture-gap)] text-3xl z-[11] flex items-center">
        <SimpleDialog metaTitle={null} dialog="options" data-expanded={isOptionsOpen}>
          <div className="flex items-center h-full">
            <Image src="/assets/menu-expand.png?v=1" onClick={handleToggleOptions} onMouseEnter={() => optionsNav.actions.focusOption?.(0)} data-focused={optionsFocus === 0} className="my-0 mx-1 h-full" alt="Card Icon" width="27" height="27" />
            <Image src="/assets/screenicon.png" onClick={handleToggleScanlines} onMouseEnter={() => optionsNav.actions.focusOption?.(1)} data-focused={optionsFocus === 1} className="my-0 mx-1 h-full" alt="Card Icon" width="27" height="27" data-selected={isCardGalleryOpen} />
            <Image src="/assets/cardicon.png" onClick={handleToggleCardGallery} onMouseEnter={() => optionsNav.actions.focusOption?.(2)} data-focused={optionsFocus === 2} className="my-0 mx-1 h-full" alt="Card Icon" width="27" height="27" data-selected={isCardGalleryOpen} />
            <div onClick={handleSoundToggle} onMouseEnter={() => optionsNav.actions.focusOption?.(3)} data-focused={optionsFocus === 3} className="flex items-center m-0 h-full">
              <span className="ml-3 mr-3">{textToSprite("Sound")}</span>
              <div className="flex items-center">
                <span className={`${(!isSoundEnabled) ? "opacity-50" : ""} mr-3`}>{textToSprite("ON")}</span>
                <span className={`${(isSoundEnabled) ? "opacity-50" : ""} mr-1`}>{textToSprite("OFF")}</span>
              </div>
            </div>
          </div>
        </SimpleDialog>
      </Furniture>
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
