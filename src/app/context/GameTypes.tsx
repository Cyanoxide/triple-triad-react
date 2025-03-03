export type Player = "red" | "blue";
export type Position = [number, number];

export interface GameState {
    playerCards: number[];
    enemyCards: number[];
    winState: Player | "draw" | null;
    turn: Player | null;
    turnNumber: number;
    redScore: number;
    blueScore: number;
    lastPlacedCard: { position: [number, number]; player: Player } | null;
    board: ([number, Player] | null)[][];
    selectedCard: [number, Player, number] | null;
    isMenuOpen: boolean;
}

export type GameAction =
    | { type: "SET_PLAYER_CARDS"; payload: number[] }
    | { type: "SET_ENEMY_CARDS"; payload: number[] }
    | { type: "SET_WIN_STATE"; payload: Player | "draw" | null }
    | { type: "SET_TURN"; payload: Player }
    | { type: "INCREMENT_TURN" }
    | { type: "SET_RED_SCORE"; payload: number }
    | { type: "SET_BLUE_SCORE"; payload: number }
    | { type: "SET_LAST_PLACED_CARD"; payload: { position: [number, number]; player: Player } | null }
    | { type: "SET_BOARD"; payload: ([number, Player] | null)[][] }
    | { type: "SET_SELECTED_CARD"; payload: [number, Player, number] | null }
    | { type: "SET_MENU_OPEN"; payload: boolean };

export interface GameContextType extends GameState {
    dispatch: React.Dispatch<GameAction>;
}