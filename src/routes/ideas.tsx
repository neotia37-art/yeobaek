import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/ideas")({ component: IdeasLayout });

function IdeasLayout() {
  return <Outlet />;
}
