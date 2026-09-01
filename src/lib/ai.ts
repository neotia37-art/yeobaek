import { createServerFn } from "@tanstack/react-start";
import { parseConversationDraft } from "./conversation-draft";
import type { ConversationDraft } from "./types";

const MAX_CONVERSATION = 24000;
const PRIMARY_MODEL = "grok-4.3";
const FALLBACK_MODEL = "grok-4.5";
const REQUEST_TIMEOUT_MS = 55_000;

type OrganizeInput = {
  conversation: string;
  bookTitle: string;
  bookAuthor: string;
  existingIdeaTitles: string[];
  existingNotes: string;
};

type OrganizeResult =
  | { ok: true; draft: ConversationDraft }
  | { ok: false; error: string };

type ChatResponse = {
  choices?: Array<{
    finish_reason?: string;
    message?: { content?: string };
  }>;
  error?: { message?: string };
};

export const organizeConversation = createServerFn({ method: "POST" })
  .validator((input: unknown): OrganizeInput => {
    const data = (input ?? {}) as {
      conversation?: unknown;
      bookTitle?: unknown;
      bookAuthor?: unknown;
      existingIdeaTitles?: unknown;
      existingNotes?: unknown;
    };
    const titles = Array.isArray(data.existingIdeaTitles) ? data.existingIdeaTitles : [];
    return {
      conversation: String(data.conversation ?? ""),
      bookTitle: String(data.bookTitle ?? "").trim().slice(0, 200),
      bookAuthor: String(data.bookAuthor ?? "").trim().slice(0, 200),
      existingIdeaTitles: titles.slice(0, 40).map((t) => String(t).slice(0, 80)),
      existingNotes: String(data.existingNotes ?? "").trim().slice(0, 2000),
    };
  })
  .handler(async ({ data }): Promise<OrganizeResult> => {
    const conversation = data.conversation.trim();
    if (conversation.length < 40) {
      return { ok: false, error: "대화가 너무 짧습니다. 조금 더 붙여 넣어 주세요." };
    }

    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      return { ok: false, error: "지금은 대화 정리 기능을 쓸 수 없습니다." };
    }

    const system = `당신은 건설적 독서 기록을 돕는 편집자다.
붙여 넣은 글의 형식을 가리지 마라: 사용자/어시스턴트 왕복, ChatGPT·Grok 내보내기, 긴 분석문, 연구 메모 모두 동일하게 다룬다.
내용을 네 칸으로 나눈다.
1) excerpt 책의 내용 — 저자가 말한 것만. 사용자 해석·반론을 섞지 말 것.
2) thought 나의 생각 — 사용자의 반응, 질문, 저항, 뒤집은 인과.
3) idea 발전된 아이디어 — 책을 넘어 확장된 가설. 짧게 이름 붙일 것.
4) action 실행할 점 — 이번 주에 실행 가능한 구체적 행동(기록·실험·질문).

반드시 JSON 객체만 출력한다. 한국어. 각 body는 2~4문장, 장황하지 않게.
항목 수: excerpt 2~3, thought 2~3, idea 1~3, action 1~2.
스키마:
{"sessionTitle": string, "summary": string, "entries": [{"kind":"excerpt"|"thought"|"idea"|"action","title":string,"body":string,"tags":string[],"linkedIdeaTitles":string[]}], "suggestedIdeas": [{"title":string,"summary":string}]}
linkedIdeaTitles는 기존 아이디어 제목 중 실제로 연결되는 것만.
suggestedIdeas는 새로 만들 아이디어만.`;

    const clipped = conversation.slice(0, MAX_CONVERSATION);
    const user = `책: ${data.bookTitle || "(미정)"} / 저자: ${data.bookAuthor || "(미정)"}
기존 아이디어: ${data.existingIdeaTitles.join(", ") || "(없음)"}
기존 노트 요약:
${data.existingNotes || "(없음)"}

대화:
${clipped}`;

    try {
      let raw = await completeChat(apiKey, PRIMARY_MODEL, system, user, false);
      if (!raw.ok && raw.retryWithFallback) {
        raw = await completeChat(apiKey, FALLBACK_MODEL, system, user, true);
      }
      if (!raw.ok) return { ok: false, error: raw.error };

      let draft = parseConversationDraft(raw.text);
      if (!draft && raw.text.trim()) {
        const compact = await completeChat(
          apiKey,
          raw.model,
          system,
          `${user}\n\n이전 출력이 JSON으로 파싱되지 않았다. 더 짧게, 항목 6개 안팎의 유효한 JSON만 다시 출력하라.`,
          raw.model === FALLBACK_MODEL,
        );
        if (compact.ok) draft = parseConversationDraft(compact.text);
      }
      if (!draft) {
        return { ok: false, error: "정리 결과를 읽지 못했습니다. 다시 시도해 주세요." };
      }
      return { ok: true, draft };
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      if (name === "TimeoutError" || name === "AbortError") {
        return { ok: false, error: "시간이 초과되었습니다. 대화를 조금 줄여 다시 시도해 주세요." };
      }
      return { ok: false, error: "네트워크 오류로 정리하지 못했습니다." };
    }
  });

async function completeChat(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  lowReasoning: boolean,
): Promise<
  | { ok: true; text: string; model: string }
  | { ok: false; error: string; retryWithFallback: boolean; model: string }
> {
  const payload: Record<string, unknown> = {
    model,
    temperature: 0.2,
    max_tokens: 3500,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  if (lowReasoning) payload.reasoning_effort = "low";

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    const retryWithFallback =
      model === PRIMARY_MODEL && (res.status === 400 || res.status === 404 || res.status === 422);
    return { ok: false, error: mapHttpError(res.status), retryWithFallback, model };
  }

  const body = (await res.json()) as ChatResponse;
  const text = body.choices?.[0]?.message?.content ?? "";
  if (!text.trim()) {
    return {
      ok: false,
      error: "정리 결과를 읽지 못했습니다. 다시 시도해 주세요.",
      retryWithFallback: model === PRIMARY_MODEL,
      model,
    };
  }
  return { ok: true, text, model };
}

function mapHttpError(status: number): string {
  if (status === 401 || status === 403) return "지금은 대화 정리 기능을 쓸 수 없습니다.";
  if (status === 429) return "요청이 많습니다. 잠시 후 다시 시도해 주세요.";
  if (status === 400 || status === 413 || status === 422) {
    return "정리 요청이 거부되었습니다. 대화를 조금 줄여 보세요.";
  }
  return `정리 요청이 실패했습니다 (${status}).`;
}
