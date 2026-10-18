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

import { seedData } from "./catalog";

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
        coverageType: comp.coverageType,
        description: comp.description,
        limitAmount: comp.limitAmount,
      });
    }
  }
  console.log("Готово.");
}

if (import.meta.main) main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
