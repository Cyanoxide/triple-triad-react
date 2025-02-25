import Board from './components/Board/Board';
import Hand from './components/Hand/Hand';

export default function Home() {
  return (
    <div className="flex h-screen">
      <Hand className="order-1 flex justify-center items-center gap-4 flex-col w-[20%]"></Hand>
      <Hand className="order-3 flex justify-center items-center gap-4 flex-col w-[20%]"></Hand>
      <Board className="order-2 grid justify-center items-center gap-4 w-[60%] m-auto"></Board>
    </div>
  );
}
