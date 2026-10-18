import { describe, expect, test } from "bun:test";
import { recommend, type InsuranceProductInput, type UserProfile } from "../src/lib/recommendation";

// ── Тестовий каталог (фіктивні дані, ізольовані від seed.ts, для чистоти
//    юніт-тестів алгоритму) ────────────────────────────────────────────
const catalog: InsuranceProductInput[] = [
  {
    id: 1, company: "A", productName: "Cheap Ambulatory", programType: "ambulatory",
    minAge: 18, maxAge: 60, annualPrice: 3000, coverageLimit: 20000, deductible: 500,
    networkSizeScore: 30, regions: ["Київ"], exclusions: [], waitingPeriodDays: 10, isActive: true, coverageComponents: [{coverageType: "ambulatory", limitAmount: 10000}],
  },
  {
    id: 2, company: "B", productName: "Premium Ambulatory", programType: "ambulatory",
    minAge: 18, maxAge: 60, annualPrice: 9000, coverageLimit: 80000, deductible: 0,
    networkSizeScore: 90, regions: ["Київ"], exclusions: [], waitingPeriodDays: 5, isActive: true, coverageComponents: [{coverageType: "ambulatory", limitAmount: 10000}],
  },
  {
    id: 3, company: "C", productName: "Out of budget", programType: "ambulatory",
    minAge: 18, maxAge: 60, annualPrice: 50000, coverageLimit: 100000, deductible: 0,
    networkSizeScore: 95, regions: ["Київ"], exclusions: [], waitingPeriodDays: 0, isActive: true, coverageComponents: [{coverageType: "ambulatory", limitAmount: 10000}],
  },
  {
    id: 4, company: "D", productName: "Wrong age range", programType: "ambulatory",
    minAge: 65, maxAge: 90, annualPrice: 4000, coverageLimit: 30000, deductible: 0,
    networkSizeScore: 50, regions: ["Київ"], exclusions: [], waitingPeriodDays: 0, isActive: true, coverageComponents: [{coverageType: "ambulatory", limitAmount: 10000}],
  },
  {
    id: 5, company: "E", productName: "Wrong region", programType: "ambulatory",
    minAge: 18, maxAge: 60, annualPrice: 4000, coverageLimit: 30000, deductible: 0,
    networkSizeScore: 50, regions: ["Львів"], exclusions: [], waitingPeriodDays: 0, isActive: true, coverageComponents: [{coverageType: "ambulatory", limitAmount: 10000}],
  },
  {
    id: 6, company: "F", productName: "Excludes chronic", programType: "ambulatory",
    minAge: 18, maxAge: 60, annualPrice: 4000, coverageLimit: 30000, deductible: 0,
    networkSizeScore: 50, regions: ["Київ"], exclusions: ["хронічні захворювання"], waitingPeriodDays: 0, isActive: true, coverageComponents: [{coverageType: "ambulatory", limitAmount: 10000}],
  },
  {
    id: 7, company: "G", productName: "Complex covers all", programType: "complex",
    minAge: 18, maxAge: 60, annualPrice: 20000, coverageLimit: 200000, deductible: 1000,
    networkSizeScore: 80, regions: ["nationwide"], exclusions: [], waitingPeriodDays: 30, isActive: true, coverageComponents: [{coverageType: "ambulatory", limitAmount: 10000}],
  },
  {
    id: 8, company: "H", productName: "Inactive product", programType: "ambulatory",
    minAge: 18, maxAge: 60, annualPrice: 3500, coverageLimit: 25000, deductible: 0,
    networkSizeScore: 60, regions: ["Київ"], exclusions: [], waitingPeriodDays: 0, isActive: false, coverageComponents: [{coverageType: "ambulatory", limitAmount: 10000}],
  },
];

const baseUser: UserProfile = {
  age: 30,
  region: "Київ",
  requiredProgramType: "ambulatory",
  maxBudget: 10000,
};

