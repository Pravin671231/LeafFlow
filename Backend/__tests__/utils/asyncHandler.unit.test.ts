import { describe, it, expect, vi } from "vitest";
import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../../src/utils/asyncHandler";

describe("asyncHandler", () => {
  it("U9: calls next(err) when the wrapped async function throws", async () => {
    const error = new Error("test error");
    const fn = async (_req: Request, _res: Response, _next: NextFunction) => {
      throw error;
    };
    const handler = asyncHandler(fn);
    const next = vi.fn();
    await handler({} as Request, {} as Response, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});
