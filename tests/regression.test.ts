import { describe, expect, test } from "bun:test";
import { recommend } from "../src/lib/recommendation";
import { userProfileSchema } from "../src/lib/profile";
import { catalog, base } from "./fixtures";

describe("Regression: territory and mandatory coverage",()=>{
  test("S9: dental in Lviv remains empty, no R3 bypass",()=>{
    const r=recommend(catalog,{...base,requiredProgramType:"dental",region:"Львів",maxBudget:4000});
    expect(r.results).toHaveLength(0);expect(r.diagnostics.relaxationStepsApplied).toEqual(["R1_budget_+15%","R2_drop_min_coverage"]);
  });
  test("S6: maternity returns only confirmed maternity product",()=>{
    const r=recommend(catalog,{...base,requiredProgramType:"maternity",region:"Львів",maxBudget:30000,minCoverageLimit:150000,specialNeeds:["материнство"]});
    expect(r.results.map(x=>x.product.id)).toEqual([6]);expect(r.diagnostics.eliminationCounts.C8_requiredCoverage).toBeGreaterThan(0);
  });
  test("nationwide works without region relaxation",()=>{
    expect(recommend(catalog,{...base,region:"Ужгород",maxBudget:6000}).results.map(x=>x.product.id).sort()).toEqual([4,7]);
  });
  test("missing coverage does not satisfy request",()=>{
    expect(recommend([{...catalog[0],coverageComponents:[]}],base).results).toHaveLength(0);
  });
  test("zero coverage limit does not satisfy request",()=>{
    expect(recommend([{...catalog[0],coverageComponents:[{coverageType:"ambulatory",limitAmount:0}]}],base).results).toHaveLength(0);
  });
  test("NaN component limit does not confirm coverage",()=>{
    expect(recommend([{...catalog[0],coverageComponents:[{coverageType:"ambulatory",limitAmount:NaN}]}],base).results).toHaveLength(0);
  });
  test("complex request requires both outpatient and inpatient",()=>{
    expect(recommend([{...catalog[0],programType:"complex"}],{...base,requiredProgramType:"complex"}).results).toHaveLength(0);
  });
  test("chronic need requires positive chronic component, not just no exclusion",()=>{
    const r=recommend(catalog,{...base,age:60,requiredProgramType:"complex",maxBudget:40000,specialNeeds:["хронічні захворювання"]});
    expect(r.results.map(x=>x.product.id)).toEqual([8]);
  });
});

describe("Regression: weights and edge scoring",()=>{
  const allZero={coverage:0,price:0,network:0,deductible:0,waiting:0};
  test("negative weights rejected by API schema",()=>expect(userProfileSchema.safeParse({...base,priorityWeights:{price:-1}}).success).toBe(false));
  test("all-zero effective weights rejected",()=>expect(()=>recommend(catalog,{...base,priorityWeights:allZero})).toThrow());
  test("invalid weights rejected even for empty catalog",()=>expect(()=>recommend([],{...base,priorityWeights:{price:-1}})).toThrow());
  test("NaN weight rejected",()=>expect(()=>recommend(catalog,{...base,priorityWeights:{price:NaN}})).toThrow());
  test("infinite weight rejected",()=>expect(()=>recommend(catalog,{...base,priorityWeights:{price:Infinity}})).toThrow());
  test("overflowing weight sum rejected",()=>expect(()=>recommend(catalog,{...base,priorityWeights:{price:Number.MAX_VALUE,coverage:Number.MAX_VALUE}})).toThrow());
  test("partial zeros preserve defaults for omitted fields",()=>{
    const r=recommend([],{...base,priorityWeights:{price:0}});expect(r.weightsUsed.price).toBe(0);
    expect(Object.values(r.weightsUsed).reduce((a,b)=>a+b,0)).toBeCloseTo(1);
  });
  test("single candidate is neutral at 0.5",()=>{
    const r=recommend([catalog[0]],base);expect(r.results[0].score).toBeCloseTo(.5);
    expect(r.results[0].breakdown.price).toBeCloseTo(.15);
    expect(r.results[0].explanation).toContain("не дають порівняльної переваги");
  });
  test("equal candidates have neutral scores",()=>{
    const r=recommend([catalog[0],{...catalog[0],id:99}],base);for(const x of r.results)expect(x.score).toBeCloseTo(.5,12);
  });
  test("explanation distinguishes budget relaxation and drawbacks",()=>{
    const r=recommend(catalog,{...base,maxBudget:3700});expect(r.results[0].explanation).toContain("перевищує початковий бюджет");
    expect(r.results[0].explanation).toContain("франшиза");
  });
  test("unknown special need rejected, not silently satisfied",()=>expect(userProfileSchema.safeParse({...base,specialNeeds:["невідоме"]}).success).toBe(false));
  test("product nationwide marker is not a user location",()=>expect(userProfileSchema.safeParse({...base,region:"nationwide"}).success).toBe(false));
});