import Board from './components/Board/Board';
import Hand from './components/Hand/Hand';

export default function Home() {
  return (
    <div className="flex h-screen">
      <Hand className="order-1 flex justify-center items-center"></Hand>
      <Hand className="order-3 flex justify-center items-center"></Hand>
      <Board className="order-2 justify-center items-center"></Board>
    </div>
  );
}
