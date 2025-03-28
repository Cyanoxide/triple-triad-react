const textToSprite = (text: string) => {
    if (!text) return;

    return (
        <span className="font">
            {text.split("").map((glyph: string, index: number) => (
                <span key={index} className="font-glyph" data-sprite={glyph}>{glyph}</span>
            ))}
        </span>
    )
}
export default textToSprite;
