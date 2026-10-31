import "server-only";
import { createCaller } from "@/server/trpc/router";

/**
 * Direct caller for Server Components (SSR). No HTTP round-trip, no
 * serialization — the page calls the procedure like a function.
 */
export const api = createCaller({});
