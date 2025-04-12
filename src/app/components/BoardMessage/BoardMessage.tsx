
import Image from "next/image";
import styles from "./BoardMessage.module.scss";

interface BoardMessageProps {
    message: "same" | "plus" | "combo";
}

export default function BoardMessage({ message }: BoardMessageProps) {
    return <Image src="/assets/plusSame.png" alt="message" width="500" height="84" className={`${styles.boardMessage} ${styles[message]}`} />;
}