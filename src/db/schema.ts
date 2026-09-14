import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

/**
 * Схема БД для прототипу рекомендаційної підсистеми
 * вебзастосунку "Допомога у виборі програми ДМС".
 *
 * УВАГА: дані каталогу продуктів (insuranceProducts), якими наповнюється
 * ця схема (див. src/db/seed.ts), є ІЛЮСТРАТИВНИМИ і створені
 * для демонстрації роботи алгоритму, а НЕ є реальними чинними тарифами
 * страхових компаній. Назви компаній використані лише як приклад
 * ринкових гравців; конкретні числові параметри — синтетичні.
 */

// Каталог програм добровільного медичного страхування (ДМС)
export const insuranceProducts = sqliteTable("insurance_products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  company: text("company").notNull(),
  productName: text("product_name").notNull(),
  // тип програми: ambulatory | stationary | complex | dental | maternity
  programType: text("program_type").notNull(),
  minAge: integer("min_age").notNull(),
  maxAge: integer("max_age").notNull(),
  // річна вартість поліса, грн (ілюстративна)
  annualPrice: real("annual_price").notNull(),
  // страховий ліміт покриття, грн
  coverageLimit: real("coverage_limit").notNull(),
  // франшиза (безумовна), грн
  deductible: real("deductible").notNull().default(0),
  // розмір мережі партнерських клінік (умовний індикатор, 1-100)
  networkSizeScore: integer("network_size_score").notNull(),
  // регіони покриття, збережені як JSON-масив рядків, напр. ["Київ","Львів"] або ["nationwide"]
  regions: text("regions").notNull(),
  // перелік виключень покриття, JSON-масив рядків, напр. ["хронічні захворювання","стоматологія"]
  exclusions: text("exclusions").notNull().default("[]"),
  // період очікування (днів) до початку дії покриття для нестрахових випадків
  waitingPeriodDays: integer("waiting_period_days").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Деталізовані компоненти покриття продукту (1-до-багатьох)
export const coverageComponents = sqliteTable("coverage_components", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id")
    .notNull()
    .references(() => insuranceProducts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  limitAmount: real("limit_amount").notNull().default(0),
});

// Журнал звернень (запитів) до рекомендаційного модуля — потрібен для
// відтворюваності експериментів та подальшого аналізу якості рекомендацій.
export const recommendationRequests = sqliteTable("recommendation_requests", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // профіль користувача-заявника, як він надійшов у запиті (JSON)
  userProfileJson: text("user_profile_json").notNull(),
  // повний ранжований список результатів разом з оцінками (JSON)
  resultJson: text("result_json").notNull(),
  // час виконання алгоритму ранжування, мс
  computeTimeMs: real("compute_time_ms").notNull(),
  // кількість продуктів, що пройшли жорсткі обмеження
  candidatesAfterFilter: integer("candidates_after_filter").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
