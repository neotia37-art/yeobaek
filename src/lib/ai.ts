import { createServerFn } from "@tanstack/react-start";
import { ENTRY_KINDS, type ConversationDraft, type EntryKind } from "./types";

const MAX_CONVERSATION = 18000;

type OrganizeResult =
  | { ok: true; draft: ConversationDraft }
  | { ok: false; error: string };

export const organizeConversation = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const data = input as {
      conversation?: string;
      bookTitle?: string;
      bookAuthor?: string;
      existingIdeaTitles?: string[];
      existingNotes?: string;
    };
    const conversation = (data.conversation ?? "").trim();
    if (conversation.length < 40) {
      throw new Error("대화가 너무 짧습니다. 조금 더 붙여 넣어 주세요.");
    }
    return {
      conversation: conversation.slice(0, MAX_CONVERSATION),
      bookTitle: (data.bookTitle ?? "").trim().slice(0, 200),
      bookAuthor: (data.bookAuthor ?? "").trim().slice(0, 200),
      existingIdeaTitles: (data.existingIdeaTitles ?? []).slice(0, 40).map((t) => t.slice(0, 80)),
      existingNotes: (data.existingNotes ?? "").trim().slice(0, 4000),
    };
  })
  .handler(async ({ data }): Promise<OrganizeResult> => {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false, error: "지금은 대화 정리 기능을 쓸 수 없습니다." };
    }

    const system = `당신은 건설적 독서 기록을 돕는 편집자다. 사용자가 책과 관련해 LLM과 나눈 대화를 네 칸으로 나눈다.
1) excerpt 책의 내용 — 저자가 말한 것만. 사용자 해석을 섞지 말 것.
2) thought 나의 생각 — 사용자의 반응, 질문, 저항.
3) idea 발전된 아이디어 — 책을 넘어 확장된 가설. 짧게 이름 붙일 것.
4) action 실행할 점 — 이번 주에 실행 가능한 구체적 행동.

반드시 JSON만 출력한다. 한국어. 각 항목은 빈약하지 않게, 그러나 장황하지 않게.
스키마:
{
  "sessionTitle": string,
  "summary": string,
  "entries": [{"kind":"excerpt"|"thought"|"idea"|"action","title":string,"body":string,"tags":string[],"linkedIdeaTitles":string[]}],
  "suggestedIdeas": [{"title":string,"summary":string}]
}
linkedIdeaTitles는 기존 아이디어 제목 중 실제로 연결되는 것만.
suggestedIdeas는 새로 만들 아이디어만. excerpt 2~5, thought 2~4, idea 1~4, action 1~4개.`;

    const user = `책: ${data.bookTitle || "(미정)"} / 저자: ${data.bookAuthor || "(미정)"}
기존 아이디어: ${data.existingIdeaTitles.join(", ") || "(없음)"}
기존 노트 요약:
${data.existingNotes || "(없음)"}

대화:
${data.conversation}`;

    try {
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "grok-4.5",
          temperature: 0.3,
          max_tokens: 2200,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
      if (!res.ok) {
        return { ok: false, error: `정리 요청이 실패했습니다 (${res.status}).` };
      }
      const body = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = body.choices?.[0]?.message?.content ?? "";
      const draft = parseDraft(text);
      if (!draft) return { ok: false, error: "정리 결과를 읽지 못했습니다. 다시 시도해 주세요." };
      return { ok: true, draft };
    } catch {
      return { ok: false, error: "네트워크 오류로 정리하지 못했습니다." };
    }
  });

function parseDraft(text: string): ConversationDraft | null {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const raw = JSON.parse(trimmed.slice(start, end + 1)) as Partial<ConversationDraft>;
    const entries = (raw.entries ?? [])
      .map((e) => ({
        kind: (ENTRY_KINDS.includes(e.kind as EntryKind) ? e.kind : "thought") as EntryKind,
        title: String(e.title ?? "").trim().slice(0, 120),
        body: String(e.body ?? "").trim().slice(0, 2000),
        tags: Array.isArray(e.tags) ? e.tags.map((t) => String(t).slice(0, 24)).slice(0, 6) : [],
        linkedIdeaTitles: Array.isArray(e.linkedIdeaTitles)
          ? e.linkedIdeaTitles.map((t) => String(t).slice(0, 80)).slice(0, 6)
          : [],
      }))
      .filter((e) => e.title && e.body)
      .slice(0, 20);
    if (entries.length === 0) return null;
    return {
      sessionTitle: String(raw.sessionTitle ?? "대화에서 정리한 회독").slice(0, 80),
      summary: String(raw.summary ?? "").slice(0, 400),
      entries,
      suggestedIdeas: (raw.suggestedIdeas ?? [])
        .map((i) => ({
          title: String(i.title ?? "").trim().slice(0, 80),
          summary: String(i.summary ?? "").trim().slice(0, 400),
        }))
        .filter((i) => i.title)
        .slice(0, 8),
    };
  } catch {
    return null;
  }
}
