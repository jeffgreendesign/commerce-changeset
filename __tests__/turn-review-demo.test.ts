import { describe, expect, it } from "vitest";
import { DEMO_TURN_REVIEW } from "@/lib/turn-review/demo-turn";

const prohibitedPhrases = [
  "production-ready",
  "deployed",
  "live system",
  "used in production",
  "at scale",
];

const liveIntegrationPhrases = [
  "real customer",
  "real order",
  "production store",
  "live Shopify",
  "live Google Sheet",
];

describe("DEMO_TURN_REVIEW", () => {
  it("has exactly four moves", () => {
    expect(DEMO_TURN_REVIEW.moves).toHaveLength(4);
  });

  it("references valid proposed and default selected moves", () => {
    const moveIds = new Set(DEMO_TURN_REVIEW.moves.map((move) => move.id));

    expect(moveIds.has(DEMO_TURN_REVIEW.proposedMoveId)).toBe(true);
    expect(moveIds.has(DEMO_TURN_REVIEW.defaultSelectedMoveId)).toBe(true);
  });

  it("includes regret, rollback, and linked receipt previews for every move", () => {
    for (const move of DEMO_TURN_REVIEW.moves) {
      expect(move.regret.ifChosen).toBeTruthy();
      expect(move.regret.ifRejected).toBeTruthy();

      if (move.rollback.available) {
        expect(move.rollback.steps.length).toBeGreaterThan(0);
      }

      expect(move.receiptPreview.chosenMoveId).toBe(move.id);
    }
  });

  it("uses cleared state only for low-blast-radius moves", () => {
    const clearedMoves = DEMO_TURN_REVIEW.moves.filter(
      (move) => move.policyState === "cleared",
    );

    expect(clearedMoves.length).toBeGreaterThan(0);
    for (const move of clearedMoves) {
      expect(move.blastRadius).toBeLessThanOrEqual(35);
    }
  });

  it("does not include prohibited public claims", () => {
    const serialized = JSON.stringify(DEMO_TURN_REVIEW).toLowerCase();

    for (const phrase of prohibitedPhrases) {
      expect(serialized).not.toContain(phrase.toLowerCase());
    }
  });

  it("does not include live integration phrases", () => {
    const serialized = JSON.stringify(DEMO_TURN_REVIEW).toLowerCase();

    for (const phrase of liveIntegrationPhrases) {
      expect(serialized).not.toContain(phrase.toLowerCase());
    }
  });
});
