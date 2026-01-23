import { test } from "node:test";
import assert from "node:assert";
import request from "supertest";

import { app } from "../src/app";

test("GET /api/health retorna ok", async () => {
  const res = await request(app).get("/api/health");
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.ok(res.body.ts);
});
