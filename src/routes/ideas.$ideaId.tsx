import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ideaBooks, ideaEntries, useJournal } from "@/lib/store";
import { KIND_META } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/ideas/$ideaId")({ component: IdeaPage });

function IdeaPage() {
  const { ideaId } = Route.useParams();
  const navigate = useNavigate();
  const idea = useJournal((s) => s.ideas.find((i) => i.id === ideaId));
  const removeIdea = useJournal((s) => s.removeIdea);
  const state = useJournal();
  const books = idea ? ideaBooks(state, idea.id) : [];
  const entries = idea ? ideaEntries(state, idea.id) : [];

  if (!idea) {
    return (
      <main className="py-20 text-center">
        <p className="text-muted">아이디어를 찾지 못했습니다.</p>
        <Link to="/ideas" className="mt-4 inline-block text-sm underline">
          목록으로
        </Link>
      </main>
    );
  }

  return (
    <main>
      <Link
        to="/ideas"
        className="inline-flex h-11 items-center gap-2 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" />
        아이디어
      </Link>
      <header className="mt-6 max-w-2xl">
        <h1 className="font-display text-4xl">{idea.title}</h1>
        <p className="mt-3 text-base leading-relaxed text-muted">{idea.summary}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {idea.tags.map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
      </header>

      <section className="mt-10">
        <h2 className="font-display text-lg">연결된 책</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {books.map((book) => (
            <li key={book.id}>
              <Link
                to="/books/$bookId"
                params={{ bookId: book.id }}
                className="text-sm text-accent underline-offset-4 hover:underline"
              >
                {book.title}
                <span className="text-muted"> · {book.author}</span>
              </Link>
            </li>
          ))}
          {books.length === 0 && <p className="text-sm text-subtle">아직 연결된 책이 없습니다.</p>}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg">누적 기록</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {entries.map((entry) => {
            const book = state.books.find((b) => b.id === entry.bookId);
            return (
              <li key={entry.id} className="rounded-lg bg-surface p-4 shadow-border">
                <p className="text-xs text-subtle">
                  {KIND_META[entry.kind].label} · {book?.title} · {formatDate(entry.createdAt)}
                </p>
                <h3 className="mt-1 font-medium">{entry.title}</h3>
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{entry.body}</p>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-12">
        <Button
          variant="ghost"
          className="text-muted hover:text-danger"
          onClick={() => {
            if (confirm("이 아이디어를 지울까요? 기록 본문은 남습니다.")) {
              removeIdea(idea.id);
              void navigate({ to: "/ideas" });
            }
          }}
        >
          <Trash2 className="size-4" />
          아이디어 삭제
        </Button>
      </div>
    </main>
  );
}
