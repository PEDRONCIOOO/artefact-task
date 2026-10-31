import { api } from "@/lib/trpc/server";
import { TaskList } from "@/components/TaskList";

/**
 * SSR: this Server Component calls the tRPC procedure directly (no HTTP) and
 * passes the first page as initial data. The HTML arrives with tasks already
 * rendered; the client component then takes over for delete + infinite scroll.
 *
 * force-dynamic: the list changes on every mutation, so it must never be
 * cached as static output.
 */
export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function HomePage() {
  const firstPage = await api.tasks.list({ limit: PAGE_SIZE });

  return (
    <>
      <h1>Tasks</h1>
      <p className="muted">
        Rendered on the server, then hydrated. Scroll down to load more.
      </p>
      <TaskList initialPage={firstPage} pageSize={PAGE_SIZE} />
    </>
  );
}
