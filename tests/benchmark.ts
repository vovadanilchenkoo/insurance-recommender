/** Function-only timing; no DB or network, synthetic catalog. */
import { recommend } from "../src/lib/recommendation";
import { catalog, profiles } from "./fixtures";
import { mkdirSync, writeFileSync } from "node:fs";
import { cpus, platform, arch } from "node:os";
const inputs = profiles();
function stats(times: number[]) {
  const s = [...times].sort((a,b)=>a-b);
  const at = (p:number) => s[Math.ceil(p*s.length)-1];
  return {n:s.length,min:s[0],mean:s.reduce((a,b)=>a+b,0)/s.length,max:s.at(-1),p50:at(.5),p95:at(.95),p99:at(.99)};
}
function measure(data: typeof catalog, requests: typeof inputs) {
  for (const u of requests.slice(0,500)) recommend(data,u);
  const times:number[]=[];let empty=0,relaxed=0;
  for (const u of requests) { const start=performance.now();const r=recommend(data,u);times.push(performance.now()-start);
    if (!r.results.length)empty++;if(r.diagnostics.relaxationStepsApplied.length)relaxed++;
  }
  return {...stats(times),empty,relaxed,timingsMs:times};
}
const baseline = measure(catalog,inputs);
const scaling = [1,10,50,100,500].map(factor=>{
  const expanded=Array.from({length:factor},(_,i)=>catalog.map(p=>({...p,id:p.id+i*catalog.length}))).flat();
  return {products:expanded.length,...measure(expanded,inputs.slice(0,500))};
});
const report={date:"2026-10-18",bun:Bun.version,platform:platform(),arch:arch(),cpu:cpus()[0]?.model,
  seed:20261005,warmupRequests:500,scope:"recommend only including validation, no IO/network; duplicated synthetic catalog for scaling",baseline,scaling};
mkdirSync("artifacts",{recursive:true});writeFileSync("artifacts/benchmark.json",JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,baseline:{...baseline,timingsMs:undefined},scaling:scaling.map(x=>({...x,timingsMs:undefined}))},null,2));