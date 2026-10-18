import { z } from "zod";

export const DEFAULT_WEIGHTS = {
  coverage: 0.35, price: 0.30, network: 0.15, deductible: 0.10, waiting: 0.10,
};
export type PriorityWeights = Partial<typeof DEFAULT_WEIGHTS>;
export const coverageKinds = ["ambulatory", "stationary", "dental", "maternity", "chronic", "oncology", "orthodontics", "cosmetology", "emergency"] as const;
export type CoverageKind = typeof coverageKinds[number];
export const specialNeedKinds = {
  "хронічні захворювання": "chronic",
  "стоматологія": "dental",
  "материнство": "maternity",
  "онкологія": "oncology",
  "ортодонтія": "orthodontics",
  "косметологія": "cosmetology",
} as const satisfies Record<string, CoverageKind>;
export const specialNeeds = Object.keys(specialNeedKinds) as [keyof typeof specialNeedKinds, ...(keyof typeof specialNeedKinds)[]];

/** Missing weights use defaults; explicit zeros are preserved. */
export function normalizedWeights(weights: PriorityWeights = {}) {
  const merged = { ...DEFAULT_WEIGHTS };
  for (const key of Object.keys(merged) as (keyof typeof merged)[]) {
    if (weights[key] !== undefined) merged[key] = weights[key]!;
  }
  const values = Object.values(merged);
  if (values.some(v => !Number.isFinite(v) || v < 0)) {
    throw new RangeError("Weights must be finite and nonnegative");
  }
  const sum = values.reduce((a, b) => a + b, 0);
  if (!Number.isFinite(sum) || sum <= 0) throw new RangeError("Weight sum must be finite and positive");
  return Object.fromEntries(Object.entries(merged).map(([k, v]) => [k, v / sum])) as typeof merged;
}

const weight = z.number().finite().nonnegative().optional();
export const userProfileSchema = z.object({
  age: z.number().int().min(0).max(120),
  region: z.string().trim().min(1).max(100).refine(r => r !== "nationwide", "Specify a user location, not a product coverage marker"),
  requiredProgramType: z.enum(["ambulatory", "stationary", "complex", "dental", "maternity"]),
  maxBudget: z.number().finite().positive(),
  minCoverageLimit: z.number().finite().nonnegative().optional(),
  specialNeeds: z.array(z.enum(specialNeeds)).max(6).optional(),
  priorityWeights: z.object({ coverage: weight, price: weight, network: weight, deductible: weight, waiting: weight }).strict().optional(),
}).strict().superRefine((u, ctx) => {
  try { normalizedWeights(u.priorityWeights); }
  catch { ctx.addIssue({ code: "custom", path: ["priorityWeights"], message: "Effective weights must have a finite positive sum" }); }
});