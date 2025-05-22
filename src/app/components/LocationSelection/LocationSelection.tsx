import { useEffect } from "react";
import styles from "./LocationSelection.module.scss";
import { useGameContext } from "../../context/GameContext";
import locations from "../../../data/locations.json";
import DialogPagination from "../DialogPagination/DialogPagination";
import textToSprite from "../../utils/textToSprite";

const LocationSelectionDialog = () => {
    const { isMenuOpen, currentPages, slideDirection, dispatch } = useGameContext();

    useEffect(() => {
        const locationId = currentPages.locations;
        if (!locationId) return;

        const allPages = { ...currentPages };
        allPages.players = 1;
        dispatch({ type: "SET_CURRENT_PAGES", payload: allPages });
    }, [currentPages.locations]);


    const locationContent = (item: { id: string, location: string }) => {
        return (
            <div key={item.id} data-slide-direction={(slideDirection && slideDirection[0] === "locations") ? slideDirection[1] : null}>
                <p>{textToSprite(item.location, "white", true)}</p>
            </div>

        );
    };

    return (
        <div className={`${styles.locationSelectionDialog} ${isMenuOpen ? "" : "hidden"} top-[80%]`}>
            <h4 className={styles.meta} data-sprite="location">Location</h4>
            <DialogPagination items={locations} itemsPerPage={1} renderItem={locationContent} pagination="locations" />
        </div>
    );
};

export default LocationSelectionDialog;