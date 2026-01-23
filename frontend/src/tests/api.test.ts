import { describe, it, expect, vi, beforeEach } from "vitest";
import { createUser, getUsers, updateUser, deleteUser } from "../api";

const fetchMock = vi.fn();
// @ts-expect-error override
global.fetch = fetchMock;

beforeEach(() => {
  fetchMock.mockReset();
});

describe("api", () => {
  it("getUsers retorna json", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => [{ id: "1" }] });
    const data = await getUsers();
    expect(data).toEqual([{ id: "1" }]);
  });

  it("createUser envia payload", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: "1" }) });
    const data = await createUser({ email: "a@b.com" });
    expect(data).toEqual({ id: "1" });
  });

  it("updateUser envia payload", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ id: "1" }) });
    const data = await updateUser("1", { name: "Ana" });
    expect(data).toEqual({ id: "1" });
  });

  it("deleteUser retorna true", async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({}) });
    const ok = await deleteUser("1");
    expect(ok).toEqual(true);
  });
});
