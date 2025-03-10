import { GameState, GameAction } from "./GameTypes";

export const gameReducer = (state: GameState, action: GameAction): GameState => {
    switch (action.type) {
        case "SET_PLAYER_CARDS":
            return { ...state, playerCards: action.payload };
        case "SET_PLAYER_CARDS_SELECTION":
            return { ...state, playerCardsSelection: action.payload };
        case "SET_PLAYER_HAND":
            return { ...state, playerHand: action.payload };
        case "SET_ENEMY_HAND":
            return { ...state, enemyHand: action.payload };
        case "SET_WIN_STATE":
            return { ...state, winState: action.payload };
        case "SET_TURN":
            return { ...state, turn: action.payload };
        case "INCREMENT_TURN":
            return { ...state, turnNumber: state.turnNumber + 1 };
        case "SET_TURN_STATE":
            return { ...state, turnState: action.payload };
        case "SET_SCORE":
            return { ...state, score: action.payload };
        case "SET_BOARD":
            return { ...state, board: action.payload };
        case "SET_SELECTED_CARD":
            return { ...state, selectedCard: action.payload };
        case "SET_IS_MENU_OPEN":
            return { ...state, isMenuOpen: action.payload };
        case "SET_IS_CARD_SELECTION_OPEN":
            return { ...state, isCardSelectionOpen: action.payload };
        case "SET_IS_GAME_ACTIVE":
            return { ...state, isGameActive: action.payload };
        case "RESET_GAME":
            return initialState;
        default:
            return state;
    }
};

export const initialState: GameState = {
    playerCards: { "1": 1, "2": 1, "3": 3, "4": 1, "5": 1, "6": 1, "7": 2 },
    playerCardsSelection: {},
    playerHand: [],
    enemyHand: [7, 8, 9, 10, 11],
    winState: null,
    turn: null,
    turnNumber: 1,
    turnState: null,
    score: [5, 5],
    board: Array(3).fill(null).map(() => Array(3).fill(null)),
    selectedCard: null,
    isMenuOpen: true,
    isCardSelectionOpen: false,
    isGameActive: false,
};