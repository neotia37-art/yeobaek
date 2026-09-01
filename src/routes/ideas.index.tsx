import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
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
import { ideaBooks, ideaEntries, useJournal } from "@/lib/store";

export const Route = createFileRoute("/ideas/")({ component: IdeasPage });

function IdeasPage() {
  const ideas = useJournal((s) => s.ideas);
  const addIdea = useJournal((s) => s.addIdea);
  const state = useJournal();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");

  return (
    <main>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-xl">
          <p className="text-xs tracking-[0.25em] text-muted">생각의 실</p>
          <h1 className="mt-3 font-display text-4xl">아이디어</h1>
          <p className="mt-3 text-muted">
            책 이름 아래가 아니라, 생각이 모이는 자리입니다. 여러 권, 여러 회독이 하나의 아이디어로
            이어집니다.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus />
          새 아이디어
        </Button>
      </div>

      <ul className="mt-10 grid gap-4 md:grid-cols-2">
        {ideas.map((idea) => {
          const books = ideaBooks(state, idea.id);
          const count = ideaEntries(state, idea.id).length;
          return (
            <li key={idea.id}>
              <Link
                to="/ideas/$ideaId"
                params={{ ideaId: idea.id }}
                className="block rounded-xl bg-surface p-5 shadow-border transition-transform duration-150 hover:-translate-y-0.5"
              >
                <h2 className="font-display text-2xl">{idea.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{idea.summary}</p>
                <p className="mt-4 text-xs text-subtle">
                  {books.length}권 · {count}개 기록
                  {books.length > 0 ? ` · ${books.map((b) => b.title).join(" · ")}` : ""}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>

      {ideas.length === 0 && (
        <p className="mt-16 text-center text-sm text-muted">아직 아이디어가 없습니다.</p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogTitle>새 아이디어</DialogTitle>
          <DialogDescription>여러 책에 걸쳐 추적하고 싶은 한 가지.</DialogDescription>
          <form
            className="mt-5 grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!title.trim()) return;
              addIdea({ title, summary });
              setTitle("");
              setSummary("");
              setOpen(false);
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="idea-title">이름</Label>
              <Input id="idea-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="idea-sum">요약</Label>
              <Textarea id="idea-sum" value={summary} onChange={(e) => setSummary(e.target.value)} />
            </div>
            <Button type="submit">만들기</Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
