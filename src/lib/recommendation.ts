/**
 * Контентно-орієнтований рекомендаційний алгоритм ранжування програм ДМС
 * з жорсткими обмеженнями (hard-constraint content-based ranking).
 *
 * Формальний опис моделі (відповідає розділу "Формальний опис
 * рекомендаційного алгоритму" пояснювальної записки):
 *
 * Нехай U — профіль користувача, P = {p1..pn} — каталог активних програм ДМС.
 *
 * КРОК 1. Фільтрація жорсткими обмеженнями (hard constraints).
 * Продукт p проходить фільтр лише якщо ВСІ умови C1..C8 істинні:
 *   C1 (вік):        p.minAge <= U.age <= p.maxAge
 *   C2 (регіон):      U.region ∈ p.regions ∨ "nationwide" ∈ p.regions
 *   C3 (тип програми): p.programType = U.requiredProgramType ∨ p.programType = "complex"
 *   C4 (бюджет):      p.annualPrice <= U.maxBudget
 *   C5 (виключення):  ∀ need ∈ U.specialNeeds: need ∉ p.exclusions
 *   C6 (активність):  p.isActive = true
 *   C7 (ліміт покриття, опційно): якщо задано U.minCoverageLimit,
 *                     то p.coverageLimit >= U.minCoverageLimit
 *   C8: усі необхідні типи покриття мають структурований компонент
 *       зі скінченним додатним лімітом; complex потребує ambulatory + stationary.
 * Множина кандидатів: Cand = { p ∈ P : C1(p) ∧ ... ∧ C8(p) }.
 *
 * КРОК 2. Якщо Cand = ∅ — послаблення обмежень (relaxation) у фіксованому
 * порядку пріоритету (від найменш критичного до найбільш критичного):
 *   R1: збільшити допустимий бюджет на 15% (U.maxBudget *= 1.15)
 *   R2: відмінити вимогу C7 (мінімальний ліміт покриття)
 * Регіон і необхідні компоненти покриття НІКОЛИ не послаблюються.
 * Надлишковий R3 вилучено: nationwide вже дозволено правилом C2.
 * Після кожного кроку послаблення фільтрація повторюється. Якщо після
 * усіх кроків Cand = ∅ — алгоритм повертає порожній результат разом
 * з діагностикою (яке обмеження відсіяло найбільше кандидатів), а НЕ
 * довільний продукт.
 *
 * КРОК 3. Ранжування (scoring) кандидатів. Для кожного критерію k
 * виконується min-max нормалізація В МЕЖАХ МНОЖИНИ Cand (відносне
 * ранжування в межах поточного запиту):
 *   norm_k(p) = (v_k(p) - min_k) / (max_k - min_k), якщо max_k ≠ min_k, інакше 0.5
 *
 * Підсумкова оцінка відповідності:
 *   S(p) = w_cov  * norm_coverage(p)
 *        + w_price* (1 - norm_price(p))        // менша ціна — краще
 *        + w_net  * norm_network(p)
 *        + w_ded  * (1 - norm_deductible(p))   // менша франшиза — краще
 *        + w_wait * (1 - norm_waiting(p))      // коротший період очікування — краще
 * де w_cov+w_price+w_net+w_ded+w_wait = 1, ваги за замовчуванням:
 *   w_cov=0.35, w_price=0.30, w_net=0.15, w_ded=0.10, w_wait=0.10
 * Це евристичне налаштування, не навчання або експертна валідація ваг.
 * Користувач може передати власні ваги (priorityWeights), які
 * перевіряються як невід’ємні скінченні числа з додатною скінченною
 * ефективною сумою, а потім ренормалізуються до суми 1.
 *
 * Складність алгоритму: фільтрація — O(n); нормалізація — O(n) на кожен
 * із 5 критеріїв, тобто O(n); сортування за оцінкою — O(n log n).
 * Сумарна складність: O(n log n), де n — кількість активних програм
 * у каталозі. Пам'яттєва складність: O(n).
 */

import { DEFAULT_WEIGHTS, normalizedWeights, specialNeedKinds, userProfileSchema, type CoverageKind } from "./profile";

export type ProgramType =
  | "ambulatory"
  | "stationary"
  | "complex"
  | "dental"
  | "maternity";

