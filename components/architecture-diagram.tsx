/**
 * Architecture Diagram — React SVG component for the About page.
 *
 * Renders the 10-step agent pipeline as inline SVG with Tailwind dark mode
 * support and subtle CSS animations (pulsing CIBA gate, flowing connector
 * dash pattern).
 */

const NODE_RX = 12;

// ── Colors (oklch) ──────────────────────────────────────────────────

const C = {
  reader:       "oklch(0.6 0.2 264)",
  orchestrator: "oklch(0.85 0 0)",
  writer:       "oklch(0.7 0.18 85)",
  notifier:     "oklch(0.7 0.18 155)",
  auth0:        "oklch(0.55 0.25 295)",
  receipt:      "oklch(0.72 0.20 185)",
  // Fills at 12% opacity
  readerFill:       "oklch(0.6 0.2 264 / 12%)",
  orchestratorFill: "oklch(0.85 0 0 / 12%)",
  writerFill:       "oklch(0.7 0.18 85 / 12%)",
  notifierFill:     "oklch(0.7 0.18 155 / 12%)",
  auth0Fill:        "oklch(0.55 0.25 295 / 12%)",
  receiptFill:      "oklch(0.72 0.20 185 / 12%)",
  // Tier badge fills at 25%
  t0Fill: "oklch(0.7 0.18 155 / 25%)",
  t1Fill: "oklch(0.6 0.2 264 / 25%)",
  t2Fill: "oklch(0.7 0.18 85 / 25%)",
  t3Fill: "oklch(0.65 0.25 25 / 25%)",
  t3Stroke: "oklch(0.65 0.25 25)",
} as const;

// ── Step number badge ───────────────────────────────────────────────

function StepBadge({ cx, cy, n, color }: { cx: number; cy: number; n: number; color: string }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={10} fill={`${color.replace(")", " / 20%)")}`} stroke={color} strokeWidth={1.2} />
      <text x={cx} y={cy + 4} textAnchor="middle" className="text-[10px] font-bold" fill={color}>{n}</text>
    </g>
  );
}

// ── Node box ────────────────────────────────────────────────────────

function Node({
  x, y, w, h, fill, stroke, label, sublabel, dashed,
}: {
  x: number; y: number; w: number; h: number;
  fill: string; stroke: string;
  label: string; sublabel: string;
  dashed?: boolean;
}) {
  return (
    <g>
      <rect
        x={x} y={y} width={w} height={h} rx={NODE_RX}
        fill={fill} stroke={stroke} strokeWidth={2}
        strokeDasharray={dashed ? "6 3" : undefined}
      />
      <text x={x + w / 2} y={y + 30} textAnchor="middle" className="text-[13px] font-semibold" fill={stroke}>{label}</text>
      <text x={x + w / 2} y={y + 48} textAnchor="middle" className="text-[9.5px] fill-muted-foreground">{sublabel}</text>
    </g>
  );
}

// ── Scope label ─────────────────────────────────────────────────────

function ScopeLabel({ x, y, text, color }: { x: number; y: number; text: string; color: string }) {
  return (
    <text x={x} y={y} textAnchor="middle" className="text-[8.5px] tracking-wide" fill={color}>{text}</text>
  );
}

// ── Main component ──────────────────────────────────────────────────

