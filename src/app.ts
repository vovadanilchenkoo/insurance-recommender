import { Hono } from "hono";
import { cors } from "hono/cors";
import { os, type Router } from "@orpc/server";
import { RPCHandler } from "@orpc/server/fetch";

/**
 * Складання HTTP-застосунку.
 *
 * oRPC — прошарок API: процедури визначаються у ./router.ts і обслуговуються
 * за шляхом /api/rpc/*. Hono використовується лише як HTTP-обгортка
 * (CORS, health-check, монтування RPC-обробника).
 */

/** Контекст, доступний у кожній процедурі через `context`. */
export interface RpcContext {
  headers: Headers;
}

/** Базовий будівельник процедур — від нього викликаються .input()/.handler(). */
export const base = os.$context<RpcContext>();

/** Формує HTTP-застосунок: CORS → /api/health → oRPC-процедури на /api/rpc/*. */
export function createApp(router: Router<Record<never, never>, RpcContext>) {
  const app = new Hono().use(
    cors({
      origin: (origin) => origin ?? "*",
      credentials: true,
    }),
  );

  app.get("/api/health", (c) => c.json({ status: "ok" }, 200));

  const handler = new RPCHandler(router);
  app.use("/api/rpc/*", async (c, next) => {
    const { matched, response } = await handler.handle(c.req.raw, {
      prefix: "/api/rpc",
      context: { headers: c.req.raw.headers },
    });
    if (matched) return c.newResponse(response.body, response);
    await next();
  });

  return app;
}
