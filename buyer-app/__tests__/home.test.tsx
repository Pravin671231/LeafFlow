import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import Home from "@/app/page";

describe("Home", () => {
  it("renders homepage without crashing", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: /leafflow shop/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /browse plants/i }),
    ).toBeInTheDocument();
  });
});
