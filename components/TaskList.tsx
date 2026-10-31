"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { useTRPC } from "@/lib/trpc/client";
import { useToast } from "@/components/Toast";
import type { Task } from "@/server/tasks/schema";

type Page = { items: Task[]; nextCursor: string | null };

/**
 * Client half of the list page.
 * - Seeded with the SSR page so there's no second fetch on mount.
 * - Infinite scroll via IntersectionObserver on a sentinel div (bonus).
 * - Delete with optimistic-free, explicit success/error feedback; the list is
 *   invalidated after the mutation so the server stays the source of truth.
 */
export function TaskList({ initialPage, pageSize }: { initialPage: Page; pageSize: number }) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const toast = useToast();

  const listOpts = trpc.tasks.list.infiniteQueryOptions(
    { limit: pageSize },
    {
      getNextPageParam: (last) => last.nextCursor ?? undefined,
      initialData: { pages: [initialPage], pageParams: [null] },
      initialDataUpdatedAt: Date.now(),
    },
  );
  const query = useInfiniteQuery(listOpts);

  const del = useMutation(
    trpc.tasks.delete.mutationOptions({
      onSuccess: async () => {
        toast.success("Task deleted");
        await qc.invalidateQueries({ queryKey: trpc.tasks.list.infiniteQueryKey() });
      },
      onError: (e) => toast.error(e.message || "Could not delete task"),
    }),
  );

  // Infinite scroll: when the sentinel enters the viewport, fetch the next page.
  const sentinel = useRef<HTMLDivElement | null>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  if (query.isError) {
    return (
      <div className="empty">
        <p className="error">Failed to load tasks: {query.error.message}</p>
        <button className="btn" onClick={() => query.refetch()}>Retry</button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="empty">
        <p>No tasks yet.</p>
        <Link href="/tasks/new" className="btn btn-primary">Create the first one</Link>
      </div>
    );
  }

  return (
    <>
      {items.map((t) => (
        <article key={t.id} className="card">
          <div>
            <h3>{t.titulo}</h3>
            {t.descricao && <p>{t.descricao}</p>}
            <span className="muted">
              Created {t.dataCriacao.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
            </span>
          </div>
          <div className="actions">
            <Link href={`/tasks/${t.id}/edit`} className="btn">Edit</Link>
            <button
              className="btn btn-danger"
              disabled={del.isPending && del.variables?.id === t.id}
              onClick={() => del.mutate({ id: t.id })}
            >
              {del.isPending && del.variables?.id === t.id ? "Deleting…" : "Delete"}
            </button>
          </div>
        </article>
      ))}

      <div ref={sentinel} className="sentinel" />
      {query.isFetchingNextPage && <div className="loader">Loading more…</div>}
      {!query.hasNextPage && items.length >= pageSize && (
        <div className="loader">All {items.length} tasks loaded.</div>
      )}
    </>
  );
}
