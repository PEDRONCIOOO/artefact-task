"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useTRPC } from "@/lib/trpc/client";
import { useToast } from "@/components/Toast";
import { createTaskInput } from "@/server/tasks/schema";
import type { Task } from "@/server/tasks/schema";

type FieldErrors = Partial<Record<"titulo" | "descricao", string>>;

/**
 * One form for create and edit (mode decided by the presence of `task`).
 * - Client-side validation reuses the SAME Zod schema the server uses, so
 *   messages match and nothing can pass the client that the server rejects.
 * - Server-side Zod errors (if any slip through) are mapped back to fields via
 *   the custom errorFormatter in server/trpc/init.ts.
 * - Submit is disabled while pending; errors are shown inline + toast.
 */
export function TaskForm({ task }: { task?: Task }) {
  const trpc = useTRPC();
  const qc = useQueryClient();
  const router = useRouter();
  const toast = useToast();

  const [titulo, setTitulo] = useState(task?.titulo ?? "");
  const [descricao, setDescricao] = useState(task?.descricao ?? "");
  const [errors, setErrors] = useState<FieldErrors>({});

  const onDone = async (msg: string) => {
    toast.success(msg);
    await qc.invalidateQueries({ queryKey: trpc.tasks.list.infiniteQueryKey() });
    router.push("/");
    router.refresh(); // re-run the SSR list so it reflects the change immediately
  };

  const onError = (e: { message: string; data?: { fieldErrors?: Record<string, string[]> | null } | null }) => {
    const fe = e.data?.fieldErrors;
    if (fe) {
      setErrors({ titulo: fe.titulo?.[0], descricao: fe.descricao?.[0] });
    }
    toast.error(e.message || "Something went wrong");
  };

  const create = useMutation(
    trpc.tasks.create.mutationOptions({ onSuccess: () => onDone("Task created"), onError }),
  );
  const update = useMutation(
    trpc.tasks.update.mutationOptions({ onSuccess: () => onDone("Task updated"), onError }),
  );
  const pending = create.isPending || update.isPending;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});

    const parsed = createTaskInput.safeParse({ titulo, descricao });
    if (!parsed.success) {
      const fe = parsed.error.flatten().fieldErrors;
      setErrors({ titulo: fe.titulo?.[0], descricao: fe.descricao?.[0] });
      return;
    }

    if (task) {
      update.mutate({ id: task.id, ...parsed.data });
    } else {
      create.mutate(parsed.data);
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit} noValidate aria-busy={pending}>
      <div className="field">
        <label htmlFor="titulo">Title <span aria-hidden="true">*</span></label>
        <input
          id="titulo"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          aria-invalid={!!errors.titulo}
          aria-describedby={errors.titulo ? "titulo-error" : undefined}
          placeholder="What needs to be done?"
          required
          aria-required="true"
          autoFocus
        />
        {errors.titulo && <p id="titulo-error" className="error">{errors.titulo}</p>}
      </div>

      <div className="field">
        <label htmlFor="descricao">Description</label>
        <textarea
          id="descricao"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          aria-invalid={!!errors.descricao}
          aria-describedby={errors.descricao ? "descricao-error" : undefined}
          placeholder="Optional details"
        />
        {errors.descricao && <p id="descricao-error" className="error">{errors.descricao}</p>}
      </div>

      <div className="form-actions">
        <button type="button" className="btn" onClick={() => router.push("/")} disabled={pending}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Saving…" : task ? "Save changes" : "Create task"}
        </button>
      </div>
    </form>
  );
}
