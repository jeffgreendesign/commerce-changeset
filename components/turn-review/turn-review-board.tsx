"use client";

import { useMemo, useState } from "react";
import type { TurnMove, TurnReviewScenario, TurnRiskState } from "@/lib/turn-review/types";

interface TurnReviewBoardProps {
  scenario: TurnReviewScenario;
  embedded?: boolean;
}

const stateStyles: Record<TurnRiskState, string> = {
  cleared: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
  review: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  blocked: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
};

const stateSurfaceStyles: Record<TurnRiskState, string> = {
  cleared: "border-emerald-200 bg-emerald-50/70 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-100",
  review: "border-amber-200 bg-amber-50/80 text-amber-950 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-100",
  blocked: "border-red-200 bg-red-50/80 text-red-950 dark:border-red-900 dark:bg-red-950/20 dark:text-red-100",
};

const moveContrast: Record<
  TurnMove["kind"],
  {
    label: string;
    mobileSignal: string;
    emphasis: string;
    border: string;
    tint: string;
    accent: string;
  }
> = {
  aggressive: {
    label: "Max reach / max cleanup",
    mobileSignal: "Fastest upside, widest blast radius",
    emphasis: "HIGH BLAST",
    border: "border-red-200 dark:border-red-900",
    tint: "bg-red-50/70 dark:bg-red-950/20",
    accent: "text-red-700 dark:text-red-300",
  },
  controlled: {
    label: "Best useful test",
    mobileSignal: "Balanced: one SKU, approval, rollback",
    emphasis: "RECOMMENDED",
    border: "border-amber-200 dark:border-amber-900",
    tint: "bg-amber-50/80 dark:bg-amber-950/20",
    accent: "text-amber-700 dark:text-amber-300",
  },
  scout: {
    label: "Safest learning",
    mobileSignal: "No write, better evidence, slower result",
    emphasis: "LOWEST RISK",
    border: "border-emerald-200 dark:border-emerald-900",
    tint: "bg-emerald-50/70 dark:bg-emerald-950/20",
    accent: "text-emerald-700 dark:text-emerald-300",
  },
  defensive: {
    label: "Stop and review",
    mobileSignal: "Avoids execution, highest opportunity cost",
    emphasis: "HOLD TURN",
    border: "border-border",
    tint: "bg-muted/50",
    accent: "text-muted-foreground",
  },
};

export function TurnReviewBoard({ scenario, embedded = false }: TurnReviewBoardProps) {
  const [selectedMoveId, setSelectedMoveId] = useState(scenario.defaultSelectedMoveId);

  const proposedMove = useMemo(
    () => scenario.moves.find((move) => move.id === scenario.proposedMoveId) ?? scenario.moves[0],
    [scenario.moves, scenario.proposedMoveId],
  );
  const selectedMove = useMemo(
    () => scenario.moves.find((move) => move.id === selectedMoveId) ?? proposedMove,
    [scenario.moves, selectedMoveId, proposedMove],
  );

  return (
    <main className={`${embedded ? "min-h-0 flex-1 overflow-auto" : "min-h-dvh"} bg-background text-foreground`}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <SituationStrip scenario={scenario} />

        <section className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <BoardMeters scenario={scenario} />
          <ProposedMoveCard move={proposedMove} selectedMoveId={selectedMove.id} />
        </section>

        <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
          <MoveSelectionLane
            moves={scenario.moves}
            proposedMoveId={scenario.proposedMoveId}
            selectedMoveId={selectedMove.id}
            onSelect={setSelectedMoveId}
          />
          <EndTurnReceipt move={selectedMove} />
        </section>
      </div>
    </main>
  );
}

function SituationStrip({ scenario }: { scenario: TurnReviewScenario }) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Turn Review · synthetic demo
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            {scenario.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {scenario.situation}
          </p>
        </div>
        <div className="rounded-lg border bg-muted/50 px-3 py-2">
          <p className="text-xs font-semibold uppercase tracking-wide">No execution</p>
          <p className="mt-1 text-xs text-muted-foreground">Choose a move; preview the receipt; no API calls.</p>
        </div>
      </div>
    </section>
  );
}