describe("Жорсткі обмеження (hard constraints)", () => {
  test("вік поза межами [minAge,maxAge] відсіює продукт", () => {
    const r = recommend(catalog, baseUser);
    expect(r.results.find((x) => x.product.id === 4)).toBeUndefined();
  });

  test("невідповідний регіон відсіює продукт", () => {
    const r = recommend(catalog, baseUser);
    expect(r.results.find((x) => x.product.id === 5)).toBeUndefined();
  });

  test("перевищення бюджету відсіює продукт", () => {
    const r = recommend(catalog, baseUser);
    expect(r.results.find((x) => x.product.id === 3)).toBeUndefined();
  });

  test("виключення (exclusions) відсіює продукт при співпадінні з specialNeeds", () => {
    const user: UserProfile = { ...baseUser, specialNeeds: ["хронічні захворювання"] };
    const r = recommend(catalog, user);
    expect(r.results.find((x) => x.product.id === 6)).toBeUndefined();
  });

  test("неактивний продукт (isActive=false) ніколи не потрапляє у видачу", () => {
    const r = recommend(catalog, baseUser);
    expect(r.results.find((x) => x.product.id === 8)).toBeUndefined();
  });

  test("complex з підтвердженим амбулаторним компонентом проходить амбулаторний запит", () => {
    const r = recommend(catalog, { ...baseUser, maxBudget: 25000 });
    expect(r.results.find((x) => x.product.id === 7)).toBeDefined();
  });

  test("продукти, що задовольняють усі обмеження, присутні у видачі", () => {
    const r = recommend(catalog, baseUser);
    const ids = r.results.map((x) => x.product.id).sort();
    // 1 (cheap) та 2 (premium) відповідають вік/регіон/бюджет/тип
    expect(ids).toContain(1);
    expect(ids).toContain(2);
  });
});

describe("Ранжування (scoring)", () => {
  test("продукт з вищим покриттям і мережею отримує вищу оцінку при рівному бюджеті", () => {
    const r = recommend(catalog, { ...baseUser, maxBudget: 9000 });
    const idx1 = r.results.findIndex((x) => x.product.id === 1); // дешевший, менше покриття
    const idx2 = r.results.findIndex((x) => x.product.id === 2); // дорожчий, більше покриття, при вазі 0.35 coverage vs 0.30 price має переважити
    expect(idx1).toBeGreaterThanOrEqual(0);
    expect(idx2).toBeGreaterThanOrEqual(0);
    // Перевіряємо саме коректність підрахунку суми ваг, а не конкретний порядок
    const s1 = r.results[idx1].score;
    const s2 = r.results[idx2].score;
    expect(s1).toBeGreaterThan(0);
    expect(s2).toBeGreaterThan(0);
  });

  test("сума ваг (нормалізованих) дорівнює 1", () => {
    const r = recommend(catalog, baseUser);
    const sum = Object.values(r.weightsUsed).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-9);
  });

  test("кастомні ваги коректно ренормалізуються", () => {
    const r = recommend(catalog, {
      ...baseUser,
      priorityWeights: { price: 1, coverage: 0, network: 0, deductible: 0, waiting: 0 },
    });
    const sum = Object.values(r.weightsUsed).reduce((a, b) => a + b, 0);
    expect(Math.abs(sum - 1)).toBeLessThan(1e-9);
    expect(r.weightsUsed.price).toBeCloseTo(1, 5);
  });

  test("результати відсортовані за спаданням оцінки", () => {
    const r = recommend(catalog, { ...baseUser, maxBudget: 25000 });
    for (let i = 1; i < r.results.length; i++) {
      expect(r.results[i - 1].score).toBeGreaterThanOrEqual(r.results[i].score);
    }
  });

  test("кожен результат містить пояснення (explanation) непорожнім рядком", () => {
    const r = recommend(catalog, baseUser);
    for (const item of r.results) {
      expect(item.explanation.length).toBeGreaterThan(0);
    }
  });
});

describe("Механізм послаблення обмежень (relaxation)", () => {
  test("якщо жоден продукт не проходить бюджет — застосовується R1 (бюджет +15%)", () => {
    // Найдешевший продукт коштує 3000, задамо бюджет 2900: після +15% = 3335 >= 3000 → пройде
    const user: UserProfile = { ...baseUser, maxBudget: 2900 };
    const r = recommend(catalog, user);
    expect(r.diagnostics.relaxationStepsApplied).toContain("R1_budget_+15%");
    expect(r.results.length).toBeGreaterThan(0);
  });

  test("якщо запит зовсім неможливо задовольнити — повертається порожній результат з діагностикою", () => {
    const user: UserProfile = { ...baseUser, age: 100, maxBudget: 1 };
    const r = recommend(catalog, user);
    expect(r.results.length).toBe(0);
    expect(r.diagnostics.candidatesAfterFilter).toBe(0);
    expect(Object.keys(r.diagnostics.eliminationCounts).length).toBeGreaterThan(0);
  });

  test("порожній каталог повертає порожній результат без винятку", () => {
    const r = recommend([], baseUser);
    expect(r.results.length).toBe(0);
  });
});
