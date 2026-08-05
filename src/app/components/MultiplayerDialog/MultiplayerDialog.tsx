"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGameContext } from "../../context/GameContext";
import playSound from "../../utils/sounds";
import textToSprite from "../../utils/textToSprite";
import SimpleDialog from "../SimpleDialog/SimpleDialog";
import rulesList from "../../../data/rules.json";
import {
    acceptRules, clearSession, clearUrlCode, codeFromUrl, createRoom, joinRoom,
    leaveRoom, linkForCode, loadSession, saveSession,
    type MultiplayerRules, type Room, type Session,
} from "../../utils/rooms";
import { multiplayer, useMultiplayer } from "../../hooks/multiplayerSession";
import { useMenuCursor } from "../../hooks/useMenuCursor";
import styles from "./MultiplayerDialog.module.scss";

/**
 * The multiplayer lobby: opening a room, joining one, agreeing the rules, and
 * waiting for the other player.
 *
 * It stops at the point both players are in and the rules are settled. Choosing
 * hands and playing are the game's own screens — this hands over rather than
 * reimplementing them.
 */

/**
 * What the host can turn on. Order matters only for the list; every one of
 * these is a rule the game already understands, except autoplay, which is a
 * multiplayer courtesy rather than an FF7 rule.
 */
const SELECTABLE_RULES = ["open", "same", "plus", "sameWall", "elemental", "random", "suddenDeath", "autoplay"] as const;
const TRADE_RULES = ["one", "diff", "direct", "all"] as const;

/** On unless the host turns it off, so a game cannot stall on someone who left */
const DEFAULT_RULES = ["open", "autoplay"];
const DEFAULT_TRADE = "one";

const CODE_LENGTH = 5;

/** The alphabet game.php draws from. Ambiguous characters are not in it. */
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

type Props = {
    onClose: () => void;
    /** Leaving the lobby on purpose, rather than it standing aside for a game */
    onExit?: () => void;
};

