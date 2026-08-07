import { useEffect, useRef } from "react"
import styles from './DialogPagination.module.scss';
import { useGameContext } from '../../context/GameContext';
import { paginationNav } from "../../hooks/paginationNav";
import playSound from "../../utils/sounds";

interface DialogPaginationProps<T> {
    items: unknown[];
    itemsPerPage: number;
    renderItem: (item: T, index: unknown) => React.ReactNode;
    pagination: string;
}

const DialogPagination = <T,>({ items, itemsPerPage = 1, renderItem, pagination }: DialogPaginationProps<T>) => {
    const { currentPages, isSoundEnabled, slideDirection, dispatch } = useGameContext();

    useEffect(() => {
        setTimeout(() => {
            dispatch({ type: "SET_SLIDE_DIRECTION", payload: null });
        }, 100);
    }, [slideDirection])

    const currentPage = currentPages[pagination];

    const entries = Object.entries(items);
    const pages = Math.ceil(entries.length / itemsPerPage);

    const paginatedItems = entries.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handlePreviousClick = () => {
        playSound("place", isSoundEnabled);
        dispatch({ type: "SET_SLIDE_DIRECTION", payload: [pagination, "prev"] });

        const previous = (currentPage === 1) ? pages : currentPage - 1;
        const allPages = { ...currentPages };

        allPages[pagination] = previous;
        dispatch({ type: "SET_CURRENT_PAGES", payload: allPages })
    }

    const handleNextClick = () => {
        playSound("place", isSoundEnabled);
        dispatch({ type: "SET_SLIDE_DIRECTION", payload: [pagination, "next"] });

        const next = (currentPage === pages) ? 1 : currentPage + 1;
        const allPages = { ...currentPages };

        allPages[pagination] = next;
        dispatch({ type: "SET_CURRENT_PAGES", payload: allPages })
    }

    // Expose the page-flip handlers (slide animation + sound included) to keyboard navigation
    useEffect(() => {
        paginationNav.register(pagination, { prev: handlePreviousClick, next: handleNextClick });
        return () => paginationNav.unregister(pagination);
    });

    /**
     * Swipe to turn the page.
     *
     * The arrows are drawn at the size the original game drew them, which on a
     * phone is a very small thing to hit with a thumb — and they are staying
     * that size. A swipe across the list does the same job with the whole
     * panel as the target.
     *
     * It goes through the same handlers as the arrows, so the slide animation,
     * the wrap-around and the "place" sound all come for free.
     */
    const touch = useRef<{ x: number; y: number; at: number } | null>(null);

    /** Far enough not to be a tap, in real pixels: this is about a thumb, not
     *  about design units, so it does not scale with the canvas */
    const SWIPE_MIN = 40;

    const onTouchStart = (event: React.TouchEvent) => {
        if (event.touches.length !== 1) { touch.current = null; return; }
        const { clientX, clientY } = event.touches[0];
        touch.current = { x: clientX, y: clientY, at: Date.now() };
    };

    const onTouchEnd = (event: React.TouchEvent) => {
        const start = touch.current;
        touch.current = null;
        if (!start || pages <= 1) return;

        const end = event.changedTouches[0];
        if (!end) return;
        const dx = end.clientX - start.x;
        const dy = end.clientY - start.y;

        // Horizontal, and decisively so. Without the second test a slightly
        // slanted scroll-like drag down the list turns the page under you.
        if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        // A slow drag is someone resting a finger, not a gesture
        if (Date.now() - start.at > 800) return;

        // Content moves with the finger: swiping left carries the next page in
        if (dx < 0) handleNextClick(); else handlePreviousClick();
    };

    return (
        <div
            className={styles.paginationContainer}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            onTouchCancel={() => { touch.current = null; }}
        >
            {paginatedItems.map(([index, item]) => renderItem(item as T, index))}

            <div className={`${styles.pagination} flex justify-between absolute bottom-0 left-0 w-full ${(pages > 1) ? "" : "hidden"}`.trim()}>
                <button data-prev onClick={handlePreviousClick} className="disabled:opacity-50"></button>
                <button data-next onClick={handleNextClick} className="disabled:opacity-50"></button>
            </div>
        </div>

    );
};

export default DialogPagination;