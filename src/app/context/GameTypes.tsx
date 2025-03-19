export type Player = "red" | "blue";
export type CardState = "placed" | "flipped" | undefined;
export type Position = [number, number];

export interface GameState {
    playerCards: Record<number, number>;
    currentPlayerCards: Record<number, number>;
    playerHand: number[];
    currentPlayerHand: number[];
    enemyHand: number[];
    currentEnemyHand: number[];
    winState: Player | "draw" | null;
    turn: Player | null;
    turnNumber: number;
    turnState: string | null;
    score: [number, number];
    board: ([number, Player, CardState] | null)[][];
    selectedCard: [number, Player, number] | null;
    selectedReward: number | null;
    isMenuOpen: boolean;
    isCardSelectionOpen: boolean;
    isRewardSelectionOpen: boolean;
    isGameActive: boolean;
    isSoundEnabled: boolean;
}

export type GameAction =
    | { type: "SET_PLAYER_CARDS"; payload: Record<number, number> }
    | { type: "SET_CURRENT_PLAYER_CARDS"; payload: Record<number, number> }
    | { type: "SET_PLAYER_HAND"; payload: number[] }
    | { type: "SET_CURRENT_PLAYER_HAND"; payload: number[] }
    | { type: "SET_ENEMY_HAND"; payload: number[] }
    | { type: "SET_CURRENT_ENEMY_HAND"; payload: number[] }
    | { type: "SET_WIN_STATE"; payload: Player | "draw" | null }
    | { type: "SET_TURN"; payload: Player }
    | { type: "INCREMENT_TURN" }
    | { type: "SET_TURN_STATE"; payload: string }
    | { type: "SET_SCORE"; payload: [number, number] }
    | { type: "SET_BOARD"; payload: ([number, Player, CardState] | null)[][] }
    | { type: "SET_SELECTED_CARD"; payload: [number, Player, number] | null }
    | { type: "SET_SELECTED_REWARD"; payload: number | null }
    | { type: "SET_IS_MENU_OPEN"; payload: boolean }
    | { type: "SET_IS_CARD_SELECTION_OPEN"; payload: boolean }
    | { type: "SET_IS_REWARD_SELECTION_OPEN"; payload: boolean }
    | { type: "SET_IS_GAME_ACTIVE"; payload: boolean }
    | { type: "SET_IS_SOUND_ENABLED"; payload: boolean }
    | { type: "RESET_GAME" };

export interface GameContextType extends GameState {
    dispatch: React.Dispatch<GameAction>;
}