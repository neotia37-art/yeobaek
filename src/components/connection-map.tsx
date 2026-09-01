import { useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import type { Book, Entry, Idea } from "@/lib/types";
import { cn } from "@/lib/utils";

type Node = { id: string; kind: "book" | "idea"; label: string; x: number; y: number };

export function ConnectionMap({
  books,
  ideas,
  entries,
}: {
  books: Book[];
  ideas: Idea[];
  entries: Entry[];
}) {
  const [hover, setHover] = useState<string | null>(null);
  const navigate = useNavigate();

  const { nodes, links, w, h } = useMemo(() => {
    const width = 920;
    const height = Math.max(420, 80 + Math.max(books.length, ideas.length) * 88);
    const bookNodes: Node[] = books.map((b, i) => ({
      id: b.id,
      kind: "book",
      label: b.title,
      x: 130,
      y: 70 + i * Math.max(88, (height - 120) / Math.max(books.length, 1)),
    }));
    const ideaNodes: Node[] = ideas.map((idea, i) => ({
      id: idea.id,
      kind: "idea",
      label: idea.title,
      x: width - 160,
      y: 70 + i * Math.max(72, (height - 120) / Math.max(ideas.length, 1)),
    }));
    const edgeSet = new Map<string, { from: string; to: string }>();
    for (const entry of entries) {
      for (const ideaId of entry.ideaIds) {
        const key = `${entry.bookId}->${ideaId}`;
        if (!edgeSet.has(key)) edgeSet.set(key, { from: entry.bookId, to: ideaId });
      }
    }
    return {
      nodes: [...bookNodes, ...ideaNodes],
      links: [...edgeSet.values()],
      w: width,
      h: height,
    };
  }, [books, ideas, entries]);

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const activeIds = new Set<string>();
  if (hover) {
    activeIds.add(hover);
    for (const link of links) {
      if (link.from === hover || link.to === hover) {
        activeIds.add(link.from);
        activeIds.add(link.to);
      }
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-surface shadow-border">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-auto min-h-80 w-full min-w-[640px] text-border-strong"
        role="img"
        aria-label="책과 아이디어의 연결 지도"
      >
        {links.map((link) => {
          const a = nodeMap.get(link.from);
          const b = nodeMap.get(link.to);
          if (!a || !b) return null;
          const dim = hover ? !activeIds.has(link.from) || !activeIds.has(link.to) : false;
          const midX = (a.x + b.x) / 2;
          return (
            <path
              key={`${link.from}-${link.to}`}
              d={`M ${a.x + 70} ${a.y} C ${midX} ${a.y}, ${midX} ${b.y}, ${b.x - 70} ${b.y}`}
              fill="none"
              stroke="currentColor"
              className={cn(dim && "opacity-20")}
              strokeWidth={1.4}
            />
          );
        })}
        {nodes.map((node) => {
          const dim = hover ? !activeIds.has(node.id) : false;
          return (
            <g
              key={node.id}
              className={cn("cursor-pointer", dim && "opacity-30")}
              onMouseEnter={() => setHover(node.id)}
              onMouseLeave={() => setHover(null)}
              onClick={() => {
                if (node.kind === "book") {
                  void navigate({ to: "/books/$bookId", params: { bookId: node.id } });
                } else {
                  void navigate({ to: "/ideas/$ideaId", params: { ideaId: node.id } });
                }
              }}
            >
              <title>{node.label}</title>
              <rect
                x={node.x - 70}
                y={node.y - 22}
                width={140}
                height={44}
                rx={node.kind === "idea" ? 22 : 8}
                fill={node.kind === "book" ? "var(--color-primary)" : "var(--color-bg-elevated)"}
                stroke={node.kind === "idea" ? "var(--color-border-strong)" : "none"}
              />
              <text
                x={node.x}
                y={node.y + 4}
                textAnchor="middle"
                fill={node.kind === "book" ? "var(--color-primary-fg)" : "var(--color-fg)"}
                fontSize={12}
                fontFamily="Noto Sans KR, sans-serif"
              >
                {node.label.length > 12 ? `${node.label.slice(0, 12)}…` : node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
