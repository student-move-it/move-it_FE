import test from "node:test";
import assert from "node:assert/strict";
import handler from "../api/proxy.js";

const response = () => ({code:0, headers:{}, body:null,
  setHeader(name,value){this.headers[name]=value;},
  status(code){this.code=code;return this;},
  json(body){this.body=body;return this;}, send(body){this.body=body;return this;},
});
test("proxy restricts methods and endpoints", async () => {
  const post=response(); await handler({method:"POST",query:{path:"classes"}},post);
  assert.equal(post.code,405);
  for (const path of ["classroom", "../health", "classes/12/extra", "https://example.org", ["classes"]]) {
    const res=response(); await handler({method:"GET",query:{path}},res); assert.equal(res.code,404);
  }
});
test("missing server key returns configuration error", async () => {
  const saved=process.env.BACKEND_API_KEY; delete process.env.BACKEND_API_KEY;
  try { const res=response(); await handler({method:"GET",query:{path:"classes"}},res); assert.equal(res.code,503); }
  finally { if(saved === undefined) delete process.env.BACKEND_API_KEY; else process.env.BACKEND_API_KEY=saved; }
});
test("proxy forwards server credential and preserves backend errors", async () => {
  const oldFetch=globalThis.fetch, saved=process.env.BACKEND_API_KEY;
  process.env.BACKEND_API_KEY="test-only-credential";
  globalThis.fetch=async (url,options) => {
    assert.equal(url,"https://move-it-be.vercel.app/classes/12");
    assert.equal(options.headers["X-API-Key"],"test-only-credential");
    return new Response(JSON.stringify({success:false,error:{message:"not registered"}}),{status:404,headers:{"Content-Type":"application/json"}});
  };
  try {
    const res=response(); await handler({method:"GET",query:{path:"classes/12"}},res);
    assert.equal(res.code,404); assert.equal(res.headers["Cache-Control"],"no-store");
    assert.equal(JSON.parse(res.body).error.message,"not registered");
    assert.ok(!res.body.includes("test-only-credential"));
  } finally { globalThis.fetch=oldFetch; if(saved === undefined) delete process.env.BACKEND_API_KEY; else process.env.BACKEND_API_KEY=saved; }
});
test("connection failure returns JSON API error", async () => {
  const oldFetch=globalThis.fetch, saved=process.env.BACKEND_API_KEY;
  process.env.BACKEND_API_KEY="test-only-credential";
  globalThis.fetch=async () => {throw new Error("offline");};
  try { const res=response(); await handler({method:"GET",query:{path:"classes"}},res); assert.equal(res.code,502); assert.equal(res.body.success,false); }
  finally { globalThis.fetch=oldFetch; if(saved === undefined) delete process.env.BACKEND_API_KEY; else process.env.BACKEND_API_KEY=saved; }
});
