import { createApp } from "./app";
import { router } from "./router";

const app = createApp(router);
const port = Number(process.env.PORT ?? 3000);

console.log(`API сервер запущено на http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
