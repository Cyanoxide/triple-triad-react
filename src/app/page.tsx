"use client";

import Board from './components/Board/Board';
import Hand from './components/Hand/Hand';

export default function Home() {
  return (
    <div className="flex h-screen">
      <Hand className="order-1 flex justify-center items-center gap-4 flex-col w-[20%]" cards={[1, 2, 3, 4, 5]} player="red" />
      <Hand className="order-3 flex justify-center items-center gap-4 flex-col w-[20%]" cards={[7, 8, 9, 10, 11]} player="blue" />
      <Board className="order-2 grid justify-center items-center gap-4 w-[60%] m-auto"></Board>
    </div>
  );
}
