import assert from "node:assert/strict";
import test from "node:test";

async function render(path="/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`,{headers:{accept:"text/html"}}),{ASSETS:{fetch:async()=>new Response("Not found",{status:404})}},{waitUntil(){},passThroughOnException(){}});
}

test("server-renders the Future Mind Global homepage",async()=>{
  const response=await render();assert.equal(response.status,200);assert.match(response.headers.get("content-type")??"",/^text\/html\b/i);
  const html=await response.text();assert.match(html,/<title>Future Mind Global/i);assert.match(html,/Think beyond borders/i);assert.match(html,/id="skills"/);assert.match(html,/id="verify"/);assert.doesNotMatch(html,/Your site is taking shape/);
});

test("server-renders the secure admin and exam routes",async()=>{
  const [admin,studio,exams]=await Promise.all([render("/admin"),render("/admin/studio"),render("/exams")]);
  assert.equal(admin.status,200);assert.equal(studio.status,200);assert.equal(exams.status,200);
  assert.match(await admin.text(),/Verifying secure access/i);assert.match(await studio.text(),/Website Studio/i);assert.match(await exams.text(),/EXAM CENTRE|Checking your account/i);
});
