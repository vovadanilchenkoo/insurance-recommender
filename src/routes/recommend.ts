import { z } from "zod";
import { eq } from "drizzle-orm";
import { base } from "../app";
import { db } from "../db/client";
import * as schema from "../db/schema";
import {
  recommend as runRecommendation,
  type InsuranceProductInput,
  type UserProfile,
} from "../lib/recommendation";
import { userProfileSchema, type CoverageKind } from "../lib/profile";

async function loadCatalog(): Promise<InsuranceProductInput[]> {
  const rows = await db.select().from(schema.insuranceProducts);
  const components = await db.select().from(schema.coverageComponents);
  const byProduct = new Map<number, InsuranceProductInput["coverageComponents"]>();
  for (const c of components) {
    const group = byProduct.get(c.productId) ?? [];
    group.push({ coverageType: c.coverageType as CoverageKind, limitAmount: c.limitAmount });
    byProduct.set(c.productId, group);
  }
  return rows.map((r) => ({
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
    coverageComponents: byProduct.get(r.id) ?? [],
  }));
}

export const recommend = {
  // Отримати ранжований список рекомендованих програм ДМС для профілю користувача
  getRecommendations: base
    .input(userProfileSchema)
    .handler(async ({ input }) => {
      const catalog = await loadCatalog();
      const started = performance.now();
      const result = runRecommendation(catalog, input as UserProfile);
      const computeTimeMs = performance.now() - started;

      // журналюємо запит для відтворюваності експериментів
      await db.insert(schema.recommendationRequests).values({
        userProfileJson: JSON.stringify(input),
        resultJson: JSON.stringify(result.results.map((r) => ({
          productId: r.product.id,
          productName: r.product.productName,
          score: r.score,
        }))),
        computeTimeMs,
        candidatesAfterFilter: result.diagnostics.candidatesAfterFilter,
      });

      return { ...result, computeTimeMs };
    }),

  // Повний каталог продуктів (для довідки/демонстрації)
  listCatalog: base.handler(async () => loadCatalog()),

  // Одна програма з деталізованими компонентами покриття
  getProduct: base
    .input(z.object({ id: z.number() }))
    .handler(async ({ input }) => {
      const [product] = await db
        .select()
        .from(schema.insuranceProducts)
        .where(eq(schema.insuranceProducts.id, input.id));
      const components = await db
        .select()
        .from(schema.coverageComponents)
        .where(eq(schema.coverageComponents.productId, input.id));
      return { product, components };
    }),

  // Журнал читається лише локально; публічну процедуру вилучено до появи авторизації.
};
