/**
 * Наповнення каталогу ІЛЮСТРАТИВНИМИ даними для демонстрації та
 * тестування рекомендаційного алгоритму.
 *
 * ВАЖЛИВО: наведені ціни, ліміти покриття, франшизи та розміри мереж
 * клінік — синтетичні, підібрані так, щоб відображати правдоподібний
 * діапазон ринку ДМС в Україні, але НЕ є витягом із реальних чинних
 * тарифів компаній. Назви страхових компаній використані лише як
 * приклад відомих гравців ринку (з огляду наукового керівника: перед
 * використанням у тексті роботи слід перевірити чинні назви, напр.
 * ARX замість "AXA Страхування" після ребрендингу).
 *
 * Запуск: bun run src/db/seed.ts
 */
import { db } from "./client";
import { insuranceProducts, coverageComponents } from "./schema";

type SeedProduct = {
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
  components: { name: string; description: string; limitAmount: number }[];
};

const seedData: SeedProduct[] = [
  {
    company: "ARX",
    productName: "Амбулаторія Стандарт",
    programType: "ambulatory",
    minAge: 1,
    maxAge: 65,
    annualPrice: 8500,
    coverageLimit: 60000,
    deductible: 0,
    networkSizeScore: 70,
    regions: ["Київ", "Львів", "Одеса", "Харків"],
    exclusions: ["хронічні захворювання", "стоматологія"],
    waitingPeriodDays: 14,
    components: [
      { name: "Консультації лікарів", description: "Прийом терапевта та вузьких фахівців", limitAmount: 25000 },
      { name: "Діагностика", description: "Лабораторні та інструментальні дослідження", limitAmount: 35000 },
    ],
  },
  {
    company: "УНІКА",
    productName: "Комплексний Захист",
    programType: "complex",
    minAge: 1,
    maxAge: 70,
    annualPrice: 21000,
    coverageLimit: 250000,
    deductible: 2000,
    networkSizeScore: 85,
    regions: ["nationwide"],
    exclusions: ["косметологія"],
    waitingPeriodDays: 30,
    components: [
      { name: "Амбулаторне лікування", description: "Консультації, діагностика", limitAmount: 80000 },
      { name: "Стаціонарне лікування", description: "Госпіталізація, операції", limitAmount: 150000 },
      { name: "Екстрена допомога", description: "Швидка медична допомога", limitAmount: 20000 },
    ],
  },
  {
    company: "PZU Україна",
    productName: "Стаціонар Преміум",
    programType: "stationary",
    minAge: 18,
    maxAge: 60,
    annualPrice: 15500,
    coverageLimit: 400000,
    deductible: 5000,
    networkSizeScore: 60,
    regions: ["Київ", "Дніпро"],
    exclusions: ["хронічні захворювання"],
    waitingPeriodDays: 45,
    components: [
      { name: "Планова госпіталізація", description: "Операції, лікування в стаціонарі", limitAmount: 350000 },
      { name: "Онкологічна допомога", description: "Діагностика та лікування онкозахворювань", limitAmount: 50000 },
    ],
  },
  {
    company: "Alliance Insurance",
    productName: "Родинний Базовий",
    programType: "ambulatory",
    minAge: 1,
    maxAge: 55,
    annualPrice: 5200,
    coverageLimit: 30000,
    deductible: 500,
    networkSizeScore: 45,
    regions: ["nationwide"],
    exclusions: ["стоматологія", "материнство"],
    waitingPeriodDays: 7,
    components: [
      { name: "Консультації сімейного лікаря", description: "Первинна допомога", limitAmount: 15000 },
      { name: "Аналізи", description: "Базові лабораторні дослідження", limitAmount: 15000 },
    ],
  },
  {
    company: "УСГ (Українська страхова група)",
    productName: "Дентал Плюс",
    programType: "dental",
    minAge: 1,
    maxAge: 75,
    annualPrice: 3800,
    coverageLimit: 20000,
    deductible: 0,
    networkSizeScore: 55,
    regions: ["Київ", "Харків", "Одеса"],
    exclusions: ["ортодонтія"],
    waitingPeriodDays: 0,
    components: [
      { name: "Лікування карієсу", description: "Терапевтична стоматологія", limitAmount: 12000 },
      { name: "Гігієна", description: "Профілактичні огляди та чистка", limitAmount: 8000 },
    ],
  },
  {
    company: "ARX",
    productName: "Материнство Комфорт",
    programType: "maternity",
    minAge: 18,
    maxAge: 45,
    annualPrice: 26000,
    coverageLimit: 180000,
    deductible: 3000,
    networkSizeScore: 65,
    regions: ["Київ", "Львів"],
    exclusions: [],
    waitingPeriodDays: 270,
    components: [
      { name: "Ведення вагітності", description: "Спостереження та обстеження", limitAmount: 60000 },
      { name: "Пологи", description: "Госпіталізація для пологів", limitAmount: 120000 },
    ],
  },
  {
    company: "PZU Україна",
    productName: "Амбулаторія Економ",
    programType: "ambulatory",
    minAge: 1,
    maxAge: 80,
    annualPrice: 4200,
    coverageLimit: 20000,
    deductible: 300,
    networkSizeScore: 40,
    regions: ["nationwide"],
    exclusions: ["стоматологія", "хронічні захворювання", "материнство"],
    waitingPeriodDays: 10,
    components: [
      { name: "Консультації терапевта", description: "Первинний прийом", limitAmount: 10000 },
      { name: "Базова діагностика", description: "Аналізи, УЗД", limitAmount: 10000 },
    ],
  },
  {
    company: "УНІКА",
    productName: "Комплекс Преміум 65+",
    programType: "complex",
    minAge: 55,
    maxAge: 85,
    annualPrice: 34000,
    coverageLimit: 300000,
    deductible: 1000,
    networkSizeScore: 75,
    regions: ["nationwide"],
    exclusions: [],
    waitingPeriodDays: 30,
    components: [
      { name: "Амбулаторне лікування", description: "Консультації, діагностика для 55+", limitAmount: 100000 },
      { name: "Стаціонар", description: "Госпіталізація з урахуванням вікових ризиків", limitAmount: 180000 },
      { name: "Хронічні захворювання", description: "Супровід хронічних станів", limitAmount: 20000 },
    ],
  },
  {
    company: "Alliance Insurance",
    productName: "Стаціонар Базовий",
    programType: "stationary",
    minAge: 1,
    maxAge: 65,
    annualPrice: 9800,
    coverageLimit: 150000,
    deductible: 4000,
    networkSizeScore: 50,
    regions: ["Київ", "Одеса", "Харків"],
    exclusions: ["онкологія"],
    waitingPeriodDays: 30,
    components: [
      { name: "Госпіталізація", description: "Планова та екстрена госпіталізація", limitAmount: 150000 },
    ],
  },
  {
    company: "УСГ (Українська страхова група)",
    productName: "Комплекс Молодіжний",
    programType: "complex",
    minAge: 16,
    maxAge: 35,
    annualPrice: 12000,
    coverageLimit: 120000,
    deductible: 1500,
    networkSizeScore: 58,
    regions: ["Київ", "Львів", "Дніпро"],
    exclusions: ["материнство"],
    waitingPeriodDays: 14,
    components: [
      { name: "Амбулаторія", description: "Консультації та діагностика", limitAmount: 60000 },
      { name: "Стаціонар", description: "Госпіталізація", limitAmount: 60000 },
    ],
  },
];

async function main() {
  console.log("Очищення таблиць...");
  await db.delete(coverageComponents);
  await db.delete(insuranceProducts);

  console.log(`Вставка ${seedData.length} продуктів...`);
  for (const item of seedData) {
    const [inserted] = await db
      .insert(insuranceProducts)
      .values({
        company: item.company,
        productName: item.productName,
        programType: item.programType,
        minAge: item.minAge,
        maxAge: item.maxAge,
        annualPrice: item.annualPrice,
        coverageLimit: item.coverageLimit,
        deductible: item.deductible,
        networkSizeScore: item.networkSizeScore,
        regions: JSON.stringify(item.regions),
        exclusions: JSON.stringify(item.exclusions),
        waitingPeriodDays: item.waitingPeriodDays,
        isActive: true,
      })
      .returning();

    for (const comp of item.components) {
      await db.insert(coverageComponents).values({
        productId: inserted.id,
        name: comp.name,
        description: comp.description,
        limitAmount: comp.limitAmount,
      });
    }
  }
  console.log("Готово.");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
