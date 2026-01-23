import { test } from "node:test";
import assert from "node:assert";
import request from "supertest";

import { app } from "../src/app";

test("CRUD usuarios", async () => {
  const created = await request(app)
    .post("/api/users")
    .send({ email: `user_${Date.now()}@exemplo.com`, name: "Test" });

  assert.equal(created.status, 201);
  const id = created.body.id;
  assert.ok(id);

  const list = await request(app).get("/api/users");
  assert.equal(list.status, 200);

  const updated = await request(app)
    .put(`/api/users/${id}`)
    .send({ name: "Updated" });
  assert.equal(updated.status, 200);

  const removed = await request(app).delete(`/api/users/${id}`);
  assert.equal(removed.status, 204);
});
