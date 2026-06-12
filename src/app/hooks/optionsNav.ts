// Bridge between the menu cursor and the always-mounted options panel.

let focusedIndex: number | null = null;
const listeners = new Set<() => void>();

export const optionsNav = {
    actions: {} as {
        toggleOptions?: () => void;
        toggleCRT?: () => void;
        toggleGallery?: () => void;
        toggleSound?: () => void;
        isOpen?: () => boolean;
        /** Registered by the MenuDialog so hovering an option moves the menu cursor */
        focusOption?: (index: number) => void;
    },

    getFocus(): number | null {
        return focusedIndex;
    },

    setFocus(index: number | null) {
        if (index === focusedIndex) return;
        focusedIndex = index;
        listeners.forEach((listener) => listener());
    },

    subscribe(listener: () => void) {
        listeners.add(listener);
        return () => {
            listeners.delete(listener);
        };
    },
};
