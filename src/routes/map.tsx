import { createFileRoute } from "@tanstack/react-router";
import { ConnectionMap } from "@/components/connection-map";
import { ideaBooks, useJournal } from "@/lib/store";

export const Route = createFileRoute("/map")({ component: MapPage });

function MapPage() {
  const books = useJournal((s) => s.books);
  const ideas = useJournal((s) => s.ideas);
  const entries = useJournal((s) => s.entries);
  const state = useJournal();

  return (
    <main>
      <div className="max-w-xl">
        <p className="text-xs tracking-[0.25em] text-muted">책과 생각</p>
        <h1 className="mt-3 font-display text-4xl">연결</h1>
        <p className="mt-3 text-muted">
          왼쪽은 책, 오른쪽은 아이디어입니다. 선을 따라가면 같은 생각이 어느 권에서 되풀이되는지
          보입니다.
        </p>
      </div>

      <div className="mt-8">
        <ConnectionMap books={books} ideas={ideas} entries={entries} />
      </div>

      <ul className="mt-10 grid gap-4 md:grid-cols-2">
        {ideas.map((idea) => {
          const linked = ideaBooks(state, idea.id);
          return (
            <li key={idea.id} className="rounded-lg bg-surface p-4 shadow-border">
              <p className="font-display text-lg">{idea.title}</p>
              <p className="mt-2 text-sm text-muted">
                {linked.length === 0
                  ? "아직 책에 연결되지 않았습니다."
                  : linked.map((b) => b.title).join(" · ")}
              </p>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
