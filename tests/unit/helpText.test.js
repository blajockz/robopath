import { describe, expect, it } from "vitest";
import { HELP_TEXT } from "../../components/helpText";

describe("help text", () => {
  it("exists in English and Arabic", () => {
    expect(Object.keys(HELP_TEXT)).toEqual(["en", "ar"]);
  });

  it("has the same parts in every language", () => {
    for (const text of Object.values(HELP_TEXT)) {
      expect(text.name).toBeTruthy();
      expect(text.title).toBeTruthy();
      expect(text.close).toBeTruthy();
      expect(text.credit).toMatch(/N7GD/);
      expect(text.steps).toHaveLength(HELP_TEXT.en.steps.length);
    }
  });

  it("reads right to left in Arabic and left to right in English", () => {
    expect(HELP_TEXT.en.dir).toBe("ltr");
    expect(HELP_TEXT.ar.dir).toBe("rtl");
  });

  it("does not mention N7SEC", () => {
    expect(JSON.stringify(HELP_TEXT)).not.toMatch(/N7SEC/i);
  });
});
