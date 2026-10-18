import { seedData } from "../src/db/catalog";
import type { InsuranceProductInput, UserProfile } from "../src/lib/recommendation";
export const catalog: InsuranceProductInput[] = seedData.map((p, i) => {
  const { components, ...rest } = p;
  return { ...rest, id: i + 1, isActive: true, coverageComponents: components };
});
export const base: UserProfile = { age: 30, region: "Київ", requiredProgramType: "ambulatory", maxBudget: 10000 };
export function mulberry32(seed: number) { return () => {
  let t = seed += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296;
}; }
export function profiles(n = 5000, seed = 20261005): UserProfile[] {
  const rng = mulberry32(seed), regions = ["Київ", "Львів", "Одеса", "Харків", "Дніпро"];
  const types = ["ambulatory", "stationary", "complex", "dental", "maternity"] as const;
  return Array.from({length: n}, () => ({ age: Math.floor(rng()*80)+1,
    region: regions[Math.floor(rng()*regions.length)], requiredProgramType: types[Math.floor(rng()*types.length)],
    maxBudget: Math.floor(rng()*30000)+2000, minCoverageLimit: rng()>.5 ? Math.floor(rng()*100000) : undefined,
    specialNeeds: rng()>.7 ? ["хронічні захворювання"] : undefined }));
}