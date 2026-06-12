type sounds = "select" | "flip" | "place" | "error" | "spin" | "back" | "success" | "victory" | "bgm";

export const loadSound = (sound: sounds) => {
    if (typeof window == "undefined") return;

    const src = "https://res.cloudinary.com/dnbsag1cp/video/upload/";

    const sounds = {
        "select": "v1759174799/select_zkotun.mp3",
        "flip": "v1759174796/flip_amnd1i.mp3",
        "place": "v1759174799/place_bafhuu.mp3",
        "error": "v1759174796/error_xjr7yd.mp3",
        "spin": "v1759174801/spin_gon09l.mp3",
        "back": "v1759174795/back_yt82fe.mp3",
        "success": "v1759174797/success_wlgfy9.mp3",
        "victory": "v1759174806/victory_hqz8c6.mp3",
        "bgm": "v1759174807/bgm_f9ep6l.mp3",
    }

    return new Audio(`${src}${sounds[sound]}`);
}

export const playLoadedSound = (audio: HTMLAudioElement | undefined, isSoundEnabled: boolean, isLoop: boolean = false) => {
    if (isSoundEnabled && audio) {
        if (isLoop) audio.loop = true;

        audio.preload = "auto";
        audio.volume = 0.2;

        audio.play().catch(console.error);
    }
}

export const stopLoadedSound = (audio: HTMLAudioElement | undefined) => {
    if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audio.loop = false;
    }
}

const playSound = (soundName: sounds, isSoundEnabled: boolean, isloop: boolean = false) => {
    const audio = loadSound(soundName);

    if (isSoundEnabled && audio) {
        if (isloop) audio.loop = true;
        audio.volume = 0.2;
        audio.play()
    }
}

export default playSound;