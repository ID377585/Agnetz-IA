import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import App from "../App";
import * as api from "../api";

vi.mock("../api", () => ({
  getUsers: vi.fn().mockResolvedValue([]),
  createUser: vi.fn().mockResolvedValue({}),
  updateUser: vi.fn().mockResolvedValue({}),
  deleteUser: vi.fn().mockResolvedValue(true)
}));

describe("App", () => {
  it("renderiza titulo", async () => {
    render(<App />);
    expect(screen.getByText(/Agnetz Full-Stack/i)).toBeInTheDocument();
  });

  it("carrega usuarios", async () => {
    render(<App />);
    expect(api.getUsers).toHaveBeenCalled();
  });
});
