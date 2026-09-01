import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { BookCover } from "@/components/book-cover";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { allTags, bookSessions, useJournal } from "@/lib/store";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const navigate = useNavigate();
  const books = useJournal((s) => s.books);
  const sessions = useJournal((s) => s.sessions);
  const entries = useJournal((s) => s.entries);
  const ideas = useJournal((s) => s.ideas);
  const addBook = useJournal((s) => s.addBook);
  const state = useJournal();
  const tags = allTags(state);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [subtitle, setSubtitle] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return books.filter((book) => {
      const hay = `${book.title} ${book.author} ${book.subtitle ?? ""}`.toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (tag) {
        const bookTags = new Set(
          entries.filter((e) => e.bookId === book.id).flatMap((e) => e.tags),
        );
        if (!bookTags.has(tag)) return false;
      }
      return true;
    });
  }, [books, entries, query, tag]);

  return (
    <main>
      <section className="max-w-2xl">
        <p className="text-xs tracking-[0.25em] text-muted">독서 기록</p>
        <h1 className="mt-3 font-display text-4xl leading-tight font-medium sm:text-5xl">여백</h1>
        <p className="mt-4 max-w-xl text-base leading-relaxed text-muted">
          책의 내용, 나의 생각, 발전된 아이디어, 실행할 점을 나란히 쌓습니다. 같은 책을 다시 읽으면
          회독이 이어지고, 아이디어는 책과 책 사이를 건넙니다.
        </p>
      </section>

      <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "책", value: books.length },
          { label: "회독", value: sessions.length },
          { label: "아이디어", value: ideas.length },
          { label: "실행", value: entries.filter((e) => e.kind === "action").length },
        ].map((item) => (
          <div key={item.label} className="rounded-lg bg-surface px-4 py-3 shadow-border">
            <dt className="text-xs text-muted">{item.label}</dt>
            <dd className="mt-1 font-display text-2xl tabular-nums">{item.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="책 제목, 저자 검색"
          className="sm:max-w-xs"
          aria-label="검색"
        />
        <Button onClick={() => setOpen(true)}>
          <Plus />
          새 책
        </Button>
      </div>

      {tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTag(null)}
            className={`rounded-full px-3 py-1.5 text-xs ${tag === null ? "bg-primary text-primary-fg" : "bg-bg-elevated text-muted"}`}
          >
            전체
          </button>
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(t === tag ? null : t)}
              className={`rounded-full px-3 py-1.5 text-xs ${tag === t ? "bg-primary text-primary-fg" : "bg-bg-elevated text-muted"}`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((book) => {
          const passes = bookSessions(state, book.id);
          const count = entries.filter((e) => e.bookId === book.id).length;
          return (
            <li key={book.id}>
              <Link
                to="/books/$bookId"
                params={{ bookId: book.id }}
                className="group flex gap-4 rounded-xl bg-surface p-3 shadow-border transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 sm:block"
              >
                <BookCover
                  title={book.title}
                  author={book.author}
                  tone={book.coverTone}
                  className="w-24 shrink-0 sm:w-full"
                />
                <div className="flex min-w-0 flex-col justify-center px-1 py-1 sm:pt-4 sm:pb-2">
                  <p className="font-display text-lg leading-snug">{book.title}</p>
                  <p className="mt-1 text-sm text-muted">{book.author}</p>
                  <p className="mt-3 text-xs text-subtle">
                    {passes.length}회독 · {count}개 기록 · {formatDate(book.updatedAt)}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {filtered.length === 0 && (
        <p className="mt-16 text-center text-sm text-muted">해당하는 책이 없습니다.</p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>새 책</DialogTitle>
          <DialogDescription>서재에 책을 넣고, 첫 회독을 시작할 수 있습니다.</DialogDescription>
          <form
            className="mt-5 grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim()) return;
              const id = addBook({ title, author: author || "저자 미상", subtitle });
              useJournal.getState().addSession({
                bookId: id,
                title: "1회독",
                intent: "책의 내용을 붙잡고, 생각과 실행으로 옮긴다.",
              });
              setTitle("");
              setAuthor("");
              setSubtitle("");
              setOpen(false);
              void navigate({ to: "/books/$bookId", params: { bookId: id } });
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="book-title">제목</Label>
              <Input id="book-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="book-author">저자</Label>
              <Input id="book-author" value={author} onChange={(e) => setAuthor(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="book-sub">한 줄 (선택)</Label>
              <Input id="book-sub" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
            </div>
            <Button type="submit" className="mt-2">
              서재에 넣기
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
