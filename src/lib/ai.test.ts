import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseConversationDraft } from "./conversation-draft.ts";

describe("parseConversationDraft", () => {
  it("parses a clean JSON object", () => {
    const draft = parseConversationDraft(
      JSON.stringify({
        sessionTitle: "순환 인과",
        summary: "빈곤과 결핍은 서로 강화한다.",
        entries: [
          {
            kind: "excerpt",
            title: "빈곤이 행동을 바꾼다",
            body: "책은 빈곤이 결핍을 만들고 실패를 높인다고 본다.",
            tags: ["결핍"],
            linkedIdeaTitles: ["터널링"],
          },
        ],
        suggestedIdeas: [{ title: "순환 인과", summary: "단방향이 아니라 루프." }],
      }),
    );
    assert.equal(draft?.sessionTitle, "순환 인과");
    assert.equal(draft?.entries.length, 1);
    assert.equal(draft?.entries[0]?.kind, "excerpt");
    assert.equal(draft?.suggestedIdeas[0]?.title, "순환 인과");
  });

  it("strips markdown fences and unknown kinds", () => {
    const draft = parseConversationDraft(`\`\`\`json
{"sessionTitle":"A","summary":"B","entries":[{"kind":"note","title":"질문","body":"빈곤은 결과인가.","tags":[],"linkedIdeaTitles":[]}],"suggestedIdeas":[]}
\`\`\``);
    assert.equal(draft?.entries[0]?.kind, "thought");
  });

  it("repairs truncated JSON enough to keep complete entries", () => {
    const draft = parseConversationDraft(`{
      "sessionTitle": "잘린 초안",
      "summary": "뒷부분이 끊겼다.",
      "entries": [
        {"kind":"thought","title":"반례","body":"빈곤에서 일어선 사람이 있다.","tags":["반례"],"linkedIdeaTitles":[]}
      ],
      "suggestedIdeas": [
        {"title":"전환점","summary":"무엇이 궤도를 바꾸는가`);
    assert.equal(draft?.sessionTitle, "잘린 초안");
    assert.equal(draft?.entries.length, 1);
    assert.equal(draft?.entries[0]?.title, "반례");
  });

  it("returns null when nothing usable remains", () => {
    assert.equal(parseConversationDraft("sorry, I cannot"), null);
    assert.equal(parseConversationDraft("{}"), null);
  });
});
