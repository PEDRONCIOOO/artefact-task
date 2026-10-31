# Tasks — Next.js 15 + tRPC

A deliberately small task manager: in-memory store, tRPC API, server-rendered list, create/edit form with validation, infinite scroll. Built for the Artefact written case (Part 2).

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

```bash
npm run build && npm start   # production
npm run lint
```

Node 20+. No database, no env vars. The store is seeded with five fictitious tasks on first access; restarting the server resets it.

## How it works

```
app/
  page.tsx                   SSR list (Server Component → direct tRPC caller)
  tasks/new/page.tsx         create form
  tasks/[id]/edit/page.tsx   SSR edit form (404 if the task is gone)
  api/trpc/[trpc]/route.ts   HTTP transport for client components
components/
  TaskList.tsx               client: infinite scroll + delete with feedback
  TaskForm.tsx               client: create/edit, Zod validation, field errors
  Toast.tsx                  success/error toasts (no library)
server/
  tasks/schema.ts            Zod schemas = runtime validation + TS types
  tasks/store.ts             in-memory Map store, cursor pagination
  trpc/init.ts               tRPC setup, superjson, Zod error formatter
  trpc/router.ts             procedures: list, byId, create, update, delete
lib/trpc/
  server.ts                  server caller (no HTTP) for Server Components
  client.tsx                 TanStack Query + tRPC provider for the browser
```

**Request flow, list page:** `page.tsx` (server) calls `api.tasks.list()` directly — no fetch, no serialization — and renders the first 10 tasks into HTML. `TaskList` (client) receives that page as `initialData`, so there is no second request on mount. Scrolling to the sentinel fetches the next page over HTTP via `/api/trpc`. Delete invalidates the list query; the server stays the source of truth.

**Request flow, form:** the form validates with the same Zod schema the server uses (`createTaskInput`), so a bad title never leaves the browser. If something does reach the server and fails, the custom `errorFormatter` returns `fieldErrors`, and the form maps them back onto the fields. Success → toast → `router.push("/")` + `router.refresh()` so the SSR list is re-rendered.

## Decisions

- **tRPC v11 + TanStack Query v5**, the current recommended integration (`@trpc/tanstack-react-query`). Server Components use a direct caller; client components go over HTTP. One router, two transports.
- **superjson** as transformer so `dataCriacao` is a real `Date` on both sides.
- **Zod schemas as the single source of truth.** `createTaskInput` drives: client validation, server validation, TS types, and error messages. `updateTaskInput = createTaskInput.partial() + id`.
- **Store errors ≠ transport errors.** The store throws `TaskNotFoundError`; the router maps it to `TRPCError NOT_FOUND`. The store knows nothing about tRPC, which keeps it trivially testable and swappable for a database.
- **Cursor pagination by id** instead of offset: stable under concurrent deletes, and a deleted cursor falls back to page 1 rather than erroring.
- **`globalThis` for the store** so Next.js dev-mode HMR doesn't wipe it on every edit.
- **`force-dynamic` on `/` and `/tasks/[id]/edit`.** The list changes on every mutation; it must never be statically cached.
- **No UI library.** ~120 lines of CSS. The case said "less is more".
- **Infinite scroll with `IntersectionObserver`** on a 1px sentinel, `rootMargin: 200px` so the next page loads before the user hits the bottom.

## What I'd add with more time

Tests (Vitest for the store and router via `createCaller`, Playwright for the two pages), optimistic delete, a real database behind the same `tasks` interface, and `protectedProcedure` middleware once there are users.

## Error handling checklist (from the case)

| Requirement | Where |
|---|---|
| Task cannot be created without a title | `createTaskInput` (`min(1)` after `trim`) — client and server |
| Meaningful error on update of a missing task | `TaskNotFoundError` → `NOT_FOUND` with message `Task "<id>" was not found` |
| Delete feedback | Toast success/error in `TaskList` |
| Loading / success / failure states | Button disabled + label change while pending; toasts; inline field errors; retry button if the list fails to load |
| Edit a deleted task | Server-side 404 page |

---

All data is fictitious. No secrets, tokens or personal data in this repository.
