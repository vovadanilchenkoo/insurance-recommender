// Підключення до БД. Визначення таблиць — у ./schema.ts.
// Локальна файлова SQLite-база (через нативний драйвер Bun) — без залежності
// від будь-якого хмарного постачальника; підходить для прототипу/дослідження.
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import * as schema from "./schema";

const DB_PATH = process.env.DATABASE_URL ?? "./local.db";

const sqlite = new Database(DB_PATH);
sqlite.exec("PRAGMA journal_mode = WAL;");

export const db = drizzle(sqlite, { schema });
