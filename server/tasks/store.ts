import { randomUUID } from "node:crypto";
import type { CreateTaskInput, Task, UpdateTaskInput } from "./schema";

/**
 * In-memory task store.
 *
 * Decisions:
 * - A Map keyed by id gives O(1) get/update/delete.
 * - Insertion order is preserved by Map, so "newest first" is just a reversed
 *   iteration — no sorting on every list call.
 * - The store lives in `globalThis` so Next.js dev-mode hot reloads don't wipe
 *   it; in production a single module instance would suffice.
 * - Errors are plain Error subclasses here; the tRPC layer maps them to
 *   proper TRPCError codes. The store knows nothing about HTTP or tRPC.
 */

export class TaskNotFoundError extends Error {
  constructor(id: string) {
    super(`Task "${id}" was not found`);
    this.name = "TaskNotFoundError";
  }
}

type Store = Map<string, Task>;

const globalForStore = globalThis as unknown as { __taskStore?: Store };

function store(): Store {
  if (!globalForStore.__taskStore) {
    globalForStore.__taskStore = seed();
  }
  return globalForStore.__taskStore;
}

/** A few fictitious tasks so the list page isn't empty on first load. */
function seed(): Store {
  const m: Store = new Map();
  const now = Date.now();
  const samples: Array<[string, string | undefined]> = [
    ["Read the case brief", "Part 1 theory, Part 2 Next.js + tRPC CRUD"],
    ["Set up tRPC router", "In-memory store, Zod validation, typed errors"],
    ["Build the list page with SSR", undefined],
    ["Build create / edit form", "Functional components + hooks, client validation"],
    ["Write the README", "How it works, how to run, decisions"],
  ];
  samples.forEach(([titulo, descricao], i) => {
    const id = randomUUID();
    m.set(id, {
      id,
      titulo,
      descricao,
      // staggered timestamps so ordering is visible
      dataCriacao: new Date(now - (samples.length - i) * 60_000),
    });
  });
  return m;
}

export const tasks = {
  /** Newest first, cursor-paginated by id. */
  list(opts: { cursor?: string | null; limit: number }): {
    items: Task[];
    nextCursor: string | null;
  } {
    const all = Array.from(store().values()).reverse();
    let start = 0;
    if (opts.cursor) {
      const idx = all.findIndex((t) => t.id === opts.cursor);
      // If the cursor task was deleted meanwhile, fall back to the first page
      // rather than throwing — a deleted cursor is a normal race, not an error.
      start = idx === -1 ? 0 : idx + 1;
    }
    const items = all.slice(start, start + opts.limit);
    const last = items[items.length - 1];
    const hasMore = start + opts.limit < all.length;
    return { items, nextCursor: hasMore && last ? last.id : null };
  },

  get(id: string): Task {
    const t = store().get(id);
    if (!t) throw new TaskNotFoundError(id);
    return t;
  },

  create(input: CreateTaskInput): Task {
    const task: Task = {
      id: randomUUID(),
      titulo: input.titulo,
      descricao: input.descricao,
      dataCriacao: new Date(),
    };
    store().set(task.id, task);
    return task;
  },

  update(input: UpdateTaskInput): Task {
    const current = tasks.get(input.id); // throws TaskNotFoundError
    const next: Task = {
      ...current,
      ...(input.titulo !== undefined ? { titulo: input.titulo } : {}),
      ...(input.descricao !== undefined ? { descricao: input.descricao } : {}),
    };
    store().set(next.id, next);
    return next;
  },

  delete(id: string): { id: string } {
    if (!store().delete(id)) throw new TaskNotFoundError(id);
    return { id };
  },

  count(): number {
    return store().size;
  },
};
