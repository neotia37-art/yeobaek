import { ENTRY_KINDS, type ConversationDraft, type EntryKind } from "./types.ts";

export function parseConversationDraft(text: string): ConversationDraft | null {
  const stripped = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  const start = stripped.indexOf("{");
  if (start < 0) return null;
  const candidate = stripped.slice(start);

  const attempts = [sliceToLastBrace(candidate), repairJson(candidate)];
  for (const attempt of attempts) {
    if (!attempt) continue;
    try {
      const draft = coerceDraft(JSON.parse(attempt) as Partial<ConversationDraft>);
      if (draft) return draft;
    } catch {
      // try the next candidate
    }
  }
  return null;
}

function sliceToLastBrace(text: string): string | null {
  const end = text.lastIndexOf("}");
  if (end <= 0) return null;
  return text.slice(0, end + 1);
}

function repairJson(text: string): string {
  let t = text.trim();
  const stack: Array<"{" | "["> = [];
  let inStr = false;
  let esc = false;
  for (const ch of t) {
    if (inStr) {
      if (esc) {
        esc = false;
        continue;
      }
      if (ch === "\\") {
        esc = true;
        continue;
      }
      if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") stack.push("{");
    else if (ch === "[") stack.push("[");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  if (inStr) t += '"';
  t = t.replace(/,\s*$/, "");
  while (stack.length > 0) {
    t += stack.pop() === "{" ? "}" : "]";
  }
  return t;
}

function coerceDraft(raw: Partial<ConversationDraft> | null | undefined): ConversationDraft | null {
  if (!raw || typeof raw !== "object") return null;
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
    .slice(0, 16);
  if (entries.length === 0) return null;
  return {
    sessionTitle: String(raw.sessionTitle ?? "대화에서 정리한 회독").trim().slice(0, 80) || "대화에서 정리한 회독",
    summary: String(raw.summary ?? "").trim().slice(0, 400),
    entries,
    suggestedIdeas: (raw.suggestedIdeas ?? [])
      .map((i) => ({
        title: String(i.title ?? "").trim().slice(0, 80),
        summary: String(i.summary ?? "").trim().slice(0, 400),
      }))
      .filter((i) => i.title)
      .slice(0, 8),
  };
}
