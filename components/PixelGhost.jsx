// The ghost mascot, drawn from a 16 x 16 pixel map (no image file needed).
// It is animated with CSS: it floats, blinks, and its feet wave.

import styles from "./PixelGhost.module.css";

// h = highlight, w = body, s = shade (same palette as the ghost GIFs)
const BODY = [
  "................",
  ".....oooooo.....",
  "...oohhwwwwoo...",
  "..ohhwwwwwwwwo..",
  ".ohwwwwwwwwwwso.",
  ".owwwwwwwwwwwso.",
  "owwwewwwwwwewwso",
  "owwwewwwwwwewwso",
  "owwppwwmmwwppwso",
  "owwwwwwwwwwwwwso",
  "owwwwwwwwwwwwwso",
  "owwwwwwwwwwwwsso",
  "osswwwwwwwwwssso",
];

// Two versions of the bottom edge. Swapping them makes the feet wave.
const FEET_A = ["ossssossssosssso", ".oooo.oooo.oooo."];
const FEET_B = ["ossossssossssoso", ".oo.oooo.oooo.o."];

// Colours taken from the ghost GIFs in public/mascot
const COLORS = {
  o: "#13152b", // outline
  h: "#f6f4fc", // highlight
  w: "#e3dcfc", // body
  s: "#c5b9fb", // shade
  e: "#13152b", // eyes
  m: "#13152b", // mouth
  p: "#fc82af", // cheeks
};

// Merge neighbouring pixels of one colour into a single rectangle per row
function toRects(rows, firstRow) {
  return rows.flatMap((row, index) => {
    const rects = [];
    let x = 0;

    while (x < row.length) {
      const char = row[x];
      let end = x;
      while (end < row.length && row[end] === char) end++;

      if (COLORS[char]) {
        rects.push({ x, y: firstRow + index, width: end - x, char });
      }
      x = end;
    }

    return rects;
  });
}

const BODY_RECTS = toRects(BODY, 0);
const FEET_A_RECTS = toRects(FEET_A, BODY.length);
const FEET_B_RECTS = toRects(FEET_B, BODY.length);

function Rects({ rects }) {
  return rects.map((rect) => (
    <rect
      key={`${rect.x}-${rect.y}`}
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height="1"
      fill={COLORS[rect.char]}
      className={rect.char === "e" ? styles.eye : undefined}
    />
  ));
}

export default function PixelGhost({ className = "" }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={`${styles.ghost} ${className}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <Rects rects={BODY_RECTS} />
      <g className={styles.feetA}>
        <Rects rects={FEET_A_RECTS} />
      </g>
      <g className={styles.feetB}>
        <Rects rects={FEET_B_RECTS} />
      </g>
    </svg>
  );
}