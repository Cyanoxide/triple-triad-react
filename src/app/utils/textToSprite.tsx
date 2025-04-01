const textToSprite = (text: string, colour: string = "white", isCentered: boolean = false) => {
    if (!text) return;

    return (
        <span className={`font ${colour} flex ${(isCentered) ? "justify-center" : ""}`}>
            {text.split("").map((glyph: string, index: number) => (
                <span key={index} className="font-glyph" data-sprite={glyph}>{glyph}</span>
            ))}
        </span>
    )
}
export default textToSprite;