function BoardMeters({ scenario }: { scenario: TurnReviewScenario }) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Board meters
        </h2>
        <span className="text-xs text-muted-foreground">pressure before the turn</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {scenario.board.map((metric) => (
          <article key={metric.id} className={`rounded-lg border p-3 ${stateSurfaceStyles[metric.state]}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{metric.label}</p>
                <p className="mt-1 text-xs leading-5 opacity-80">{metric.note}</p>
              </div>
              <StatePill state={metric.state} />
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full border border-current/20 bg-background/60">
              <div className="h-full bg-current" style={{ width: `${metric.value}%` }} />
            </div>
            <p className="mt-2 font-mono text-[10px] uppercase tracking-wide opacity-75">
              {metric.value}/100
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProposedMoveCard({ move, selectedMoveId }: { move: TurnMove; selectedMoveId: string }) {
  const selectedDiffers = selectedMoveId !== move.id;

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-amber-950 shadow-sm dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Proposed path</p>
          <h2 className="mt-2 text-xl font-semibold">{move.label}</h2>
          <p className="mt-2 text-sm leading-6 opacity-80">{move.oneLine}</p>
        </div>
        <StatePill state={move.policyState} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat label="blast radius" value={move.blastRadius} />
        <Stat label="rollback" value={move.reversibility} />
        <Stat label="evidence" value={move.evidenceStrength} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border bg-background/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why</p>
          <p className="mt-1 text-xs leading-5 opacity-80">
            Strongest useful action: bounded SKU, approval gate, rehearsed return path.
          </p>
        </div>
        <div className="rounded-lg border bg-background/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Selection</p>
          <p className="mt-1 text-xs leading-5 opacity-80">
            {selectedDiffers ? "Operator has selected a different move." : "Operator selection matches the AI proposal."}
          </p>
        </div>
      </div>
    </section>
  );
}

function MoveSelectionLane({
  moves,
  proposedMoveId,
  selectedMoveId,
  onSelect,
}: {
  moves: TurnMove[];
  proposedMoveId: string;
  selectedMoveId: string;
  onSelect: (moveId: string) => void;
}) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Move selection
        </h2>
        <span className="text-xs text-muted-foreground">compare before reading receipt</span>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {moves.map((move) => (
          <MoveCard
            key={move.id}
            move={move}
            isProposed={move.id === proposedMoveId}
            isSelected={move.id === selectedMoveId}
            onSelect={() => onSelect(move.id)}
          />
        ))}
      </div>
    </section>
  );
}

function MoveCard({
  move,
  isProposed,
  isSelected,
  onSelect,
}: {
  move: TurnMove;
  isProposed: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const contrast = moveContrast[move.kind];

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={`rounded-xl border p-3 text-left shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
        isSelected
          ? "border-primary bg-primary/5 text-foreground ring-2 ring-primary/20"
          : `${contrast.border} ${contrast.tint} text-foreground hover:bg-muted/60`
      }`}
    >
      <div className={`mb-3 rounded-lg border px-2.5 py-2 ${isSelected ? "border-primary/20 bg-background" : `${contrast.border} bg-background/70`}`}>
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[10px] font-semibold uppercase tracking-wide ${isSelected ? "text-foreground" : contrast.accent}`}>
            {contrast.emphasis}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {move.kind}
          </span>
        </div>
        <p className="mt-1 text-xs font-medium leading-5 opacity-90">{contrast.mobileSignal}</p>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap gap-1.5">
            <StatePill state={move.policyState} />
            {isProposed && <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">proposed</span>}
            {isSelected && <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">selected</span>}
          </div>
          <h3 className="mt-3 text-base font-semibold">{move.label}</h3>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] opacity-70">{contrast.label}</p>
          <p className="mt-1 text-xs leading-5 opacity-75">{move.oneLine}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <DecisionMetric label="blast radius" value={move.blastRadius} goodWhen="low" />
        <DecisionMetric label="reversibility" value={move.reversibility} goodWhen="high" />
        <DecisionMetric label="evidence" value={move.evidenceStrength} goodWhen="high" />
      </div>

      <div className="mt-4 grid gap-2 text-xs leading-5 md:grid-cols-2">
        <div className="border border-current/20 p-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-65">if chosen</p>
          <p className="mt-1 opacity-80">{move.regret.ifChosen}</p>
        </div>
        <div className="border border-current/20 p-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-65">rollback</p>
          <p className="mt-1 opacity-80">
            {move.rollback.available ? `${move.rollback.steps.length} rehearsed steps` : move.rollback.residualRisk}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.14em] opacity-70">
        <span>learn: {move.timeToLearn}</span>
        <span>{move.operatorCost}</span>
      </div>
    </button>
  );
}

function EndTurnReceipt({ move }: { move: TurnMove }) {
  const receipt = move.receiptPreview;

  return (
    <section className="rounded-xl border bg-card p-4 text-foreground shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Receipt preview</p>
      <h2 className="mt-2 text-xl font-semibold">End turn: {move.label}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Static receipt preview only. The button does not call a backend.
      </p>

      <dl className="mt-4 space-y-3 text-sm">
        <ReceiptRow label="receipt id" value={receipt.receiptId} />
        <ReceiptRow label="policy decision" value={receipt.policyDecision} />
        <ReceiptRow label="approval mode" value={receipt.approvalMode} />
        <ReceiptRow label="rollback" value={receipt.rollbackAvailable ? "available" : "not needed"} />
        <ReceiptRow label="audit label" value={receipt.auditLabel} />
      </dl>

      <div className="mt-4 rounded-lg border bg-muted/40 p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Regret preview</p>
        <p className="mt-2 text-xs leading-5"><strong>If chosen:</strong> {move.regret.ifChosen}</p>
        <p className="mt-1 text-xs leading-5"><strong>If rejected:</strong> {move.regret.ifRejected}</p>
      </div>

      {move.rollback.available && (
        <div className="mt-4 rounded-lg border bg-muted/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Rollback rehearsal</p>
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-5">
            {move.rollback.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Residual: {move.rollback.residualRisk}</p>
        </div>
      )}

      <button
        type="button"
        disabled
        aria-disabled="true"
        className="mt-4 w-full rounded-lg bg-primary px-4 py-3 text-xs font-semibold uppercase tracking-wide text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
      >
        End turn: {move.label}
      </button>
    </section>
  );
}

function StatePill({ state }: { state: TurnRiskState }) {
  return (
    <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${stateStyles[state]}`}>
      {state}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-background/60 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function DecisionMetric({
  label,
  value,
  goodWhen,
}: {
  label: string;
  value: number;
  goodWhen: "high" | "low";
}) {
  const isStrong = goodWhen === "high" ? value >= 70 : value <= 35;
  const isWeak = goodWhen === "high" ? value < 55 : value > 70;
  const signal = isStrong ? "good" : isWeak ? "watch" : "mid";
  const signalClass = isStrong
    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
    : isWeak
      ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
      : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200";

  return (
    <div className={`rounded-lg border p-2 ${signalClass}`}>
      <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide opacity-80">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full border border-current/20 bg-current/10">
        <div className="h-full bg-current" style={{ width: `${value}%` }} />
      </div>
      <p className="mt-1 text-[10px] font-medium uppercase tracking-wide opacity-70">{signal}</p>
    </div>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b pb-2">
      <dt className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm">{value}</dd>
    </div>
  );
}
