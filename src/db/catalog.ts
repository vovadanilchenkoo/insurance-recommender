/** SYNTHETIC demonstration data, not commercial tariffs. */
export type SeedProduct = {
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
  components: { name: string; coverageType: import("../lib/profile").CoverageKind; description: string; limitAmount: number }[];
};

export const seedData: SeedProduct[] = [
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
      { name: "Консультації лікарів", coverageType: "ambulatory", description: "Прийом терапевта та вузьких фахівців", limitAmount: 25000 },
      { name: "Діагностика", coverageType: "ambulatory", description: "Лабораторні та інструментальні дослідження", limitAmount: 35000 },
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
      { name: "Амбулаторне лікування", coverageType: "ambulatory", description: "Консультації, діагностика", limitAmount: 80000 },
      { name: "Стаціонарне лікування", coverageType: "stationary", description: "Госпіталізація, операції", limitAmount: 150000 },
      { name: "Екстрена допомога", coverageType: "emergency", description: "Швидка медична допомога", limitAmount: 20000 },
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
      { name: "Планова госпіталізація", coverageType: "stationary", description: "Операції, лікування в стаціонарі", limitAmount: 350000 },
      { name: "Онкологічна допомога", coverageType: "oncology", description: "Діагностика та лікування онкозахворювань", limitAmount: 50000 },
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
      { name: "Консультації сімейного лікаря", coverageType: "ambulatory", description: "Первинна допомога", limitAmount: 15000 },
      { name: "Аналізи", coverageType: "ambulatory", description: "Базові лабораторні дослідження", limitAmount: 15000 },
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
      { name: "Лікування карієсу", coverageType: "dental", description: "Терапевтична стоматологія", limitAmount: 12000 },
      { name: "Гігієна", coverageType: "dental", description: "Профілактичні огляди та чистка", limitAmount: 8000 },
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
      { name: "Ведення вагітності", coverageType: "maternity", description: "Спостереження та обстеження", limitAmount: 60000 },
      { name: "Пологи", coverageType: "maternity", description: "Госпіталізація для пологів", limitAmount: 120000 },
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
      { name: "Консультації терапевта", coverageType: "ambulatory", description: "Первинний прийом", limitAmount: 10000 },
      { name: "Базова діагностика", coverageType: "ambulatory", description: "Аналізи, УЗД", limitAmount: 10000 },
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
      { name: "Амбулаторне лікування", coverageType: "ambulatory", description: "Консультації, діагностика для 55+", limitAmount: 100000 },
      { name: "Стаціонар", coverageType: "stationary", description: "Госпіталізація з урахуванням вікових ризиків", limitAmount: 180000 },
      { name: "Хронічні захворювання", coverageType: "chronic", description: "Супровід хронічних станів", limitAmount: 20000 },
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
      { name: "Госпіталізація", coverageType: "stationary", description: "Планова та екстрена госпіталізація", limitAmount: 150000 },
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
      { name: "Амбулаторія", coverageType: "ambulatory", description: "Консультації та діагностика", limitAmount: 60000 },
      { name: "Стаціонар", coverageType: "stationary", description: "Госпіталізація", limitAmount: 60000 },
    ],
  },
];

