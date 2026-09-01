import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { EntryKind, Idea } from "@/lib/types";
import { KIND_META } from "@/lib/types";
import { cn } from "@/lib/utils";

export function EntryForm({
  kind,
  ideas,
  initial,
  submitLabel = "기록",
  onSubmit,
  onCancel,
}: {
  kind: EntryKind;
  ideas: Idea[];
  initial?: { title: string; body: string; tags: string[]; ideaIds: string[] };
  submitLabel?: string;
  onSubmit: (value: { title: string; body: string; tags: string[]; ideaIds: string[] }) => void;
  onCancel?: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [ideaIds, setIdeaIds] = useState<string[]>(initial?.ideaIds ?? []);
  const meta = KIND_META[kind];

  return (
    <form
      className="flex flex-col gap-3 rounded-lg bg-bg-elevated p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim() || !body.trim()) return;
        onSubmit({
          title,
          body,
          tags: tags.split(/[,#]/).map((t) => t.trim()).filter(Boolean),
          ideaIds,
        });
      }}
    >
      <p className="text-xs text-muted">{meta.hint}</p>
      <div className="grid gap-1.5">
        <Label htmlFor={`title-${kind}`}>제목</Label>
        <Input
          id={`title-${kind}`}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="한 줄로"
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`body-${kind}`}>본문</Label>
        <Textarea
          id={`body-${kind}`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={meta.hint}
          required
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`tags-${kind}`}>태그</Label>
        <Input
          id={`tags-${kind}`}
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="쉼표로 구분"
        />
      </div>
      {ideas.length > 0 && (
        <div className="grid gap-2">
          <Label>연결할 아이디어</Label>
          <div className="flex flex-wrap gap-2">
            {ideas.map((idea) => {
              const on = ideaIds.includes(idea.id);
              return (
                <button
                  key={idea.id}
                  type="button"
                  onClick={() =>
                    setIdeaIds((prev) =>
                      on ? prev.filter((id) => id !== idea.id) : [...prev, idea.id],
                    )
                  }
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs",
                    on ? "bg-primary text-primary-fg" : "bg-surface text-muted shadow-border",
                  )}
                >
                  {idea.title}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            취소
          </Button>
        )}
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
