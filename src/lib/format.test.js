import { describe, expect, it } from "vitest";
import { money, signedMoney, pct, tone, compactCap, compactVolume, shares } from "./format";

describe("format", () => {
  it("formats money with thousands separators", () => {
    expect(money(10234.5)).toBe("$10,234.50");
    expect(money(6120, 0)).toBe("$6,120");
    expect(money(null)).toBe("$0.00");
  });

  it("signs money and percentages", () => {
    expect(signedMoney(14.16)).toBe("+$14.16");
    expect(signedMoney(-11.25)).toBe("−$11.25");
    expect(pct(2.345)).toBe("+2.35%");
    expect(pct(-1.3)).toBe("−1.30%");
  });

  it("picks the gain / loss class", () => {
    expect(tone(0)).toBe("sb-up");
    expect(tone(-0.01)).toBe("sb-down");
  });

  it("shortens market cap and volume", () => {
    expect(compactCap(3.16e12)).toBe("$3.16T");
    expect(compactCap(2.4e9)).toBe("$2.4B");
    expect(compactCap(0)).toBe("—");
    expect(compactVolume(15_300_000)).toBe("15.3M");
  });

  it("drops trailing zeros from share counts", () => {
    expect(shares(2.5)).toBe("2.5");
    expect(shares(10)).toBe("10");
    expect(shares(0.12345)).toBe("0.1235");
  });
});
