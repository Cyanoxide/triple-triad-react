"use client";

import Board from "./components/Board/Board";
import Hand from "./components/Hand/Hand";
import { GameProvider } from "./context/GameContext";


export default function Home() {
  return (
    <GameProvider>
      <div className="flex h-screen">
        <Hand className="order-1 flex justify-center items-center gap-4 flex-col w-[20%]" player="red" />
        <Hand className="order-3 flex justify-center items-center gap-4 flex-col w-[20%]" player="blue" />
        <Board className="order-2 grid justify-center items-center gap-4 w-[60%] m-auto" />
      </div>
    </GameProvider>
  );
}
