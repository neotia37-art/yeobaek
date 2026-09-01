import { KIND_META, type Book, type Entry, type Idea, type Session } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function PdfArticle({
  book,
  sessions,
  entries,
  ideas,
}: {
  book: Book;
  sessions: Session[];
  entries: Entry[];
  ideas: Idea[];
}) {
  const ideaMap = new Map(ideas.map((i) => [i.id, i]));
  return (
    <article className="bg-surface px-12 py-14 text-fg" style={{ width: 800 }}>
      <p className="font-display text-sm tracking-[0.2em] text-muted">여백</p>
      <h1 className="mt-6 font-display text-4xl leading-tight font-medium">{book.title}</h1>
      <p className="mt-3 text-base text-muted">{book.author}</p>
      {book.subtitle && <p className="mt-1 text-sm text-subtle">{book.subtitle}</p>}
      <p className="mt-8 text-sm text-subtle">
        {sessions.length}회독 · {entries.length}개 기록 · {formatDate(book.updatedAt)} 기준
      </p>
      <div className="mt-10 h-px bg-border-strong" />

      {sessions.map((session) => (
        <section key={session.id} className="mt-12">
          <p className="text-xs tracking-wide text-subtle">
            {session.passNumber}회독
            {session.source === "conversation" ? " · 대화에서 정리" : ""}
          </p>
          <h2 className="mt-2 font-display text-2xl font-medium">{session.title}</h2>
          {session.intent && <p className="mt-2 text-sm leading-relaxed text-muted">{session.intent}</p>}
          {(Object.keys(KIND_META) as Array<keyof typeof KIND_META>).map((kind) => {
            const group = entries.filter((e) => e.sessionId === session.id && e.kind === kind);
            if (!group.length) return null;
            return (
              <div key={kind} className="mt-8">
                <h3 className="font-display text-lg">{KIND_META[kind].label}</h3>
                <div className="mt-4 flex flex-col gap-6">
                  {group.map((entry) => (
                    <div key={entry.id}>
                      <p className="font-medium">{entry.title}</p>
                      <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{entry.body}</p>
                      {entry.tags.length > 0 && (
                        <p className="mt-2 text-xs text-subtle">{entry.tags.map((t) => `#${t}`).join("  ")}</p>
                      )}
                      {entry.ideaIds.length > 0 && (
                        <p className="mt-1 text-xs text-muted">
                          연결:{" "}
                          {entry.ideaIds
                            .map((id) => ideaMap.get(id)?.title)
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </article>
  );
}
