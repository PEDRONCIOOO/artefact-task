import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { publicProcedure, router, createCallerFactory } from "./init";
import {
  createTaskInput,
  listTasksInput,
  updateTaskInput,
} from "../tasks/schema";
import { TaskNotFoundError, tasks } from "../tasks/store";

/**
 * Maps store-level errors to tRPC error codes so the client gets a
 * meaningful status (NOT_FOUND vs INTERNAL_SERVER_ERROR) and message.
 */
function mapError(e: unknown): never {
  if (e instanceof TaskNotFoundError) {
    throw new TRPCError({ code: "NOT_FOUND", message: e.message, cause: e });
  }
  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: "Unexpected error while handling the request",
    cause: e,
  });
}

export const appRouter = router({
  tasks: router({
    list: publicProcedure.input(listTasksInput).query(({ input }) => {
      return tasks.list({ cursor: input.cursor, limit: input.limit });
    }),

    byId: publicProcedure
      .input(z.object({ id: z.string().min(1) }))
      .query(({ input }) => {
        try {
          return tasks.get(input.id);
        } catch (e) {
          mapError(e);
        }
      }),

    create: publicProcedure.input(createTaskInput).mutation(({ input }) => {
      // Title presence/length is enforced by Zod before we get here (BAD_REQUEST).
      return tasks.create(input);
    }),

    update: publicProcedure.input(updateTaskInput).mutation(({ input }) => {
      try {
        return tasks.update(input);
      } catch (e) {
        mapError(e);
      }
    }),

    delete: publicProcedure
      .input(z.object({ id: z.string().min(1) }))
      .mutation(({ input }) => {
        try {
          return tasks.delete(input.id);
        } catch (e) {
          mapError(e);
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;

/** Server-side caller: lets Server Components call procedures without HTTP. */
export const createCaller = createCallerFactory(appRouter);
