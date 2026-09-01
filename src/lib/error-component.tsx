import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bg px-6 text-center text-fg">
      <span className="text-danger" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="font-display text-lg font-medium">문제가 생겼습니다</h1>
      <p className="max-w-md text-sm break-words text-muted">
        {error.message || "예상하지 못한 오류입니다. 페이지를 새로고침해 보세요."}
      </p>
    </main>
  );
}
