

// via https://jsfiddle.net/soulwire/UA6H5/
export const findClosestLinePoint = ({ x, y, x1, y1, x2, y2 }) => {
    const startToEndX = x2 - x1;
    const startToEndY = y2 - y1;
    const startToPointX = x - x1;
    const startToPointY = y - y1;
    const len = startToEndX * startToEndX + startToEndY * startToEndY;
    let dot = startToPointX * startToEndX + startToPointY * startToEndY;
    const t = Math.min(1, Math.max(0, dot / len));

    dot = (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1);

    return {
        x: x1 + startToEndX * t,
        y: y1 + startToEndY * t,
        dot,
        t
    };
}