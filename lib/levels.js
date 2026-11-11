// The six levels. Each one teaches one new idea, and they get a bit
// harder in order.
//
// map:   "." = no tile, b/o/g = blue/orange/green tile,
//        B/O/G = the same tile with a star on it
// start: x and y count from the top-left corner, starting at 0
//        dir: 0 = up, 1 = right, 2 = down, 3 = left
// slots: how many commands fit in [F1, F2]. 0 hides the function.
//
// The solutions are deliberately NOT in this file, so they are not sent
// to the players' browsers. They live in tests/solutions.js.

export const levels = [
  {
    id: "first-steps",
    name: "First steps",
    hint: "Fill F1 with commands, then press play.",
    map: [
      "...B",
      "...b",
      "bbbb",
    ],
    start: { x: 0, y: 2, dir: 1 },
    slots: [6, 0],
  },
  {
    id: "loop",
    name: "Loop",
    hint: "Only 2 slots! F1 can call itself to repeat.",
    map: ["bbBbbBbB"],
    start: { x: 0, y: 0, dir: 1 },
    slots: [2, 0],
  },
  {
    id: "colour-sensor",
    name: "Colour sensor",
    hint: "A coloured command only runs on a tile of that colour.",
    map: [
      "obBbbo",
      "b....b",
      "B....B",
      "obbBbo",
    ],
    start: { x: 1, y: 0, dir: 1 },
    slots: [3, 0],
  },
  {
    id: "left-or-right",
    name: "Left or right",
    hint: "Two colours, two different turns.",
    map: [
      "......B",
      "..oBo.b",
      "..b.b.b",
      "bbg.gBg",
    ],
    start: { x: 0, y: 3, dir: 1 },
    slots: [4, 0],
  },
  {
    id: "helper",
    name: "Helper function",
    hint: "F1 is too small. Put the pattern in F2 and call it.",
    map: [
      "....B",
      "...Bb",
      "..Bb.",
      ".Bb..",
      "bb...",
    ],
    start: { x: 0, y: 4, dir: 1 },
    slots: [2, 4],
  },
  {
    id: "side-quests",
    name: "Side quests",
    hint: "Visit every branch, then come back to the path.",
    map: [
      ".B.B.B.",
      ".b.b.b.",
      "bgbgbgB",
    ],
    start: { x: 0, y: 2, dir: 1 },
    slots: [3, 8],
  },
];
