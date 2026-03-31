"use client";

import type { WorkspacePhase } from "./workspace-provider";

interface AmbientLayerProps {
  temperature: number;
  phase: WorkspacePhase;
  energy: number;
}

/**
 * Ambient intelligence layer — a purely visual overlay that sets CSS custom
 * properties (`--ws-temperature`, `--ws-energy`) on its container so the
 * existing workspace CSS (globals.css) can drive color-mixing, pulse speed,
 * and breathing animations.
 *
 * Renders behind product tiles (`pointer-events: none`, `z-index: 0`).
 */
export function AmbientLayer({ temperature, phase, energy }: AmbientLayerProps) {
  return (
    <div
      className="ambient-layer pointer-events-none absolute inset-0 z-0 overflow-hidden"
      style={
        {
          "--ws-temperature": temperature,
          "--ws-energy": energy,
        } as React.CSSProperties
      }
      data-phase={phase}
      aria-hidden="true"
    >
      {/* Radial gradient overlay — intensifies with temperature */}
      <div
        className="absolute inset-0 transition-opacity duration-1000 ease-in-out"
        style={{ opacity: temperature * 0.15 }}
      >
        <div className="ambient-gradient absolute inset-0" />
      </div>
    </div>
  );
}
