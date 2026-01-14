
import styles from "./BoardMessage.module.scss";

interface BoardMessageProps {
    message: "same" | "plus" | "combo";
}

export default function BoardMessage({ message }: BoardMessageProps) {
    return <img src="https://res.cloudinary.com/dnbsag1cp/image/upload/v1759174759/plusSame_rwgwfb.png" alt="message" width="500" height="84" className={`${styles.boardMessage} ${styles[message]}`} />;
}