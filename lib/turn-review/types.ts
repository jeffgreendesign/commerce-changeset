export type TurnMoveKind = "aggressive" | "controlled" | "scout" | "defensive";

export type TurnRiskState = "cleared" | "review" | "blocked";

export interface BoardPressureMetric {
  id: string;
  label: string;
  value: number; // 0-100
  state: TurnRiskState;
  note: string;
}

export interface RegretPreview {
  ifChosen: string;
  ifRejected: string;
}

export interface RollbackRehearsal {
  available: boolean;
  steps: string[];
  residualRisk: string;
}

export interface TurnReceiptPreview {
  receiptId: string;
  chosenMoveId: string;
  policyDecision: string;
  approvalMode: string;
  rollbackAvailable: boolean;
  auditLabel: string;
}

export interface TurnMove {
  id: string;
  kind: TurnMoveKind;
  label: string;
  oneLine: string;
  policyState: TurnRiskState;
  blastRadius: number; // 0-100
  reversibility: number; // 0-100
  evidenceStrength: number; // 0-100
  timeToLearn: string;
  operatorCost: string;
  regret: RegretPreview;
  rollback: RollbackRehearsal;
  receiptPreview: TurnReceiptPreview;
}

export interface TurnReviewScenario {
  id: string;
  title: string;
  situation: string;
  proposedMoveId: string;
  board: BoardPressureMetric[];
  moves: TurnMove[];
  defaultSelectedMoveId: string;
}
