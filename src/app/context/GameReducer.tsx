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
        case "SET_SELECTED_CARD":
            return { ...state, selectedCard: action.payload };
        case "SET_MENU_OPEN":
            return { ...state, isMenuOpen: action.payload };
        case "RESET_GAME":
            return initialState;
        default:
            return state;
    }
};

export const initialState: GameState = {
    playerCards: [1, 2, 3, 4, 5],
    enemyCards: [7, 8, 9, 10, 11],
    winState: null,
    turn: null,
    turnNumber: 1,
    redScore: 5,
    blueScore: 5,
    lastPlacedCard: null,
    board: Array(3).fill(null).map(() => Array(3).fill(null)),
    selectedCard: null,
    isMenuOpen: true,
};