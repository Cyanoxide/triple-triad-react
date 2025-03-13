"use client";

import Board from "./components/Board/Board";
import Hand from "./components/Hand/Hand";
import MenuDialog from "./components/MenuDialog/MenuDialog";
import WinDialog from "./components/WinDialog/WinDialog";
import CardSelectionDialog from "./components/CardSelectionDialog/CardSelectionDialog";
import RewardSelectionDialog from "./components/RewardSelectionDialog/RewardSelectionDialog";
import { GameProvider, useGameContext } from "./context/GameContext";

function GameContent() {
  const { isMenuOpen, isCardSelectionOpen, isRewardSelectionOpen, winState } = useGameContext();

  return (
    <>
      <div>
        {isMenuOpen && <MenuDialog rules={["Open", "Trade Rule: One"]} />}
        {isCardSelectionOpen && <CardSelectionDialog />}
      </div>
      <div className="flex h-screen">
        <Hand className="order-1 flex justify-center items-center gap-4 flex-col w-[20%]" player="red" />
        <Hand className="order-3 flex justify-center items-center gap-4 flex-col w-[20%]" player="blue" />
        <Board className="order-2 grid justify-center items-center gap-4 w-[60%] m-auto" />
      </div>
      {winState && <WinDialog />}
      {isRewardSelectionOpen && <RewardSelectionDialog />}
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
