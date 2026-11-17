import { describe, expect, it } from "vitest";
import { parseHash } from "./router";

describe("parseHash", () => {
  it("defaults to home", () => {
    expect(parseHash("")).toEqual({ name: "home", param: null });
    expect(parseHash("#/")).toEqual({ name: "home", param: null });
  });

  it("reads a page and its parameter", () => {
    expect(parseHash("#/signals")).toEqual({ name: "signals", param: null });
    expect(parseHash("#/stock/MSFT")).toEqual({ name: "stock", param: "MSFT" });
    expect(parseHash("#/stock/BRK.B")).toEqual({ name: "stock", param: "BRK.B" });
    expect(parseHash("#/stock/BTC-USD")).toEqual({ name: "stock", param: "BTC-USD" });
  });

  it("decodes encoded symbols", () => {
    expect(parseHash("#/stock/GC%3DF")).toEqual({ name: "stock", param: "GC=F" });
  });
});