const MultiplayerDialog: React.FC<Props> = ({ onClose, onExit = onClose }) => {
    const { isSoundEnabled } = useGameContext();

    const { session, room, notice } = useMultiplayer();
    const setSession = (next: Session | null) => multiplayer.setSession(next);
    const [typedCode, setTypedCode] = useState("");
    const [busy, setBusy] = useState(false);
    const [problem, setProblem] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    /**
     * The host picks the rules here rather than inheriting whatever the single
     * player screen happened to have rolled — that was random per client, and
     * the guest had no say in it at all.
     */
    const [choosing, setChoosing] = useState(false);

    /**
     * The menu's buttons carry the hand cursor through data-focused, which the
     * shared dialog styling draws. Without it "Host Game" read as a heading
     * rather than something to press. Hover only: the code field already owns
     * the keyboard here.
     */
    /**
     * Where the cursor is. Hover moves it and it stays put when the pointer
     * leaves — springing back to a default made the cursor feel like a
     * highlight rather than something you had moved.
     */
    const [selected, setSelected] = useState("host");

    /**
     * Moving the cursor makes a sound whether it was moved by the pointer or by
     * the arrow keys — the menu's own rows do, and a silent hover next to a
     * noisy one is the odd one out. Guarded on the id actually changing, or a
     * pointer resting on a row would retrigger on every stray mouse event.
     */
    const moveCursor = (id: string) => setSelected((current) => {
        if (current !== id) playSound("select", isSoundEnabled);
        return id;
    });

    /**
     * Where the cursor sits when the pointer is not on anything: the step this
     * screen is actually asking for. The code field is the exception — once
     * five characters are in, the cursor moves to Join, so the next thing is
     * one press rather than a hunt. It does not submit by itself; a typo in the
     * last character would be sent before it could be corrected.
     */
    const chooseTrade = (rule: string) => {
        playSound("select", isSoundEnabled);
        setChosenTrade(rule);
    };

    const screen = !session ? (choosing ? "rules" : "join")
        : (session.seat === "guest" && room?.phase === "lobby") ? "accept" : "room";

    /**
     * Each screen starts the cursor on the step it is asking for. Only on
     * arrival — after that it is yours to move, and it stays where you left it.
     */
    useEffect(() => {
        setSelected(screen === "rules" ? "confirmOpen"
            : screen === "accept" ? "accept"
                : screen === "room" ? "leave"
                    : "host");
    }, [screen]);

    /**
     * A finished code moves the cursor to Join, so the next thing is one press
     * rather than a hunt. It does not submit by itself: a typo in that last
     * character would be gone before it could be corrected.
     */
    useEffect(() => {
        if (typedCode.length === CODE_LENGTH) setSelected("join");
    }, [typedCode.length]);

    /**
     * The keyboard, laid out as the screen is. The rules grid is filled in
     * reading order across two columns, which is exactly how it is drawn, so
     * Down goes to the option below rather than the next one in source order.
     */
    const layout: string[][] =
        screen === "rules" ? [
            ...Array.from({ length: Math.ceil(SELECTABLE_RULES.length / 2) }, (_, row) =>
                SELECTABLE_RULES.slice(row * 2, row * 2 + 2).map((rule) => `rule:${rule}`)),
            TRADE_RULES.map((rule) => `trade:${rule}`),
            ["confirmOpen", "back"],
        ]
            : screen === "join" ? [["host"], ["join", "back"]]
                : screen === "accept" ? [["accept", "leave"]]
                    : [["leave"]];

    const confirmSelection = (id: string) => {
        if (id.startsWith("rule:")) return toggleRule(id.slice(5));
        if (id.startsWith("trade:")) return chooseTrade(id.slice(6));
        if (id === "confirmOpen") return void handleHost();
        if (id === "host") { playSound("select", isSoundEnabled); return setChoosing(true); }
        if (id === "join") {
            if (typedCode.length !== CODE_LENGTH) return playSound("error", isSoundEnabled);
            return void attemptJoin(typedCode);
        }
        if (id === "accept") return void handleAccept();
        if (id === "leave") return void handleLeave();
        if (id === "back") {
            playSound("back", isSoundEnabled);
            return screen === "rules" ? setChoosing(false) : onExit();
        }
    };

    const goBack = () => {
        playSound("back", isSoundEnabled);
        if (screen === "rules") return setChoosing(false);
        if (screen === "join") return onExit();
        void handleLeave();
    };

    useMenuCursor({
        layout,
        selected,
        onSelect: moveCursor,
        onConfirm: confirmSelection,
        onBack: goBack,
        enabled: !busy,
        // On the join screen Backspace belongs to the code being typed, right
        // up until there is nothing left to delete
        claimsBackspace: () => screen === "join" && typedCode.length > 0,
    });

    const pointer = (id: string) => ({
        className: styles.action,
        "data-focused": selected === id,
        onMouseEnter: () => moveCursor(id),
    });
    const [chosenRules, setChosenRules] = useState<string[]>(DEFAULT_RULES);
    const [chosenTrade, setChosenTrade] = useState<string>(DEFAULT_TRADE);

    const toggleRule = (rule: string) => {
        playSound("select", isSoundEnabled);
        setChosenRules((current) =>
            current.includes(rule) ? current.filter((name) => name !== rule) : [...current, rule]);
    };

    /**
     * A live ellipsis on the waiting lines. Nothing else on this screen moves
     * while you wait for someone to join, and a still "..." looks the same as
     * a crash.
     */
    const [dots, setDots] = useState(3);
    useEffect(() => {
        const tick = setInterval(() => setDots((count) => (count % 3) + 1), 500);
        return () => clearInterval(tick);
    }, []);

    /**
     * Three dots are always drawn and the unreached ones are merely invisible.
     * Growing the string instead re-centred the line on every tick, so the
     * whole message jittered left and right as it animated.
     */
    const Ellipsis = () => (
        <span className={styles.ellipsis}>
            {[1, 2, 3].map((step) => (
                <span key={step} data-shown={step <= dots}>{textToSprite(".")}</span>
            ))}
        </span>
    );

    const error = null;

    const joinAttempted = useRef(false);

    /**
     * Arriving by shared link, or coming back to a game already in progress.
     *
     * The stored session wins over the link: if you refresh while playing, the
     * address may still carry a code you have already used, and joining again
     * would be refused because the room is full.
     */
    useEffect(() => {
        if (joinAttempted.current) return;
        joinAttempted.current = true;

        const stored = loadSession();
        if (stored) {
            setSession(stored);
            clearUrlCode();
            return;
        }

        const fromLink = codeFromUrl();
        if (fromLink) {
            /**
             * Cleared as it is read, not once it works. It used to survive a
             * failed join, so every later visit to multiplayer re-attempted
             * the same dead code — the field arrived pre-filled with it and
             * the screen reported it expired, over and over.
             */
            clearUrlCode();
            setTypedCode(fromLink);
            void attemptJoin(fromLink).then(() => {
                if (!loadSession()) setTypedCode("");
            });
        }
    }, []);

    const run = async (work: () => Promise<void>) => {
        setBusy(true);
        setProblem(null);
        try {
            await work();
        } catch (failure) {
            setProblem(failure instanceof Error ? failure.message : "Something went wrong.");
            playSound("error", isSoundEnabled);
        } finally {
            setBusy(false);
        }
    };

    const handleHost = () => run(async () => {
        playSound("select", isSoundEnabled);
        const offered: MultiplayerRules = { rules: chosenRules, tradeRule: chosenTrade };
        const { token, room: created } = await createRoom(offered);
        const next: Session = { code: created.code, token, seat: "host" };
        saveSession(next);
        setSession(next);
    });

    const attemptJoin = useCallback((code: string) => run(async () => {
        playSound("select", isSoundEnabled);
        const { token, room: joined } = await joinRoom(code);
        const next: Session = { code: joined.code, token, seat: "guest" };
        saveSession(next);
        setSession(next);
        clearUrlCode();
        playSound("success", isSoundEnabled);
    }), [isSoundEnabled]);

    /**
     * The lobby's job ends when the room reaches 'hands'. Card selection is the
     * game's own screen, so this closes and lets it take over rather than
     * building a second one.
     */
    useEffect(() => {
        if (room?.phase === "hands") {
            playSound("success", isSoundEnabled);
            onClose();
        }
    }, [room?.phase]);

    const handleAccept = () => run(async () => {
        if (!session || !room) return;
        playSound("select", isSoundEnabled);
        await acceptRules(session.code, session.token, room.rulesHash);
    });

    /**
     * "You won that game", "Your opponent left" and so on explain why you are
     * back at the lobby, so they are worth showing once. They were outliving
     * that though — the notice sat in the session store until a new game
     * replaced it, so opening this a day later still reported the last result.
     * Cleared on the way out, which is the point it has been read.
     */
    useEffect(() => () => { multiplayer.clearNotice(); }, []);

    const handleLeave = () => run(async () => {
        playSound("back", isSoundEnabled);
        if (session) await leaveRoom(session.code, session.token).catch(() => { });
        clearSession();
        multiplayer.reset();
        setTypedCode("");
        onExit();
    });

    const handleCopy = async () => {
        if (!session) return;
        try {
            await navigator.clipboard.writeText(linkForCode(session.code));
            setCopied(true);
            playSound("select", isSoundEnabled);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            setProblem("Could not copy. The code above works just as well.");
        }
    };

    // Typed by keyboard as well as clicked, since the code is usually read aloud
    /**
     * Typing the code. Only on the screen that has a code field — while the
     * rules are being chosen the same keys would fill it invisibly.
     *
     * Enter and the arrows are not handled here: the menu cursor owns them, and
     * a second listener acting on Enter joined the room twice.
     */
    useEffect(() => {
        if (screen !== "join") return;
        const onKey = (event: KeyboardEvent) => {
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            if (event.key === "Backspace") {
                setTypedCode((code) => code.slice(0, -1));
                return;
            }
            const char = event.key.toUpperCase();
            if (char.length === 1 && CODE_CHARS.includes(char)) {
                setTypedCode((code) => (code.length < CODE_LENGTH ? code + char : code));
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [screen]);

    const ruleNames = (offered: Room["rules"]) => {
        const names = (offered?.rules ?? []).map((key) => rulesList.rules[key as keyof typeof rulesList.rules] ?? key);
        return names.length ? names : ["None"];
    };

    const message = problem ?? notice ?? error;

    // ── Choosing the rules before opening a room ────────────────────────────
    if (!session && choosing) {
        return (
            <SimpleDialog className={`${styles.lobby} ${styles.rulesScreen}`}>
                <p className={styles.label}>{textToSprite("Game rules")}</p>
                <ul className={styles.ruleList}>
                    {SELECTABLE_RULES.map((rule) => (
                        <li key={rule}>
                            <button
                                className={styles.ruleToggle}
                                data-focused={selected === `rule:${rule}`}
                                onMouseEnter={() => moveCursor(`rule:${rule}`)}
                                onClick={() => toggleRule(rule)}
                            >
                                <span>{textToSprite(rulesList.rules[rule as keyof typeof rulesList.rules] ?? rule)}</span>
                                <span data-on={chosenRules.includes(rule)} className={styles.toggleState}>
                                    {textToSprite(chosenRules.includes(rule) ? "On" : "Off")}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>

                <div className={styles.divider} />

                <p className={styles.label}>{textToSprite("Trade rule")}</p>
                <div className={styles.tradeRow}>
                    {TRADE_RULES.map((rule) => (
                        <button
                            key={rule}
                            className={styles.tradeOption}
                            data-on={chosenTrade === rule}
                            data-focused={selected === `trade:${rule}`}
                            onMouseEnter={() => moveCursor(`trade:${rule}`)}
                            onClick={() => chooseTrade(rule)}
                        >
                            {textToSprite(rulesList.tradeRules[rule])}
                        </button>
                    ))}
                </div>

                <div className={styles.row}>
                    <button {...pointer("confirmOpen")} onClick={handleHost} disabled={busy}>
                        {textToSprite("Open Game")}
                    </button>
                    <button {...pointer("back")} onClick={() => { playSound("back", isSoundEnabled); setChoosing(false); }} disabled={busy}>
                        {textToSprite("Back")}
                    </button>
                </div>

                {message && <p className={styles.problem}>{textToSprite(message)}</p>}
            </SimpleDialog>
        );
    }

    // ── Not in a room yet: host one, or type a code ──────────────────────────
    if (!session) {
        return (
            <SimpleDialog className={styles.lobby}>
                <div className={styles.section}>
                    <button {...pointer("host")} onClick={() => { playSound("select", isSoundEnabled); setChoosing(true); }} disabled={busy}>
                        {textToSprite("Host Game")}
                    </button>
                </div>

                <div className={styles.divider} />

                <p className={styles.label}>{textToSprite("Enter game code")}</p>
                <div className={styles.code}>
                    {Array.from({ length: CODE_LENGTH }).map((_, index) => (
                        <span
                            key={index}
                            className={styles.codeSlot}
                            data-filled={!!typedCode[index]}
                            data-caret={index === typedCode.length}
                        >
                            {typedCode[index] ? textToSprite(typedCode[index]) : textToSprite("_")}
                        </span>
                    ))}
                </div>

                <div className={styles.row}>
                    <button
                        {...pointer("join")}
                        onClick={() => attemptJoin(typedCode)}
                        disabled={busy || typedCode.length !== CODE_LENGTH}
                    >
                        {textToSprite("Join")}
                    </button>
                    <button {...pointer("back")} onClick={goBack} disabled={busy}>
                        {textToSprite("Back")}
                    </button>
                </div>

                {message && <p className={styles.problem}>{textToSprite(message)}</p>}
            </SimpleDialog>
        );
    }

    // ── In a room ───────────────────────────────────────────────────────────
    const opponent = session.seat === "host" ? room?.players.guest : room?.players.host;
    const waitingForOpponent = !opponent?.present;
    const guestMustAccept = session.seat === "guest" && room?.phase === "lobby";
    const hostAwaitingAcceptance = session.seat === "host" && room?.phase === "lobby" && !waitingForOpponent;

    return (
        <SimpleDialog className={styles.lobby}>
            {session.seat === "host" && (
                <>
                    <p className={styles.label}>{textToSprite("Your game code")}</p>
                    <div className={styles.code}>
                        {session.code.split("").map((char, index) => (
                            <span key={index} className={styles.codeSlot} data-filled="true">{textToSprite(char)}</span>
                        ))}
                    </div>
                    <button className={styles.link} onClick={handleCopy}>
                        {textToSprite(copied ? "Link copied" : "Copy link instead")}
                    </button>
                </>
            )}

            {/* Only under the host's code. The guest has nothing above this,
                so the rule drew a stray line across the top of the panel */}
            {session.seat === "host" && <div className={styles.divider} />}

            <div className={styles.rules}>
                <p>{textToSprite("Rules:")}</p>
                <ul>
                    {room && ruleNames(room.rules).map((name) => (
                        <li key={name}><span>{textToSprite(`• ${name}`)}</span></li>
                    ))}
                </ul>
                {room?.rules?.tradeRule && (
                    <p>
                        {textToSprite(`• Trade Rule: ${rulesList.tradeRules[room.rules.tradeRule as keyof typeof rulesList.tradeRules] ?? room.rules.tradeRule}`)}
                    </p>
                )}
            </div>

            <div className={styles.divider} />

            <p className={styles.status}>
                {textToSprite(
                    waitingForOpponent ? "Waiting for a challenger"
                        : guestMustAccept ? "Accept these rules to begin"
                            : hostAwaitingAcceptance ? "Waiting for them to accept"
                                : "Ready. Choose your cards.",
                )}
                {(waitingForOpponent || hostAwaitingAcceptance) && <Ellipsis />}
            </p>

            <div className={styles.row}>
                {guestMustAccept && (
                    <button {...pointer("accept")} onClick={handleAccept} disabled={busy}>
                        {textToSprite("Accept")}
                    </button>
                )}
                <button {...pointer("leave")} onClick={handleLeave} disabled={busy}>
                    {textToSprite(guestMustAccept ? "Decline" : "Leave")}
                </button>
            </div>

            {message && <p className={styles.problem}>{textToSprite(message)}</p>}
        </SimpleDialog>
    );
};

export default MultiplayerDialog;
