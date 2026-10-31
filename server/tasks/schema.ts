import { z } from "zod";

/**
 * Zod schemas are the single source of truth for both runtime validation
 * (tRPC input) and static types (inferred below). Field names follow the
 * case statement: titulo, descricao, dataCriacao.
 */
export const taskSchema = z.object({
  id: z.string(),
  titulo: z.string(),
  descricao: z.string().optional(),
  dataCriacao: z.date(),
});

export const createTaskInput = z.object({
  titulo: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(120, "Title must be at most 120 characters"),
  descricao: z
    .string()
    .trim()
    .max(1000, "Description must be at most 1000 characters")
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

export const updateTaskInput = createTaskInput.partial().extend({
  id: z.string().min(1),
});

export const listTasksInput = z.object({
  cursor: z.string().nullish(), // id of the last item seen; null/undefined = first page
  limit: z.number().int().min(1).max(50).default(10),
});

export type Task = z.infer<typeof taskSchema>;
export type CreateTaskInput = z.infer<typeof createTaskInput>;
export type UpdateTaskInput = z.infer<typeof updateTaskInput>;
