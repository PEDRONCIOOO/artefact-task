import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";
import { api } from "@/lib/trpc/server";
import { TaskForm } from "@/components/TaskForm";

export const dynamic = "force-dynamic";

/**
 * SSR edit page: loads the task on the server so the form is pre-filled in the
 * initial HTML. A missing task becomes a proper 404 instead of a client error.
 */
export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let task;
  try {
    task = await api.tasks.byId({ id });
  } catch (e) {
    if (e instanceof TRPCError && e.code === "NOT_FOUND") notFound();
    throw e;
  }

  return (
    <>
      <h1>Edit task</h1>
      <TaskForm task={task} />
    </>
  );
}
