import { createFileRoute, Outlet } from "@tanstack/react-router";
import { NotFoundComponent } from "./__root";

export const Route = createFileRoute("/grow")({
  component: GrowLayout,
  notFoundComponent: NotFoundComponent,
});

function GrowLayout() {
  return <Outlet />;
}
