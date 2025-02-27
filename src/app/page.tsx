"use client";

import { useState } from 'react';
import Board from './components/Board/Board';
import Hand from './components/Hand/Hand';

export default function Home() {
  const [winState, setWinState] = useState<"red" | "blue" | "draw" | null>(null);
  const [turn, setTurn] = useState<"red" | "blue">();
  const [turnNumber, setTurnNumber] = useState(0);
  const [redScore, setRedScore] = useState(0);
  const [blueScore, setBlueScore] = useState(0);

  const swapTurn = () => {
    setTurn(prevTurn => prevTurn === "red" ? "blue" : "red");
  }

  const determineWinState = () => {
    if (turnNumber < 9) return;

    if (redScore > blueScore) setWinState("red");
    if (redScore < blueScore) setWinState("blue");
    if (redScore === blueScore) setWinState("draw");
  }

  return (
    <div className="flex h-screen">
      <Hand className="order-1 flex justify-center items-center gap-4 flex-col w-[20%]" cards={[1, 2, 3, 4, 5]} player="red" />
      <Hand className="order-3 flex justify-center items-center gap-4 flex-col w-[20%]" cards={[7, 8, 9, 10, 11]} player="blue" />
      <Board className="order-2 grid justify-center items-center gap-4 w-[60%] m-auto"></Board>
    </div>
  );
}
