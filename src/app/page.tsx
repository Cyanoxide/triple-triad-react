"use client";

import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import Board from "./components/Board/Board";
import Hand from "./components/Hand/Hand";
import MenuDialog from "./components/MenuDialog/MenuDialog";
import WinDialog from "./components/WinDialog/WinDialog";
import CardSelectionDialog from "./components/CardSelectionDialog/CardSelectionDialog";
import RewardSelectionDialog from "./components/RewardSelectionDialog/RewardSelectionDialog";
import { GameProvider, useGameContext } from "./context/GameContext";
import playSound, { loadSound, playLoadedSound, stopLoadedSound } from "./utils/sounds";
import CardGallery from "./components/CardGallery/CardGallery";
import Image from "next/image";
import SimpleDialog from "./components/SimpleDialog/SimpleDialog";
import textToSprite from "./utils/textToSprite";
import { optionsNav } from "./hooks/optionsNav";

function GameContent() {
  const { isMenuOpen, isCardSelectionOpen, isCardGalleryOpen, isRewardSelectionOpen, winState, isSoundEnabled, isGameActive, currentPages, isCRTEffectActive, dispatch } = useGameContext();
  const victorySoundRef = useRef<HTMLAudioElement | undefined>(undefined);
  const bgmRef = useRef<HTMLAudioElement | undefined>(undefined);

  if (!bgmRef.current) {
    bgmRef.current = loadSound("bgm");
  }

  if (!victorySoundRef.current) {
    victorySoundRef.current = loadSound("victory");
  }

  const [isOptionsOpen, setIsOptionsOpen] = useState(false);

  useEffect(() => {
    if (winState) return;
    playLoadedSound(bgmRef.current, isSoundEnabled, true);
  }, [isSoundEnabled, isGameActive])

  useEffect(() => {
    const app = document.getElementById('app');
    const modal = document.getElementById('modal');
    if (app && modal) {
      const scaleApp = () => {
        const originalWidth = 950;
        const originalHeight = 750;

        // The layout viewport stays stable while pinch-zooming, unlike innerWidth/innerHeight
        const windowWidth = document.documentElement.clientWidth;
        const windowHeight = document.documentElement.clientHeight;

        const scale = Math.min(windowWidth / originalWidth, windowHeight / originalHeight);
        app.style.zoom = String(scale);
        modal.style.zoom = String(scale);
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
      <div id="app" className="max-w-4xl w-full h-full m-auto relative">
        {isCardGalleryOpen && <CardGallery />}
        <div>
          {isMenuOpen && <MenuDialog />}
          {isCardSelectionOpen && <CardSelectionDialog />}
        </div>
        <div className="flex h-full justify-center">
          <Hand className="order-1 flex items-center justify-center w-[150px] flex-shrink-0" player="red" />
          <Hand className="order-3 flex items-center justify-center w-[150px] flex-shrink-0" player="blue" />
          <Board className="order-2 grid justify-center items-center gap-1 w-[535px] flex-shrink-0 m-auto" />
        </div>
        {winState && !isRewardSelectionOpen && victorySoundRef.current && <WinDialog victorySound={victorySoundRef.current} bgm={bgmRef.current} />}
        {isRewardSelectionOpen && victorySoundRef.current && <RewardSelectionDialog victorySound={victorySoundRef.current} bgm={bgmRef.current} />}
      </div>

      <div className="absolute right-[1.5rem] bottom-[1.5rem] text-3xl z-50 flex items-center">
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
