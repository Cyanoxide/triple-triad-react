import { GameState, GameAction } from "./GameTypes";

export const gameReducer = (state: GameState, action: GameAction): GameState => {
    switch (action.type) {
        case "SET_PLAYER_CARDS":
            return { ...state, playerCards: action.payload };
        case "SET_ENEMY_CARDS":
            return { ...state, enemyCards: action.payload };
        case "SET_WIN_STATE":
            return { ...state, winState: action.payload };
        case "SET_TURN":
            return { ...state, turn: action.payload };
        case "INCREMENT_TURN":
            return { ...state, turnNumber: state.turnNumber + 1 };
        case "SET_RED_SCORE":
            return { ...state, redScore: action.payload };
        case "SET_BLUE_SCORE":
            return { ...state, blueScore: action.payload };
        case "SET_LAST_PLACED_CARD":
            return { ...state, lastPlacedCard: action.payload };
        case "SET_BOARD":
            return { ...state, board: action.payload };
        default:
            return state;
    }
};

export const initialState: GameState = {
    playerCards: [1, 2, 3, 4, 5],
    enemyCards: [7, 8, 9, 10, 11],
    winState: null,
    turn: Math.random() < 0.5 ? "red" : "blue",
    turnNumber: 0,
    redScore: 0,
    blueScore: 0,
    lastPlacedCard: null,
    board: Array(3).fill(null).map(() => Array(3).fill(null)),
};