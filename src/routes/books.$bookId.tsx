import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Download, MessageSquareText, Plus, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { EntryForm } from "@/components/entry-form";
import { PdfArticle } from "@/components/pdf-article";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { downloadBookPdf } from "@/lib/pdf";
import { bookSessions, sessionEntries, useJournal } from "@/lib/store";
import { ENTRY_KINDS, KIND_META, type EntryKind } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/books/$bookId")({ component: BookPage });

function BookPage() {
  const { bookId } = Route.useParams();
  const navigate = useNavigate();
  const book = useJournal((s) => s.books.find((b) => b.id === bookId));
  const ideas = useJournal((s) => s.ideas);
  const addSession = useJournal((s) => s.addSession);
  const addEntry = useJournal((s) => s.addEntry);
  const updateEntry = useJournal((s) => s.updateEntry);
  const removeEntry = useJournal((s) => s.removeEntry);
  const removeBook = useJournal((s) => s.removeBook);
  const state = useJournal();
  const sessions = book ? bookSessions(state, book.id) : [];
  const entries = state.entries.filter((e) => e.bookId === bookId);
  const pdfRef = useRef<HTMLDivElement>(null);
  const [passOpen, setPassOpen] = useState(false);
  const [passTitle, setPassTitle] = useState("");
  const [passIntent, setPassIntent] = useState("");
  const [composing, setComposing] = useState<{ sessionId: string; kind: EntryKind } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [focusSession, setFocusSession] = useState<string | "all">("all");

  const visibleSessions = useMemo(
    () => (focusSession === "all" ? sessions : sessions.filter((s) => s.id === focusSession)),
    [sessions, focusSession],
  );

  if (!book) {
    return (
      <main className="py-20 text-center">
        <p className="text-muted">책을 찾지 못했습니다.</p>
        <Link to="/" className="mt-4 inline-block text-sm underline">
          서재로
        </Link>
      </main>
    );
  }

  async function onPdf() {
    if (!pdfRef.current || !book) return;
    setExporting(true);
    try {
      await downloadBookPdf({
        book,
        node: pdfRef.current,
      });
      toast.success("PDF를 저장했습니다.");
    } catch {
      toast.error("PDF를 만들지 못했습니다. 인쇄 대화상자를 엽니다.");
      window.print();
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="relative">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex h-11 items-center gap-2 rounded-md px-2 text-sm text-muted hover:text-fg"
        >
          <ArrowLeft className="size-4" />
          서재
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/import", search: { bookId } })}
          >
            <MessageSquareText />
            대화 정리
          </Button>
          <Button variant="outline" onClick={onPdf} disabled={exporting}>
            <Download />
            {exporting ? "만드는 중" : "PDF"}
          </Button>
          <Button onClick={() => setPassOpen(true)}>
            <Plus />
            다시 읽기
          </Button>
        </div>
      </div>

      <header className="max-w-2xl border-l border-border-strong pl-6 sm:pl-10">
        <p className="text-sm text-muted">{book.author}</p>
        <h1 className="mt-2 font-display text-3xl leading-tight font-medium sm:text-4xl">{book.title}</h1>
        {book.subtitle && <p className="mt-3 text-muted">{book.subtitle}</p>}
        <p className="mt-5 text-xs text-subtle">
          {sessions.length}회독이 누적되어 있습니다. 같은 책을 다시 읽으면 이전 기록이 지워지지 않고 이어집니다.
        </p>
      </header>

      <div className="mt-8 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFocusSession("all")}
          className={`rounded-full px-3 py-1.5 text-xs ${focusSession === "all" ? "bg-primary text-primary-fg" : "bg-bg-elevated text-muted"}`}
        >
          모든 회독
        </button>
        {sessions.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setFocusSession(s.id)}
            className={`rounded-full px-3 py-1.5 text-xs ${focusSession === s.id ? "bg-primary text-primary-fg" : "bg-bg-elevated text-muted"}`}
          >
            {s.passNumber}회독
          </button>
        ))}
      </div>

      <div className="mt-10 flex flex-col gap-16">
        {visibleSessions.map((session) => {
          const group = sessionEntries(state, session.id);
          return (
            <section key={session.id} className="border-l border-border pl-6 sm:pl-10">
              <p className="text-xs tracking-wide text-subtle">
                {session.passNumber}회독 · {formatDate(session.createdAt)}
                {session.source === "conversation" ? " · 대화에서 정리" : ""}
              </p>
              <h2 className="mt-2 font-display text-2xl">{session.title}</h2>
              {session.intent && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{session.intent}</p>}

              {ENTRY_KINDS.map((kind) => {
                const items = group.filter((e) => e.kind === kind);
                const isOpen = composing?.sessionId === session.id && composing.kind === kind;
                return (
                  <div key={kind} className="mt-8">
                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <h3 className="font-display text-lg">{KIND_META[kind].label}</h3>
                        <p className="text-xs text-subtle">{KIND_META[kind].hint}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setComposing(isOpen ? null : { sessionId: session.id, kind })}
                      >
                        추가
                      </Button>
                    </div>
                    {isOpen && (
                      <div className="mt-3">
                        <EntryForm
                          kind={kind}
                          ideas={ideas}
                          onCancel={() => setComposing(null)}
                          onSubmit={(value) => {
                            addEntry({ bookId: book.id, sessionId: session.id, kind, ...value });
                            setComposing(null);
                          }}
                        />
                      </div>
                    )}
                    <ul className="mt-4 flex flex-col gap-3">
                      {items.map((entry) => (
                        <li key={entry.id} className="rounded-lg bg-surface p-4 shadow-border">
                          {editing === entry.id ? (
                            <EntryForm
                              kind={entry.kind}
                              ideas={ideas}
                              initial={entry}
                              submitLabel="저장"
                              onCancel={() => setEditing(null)}
                              onSubmit={(value) => {
                                updateEntry(entry.id, value);
                                setEditing(null);
                              }}
                            />
                          ) : (
                            <>
                              <div className="flex items-start justify-between gap-3">
                                <h4 className="font-medium leading-snug">{entry.title}</h4>
                                <div className="flex shrink-0">
                                  <Button size="sm" variant="ghost" onClick={() => setEditing(entry.id)}>
                                    수정
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="size-9 text-muted hover:text-danger"
                                    onClick={() => removeEntry(entry.id)}
                                    aria-label="삭제"
                                  >
                                    <Trash2 className="size-4" />
                                  </Button>
                                </div>
                              </div>
                              <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-fg/90">
                                {entry.body}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {entry.tags.map((t) => (
                                  <Badge key={t}>{t}</Badge>
                                ))}
                                {entry.ideaIds.map((id) => {
                                  const idea = ideas.find((i) => i.id === id);
                                  if (!idea) return null;
                                  return (
                                    <Link
                                      key={id}
                                      to="/ideas/$ideaId"
                                      params={{ ideaId: id }}
                                      className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-accent"
                                    >
                                      {idea.title}
                                    </Link>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </li>
                      ))}
                      {items.length === 0 && !isOpen && (
                        <p className="text-sm text-subtle">아직 기록이 없습니다.</p>
                      )}
                    </ul>
                  </div>
                );
              })}
            </section>
          );
        })}
      </div>

      <div className="mt-16 flex justify-end">
        <Button
          variant="ghost"
          className="text-muted hover:text-danger"
          onClick={() => {
            if (confirm("이 책과 모든 회독 기록을 지울까요?")) {
              removeBook(book.id);
              void navigate({ to: "/" });
            }
          }}
        >
          책 삭제
        </Button>
      </div>

      <div
        aria-hidden
        className="no-print pointer-events-none"
        style={{ position: "fixed", left: -10000, top: 0, width: 800 }}
      >
        <div ref={pdfRef}>
          <PdfArticle book={book} sessions={sessions} entries={entries} ideas={ideas} />
        </div>
      </div>

      <Dialog open={passOpen} onOpenChange={setPassOpen}>
        <DialogContent>
          <DialogTitle>다시 읽기</DialogTitle>
          <DialogDescription>
            이전 {sessions.length}회독은 그대로 남습니다. 이번 회독의 초점만 적으면 됩니다.
          </DialogDescription>
          <form
            className="mt-5 grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              addSession({
                bookId: book.id,
                title: passTitle || `${sessions.length + 1}회독`,
                intent: passIntent,
              });
              setPassTitle("");
              setPassIntent("");
              setPassOpen(false);
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="pass-title">이번 회독의 제목</Label>
              <Input
                id="pass-title"
                value={passTitle}
                onChange={(e) => setPassTitle(e.target.value)}
                placeholder="예: 실행만 다시 본다"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pass-intent">의도</Label>
              <Textarea
                id="pass-intent"
                value={passIntent}
                onChange={(e) => setPassIntent(e.target.value)}
                placeholder="무엇을 확장하거나 검증하고 싶은가"
              />
            </div>
            <Button type="submit">회독 시작</Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
