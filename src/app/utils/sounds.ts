/**
 * Game audio.
 *
 * Two paths, because the files fall into two very different groups.
 *
 * **Short effects go through the Web Audio API.** `new Audio(src).play()` per
 * sound — what this replaces — behaves badly on iOS: each call built a fresh
 * element that had to fetch and decode before making a sound, so the click and
 * the noise came apart; Safari only starts audio from inside a user gesture, so
 * anything raised from an effect was dropped; and nothing tied a sound to the
 * element that made it, so repeats overlapped. Decoding each clip once and
 * firing a buffer source per play fixes all three. The seven of them come to
 * about 190KB.
 *
 * **The music and the victory sting stay on an HTMLAudioElement.** They are
 * 4.5MB and 2.2MB, and decoding those into an AudioBuffer would cost tens of
 * megabytes of memory held for the whole session. An element streams them, and
 * nothing about background music needs sample-accurate timing. What they did
 * need is the unlock handling below: the music starts from an effect on mount,
 * which on a return visit — sound already enabled from a previous session — has
 * no gesture behind it and was simply refused, leaving the game silent until
 * something happened to retrigger it.
 */

export type sounds = "select" | "flip" | "place" | "error" | "spin" | "back" | "success" | "victory" | "bgm";

/**
 * This branch serves the audio from Cloudinary rather than from public/. The
 * Web Audio path fetches and decodes rather than handing a URL to an element,
 * so it needs CORS — Cloudinary sends `access-control-allow-origin: *` on these
 * delivery URLs, which is what makes that work.
 */
const SRC = "https://res.cloudinary.com/dnbsag1cp/video/upload/";

const FILES: Record<sounds, string> = {
    select: "v1759174799/select_zkotun.mp3",
    flip: "v1759174796/flip_amnd1i.mp3",
    place: "v1759174799/place_bafhuu.mp3",
    error: "v1759174796/error_xjr7yd.mp3",
    spin: "v1759174801/spin_gon09l.mp3",
    back: "v1759174795/back_yt82fe.mp3",
    success: "v1759174797/success_wlgfy9.mp3",
    victory: "v1759174806/victory_hqz8c6.mp3",
    bgm: "v1759174807/bgm_f9ep6l.mp3",
};

/** The ones small enough to be worth holding decoded in memory */
const EFFECTS: readonly sounds[] = ["select", "flip", "place", "error", "spin", "back", "success"];
const isEffect = (name: sounds) => EFFECTS.includes(name);

const VOLUME = 0.2;

/** Collapses the same clip fired twice by one interaction into a single play */
const DEDUPE_MS = 20;

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

let context: AudioContext | null = null;
let contextUnavailable = false;

/**
 * Whether a user gesture has happened yet. Until one has, a sound started
 * against a suspended context is not dropped by the browser — it is scheduled,
 * and the whole backlog fires at once when the context resumes.
 */
let gestureSeen = false;

const buffers = new Map<sounds, AudioBuffer>();
const loading = new Map<sounds, Promise<void>>();
const lastPlayed = new Map<sounds, number>();

/** Elements whose play() was refused by the autoplay policy, awaiting a gesture */
const blocked = new Map<HTMLAudioElement, boolean>();

/**
 * Elements the game stopped on purpose. pause() rejects whatever play() promise
 * was in flight, and that rejection arrives after the stop has been recorded, so
 * without this marker a deliberately stopped track puts itself back in the retry
 * queue and starts again later over whatever is playing by then.
 */
const stopped = new WeakSet<HTMLAudioElement>();

const getContext = (): AudioContext | null => {
    if (context || contextUnavailable) return context;
    if (typeof window === "undefined") return null;

    const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
    if (!Ctor) {
        // Nothing to fall back to, but the game must not break over a sound
        contextUnavailable = true;
        return null;
    }

    context = new Ctor();
    preload();
    return context;
};

const load = (name: sounds): Promise<void> => {
    const existing = loading.get(name);
    if (existing) return existing;

    const request = (async () => {
        const ctx = getContext();
        if (!ctx) return;

        const response = await fetch(`${SRC}${FILES[name]}`);
        const encoded = await response.arrayBuffer();
        // Safari's decodeAudioData settles its callbacks, not the promise
        const decoded = await new Promise<AudioBuffer>((resolve, reject) => {
            ctx.decodeAudioData(encoded, resolve, reject);
        });
        buffers.set(name, decoded);
    })().catch(() => {
        // A clip that will not decode should cost silence, not a crash. Drop the
        // record so a later play retries rather than being stuck on a failure.
        loading.delete(name);
    });

    loading.set(name, request);
    return request;
};

/** Decodes the effects, so no single play is the one that pays for loading */
const preload = () => {
    EFFECTS.forEach(load);
};

const startEffect = (name: sounds, isLoop: boolean) => {
    const ctx = getContext();
    const buffer = ctx && buffers.get(name);
    if (!ctx || !buffer) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = isLoop;

    const gain = ctx.createGain();
    gain.gain.value = VOLUME;

    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);

    // Each play gets its own nodes, released once the clip ends
    source.onended = () => {
        source.disconnect();
        gain.disconnect();
    };
};

