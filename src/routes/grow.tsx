import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/grow")({
  component: GrowLayout,
});

function GrowLayout() {
  return <Outlet />;
}
