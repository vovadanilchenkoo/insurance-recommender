/**
 * Навантажувальний бенчмарк рекомендаційного алгоритму (не мережевий —
 * вимірює час виконання чистої функції recommend() на реальному
 * каталозі, завантаженому з БД). Виводить p50/p95/p99, а також
 * поведінку алгоритму при зростанні розміру каталогу (масштабованість).
 *
 * Запуск: bun run tests/benchmark.ts
 */
import { db } from "../src/db/client";
import * as schema from "../src/db/schema";
import { recommend, type InsuranceProductInput, type UserProfile } from "../src/lib/recommendation";

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, idx))];
}

function randomProfile(regions: string[]): UserProfile {
  const types = ["ambulatory", "stationary", "complex", "dental", "maternity"] as const;
  return {
    age: Math.floor(Math.random() * 80) + 1,
    region: regions[Math.floor(Math.random() * regions.length)],
    requiredProgramType: types[Math.floor(Math.random() * types.length)],
    maxBudget: Math.floor(Math.random() * 30000) + 2000,
    minCoverageLimit: Math.random() > 0.5 ? Math.floor(Math.random() * 100000) : undefined,
    specialNeeds: Math.random() > 0.7 ? ["хронічні захворювання"] : undefined,
  };
}

function expandCatalog(base: InsuranceProductInput[], factor: number): InsuranceProductInput[] {
  const out: InsuranceProductInput[] = [];
  for (let i = 0; i < factor; i++) {
    for (const p of base) {
      out.push({ ...p, id: p.id + i * base.length });
    }
  }
  return out;
}

async function main() {
  const rows = await db.select().from(schema.insuranceProducts);
  const catalog: InsuranceProductInput[] = rows.map((r) => ({
    id: r.id,
    company: r.company,
    productName: r.productName,
    programType: r.programType,
    minAge: r.minAge,
    maxAge: r.maxAge,
    annualPrice: r.annualPrice,
    coverageLimit: r.coverageLimit,
    deductible: r.deductible,
    networkSizeScore: r.networkSizeScore,
    regions: JSON.parse(r.regions) as string[],
    exclusions: JSON.parse(r.exclusions) as string[],
    waitingPeriodDays: r.waitingPeriodDays,
    isActive: r.isActive,
  }));

  const regions = Array.from(new Set(catalog.flatMap((p) => p.regions)));
  const N_REQUESTS = 5000;

  console.log(`\n=== Бенчмарк 1: латентність на реальному каталозі (n=${catalog.length} продуктів), ${N_REQUESTS} запитів ===`);
  const profiles = Array.from({ length: N_REQUESTS }, () => randomProfile(regions));
  const timings: number[] = [];
  let emptyResultCount = 0;
  let relaxationAppliedCount = 0;

  for (const profile of profiles) {
    const t0 = performance.now();
    const result = recommend(catalog, profile);
    const t1 = performance.now();
    timings.push(t1 - t0);
    if (result.results.length === 0) emptyResultCount++;
    if (result.diagnostics.relaxationStepsApplied.length > 0) relaxationAppliedCount++;
  }

  const sorted = [...timings].sort((a, b) => a - b);
  const p50 = percentile(sorted, 50);
  const p95 = percentile(sorted, 95);
  const p99 = percentile(sorted, 99);
  const mean = timings.reduce((a, b) => a + b, 0) / timings.length;
  const max = sorted[sorted.length - 1];
  const min = sorted[0];

  console.log(`Кількість запитів:            ${N_REQUESTS}`);
  console.log(`Розмір каталогу:              ${catalog.length} продуктів`);
  console.log(`min / mean / max, мс:         ${min.toFixed(4)} / ${mean.toFixed(4)} / ${max.toFixed(4)}`);
  console.log(`p50, мс:                      ${p50.toFixed(4)}`);
  console.log(`p95, мс:                      ${p95.toFixed(4)}`);
  console.log(`p99, мс:                      ${p99.toFixed(4)}`);
  console.log(`Запитів з порожнім результатом: ${emptyResultCount} (${((emptyResultCount / N_REQUESTS) * 100).toFixed(1)}%)`);
  console.log(`Запитів із застосуванням послаблення обмежень: ${relaxationAppliedCount} (${((relaxationAppliedCount / N_REQUESTS) * 100).toFixed(1)}%)`);

  console.log(`\n=== Бенчмарк 2: масштабованість — залежність часу виконання від розміру каталогу ===`);
  console.log(`n (продуктів)\tp50 (мс)\tp95 (мс)\tсередній (мс)`);
  for (const factor of [1, 10, 50, 100, 500]) {
    const bigCatalog = expandCatalog(catalog, factor);
    const localTimings: number[] = [];
    const localProfiles = Array.from({ length: 500 }, () => randomProfile(regions));
    for (const profile of localProfiles) {
      const t0 = performance.now();
      recommend(bigCatalog, profile);
      const t1 = performance.now();
      localTimings.push(t1 - t0);
    }
    const s = [...localTimings].sort((a, b) => a - b);
    const m = localTimings.reduce((a, b) => a + b, 0) / localTimings.length;
    console.log(`${bigCatalog.length}\t\t${percentile(s, 50).toFixed(4)}\t\t${percentile(s, 95).toFixed(4)}\t\t${m.toFixed(4)}`);
  }

  console.log(`\n=== Бенчмарк 3: крайні випадки (edge cases) ===`);
  // 3.1: неможливий запит (вік 200 років)
  const impossibleUser: UserProfile = { age: 200, region: "Київ", requiredProgramType: "ambulatory", maxBudget: 5000 };
  const r1 = recommend(catalog, impossibleUser);
  console.log(`Неможливий вік (200 років): результатів=${r1.results.length}, застосовані послаблення=[${r1.diagnostics.relaxationStepsApplied.join(", ")}], найбільш дискваліфікуюче обмеження=${JSON.stringify(r1.diagnostics.eliminationCounts)}`);

  // 3.2: дуже малий бюджет — очікуємо спрацювання R1
  const lowBudgetUser: UserProfile = { age: 30, region: "Київ", requiredProgramType: "ambulatory", maxBudget: 3700 };
  const r2 = recommend(catalog, lowBudgetUser);
  console.log(`Малий бюджет (3700 грн): результатів=${r2.results.length}, застосовані послаблення=[${r2.diagnostics.relaxationStepsApplied.join(", ")}]`);

  // 3.3: порожній каталог
  const r3 = recommend([], impossibleUser);
  console.log(`Порожній каталог: результатів=${r3.results.length} (очікується 0, без винятків)`);

  console.log(`\nЗавершено. Результати відтворювані — для повторного запуску використайте той самий seed.ts та цей скрипт.`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
