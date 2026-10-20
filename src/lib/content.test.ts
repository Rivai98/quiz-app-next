import { describe, expect, it } from "vitest";
import { contentBlocks } from "./content";
import { parseImportQuiz, adminSaveSchema } from "./schema";
import { sanitizeQuiz } from "./validate";
import { seedToQuiz, toPublicQuiz } from "./share";
import { seedQuizzes } from "./quiz";
import { highlightCode } from "./highlightCode";

describe("multiline quiz content", () => {
  it("preserves whitespace, tabs, quotes and backslashes through import, save and reload", () => {
    const text = '  ما الناتج؟\n```javascript\n\tconst path = "C:\\\\quiz";\n  console.log(path);\n```\n  ';
    const imported = parseImportQuiz({ ...seedQuizzes[0], questions: [{ ...seedQuizzes[0].questions[0], text, explanation: text, options: [text, "آخر"] }] });
    expect(imported.ok).toBe(true);
    if (!imported.ok) throw new Error(imported.error);
    const saved = adminSaveSchema.parse(imported.data);
    const reloaded = sanitizeQuiz(JSON.parse(JSON.stringify(seedToQuiz(saved, "code", true))));
    expect(reloaded?.questions[0]).toMatchObject({ text, explanation: text, options: [text, "آخر"] });
    const publicQuestion = toPublicQuiz(reloaded!).questions[0];
    expect(publicQuestion.text).toBe(text);
    expect(publicQuestion).not.toHaveProperty("correctIndex");
    expect(publicQuestion).not.toHaveProperty("explanation");
  });

  it("supports several code blocks while leaving incomplete fences visible", () => {
    const blocks = contentBlocks('سؤال\n```js\n  let x = 1;\n```\nنص\n```\n\tplain\n```\n```python\nunfinished');
    expect(blocks).toEqual([
      { kind: "text", text: "سؤال\n" },
      { kind: "code", text: "  let x = 1;\n", language: "js" },
      { kind: "text", text: "نص\n" },
      { kind: "code", text: "\tplain\n", language: "" },
      { kind: "text", text: "```python\nunfinished" },
    ]);
  });

  it.each(["javascript", "python", "xml", "css", "json"])("escapes executable HTML when highlighting %s", language => {
    const highlighted = highlightCode('<script>alert("x")</script>', language);
    expect(highlighted).not.toContain("<script>");
    expect(highlighted).toContain("&lt;");
  });

  it.each([
    ["text", 10_000], ["explanation", 10_000], ["option", 4_000],
  ])("applies the same %s limits at import and reload", (field, limit) => {
    const question = seedQuizzes[0].questions[0];
    const makeQuiz = (length: number) => ({ ...seedQuizzes[0], questions: [{ ...question, ...(field === "option" ? { options: ["x".repeat(length), "آخر"] } : { [field]: "x".repeat(length) }) }] });
    expect(parseImportQuiz(makeQuiz(limit)).ok).toBe(true);
    expect(sanitizeQuiz(makeQuiz(limit))).not.toBeNull();
    expect(parseImportQuiz(makeQuiz(limit + 1)).ok).toBe(false);
    expect(sanitizeQuiz(makeQuiz(limit + 1))).toBeNull();
  });
});