/**
 * Starts an element, and remembers it only if the *autoplay policy* refused it.
 *
 * Which rejection it is matters. NotAllowedError means the browser would not
 * start it without a gesture, and it is worth trying again on the next one.
 * AbortError means our own pause() interrupted this play — retrying that later
 * restarts a track the game deliberately stopped, on top of whatever is playing
 * by then, which is two pieces of music at once.
 */
const startElement = (audio: HTMLAudioElement, isLoop: boolean) => {
    stopped.delete(audio);

    audio.loop = isLoop;
    audio.preload = "auto";
    audio.volume = VOLUME;

    // Already rolling: play() would resolve without doing anything, and asking
    // again only creates another promise to mis-handle
    if (!audio.paused) return;

    void audio.play().then(
        () => { blocked.delete(audio); },
        (error: unknown) => {
            const name = (error as DOMException | undefined)?.name;
            if (name === "NotAllowedError" && !stopped.has(audio)) blocked.set(audio, isLoop);
        },
    );
};

/**
 * Safari starts the context suspended and only resumes it from inside a user
 * gesture. Resuming is most of the job; the silent one-frame source is what
 * convinces older iOS the context is genuinely gesture-backed.
 */
const unlock = () => {
    // Set before resume() is even asked for: the click that follows a
    // pointerdown arrives long before the resume promise settles, and that
    // click's own sound is one we do want to hear.
    gestureSeen = true;

    const ctx = getContext();
    if (ctx) {
        if (ctx.state !== "running") void ctx.resume();

        const source = ctx.createBufferSource();
        source.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
        source.connect(ctx.destination);
        source.start(0);
    }

    // Anything the autoplay policy refused before now — the music, most likely —
    // gets its second chance on the back of this gesture. Skip any that has been
    // stopped or restarted since.
    const waiting = [...blocked.entries()];
    blocked.clear();
    waiting.forEach(([audio, isLoop]) => {
        if (audio.paused && !stopped.has(audio)) startElement(audio, isLoop);
    });
};

/**
 * Only these count. The activation events a browser will unlock audio on are
 * pointer and key presses — a hover is not one. touchend is here for iOS, which
 * treats it as the activation rather than the pointerdown.
 */
const GESTURES = ["pointerdown", "touchend", "keydown"] as const;

const armUnlock = () => {
    const onGesture = () => {
        unlock();
        GESTURES.forEach((type) => window.removeEventListener(type, onGesture));
    };
    GESTURES.forEach((type) => window.addEventListener(type, onGesture, { passive: true }));
};

if (typeof window !== "undefined") {
    armUnlock();

    /**
     * iOS suspends audio when the page goes into the background, and on an
     * interruption such as a call. Coming back needs a fresh gesture, so the
     * listeners go back rather than being a one-time thing — otherwise sound
     * stops working for the rest of the visit.
     */
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState !== "visible") return;
        if (context && context.state !== "running") {
            gestureSeen = false;
            armUnlock();
        }
    });
}

/** Builds the element for a long track. Kept per caller, held in a ref. */
export const loadSound = (sound: sounds) => {
    if (typeof window === "undefined") return;
    return new Audio(`${SRC}${FILES[sound]}`);
};

export const playLoadedSound = (audio: HTMLAudioElement | undefined, isSoundEnabled: boolean, isLoop: boolean = false) => {
    if (!isSoundEnabled || !audio) return;
    startElement(audio, isLoop);
};

export const stopLoadedSound = (audio: HTMLAudioElement | undefined) => {
    if (!audio) return;
    // Marked as well as removed: pause() below rejects the play() promise that
    // is still in flight, and that rejection lands after this line
    stopped.add(audio);
    blocked.delete(audio);
    audio.pause();
    audio.currentTime = 0;
    audio.loop = false;
};

const playSound = (soundName: sounds, isSoundEnabled: boolean, isLoop: boolean = false) => {
    if (!isSoundEnabled) return;

    // The long tracks are not held decoded; if one is asked for here it streams,
    // the same as it does through loadSound
    if (!isEffect(soundName)) {
        const audio = loadSound(soundName);
        if (audio) startElement(audio, isLoop);
        return;
    }

    const ctx = getContext();
    if (!ctx) return;

    // Nothing has unlocked audio yet, so this cannot be heard now and must not
    // be scheduled for later — that is the backlog. Drop it.
    if (ctx.state !== "running" && !gestureSeen) return;

    const now = performance.now();
    if (now - (lastPlayed.get(soundName) ?? -Infinity) < DEDUPE_MS) return;
    lastPlayed.set(soundName, now);

    const play = () => {
        if (buffers.has(soundName)) {
            startEffect(soundName, isLoop);
            return;
        }
        // Only reachable before the preload finishes. Late beats silent.
        void load(soundName).then(() => startEffect(soundName, isLoop));
    };

    if (ctx.state === "running") {
        play();
        return;
    }

    /**
     * A gesture has happened but resume() has not settled yet. Checked again on
     * the way out: resume() settling does not promise the context actually
     * started, and playing into one that is still suspended is what schedules a
     * sound for later instead of playing it.
     */
    void ctx.resume().then(() => {
        if (ctx.state === "running") play();
    });
};

export default playSound;
