import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty">
      <h1>Task not found</h1>
      <p className="muted">It may have been deleted. The store is in-memory, so a server restart also clears it.</p>
      <Link href="/" className="btn btn-primary">Back to list</Link>
    </div>
  );
}