export function ArchitectureDiagram() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 960 540"
      className="w-full"
      role="img"
      aria-label="Architecture diagram: 10-step agent pipeline from user authentication through execution receipt"
    >
      <style>{`
        @keyframes flow-dash {
          to { stroke-dashoffset: -20; }
        }
        .flow-arrow {
          animation: flow-dash 1.5s linear infinite;
        }
        @keyframes ciba-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .ciba-pulse {
          animation: ciba-pulse 2s ease-in-out infinite;
        }
      `}</style>
      <defs>
        <marker id="a-arrow" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0L10 3.5 0 7z" className="fill-muted-foreground/60" />
        </marker>
        <marker id="a-arrow-green" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0L10 3.5 0 7z" fill={C.notifier} />
        </marker>
      </defs>

      {/* ── ROW 1: User/Auth0 → Orchestrator ─────────────────────── */}

      <Node x={40} y={40} w={200} h={72} fill={C.auth0Fill} stroke={C.auth0} label="User / Auth0" sublabel="Universal Login + MFA" />

      {/* Arrow 1 */}
      <line x1={240} y1={76} x2={340} y2={76} className="stroke-muted-foreground/40" strokeWidth={1.5} markerEnd="url(#a-arrow)" />
      <StepBadge cx={290} cy={76} n={1} color={C.auth0} />

      <Node x={350} y={40} w={220} h={72} fill={C.orchestratorFill} stroke={C.orchestrator} label="Orchestrator" sublabel="Plans only — no API access" />

      {/* Arrow 2 (down to Reader) */}
      <path d="M420 112L420 140 120 140 120 190" fill="none" className="stroke-muted-foreground/40" strokeWidth={1.5} markerEnd="url(#a-arrow)" />
      <StepBadge cx={420} cy={130} n={2} color={C.reader} />

      {/* ── ROW 2: Reader → LLM → Policy → CIBA ─────────────────── */}

      <Node x={30} y={195} w={180} h={72} fill={C.readerFill} stroke={C.reader} label="Reader Agent" sublabel="Token Vault OBO" />
      <ScopeLabel x={120} y={280} text="spreadsheets.readonly" color={C.reader} />

      {/* Arrow 3 */}
      <line x1={210} y1={231} x2={280} y2={231} className="stroke-muted-foreground/40" strokeWidth={1.5} markerEnd="url(#a-arrow)" />
      <StepBadge cx={245} cy={231} n={3} color={C.orchestrator} />

      <Node x={290} y={195} w={170} h={72} fill={C.orchestratorFill} stroke={C.orchestrator} label="LLM Analysis" sublabel="Discrete operations" />

      {/* Arrow 4 */}
      <line x1={460} y1={231} x2={520} y2={231} className="stroke-muted-foreground/40" strokeWidth={1.5} markerEnd="url(#a-arrow)" />
      <StepBadge cx={490} cy={231} n={4} color={C.orchestrator} />

      {/* Policy Engine (dashed border) */}
      <Node x={530} y={185} w={200} h={92} fill="oklch(0.65 0 0 / 8%)" stroke="oklch(0.65 0 0)" label="Policy Engine" sublabel="json-rules-engine — 7 rules" dashed />

      {/* Risk tier badges */}
      <rect x={544} y={238} width={42} height={16} rx={8} fill={C.t0Fill} stroke={C.notifier} strokeWidth={0.8} />
      <text x={565} y={250} textAnchor="middle" className="text-[7.5px] font-semibold" fill={C.notifier}>T0</text>
      <rect x={592} y={238} width={42} height={16} rx={8} fill={C.t1Fill} stroke={C.reader} strokeWidth={0.8} />
      <text x={613} y={250} textAnchor="middle" className="text-[7.5px] font-semibold" fill={C.reader}>T1</text>
      <rect x={640} y={238} width={42} height={16} rx={8} fill={C.t2Fill} stroke={C.writer} strokeWidth={0.8} />
      <text x={661} y={250} textAnchor="middle" className="text-[7.5px] font-semibold" fill={C.writer}>T2</text>
      <rect x={688} y={238} width={42} height={16} rx={8} fill={C.t3Fill} stroke={C.t3Stroke} strokeWidth={0.8} />
      <text x={709} y={250} textAnchor="middle" className="text-[7.5px] font-semibold" fill={C.t3Stroke}>T3</text>

      {/* Arrow 5 */}
      <line x1={730} y1={231} x2={790} y2={231} className="stroke-muted-foreground/40" strokeWidth={1.5} markerEnd="url(#a-arrow)" />
      <StepBadge cx={760} cy={231} n={5} color={C.auth0} />

      {/* CIBA Gate (pulsing) */}
      <g className="ciba-pulse">
        <Node x={800} y={195} w={140} h={72} fill={C.auth0Fill} stroke={C.auth0} label="CIBA Gate" sublabel="Guardian push (Tier 2+)" />
      </g>

      {/* Dashed auto-approve bypass */}
      <path
        d="M630 277L630 335 195 335 195 390"
        fill="none"
        stroke={C.notifier}
        strokeWidth={1.2}
        strokeDasharray="5 4"
        className="flow-arrow"
        markerEnd="url(#a-arrow-green)"
      />
      <text x={420} y={328} textAnchor="middle" className="text-[8.5px] tracking-wide" fill={C.notifier}>auto-approve (Tier 0/1)</text>

      {/* Arrow 6 (CIBA → Writer, down-left) */}
      <path d="M870 267L870 350 175 350 175 390" fill="none" className="stroke-muted-foreground/40" strokeWidth={1.5} markerEnd="url(#a-arrow)" />
      <StepBadge cx={870} cy={310} n={6} color={C.writer} />

      {/* ── ROW 3: Writer → Verify → Notifier → Receipt ─────────── */}

      <Node x={60} y={395} w={200} h={72} fill={C.writerFill} stroke={C.writer} label="Writer Agent" sublabel="Token Vault OBO" />
      <ScopeLabel x={160} y={480} text="spreadsheets (read-write)" color={C.writer} />

      {/* Arrow 7 */}
      <line x1={260} y1={431} x2={330} y2={431} className="stroke-muted-foreground/40" strokeWidth={1.5} markerEnd="url(#a-arrow)" />
      <StepBadge cx={295} cy={431} n={7} color={C.reader} />

      <Node x={340} y={395} w={180} h={72} fill={C.readerFill} stroke={C.reader} label="Reader Verify" sublabel="Read-back comparison" />

      {/* Arrow 8 */}
      <line x1={520} y1={431} x2={590} y2={431} className="stroke-muted-foreground/40" strokeWidth={1.5} markerEnd="url(#a-arrow)" />
      <StepBadge cx={555} cy={431} n={8} color={C.notifier} />

      <Node x={600} y={395} w={170} h={72} fill={C.notifierFill} stroke={C.notifier} label="Notifier Agent" sublabel="Token Vault OBO" />
      <ScopeLabel x={685} y={480} text="gmail.send" color={C.notifier} />

      {/* Arrow 9 */}
      <line x1={770} y1={431} x2={810} y2={431} className="stroke-muted-foreground/40" strokeWidth={1.5} markerEnd="url(#a-arrow)" />
      <StepBadge cx={790} cy={431} n={9} color={C.receipt} />

      <Node x={820} y={395} w={120} h={72} fill={C.receiptFill} stroke={C.receipt} label="Receipt" sublabel="SHA-256 audit hash" />
      <text x={880} y={454} textAnchor="middle" className="text-[9.5px] fill-muted-foreground">OBO chain</text>

      {/* Title */}
      <text x={480} y={520} textAnchor="middle" className="text-[11px] tracking-widest fill-muted-foreground">
        COMMERCE CHANGESET — AGENT PIPELINE
      </text>
    </svg>
  );
}
