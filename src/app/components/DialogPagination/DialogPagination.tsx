import { useEffect } from "react"
import styles from './DialogPagination.module.scss';
import { useGameContext } from '../../context/GameContext';
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

    return (
        <div className={styles.paginationContainer}>
            {paginatedItems.map(([index, item]) => renderItem(item as T, index))}

            <div className={`${styles.pagination} flex justify-between absolute bottom-0 left-0 w-full ${(pages > 1) ? "" : "hidden"}`.trim()}>
                <button data-prev onClick={handlePreviousClick} className="disabled:opacity-50"></button>
                <button data-next onClick={handleNextClick} className="disabled:opacity-50"></button>
            </div>
        </div>

    );
};

export default DialogPagination;