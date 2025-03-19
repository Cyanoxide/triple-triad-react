type sounds = "select" | "flip" | "place" | "error" | "spin" | "back" | "success" | "victory" | "bgm";

export const loadSound = (sound: sounds) => {
    const src = "/assets/audio/";

    const sounds = {
        "select": "select.mp3",
        "flip": "flip.mp3",
        "place": "place.mp3",
        "error": "error.mp3",
        "spin": "spin.mp3",
        "back": "back.mp3",
        "success": "success.mp3",
        "victory": "victory.mp3",
        "bgm": "bgm.mp3",
    }

    return new Audio(`${src}${sounds[sound]}`);
}

export const playLoadedSound = (audio: HTMLAudioElement, isSoundEnabled: boolean) => {
    if (isSoundEnabled && audio) {
        audio.volume = 0.2;
        audio.play()
    }
}

export const stopLoadedSound = (audio: HTMLAudioElement, isSoundEnabled: boolean) => {
    if (isSoundEnabled && audio) {
        audio.pause();
        audio.currentTime = 0;
    }
}

const playSound = (soundName: sounds, isSoundEnabled: boolean) => {
    const audio = loadSound(soundName);

    if (isSoundEnabled && audio) {
        audio.volume = 0.2;
        audio.play()
    }
}

export default playSound;