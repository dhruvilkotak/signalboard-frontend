import { afterEach, describe, expect, it, vi } from "vitest";
import { allTimeReturn, dayChange, positionValue, topMover, signalsLeft, trialDaysLeft, allocation } from "./portfolio";

describe("portfolio", () => {
  afterEach(() => vi.useRealTimers());

  it("computes all-time return against deposits", () => {
    expect(allTimeReturn({ total_value: 10500, total_deposited: 10000 })).toEqual({ amount: 500, pct: 5 });
    expect(allTimeReturn({ total_value: 100 })).toEqual({ amount: 0, pct: 0 });
  });

  it("sums today's change over positions with quotes", () => {
    const positions = [{ symbol: "MSFT", shares: 2 }, { symbol: "NVDA", shares: 10 }, { symbol: "NOQ", shares: 5 }];
    const quotes = { MSFT: { change_amt: 3 }, NVDA: { change_amt: -0.5 } };
    expect(dayChange(positions, quotes)).toBe(1);
  });

  it("values a position from the live quote, falling back to the stored price", () => {
    const pos = { symbol: "MSFT", shares: 2, avg_buy_price: 100, current_price: 90 };
    expect(positionValue(pos, { price: 110 })).toEqual({ value: 220, gainPct: 10 });
    expect(positionValue(pos, undefined)).toEqual({ value: 180, gainPct: -10 });
  });

  it("finds the biggest mover by absolute change", () => {
    const quotes = { A: { change_pct: 1 }, B: { change_pct: -3 }, C: {} };
    expect(topMover(["A", "B", "C"], quotes)).toBe("B");
    expect(topMover([], quotes)).toBeNull();
  });

  it("reports signals left, or null when unlimited", () => {
    expect(signalsLeft({ ondemand: { limit: 5, used: 2, period: "week" } })).toEqual({ left: 3, limit: 5, weekly: true });
    expect(signalsLeft({ ondemand: { limit: null } })).toBeNull();
    expect(signalsLeft(null)).toBeNull();
  });

  it("counts trial days left, never below zero", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-16T12:00:00Z"));
    expect(trialDaysLeft({ trial_ends_at: "2026-11-21T12:00:00Z" })).toBe(5);
    expect(trialDaysLeft({ trial_ends_at: "2026-11-01T00:00:00Z" })).toBe(0);
    expect(trialDaysLeft({})).toBeNull();
  });

  it("splits the portfolio into cash, stocks and Auto-Trader", () => {
    const parts = allocation({ available_cash: 6000, manual_value: 2000, strategy_value: 2000 });
    expect(parts.map(p => p.value)).toEqual([6000, 2000, 2000]);
  });
});
