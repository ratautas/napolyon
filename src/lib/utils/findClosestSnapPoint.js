export const findClosestSnapPoint = ({ points, x, y, radius }) => {
    let point = Object.values(points)
        .filter((point) => point.x > x - radius && point.x < x + radius)
        .filter((point) => point.y > y - radius && point.y < y + radius)
        .reduce(
            (acc, point) => {
                const diffX = point.x - x;
                const diffY = point.y - y;

                // good old pythagoras
                const diff = Math.sqrt(Math.pow(diffX, 2) + Math.pow(diffY, 2));
                return acc == null || diff <= acc.diff ? { ...point, diff } : acc;
            },
            {
                // initial (max) diff
                diff: radius
            }
        );

    return point.id ? point : null;
};