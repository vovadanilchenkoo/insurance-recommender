import { afterAll, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { base } from "./fixtures";

const dir=mkdtempSync(join(tmpdir(),"insurance-api-"));
process.env.DATABASE_URL=join(dir,"test.db");
const sqlite=new Database(process.env.DATABASE_URL);
sqlite.exec(`CREATE TABLE insurance_products (
 id INTEGER PRIMARY KEY, company TEXT NOT NULL, product_name TEXT NOT NULL, program_type TEXT NOT NULL,
 min_age INTEGER NOT NULL,max_age INTEGER NOT NULL,annual_price REAL NOT NULL,coverage_limit REAL NOT NULL,
 deductible REAL NOT NULL,network_size_score INTEGER NOT NULL,regions TEXT NOT NULL,exclusions TEXT NOT NULL,
 waiting_period_days INTEGER NOT NULL,is_active INTEGER NOT NULL,created_at INTEGER NOT NULL);
 CREATE TABLE coverage_components (id INTEGER PRIMARY KEY,product_id INTEGER NOT NULL,name TEXT NOT NULL,
 coverage_type TEXT NOT NULL DEFAULT 'unknown',description TEXT NOT NULL,limit_amount REAL NOT NULL);
 CREATE TABLE recommendation_requests (id INTEGER PRIMARY KEY,user_profile_json TEXT NOT NULL,result_json TEXT NOT NULL,
 compute_time_ms REAL NOT NULL,candidates_after_filter INTEGER NOT NULL,created_at INTEGER NOT NULL);
 INSERT INTO insurance_products VALUES(1,'Synthetic','Test','ambulatory',1,80,5000,30000,0,50,'["nationwide"]','[]',0,1,0);
 INSERT INTO coverage_components VALUES(1,1,'Test outpatient','ambulatory','Synthetic',30000);`);
const {router}=await import("../src/router");
const {createApp}=await import("../src/app");
const app=createApp(router);
const link=new RPCLink({url:"http://localhost/api/rpc",fetch:async(req,init)=>app.fetch(new Request(req,init))});
const client=createORPCClient<import("../src/router").AppRouterClient>(link);
afterAll(()=>{sqlite.close();rmSync(dir,{recursive:true,force:true});});
test("HTTP health check",async()=>expect((await app.request('/api/health')).status).toBe(200));
test("API exposes exactly three public procedures",()=>expect(Object.keys(router.recommend).sort()).toEqual(["getProduct","getRecommendations","listCatalog"]));
test("removed log endpoint returns 404",async()=>expect((await app.request('/api/rpc/recommend/getRequestLog',{method:'POST',headers:{'Content-Type':'application/json'},body:'{"json":{"limit":10}}'})).status).toBe(404));
test("valid API request returns recommendation and writes private local log",async()=>{
 const r=await client.recommend.getRecommendations(base);expect(r.results.map(x=>x.product.id)).toEqual([1]);
 expect(r.results[0].score).toBeCloseTo(.5);expect(sqlite.query('SELECT COUNT(*) AS n FROM recommendation_requests').get()).toEqual({n:1});
});
test("API rejects negative weights",async()=>expect(client.recommend.getRecommendations({...base,priorityWeights:{price:-1}})).rejects.toThrow());
test("API rejects zero effective sum",async()=>expect(client.recommend.getRecommendations({...base,priorityWeights:{coverage:0,price:0,network:0,deductible:0,waiting:0}})).rejects.toThrow());
test("API rejects wrong JSON type",async()=>expect(client.recommend.getRecommendations({...base,priorityWeights:{price:"bad" as unknown as number}})).rejects.toThrow());
test("API rejects unrecognized coverage need",async()=>expect(client.recommend.getRecommendations({...base,specialNeeds:["unknown" as "материнство"]})).rejects.toThrow());
test("API catalog includes structured components",async()=>expect((await client.recommend.listCatalog())[0].coverageComponents[0].coverageType).toBe("ambulatory"));
test("API product details include component type",async()=>expect((await client.recommend.getProduct({id:1})).components[0].coverageType).toBe("ambulatory"));