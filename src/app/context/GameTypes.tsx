export type PlayerType = "red" | "blue" | null;
export type CardStateType = string | undefined;
export type PositionType = [number, number];
export type DirectionType = "top" | "right" | "bottom" | "left";
export type CardType = [number, PlayerType, number | number[] | null, string | null];
export type BoardType = (CardType | null)[][];
export type AiMethodType = "random" | "beginner" | "intermediate" | "advanced";

export interface GameState {
    playerCards: Record<number, number>;
    currentPlayerCards: Record<number, number>;
    playerHand: CardType[];
    currentPlayerHand: CardType[];
    enemyId: number;
    enemyHand: CardType[];
    currentEnemyHand: CardType[];
    lostCards: Record<number, number>,
    winState: PlayerType | "draw";
    turn: PlayerType | null;
    turnNumber: number;
    turnState: string | null;
    score: [number, number];
    board: BoardType;
    selectedCard: CardType | null;
    selectedRewards: (number | null)[];
    isMenuOpen: boolean;
    isCardSelectionOpen: boolean;
    isRewardSelectionOpen: boolean;
    isGameActive: boolean;
    isSoundEnabled: boolean;
    slideDirection: "prev" | "next" | null;
    currentPages: Record<string, number>;
    rules: string[] | null;
    tradeRule: string | null;
    elements: Record<string, string> | null;
}

export type GameAction =
    | { type: "SET_PLAYER_CARDS"; payload: Record<number, number> }
    | { type: "SET_CURRENT_PLAYER_CARDS"; payload: Record<number, number> }
    | { type: "SET_PLAYER_HAND"; payload: CardType[] }
    | { type: "SET_CURRENT_PLAYER_HAND"; payload: CardType[] }
    | { type: "SET_ENEMY_ID"; payload: number }
    | { type: "SET_ENEMY_HAND"; payload: CardType[] }
    | { type: "SET_CURRENT_ENEMY_HAND"; payload: CardType[] }
    | { type: "SET_LOST_CARDS"; payload: Record<number, number> }
    | { type: "SET_WIN_STATE"; payload: PlayerType | "draw" }
    | { type: "SET_TURN"; payload: PlayerType }
    | { type: "INCREMENT_TURN" }
    | { type: "RESET_TURN" }
    | { type: "SET_TURN_STATE"; payload: string | null }
    | { type: "SET_SCORE"; payload: [number, number] }
    | { type: "SET_BOARD"; payload: BoardType }
    | { type: "SET_SELECTED_CARD"; payload: CardType | null }
    | { type: "SET_SELECTED_REWARDS"; payload: (number | null)[] }
    | { type: "SET_IS_MENU_OPEN"; payload: boolean }
    | { type: "SET_IS_CARD_SELECTION_OPEN"; payload: boolean }
    | { type: "SET_IS_REWARD_SELECTION_OPEN"; payload: boolean }
    | { type: "SET_IS_GAME_ACTIVE"; payload: boolean }
    | { type: "SET_IS_SOUND_ENABLED"; payload: boolean }
    | { type: "SET_CURRENT_PAGES"; payload: Record<string, number> }
    | { type: "SET_SLIDE_DIRECTION"; payload: "prev" | "next" | null }
    | { type: "SET_RULES"; payload: string[] | null }
    | { type: "SET_TRADE_RULE"; payload: string | null }
    | { type: "SET_ELEMENTS"; payload: Record<string, string> | null; }
    | { type: "RESET_GAME" };

export interface GameContextType extends GameState {
    dispatch: React.Dispatch<GameAction>;
}