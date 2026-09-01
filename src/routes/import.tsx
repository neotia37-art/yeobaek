import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { organizeConversation } from "@/lib/ai";
import { bookSessions, sessionEntries, useJournal } from "@/lib/store";
import type { ConversationDraft, EntryKind } from "@/lib/types";
import { KIND_META } from "@/lib/types";
import { cn } from "@/lib/utils";

type Search = { bookId?: string };

export const Route = createFileRoute("/import")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    bookId: typeof search.bookId === "string" ? search.bookId : undefined,
  }),
  component: ImportPage,
});

const SAMPLE = `사용자: 결핍은 우리를 어떻게 변화시키는가를 다시 읽고 있어. 1회독 때는 터널링이 인상적이었는데, 지금은 슬랙이 더 크게 와.
어시스턴트: 슬랙은 남는 자원이 아니라 충격을 흡수하는 빈칸입니다. 시간·돈·주의에 여유를 설계하지 않으면 결핍의 함정—당장의 구멍을 메우느라 미래의 대역폭을 담보 잡는 일—이 반복됩니다.
사용자: 나는 일정을 빈칸 없이 채우는 편이야. 수요일 슬랙을 만들어 두고도 자꾸 회의를 넣게 돼. 큰 약속을 하기 전에 대역폭을 점검하는 습관이 필요해.
어시스턴트: 그렇다면 규칙은 두 가지로 단순화할 수 있습니다. 첫째, 슬랙은 할 일이 아니라 지키는 자리로 이름을 붙인다. 둘째, 확신이 큰 결정일수록 터널 밖에서 한다. 카너먼의 시스템 1이 완결된 이야기에 취약한 것과 같은 구조입니다.`;

const MIN_CHARS = 40;

function ImportPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const books = useJournal((s) => s.books);
  const ideas = useJournal((s) => s.ideas);
  const applyConversation = useJournal((s) => s.applyConversation);
  const [bookId, setBookId] = useState(search.bookId ?? books[0]?.id ?? "");
  const [text, setText] = useState("");
  const [includeNotes, setIncludeNotes] = useState(true);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ConversationDraft | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  const book = books.find((b) => b.id === bookId);
  const state = useJournal();
  const existingNotes = useMemo(() => {
    if (!book || !includeNotes) return "";
    return bookSessions(state, book.id)
      .flatMap((s) =>
        sessionEntries(state, s.id).map(
          (e) => `[${s.passNumber}회독/${KIND_META[e.kind].short}] ${e.title}: ${e.body}`,
        ),
      )
      .join("\n")
      .slice(0, 1800);
  }, [book, includeNotes, state]);

  useEffect(() => {
    if (!busy) {
      setElapsed(0);
      return;
    }
    const started = Date.now();
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - started) / 1000));
    }, 250);
    return () => window.clearInterval(id);
  }, [busy]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  async function onOrganize() {
    if (!book) {
      toast.error("책을 먼저 골라 주세요.");
      return;
    }
    if (text.trim().length < MIN_CHARS) {
      toast.error("대화가 너무 짧습니다. 조금 더 붙여 넣어 주세요.");
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setBusy(true);
    setDraft(null);
    setError(null);
    try {
      const result = await organizeConversation({
        data: {
          conversation: text,
          bookTitle: book.title,
          bookAuthor: book.author,
          existingIdeaTitles: ideas.map((i) => i.title),
          existingNotes,
        },
        signal: ac.signal,
      });
      if (!result.ok) {
        setError(result.error);
        toast.error(result.error);
        return;
      }
      setDraft(result.draft);
      setSelected(new Set(result.draft.entries.map((_, i) => i)));
    } catch (err) {
      if (ac.signal.aborted) return;
      const msg =
        err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError")
          ? "시간이 초과되었습니다. 대화를 조금 줄여 다시 시도해 주세요."
          : err instanceof Error && err.message
            ? err.message
            : "정리 요청에 실패했습니다.";
      setError(msg);
      toast.error(msg);
    } finally {
      if (abortRef.current === ac) abortRef.current = null;
      setBusy(false);
    }
  }

  function cancelOrganize() {
    abortRef.current?.abort();
    abortRef.current = null;
    setBusy(false);
    setError("정리를 취소했습니다.");
  }

  function apply() {
    if (!draft || !book) return;
    const picked = draft.entries.filter((_, i) => selected.has(i));
    if (picked.length === 0) {
      toast.error("남길 항목을 골라 주세요.");
      return;
    }
    const sessionId = applyConversation({
      bookId: book.id,
      sessionTitle: draft.sessionTitle,
      intent: draft.summary,
      entries: picked.map((e) => ({
        kind: e.kind,
        title: e.title,
        body: e.body,
        tags: e.tags,
        ideaTitles: e.linkedIdeaTitles,
      })),
      newIdeas: draft.suggestedIdeas,
    });
    toast.success("새 회독으로 남겼습니다.");
    void navigate({ to: "/books/$bookId", params: { bookId: book.id } });
    return sessionId;
  }

  const chars = text.trim().length;
  const canSubmit = !busy && chars >= MIN_CHARS && Boolean(book);

  return (
    <main className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section>
        <p className="text-xs tracking-[0.25em] text-muted">대화에서</p>
        <h1 className="mt-3 font-display text-4xl">대화 정리</h1>
        <p className="mt-3 max-w-xl text-muted">
          ChatGPT·Grok과 나눈 대화나 긴 답변을 그대로 붙여 넣으면, 책의 내용 / 나의 생각 / 발전된 아이디어 /
          실행할 점으로 나누고 기존 아이디어와 잇습니다.
        </p>

        <div className="mt-8 grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="book">책</Label>
            <select
              id="book"
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              className="h-11 rounded-md bg-surface px-3 text-sm shadow-border"
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={includeNotes}
              onChange={(e) => setIncludeNotes(e.target.checked)}
              className="size-4 accent-primary"
            />
            이전 회독 기록도 함께 참고
          </label>
          <div className="grid gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="conv">대화</Label>
              <button
                type="button"
                className="text-xs text-muted underline-offset-4 hover:text-fg hover:underline"
                onClick={() => setText(SAMPLE)}
              >
                샘플 넣기
              </button>
            </div>
            <Textarea
              id="conv"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="대화를 그대로 붙여 넣으세요. 왕복 대화가 아니어도 됩니다."
              className="min-h-56"
            />
            <p className={cn("text-xs", chars < MIN_CHARS ? "text-subtle" : "text-muted")}>
              {chars.toLocaleString("ko-KR")}자
              {chars < MIN_CHARS ? " · 조금 더 붙여 넣으면 나눌 수 있습니다" : ""}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" onClick={onOrganize} disabled={!canSubmit}>
              {busy ? `나누는 중… ${elapsed}초` : "건설적으로 나누기"}
            </Button>
            {busy && (
              <Button variant="outline" onClick={cancelOrganize} className="sm:w-28">
                취소
              </Button>
            )}
          </div>
        </div>
      </section>

      <section>
        {busy && (
          <div className="rounded-xl bg-surface p-8 shadow-border">
            <p className="text-xs tracking-[0.2em] text-subtle">정리 중</p>
            <h2 className="mt-2 font-display text-2xl">대화를 네 칸으로 나누고 있습니다</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {elapsed < 8
                ? "붙여 넣은 글을 읽고 책의 주장과 당신의 생각을 가릅니다."
                : elapsed < 20
                  ? "책의 내용, 나의 생각, 아이디어, 실행할 점으로 묶는 중입니다."
                  : "긴 글은 조금 더 걸릴 수 있습니다. 이 화면을 닫지 마세요."}
            </p>
            <div className="mt-6 h-1 overflow-hidden rounded-full bg-bg">
              <div className="h-full w-1/3 animate-pulse rounded-full bg-accent" />
            </div>
            <p className="mt-3 text-xs text-subtle">{elapsed}초 경과</p>
          </div>
        )}
        {!busy && error && !draft && (
          <div className="rounded-xl bg-surface p-8 text-sm leading-relaxed shadow-border">
            <p className="text-xs tracking-[0.2em] text-subtle">정리하지 못했습니다</p>
            <p className="mt-3 text-danger">{error}</p>
            <p className="mt-3 text-muted">대화를 조금 다듬거나, 같은 내용으로 다시 시도해 보세요.</p>
            <Button className="mt-6" onClick={onOrganize} disabled={!canSubmit}>
              다시 나누기
            </Button>
          </div>
        )}
        {!busy && !error && !draft && (
          <div className="rounded-xl bg-surface p-8 text-sm leading-relaxed text-muted shadow-border">
            결과가 여기에 나타납니다. 항목을 고른 뒤 서재에 새 회독으로 남길 수 있습니다.
          </div>
        )}
        {draft && (
          <div className="rounded-xl bg-surface p-6 shadow-border">
            <p className="text-xs text-subtle">새 회독 초안</p>
            <h2 className="mt-1 font-display text-2xl">{draft.sessionTitle}</h2>
            <p className="mt-2 text-sm text-muted">{draft.summary}</p>
            {draft.suggestedIdeas.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {draft.suggestedIdeas.map((i) => (
                  <Badge key={i.title}>{i.title}</Badge>
                ))}
              </div>
            )}
            <ul className="mt-6 flex flex-col gap-3">
              {draft.entries.map((entry, i) => {
                const on = selected.has(i);
                return (
                  <li key={`${entry.title}-${i}`}>
                    <button
                      type="button"
                      onClick={() =>
                        setSelected((prev) => {
                          const next = new Set(prev);
                          if (next.has(i)) next.delete(i);
                          else next.add(i);
                          return next;
                        })
                      }
                      className={cn(
                        "w-full rounded-lg p-4 text-left shadow-border",
                        on ? "bg-bg-elevated" : "bg-bg opacity-50",
                      )}
                    >
                      <p className="text-xs text-subtle">{KIND_META[entry.kind as EntryKind].label}</p>
                      <p className="mt-1 font-medium">{entry.title}</p>
                      <p className="mt-2 text-sm leading-relaxed text-muted">{entry.body}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
            <Button className="mt-6 w-full" onClick={apply}>
              선택한 항목을 회독으로 남기기
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
