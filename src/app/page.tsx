"use client";

import { useRef, useEffect } from "react";
import Board from "./components/Board/Board";
import Hand from "./components/Hand/Hand";
import MenuDialog from "./components/MenuDialog/MenuDialog";
import WinDialog from "./components/WinDialog/WinDialog";
import CardSelectionDialog from "./components/CardSelectionDialog/CardSelectionDialog";
import RewardSelectionDialog from "./components/RewardSelectionDialog/RewardSelectionDialog";
import { GameProvider, useGameContext } from "./context/GameContext";
import playSound, { loadSound, playLoadedSound, stopLoadedSound } from "./utils/sounds";

function GameContent() {
  const { isMenuOpen, isCardSelectionOpen, isRewardSelectionOpen, winState, isSoundEnabled, isGameActive, dispatch } = useGameContext();
  const victorySoundRef = useRef(loadSound("victory"));
  const bgmRef = useRef(loadSound("bgm"));

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

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        const scale = Math.min(windowWidth / originalWidth, windowHeight / originalHeight);
        app.style.zoom = String(scale);
        modal.style.zoom = String(scale);
      }

      window.addEventListener('load', scaleApp);
      window.addEventListener('resize', scaleApp);
      scaleApp();
    }
  }, []);

  const handleSoundToggle = () => {
    playSound("select", !isSoundEnabled);
    const toggle = (isSoundEnabled === false) ? true : false;

    if (toggle === false) {
      stopLoadedSound(bgmRef.current, isSoundEnabled);
      stopLoadedSound(victorySoundRef.current, isSoundEnabled);
    } else {
      if (!winState) {
        playLoadedSound(bgmRef.current, isSoundEnabled, true);
      }
    }

    dispatch({ type: "SET_IS_SOUND_ENABLED", payload: toggle });
  }

  return (
    <>
      <div id="app" className="max-w-4xl w-full h-full m-auto relative">
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
      <button className="absolute right-[1.5rem] bottom-[1.5rem] text-3xl z-50" onClick={handleSoundToggle}>{(isSoundEnabled) ? "🔊" : "🔇"}</button>
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
