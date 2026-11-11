// The "How to play" text, in English and Arabic.
// To add a language: add an entry here with the same fields.

export const HELP_TEXT = {
  en: {
    name: "English",
    dir: "ltr",
    title: "How to play",
    steps: [
      "Collect every star. The ghost must stay on the tiles.",
      "Tap a slot, then tap a command: forward, turn left or turn right.",
      "F1 and F2 run another function. A function can call itself to repeat.",
      "Pick a colour first to make a command run only on tiles of that colour.",
      "Press play. Slots are limited, so think short!",
    ],
    credit: "A game by N7GD (Game Dev).",
    close: "Got it",
  },
  ar: {
    name: "العربية",
    dir: "rtl",
    title: "طريقة اللعب",
    steps: [
      "اجمع كل النجوم. يجب أن يبقى الشبح فوق المربعات.",
      "اضغط على خانة، ثم اختر أمراً: تقدَّم، استدر يساراً أو استدر يميناً.",
      "F1 و F2 يشغّلان دالة أخرى. يمكن للدالة أن تستدعي نفسها لتكرار الحركات.",
      "اختر لوناً أولاً ليُنفَّذ الأمر فقط فوق المربعات التي لها نفس اللون.",
      "اضغط على زر التشغيل. عدد الخانات محدود، ففكّر في حل قصير!",
    ],
    credit: "لعبة من تصميم N7GD (نادي تطوير الألعاب).",
    close: "فهمت",
  },
};
