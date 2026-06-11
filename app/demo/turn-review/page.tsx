import { DEMO_TURN_REVIEW } from "@/lib/turn-review/demo-turn";
import { TurnReviewBoard } from "@/components/turn-review/turn-review-board";

export default function TurnReviewDemoPage() {
  return <TurnReviewBoard scenario={DEMO_TURN_REVIEW} />;
}
