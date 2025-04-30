import { GameState, GameAction } from "./GameTypes";

export const gameReducer = (state: GameState, action: GameAction): GameState => {
    switch (action.type) {
        case "SET_PLAYER_CARDS":
            return { ...state, playerCards: action.payload };
        case "SET_CURRENT_PLAYER_CARDS":
            return { ...state, currentPlayerCards: action.payload };
        case "SET_PLAYER_HAND":
            return { ...state, playerHand: action.payload };
        case "SET_CURRENT_PLAYER_HAND":
            return { ...state, currentPlayerHand: action.payload };
        case "SET_ENEMY_ID":
            return { ...state, enemyId: action.payload };
        case "SET_ENEMY_HAND":
            return { ...state, enemyHand: action.payload };
        case "SET_CURRENT_ENEMY_HAND":
            return { ...state, currentEnemyHand: action.payload };
        case "SET_LOST_CARDS":
            return { ...state, lostCards: action.payload };
        case "SET_WIN_STATE":
            return { ...state, winState: action.payload };
        case "SET_TURN":
            return { ...state, turn: action.payload };
        case "INCREMENT_TURN":
            return { ...state, turnNumber: state.turnNumber + 1 };
        case "RESET_TURN":
            return { ...state, turnNumber: 1 };
        case "SET_TURN_STATE":
            return { ...state, turnState: action.payload };
        case "SET_SCORE":
            return { ...state, score: action.payload };
        case "SET_BOARD":
            return { ...state, board: action.payload };
        case "SET_SELECTED_CARD":
            return { ...state, selectedCard: action.payload };
        case "SET_SELECTED_REWARDS":
            return { ...state, selectedRewards: action.payload };
        case "SET_IS_MENU_OPEN":
            return { ...state, isMenuOpen: action.payload };
        case "SET_IS_CARD_SELECTION_OPEN":
            return { ...state, isCardSelectionOpen: action.payload };
        case "SET_IS_REWARD_SELECTION_OPEN":
            return { ...state, isRewardSelectionOpen: action.payload };
        case "SET_IS_GAME_ACTIVE":
            return { ...state, isGameActive: action.payload };
        case "SET_IS_SOUND_ENABLED":
            return { ...state, isSoundEnabled: action.payload };
        case "SET_CURRENT_PAGES":
            return { ...state, currentPages: action.payload };
        case "SET_SLIDE_DIRECTION":
            return { ...state, slideDirection: action.payload };
        case "SET_RULES":
            return { ...state, rules: action.payload };
        case "SET_TRADE_RULE":
            return { ...state, tradeRule: action.payload };
        case "SET_ELEMENTS":
            return { ...state, elements: action.payload };
        case "RESET_GAME":
            return {
                ...initialState,
                isSoundEnabled: state.isSoundEnabled
            };
        default:
            return state;
    }
};

export const initialState: GameState = {
    playerCards: { "1": 1, "2": 1, "3": 1, "4": 1, "5": 1, "6": 1, "7": 1 },
    currentPlayerCards: [],
    playerHand: [],
    currentPlayerHand: [],
    enemyId: 1,
    enemyHand: [[1, "red", 0, "", null], [1, "red", 1, "", null], [1, "red", 2, "", null], [1, "red", 3, "", null], [1, "red", 4, "", null]],
    currentEnemyHand: [[1, "red", 0, "", null], [1, "red", 1, "", null], [1, "red", 2, "", null], [1, "red", 3, "", null], [1, "red", 4, "", null]],
    lostCards: {},
    winState: null,
    turn: null,
    turnNumber: 1,
    turnState: null,
    score: [5, 5],
    board: Array(3).fill(null).map(() => Array(3).fill(null)),
    selectedCard: null,
    selectedRewards: [],
    isMenuOpen: true,
    isCardSelectionOpen: false,
    isRewardSelectionOpen: false,
    isGameActive: false,
    isSoundEnabled: false,
    slideDirection: null,
    currentPages: { "players": 1, "cards": 1 },
    rules: ["open", "same", "plus"],
    tradeRule: "direct",
    elements: null,
};