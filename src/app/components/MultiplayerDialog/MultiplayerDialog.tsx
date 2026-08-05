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

type Props = { onClose: () => void };

const MultiplayerDialog: React.FC<Props> = ({ onClose }) => {
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
    const [chosenRules, setChosenRules] = useState<string[]>(DEFAULT_RULES);
    const [chosenTrade, setChosenTrade] = useState<string>(DEFAULT_TRADE);

    const toggleRule = (rule: string) => {
        playSound("select", isSoundEnabled);
        setChosenRules((current) =>
            current.includes(rule) ? current.filter((name) => name !== rule) : [...current, rule]);
    };

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
            setTypedCode(fromLink);
            void attemptJoin(fromLink);
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

    const handleLeave = () => run(async () => {
        playSound("back", isSoundEnabled);
        if (session) await leaveRoom(session.code, session.token).catch(() => { });
        clearSession();
        multiplayer.reset();
        setTypedCode("");
        onClose();
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
    useEffect(() => {
        if (session) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.metaKey || event.ctrlKey || event.altKey) return;
            if (event.key === "Backspace") {
                setTypedCode((code) => code.slice(0, -1));
                return;
            }
            if (event.key === "Enter" && typedCode.length === CODE_LENGTH) {
                void attemptJoin(typedCode);
                return;
            }
            const char = event.key.toUpperCase();
            if (char.length === 1 && CODE_CHARS.includes(char)) {
                setTypedCode((code) => (code.length < CODE_LENGTH ? code + char : code));
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [session, typedCode, attemptJoin]);

    const ruleNames = (offered: Room["rules"]) => {
        const names = (offered?.rules ?? []).map((key) => rulesList.rules[key as keyof typeof rulesList.rules] ?? key);
        return names.length ? names : ["None"];
    };

    const message = problem ?? notice ?? error;

    // ── Choosing the rules before opening a room ────────────────────────────
    if (!session && choosing) {
        return (
            <SimpleDialog metaTitle={null} className={styles.lobby}>
                <p className={styles.label}>{textToSprite("Game rules")}</p>
                <ul className={styles.ruleList}>
                    {SELECTABLE_RULES.map((rule) => (
                        <li key={rule}>
                            <button className={styles.ruleToggle} onClick={() => toggleRule(rule)}>
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
                            onClick={() => { playSound("select", isSoundEnabled); setChosenTrade(rule); }}
                        >
                            {textToSprite(rulesList.tradeRules[rule])}
                        </button>
                    ))}
                </div>

                <div className={styles.row}>
                    <button className={styles.action} onClick={handleHost} disabled={busy}>
                        {textToSprite("Open Game")}
                    </button>
                    <button className={styles.action} onClick={() => { playSound("back", isSoundEnabled); setChoosing(false); }} disabled={busy}>
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
            <SimpleDialog metaTitle={null} className={styles.lobby}>
                <div className={styles.section}>
                    <button className={styles.action} onClick={() => { playSound("select", isSoundEnabled); setChoosing(true); }} disabled={busy}>
                        {textToSprite("Host Game")}
                    </button>
                </div>

                <div className={styles.divider} />

                <p className={styles.label}>{textToSprite("Enter game code")}</p>
                <div className={styles.code}>
                    {Array.from({ length: CODE_LENGTH }).map((_, index) => (
                        <span key={index} className={styles.codeSlot} data-filled={!!typedCode[index]}>
                            {typedCode[index] ? textToSprite(typedCode[index]) : textToSprite("_")}
                        </span>
                    ))}
                </div>

                <div className={styles.row}>
                    <button
                        className={styles.action}
                        onClick={() => attemptJoin(typedCode)}
                        disabled={busy || typedCode.length !== CODE_LENGTH}
                    >
                        {textToSprite("Join")}
                    </button>
                    <button className={styles.action} onClick={onClose} disabled={busy}>
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
        <SimpleDialog metaTitle={null} className={styles.lobby}>
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

            <div className={styles.divider} />

            <div className={styles.rules}>
                <p className={styles.label}>{textToSprite("Rules")}</p>
                {room && ruleNames(room.rules).map((name) => (
                    <p key={name} className={styles.ruleLine}>{textToSprite(`- ${name}`)}</p>
                ))}
                {room?.rules?.tradeRule && (
                    <p className={styles.ruleLine}>
                        {textToSprite(`Trade: ${rulesList.tradeRules[room.rules.tradeRule as keyof typeof rulesList.tradeRules] ?? room.rules.tradeRule}`)}
                    </p>
                )}
            </div>

            <p className={styles.status}>
                {textToSprite(
                    waitingForOpponent ? "Waiting for a challenger..."
                        : guestMustAccept ? "Accept these rules to begin"
                            : hostAwaitingAcceptance ? "Waiting for them to accept..."
                                : "Ready. Choose your cards.",
                )}
            </p>

            <div className={styles.row}>
                {guestMustAccept && (
                    <button className={styles.action} onClick={handleAccept} disabled={busy}>
                        {textToSprite("Accept")}
                    </button>
                )}
                <button className={styles.action} onClick={handleLeave} disabled={busy}>
                    {textToSprite(guestMustAccept ? "Decline" : "Leave")}
                </button>
            </div>

            {message && <p className={styles.problem}>{textToSprite(message)}</p>}
        </SimpleDialog>
    );
};

export default MultiplayerDialog;
