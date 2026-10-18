import { recommend, type InsuranceProductInput, type UserProfile } from "../src/lib/recommendation";
import { catalog, base, profiles } from "./fixtures";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
// Oracle intentionally does not call production predicates or normalization.
function failures(p: InsuranceProductInput,u: UserProfile,stage=0): string[] {
 const programKinds=u.requiredProgramType==='complex'?['ambulatory','stationary']:[u.requiredProgramType];
 const dictionary:Record<string,string>={'хронічні захворювання':'chronic','стоматологія':'dental','материнство':'maternity','онкологія':'oncology','ортодонтія':'orthodontics','косметологія':'cosmetology'};
 const required=[...programKinds,...(u.specialNeeds??[]).map(x=>dictionary[x])];
 const predicates=[p.minAge<=u.age&&u.age<=p.maxAge,p.regions.includes(u.region)||p.regions.includes('nationwide'),
  p.programType===u.requiredProgramType||p.programType==='complex',p.annualPrice<=u.maxBudget*(stage>=1?1.15:1),
  !(u.specialNeeds??[]).some(n=>p.exclusions.includes(n)),p.isActive,
  stage>=2||u.minCoverageLimit===undefined||p.coverageLimit>=u.minCoverageLimit,
  required.every(k=>p.coverageComponents.some(c=>c.coverageType===k&&Number.isFinite(c.limitAmount)&&c.limitAmount>0))];
 return predicates.flatMap((ok,i)=>ok?[]:[`C${i+1}`]);
}
const specs:{id:string;label:string;profile:UserProfile;ids:number[];top:number|null;stage:number}[]=[
 {id:'S1',label:'Студент',profile:{...base,age:22,maxBudget:6000},ids:[4,7],top:4,stage:0},
 {id:'S2',label:'Дитина',profile:{...base,age:8,maxBudget:9000},ids:[1,4,7],top:1,stage:0},
 {id:'S3',label:'72 роки, хронічна потреба',profile:{...base,age:72,requiredProgramType:'complex',maxBudget:40000,specialNeeds:['хронічні захворювання']},ids:[8],top:8,stage:0},
 {id:'S4',label:'Стаціонар із мінімальним покриттям',profile:{...base,age:35,requiredProgramType:'stationary',maxBudget:20000,minCoverageLimit:200000},ids:[3],top:3,stage:0},
 {id:'S5',label:'Стоматологія у Києві',profile:{...base,age:28,requiredProgramType:'dental',maxBudget:4000},ids:[5],top:5,stage:0},
 {id:'S6',label:'Материнство у Львові',profile:{...base,requiredProgramType:'maternity',region:'Львів',maxBudget:30000,minCoverageLimit:150000,specialNeeds:['материнство']},ids:[6],top:6,stage:0},
 {id:'S7',label:'Малий бюджет',profile:{...base,maxBudget:3700},ids:[7],top:7,stage:1},
 {id:'S8',label:'Недосяжний ліміт',profile:{...base,minCoverageLimit:500000},ids:[1,4,7],top:1,stage:2},
 {id:'S9',label:'Стоматологія у Львові',profile:{...base,requiredProgramType:'dental',region:'Львів',maxBudget:4000},ids:[],top:null,stage:2},
 {id:'S10',label:'Вік поза межами каталогу',profile:{...base,age:100},ids:[],top:null,stage:2},
];
function oracleScores(products:InsuranceProductInput[]) {
 const keys=['coverageLimit','annualPrice','networkSizeScore','deductible','waitingPeriodDays'] as const,weights=[.35,.30,.15,.10,.10];
 return products.map(p=>({id:p.id,score:keys.reduce((s,k,i)=>{
  const lo=Math.min(...products.map(p=>p[k])),hi=Math.max(...products.map(p=>p[k]));
  const z=lo===hi?.5:(p[k]-lo)/(hi-lo);return s+weights[i]*([0,2].includes(i)?z:1-z);
 },0)}));
}
const scenarios=specs.map(s=>{
 const result=recommend(catalog,s.profile),got=result.results.map(r=>r.product.id).sort((a,b)=>a-b);
 const independent=catalog.filter(p=>failures(p,s.profile,s.stage).length===0),scores=oracleScores(independent);
 const pass=JSON.stringify(got)===JSON.stringify(s.ids)&&JSON.stringify(independent.map(p=>p.id))===JSON.stringify(s.ids)
  &&(result.results[0]?.product.id??null)===s.top&&result.diagnostics.relaxationStepsApplied.length===s.stage
  &&result.results.every(r=>Math.abs(r.score-scores.find(x=>x.id===r.product.id)!.score)<1e-12);
 return {...s,pass,result};
});
const inputs=profiles(),codes=Array.from({length:8},(_,i)=>`C${i+1}`);
const pairs=Object.fromEntries(codes.map(c=>[c,0])),recoverIfDropped={...pairs};
let empty=0,relaxed=0;const stages=[0,0,0],emptyByAge=Array.from({length:8},()=>({n:0,empty:0}));
const records=inputs.map((profile,index)=>{
 const result=recommend(catalog,profile),stage=result.diagnostics.relaxationStepsApplied.length;
 const first=catalog.flatMap(p=>failures(p,profile));for(const c of first)pairs[c]++;
 const bin=emptyByAge[Math.floor((profile.age-1)/10)];bin.n++;stages[stage]++;if(stage>0)relaxed++;
 if(!result.results.length){empty++;bin.empty++;for(const c of codes)if(catalog.some(p=>failures(p,profile,2).every(f=>f===c)))recoverIfDropped[c]++;}
 for(const c of codes){const actual=Object.entries(result.diagnostics.eliminationCounts).find(([k])=>k.startsWith(c+'_'))?.[1]??0;
  if(actual!==first.filter(x=>x===c).length)throw new Error('Diagnostic discrepancy '+c);}
 if(result.results.some(x=>failures(x.product,profile,stage).length))throw new Error('Constraint violated');
 return {index,profile,ids:result.results.map(x=>x.product.id),stage};
});
// Search for reversal among existing candidates when a third eligible alternative is added.
let eligiblePairs=0,reversals=0;let example:unknown=null;
for(const profile of inputs){
 const full=recommend(catalog,profile);if(full.diagnostics.relaxationStepsApplied.length||full.results.length<3)continue;
 const candidates=full.results.map(r=>r.product);
 for(let i=0;i<candidates.length;i++)for(let j=i+1;j<candidates.length;j++){
  eligiblePairs++;const pair=recommend([candidates[i],candidates[j]],profile).results;
  const a=pair.find(x=>x.product.id===candidates[i].id)!.score,b=pair.find(x=>x.product.id===candidates[j].id)!.score;
  const fa=full.results.find(x=>x.product.id===candidates[i].id)!.score,fb=full.results.find(x=>x.product.id===candidates[j].id)!.score;
  if((a-b)*(fa-fb)<-1e-12){reversals++;example??={profile,pair:pair.map(x=>({id:x.product.id,score:x.score})),full:full.results.map(x=>({id:x.product.id,score:x.score}))};}
 }
}
const report={date:'2026-10-18',bun:Bun.version,seed:20261005,algorithmSha256:createHash('sha256').update(readFileSync('src/lib/recommendation.ts')).digest('hex'),
 scenarios,sample:{n:inputs.length,empty,relaxed,stages,pairs,recoverIfDropped,emptyByAge,records},sensitivity:{eligiblePairs,reversals,example}};
mkdirSync('artifacts',{recursive:true});writeFileSync('artifacts/evaluation.json',JSON.stringify(report,null,2));
writeFileSync('artifacts/catalog.json',JSON.stringify(catalog,null,2));
console.log(JSON.stringify({...report,scenarios:scenarios.map(s=>({id:s.id,pass:s.pass,ids:s.ids,top:s.top,score:s.result.results[0]?.score,stage:s.stage})),sample:{...report.sample,records:undefined}},null,2));
if(scenarios.some(s=>!s.pass))throw new Error('Scenario failure');