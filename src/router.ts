import type { RouterClient } from "@orpc/server";
import { recommend } from "./routes/recommend";

// Кожна функціональна область API — окремий файл у ./routes/,
// зібраний тут у єдиний маршрутизатор (типізований на всьому шляху).
export const router = {
  recommend,
};

export type AppRouter = typeof router;
export type AppRouterClient = RouterClient<AppRouter>;
