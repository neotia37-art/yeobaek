import type { CoverTone } from "@/lib/types";
import { cn } from "@/lib/utils";

const TONES: Record<CoverTone, string> = {
  0: "bg-cover-0",
  1: "bg-cover-1",
  2: "bg-cover-2",
  3: "bg-cover-3",
  4: "bg-cover-4",
};

export function BookCover({
  title,
  author,
  tone,
  className,
}: {
  title: string;
  author: string;
  tone: CoverTone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex aspect-[3/4] flex-col justify-between overflow-hidden rounded-md p-4 text-primary-fg",
        TONES[tone],
        className,
      )}
    >
      <div className="absolute inset-y-0 left-3 w-px bg-primary-fg/25" />
      <p className="font-display text-xs tracking-wide text-primary-fg/70">{author}</p>
      <h3 className="font-display text-lg leading-snug font-medium tracking-tight text-balance">
        {title}
      </h3>
    </div>
  );
}
