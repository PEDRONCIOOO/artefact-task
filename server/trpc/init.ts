import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";

/**
 * tRPC initialisation.
 * - superjson so Date survives the wire (dataCriacao stays a Date on the client).
 * - errorFormatter flattens Zod issues into `data.fieldErrors` so the form can
 *   show per-field messages coming from the server, not just a generic toast.
 */
const t = initTRPC.create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const zod = error.cause instanceof ZodError ? error.cause.flatten() : null;
    return {
      ...shape,
      data: {
        ...shape.data,
        fieldErrors: zod?.fieldErrors ?? null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
