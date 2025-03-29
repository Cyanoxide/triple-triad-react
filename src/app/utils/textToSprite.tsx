const textToSprite = (text: string, colour: string = "white") => {
    if (!text) return;

    return (
        <span className={`font ${colour}`}>
            {text.split("").map((glyph: string, index: number) => (
                <span key={index} className="font-glyph" data-sprite={glyph}>{glyph}</span>
            ))}
        </span>
    )
}
export default textToSprite;