export interface InsuranceProductInput {
  id: number;
  company: string;
  productName: string;
  programType: string;
  minAge: number;
  maxAge: number;
  annualPrice: number;
  coverageLimit: number;
  deductible: number;
  networkSizeScore: number;
  regions: string[];
  exclusions: string[];
  waitingPeriodDays: number;
  isActive: boolean;
  coverageComponents: { coverageType: CoverageKind; limitAmount: number }[];
}

export interface UserProfile {
  age: number;
  region: string;
  requiredProgramType: ProgramType;
  maxBudget: number;
  minCoverageLimit?: number;
  specialNeeds?: (keyof typeof specialNeedKinds)[];
  priorityWeights?: Partial<{
    coverage: number;
    price: number;
    network: number;
    deductible: number;
    waiting: number;
  }>;
}

export interface ScoredProduct {
  product: InsuranceProductInput;
  score: number; // 0..1
  breakdown: {
    coverage: number;
    price: number;
    network: number;
    deductible: number;
    waiting: number;
  };
  explanation: string;
}

export interface RecommendationDiagnostics {
  totalCandidatesConsidered: number;
  candidatesAfterFilter: number;
  relaxationStepsApplied: string[];
  eliminationCounts: Record<string, number>; // яке обмеження скільки відсіяло (на першому проході)
}

export interface RecommendationResult {
  results: ScoredProduct[];
  diagnostics: RecommendationDiagnostics;
  weightsUsed: Record<string, number>;
}

export function requiredCoverageKinds(u: UserProfile): CoverageKind[] {
  const program: CoverageKind[] = u.requiredProgramType === "complex"
    ? ["ambulatory", "stationary"] : [u.requiredProgramType];
  return [...new Set([...program, ...(u.specialNeeds ?? []).map(n => specialNeedKinds[n])])];
}

function passesHardConstraints(
  p: InsuranceProductInput,
  u: UserProfile,
  opts: { relaxBudget: boolean; relaxCoverage: boolean },
): { pass: boolean; failedOn: string[] } {
  const failedOn: string[] = [];

  if (!p.isActive) failedOn.push("C6_active");

  if (!(p.minAge <= u.age && u.age <= p.maxAge)) failedOn.push("C1_age");

  const regionOk =
    p.regions.includes(u.region) ||
    p.regions.includes("nationwide");
  if (!regionOk) failedOn.push("C2_region");

  const programOk =
    p.programType === u.requiredProgramType || p.programType === "complex";
  if (!programOk) failedOn.push("C3_programType");

  const effectiveBudget = opts.relaxBudget ? u.maxBudget * 1.15 : u.maxBudget;
  if (!(p.annualPrice <= effectiveBudget)) failedOn.push("C4_budget");

  const needs = u.specialNeeds ?? [];
  const hasExcludedNeed = needs.some((n) => p.exclusions.includes(n));
  if (hasExcludedNeed) failedOn.push("C5_exclusions");

  if (!requiredCoverageKinds(u).every(kind => p.coverageComponents.some(c =>
    c.coverageType === kind && Number.isFinite(c.limitAmount) && c.limitAmount > 0
  ))) failedOn.push("C8_requiredCoverage");

  if (
    !opts.relaxCoverage &&
    u.minCoverageLimit !== undefined &&
    p.coverageLimit < u.minCoverageLimit
  ) {
    failedOn.push("C7_coverageLimit");
  }

  return { pass: failedOn.length === 0, failedOn };
}

function minMax(values: number[]): { min: number; max: number } {
  return { min: Math.min(...values), max: Math.max(...values) };
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0.5;
  return (value - min) / (max - min);
}

/**
 * Головна функція рекомендаційного алгоритму.
 */
export function recommend(
  catalog: InsuranceProductInput[],
  user: UserProfile,
): RecommendationResult {
  user = userProfileSchema.parse(user);
  const wNorm = normalizedWeights(user.priorityWeights);
  const active = catalog.filter((p) => p.isActive);

  // ── КРОК 1: фільтрація жорсткими обмеженнями (без послаблень) ──
  const eliminationCounts: Record<string, number> = {};
  let candidates: InsuranceProductInput[] = [];
  const relaxOpts = { relaxBudget: false, relaxCoverage: false };

  for (const p of active) {
    const { pass, failedOn } = passesHardConstraints(p, user, relaxOpts);
    if (pass) {
      candidates.push(p);
    } else {
      for (const reason of failedOn) {
        eliminationCounts[reason] = (eliminationCounts[reason] ?? 0) + 1;
      }
    }
  }

  // ── КРОК 2: послаблення обмежень за потреби ──
  const relaxationStepsApplied: string[] = [];
  if (candidates.length === 0) {
    relaxOpts.relaxBudget = true;
    relaxationStepsApplied.push("R1_budget_+15%");
    candidates = active.filter((p) => passesHardConstraints(p, user, relaxOpts).pass);
  }
  if (candidates.length === 0) {
    relaxOpts.relaxCoverage = true;
    relaxationStepsApplied.push("R2_drop_min_coverage");
    candidates = active.filter((p) => passesHardConstraints(p, user, relaxOpts).pass);
  }
  const diagnostics: RecommendationDiagnostics = {
    totalCandidatesConsidered: active.length,
    candidatesAfterFilter: candidates.length,
    relaxationStepsApplied,
    eliminationCounts,
  };

  if (candidates.length === 0) {
    return { results: [], diagnostics, weightsUsed: wNorm };
  }

  // ── КРОК 3: ранжування ──
  const coverageRange = minMax(candidates.map((p) => p.coverageLimit));
  const priceRange = minMax(candidates.map((p) => p.annualPrice));
  const networkRange = minMax(candidates.map((p) => p.networkSizeScore));
  const deductibleRange = minMax(candidates.map((p) => p.deductible));
  const waitingRange = minMax(candidates.map((p) => p.waitingPeriodDays));

  const scored: ScoredProduct[] = candidates.map((p) => {
    const covN = normalize(p.coverageLimit, coverageRange.min, coverageRange.max);
    const priceN = normalize(p.annualPrice, priceRange.min, priceRange.max);
    const netN = normalize(p.networkSizeScore, networkRange.min, networkRange.max);
    const dedN = normalize(p.deductible, deductibleRange.min, deductibleRange.max);
    const waitN = normalize(p.waitingPeriodDays, waitingRange.min, waitingRange.max);

    const breakdown = {
      coverage: wNorm.coverage * covN,
      price: wNorm.price * (1 - priceN),
      network: wNorm.network * netN,
      deductible: wNorm.deductible * (1 - dedN),
      waiting: wNorm.waiting * (1 - waitN),
    };
    const score =
      breakdown.coverage +
      breakdown.price +
      breakdown.network +
      breakdown.deductible +
      breakdown.waiting;

    // пояснення: два найвагоміші компоненти оцінки
    const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
    const labels: Record<string, string> = {
      coverage: "високий рівень страхового покриття",
      price: "вигідна вартість полісу відносно інших відповідних варіантів",
      network: "широка мережа партнерських клінік",
      deductible: "низька франшиза",
      waiting: "короткий період очікування",
    };
    const ranges = { coverage: coverageRange, price: priceRange, network: networkRange, deductible: deductibleRange, waiting: waitingRange };
    const positive = entries.filter(([k, v]) => v > 0 && ranges[k as keyof typeof ranges].max !== ranges[k as keyof typeof ranges].min).slice(0, 2);
    const drawbacks = [
      p.annualPrice > user.maxBudget ? "ціна перевищує початковий бюджет" : "",
      user.minCoverageLimit !== undefined && p.coverageLimit < user.minCoverageLimit ? "ліміт нижчий за початкову вимогу" : "",
      p.deductible > 0 ? `франшиза ${p.deductible} грн` : "",
      p.waitingPeriodDays > 0 ? `очікування ${p.waitingPeriodDays} днів` : "",
    ].filter(Boolean);
    const explanation = (positive.length
      ? `Найбільші відносні внески: ${positive.map(([k]) => labels[k]).join(" та ")}. `
      : "Критерії із додатною вагою не дають порівняльної переваги; сталий критерій має нейтральне значення 0,5. ")
      + "Оцінка відносна до поточних кандидатів, не є ймовірністю чи гарантією придатності. "
      + (drawbacks.length ? `Умови, що потребують уваги: ${drawbacks.join("; ")}.` : "Перевірте повні умови договору.");

    return { product: p, score, breakdown, explanation };
  });

  scored.sort((a, b) => b.score - a.score);

  return { results: scored, diagnostics, weightsUsed: wNorm };
}
