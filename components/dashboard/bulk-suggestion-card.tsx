"use client";

import { useState } from "react";
import {
  LayersIcon,
  CheckIcon,
  XIcon,
  ArrowRightIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { RepetitionSignal, ConfirmationRow } from "@/lib/voice/types";

// ── Types ────────────────────────────────────────────────────────────

interface BulkSuggestionCardProps {
  signal: RepetitionSignal;
  /** Called when user accepts the bulk suggestion with selected rows. */
  onAccept: (selectedRows: ConfirmationRow[]) => void;
  /** Called when user dismisses the suggestion. */
  onDismiss: () => void;
  /** Whether the card interaction is disabled. */
  disabled?: boolean;
}

// ── Component ────────────────────────────────────────────────────────

export function BulkSuggestionCard({
  signal,
  onAccept,
  onDismiss,
  disabled = false,
}: BulkSuggestionCardProps) {
  const [selectedSkus, setSelectedSkus] = useState<Set<string>>(
    new Set(signal.confirmationTable.map((row) => row.sku))
  );

  const toggleRow = (sku: string) => {
    setSelectedSkus((prev) => {
      const next = new Set(prev);
      if (next.has(sku)) {
        next.delete(sku);
      } else {
        next.add(sku);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedSkus.size === signal.confirmationTable.length) {
      setSelectedSkus(new Set());
    } else {
      setSelectedSkus(
        new Set(signal.confirmationTable.map((row) => row.sku))
      );
    }
  };

  const handleAccept = () => {
    const selectedRows = signal.confirmationTable.filter((row) =>
      selectedSkus.has(row.sku)
    );
    onAccept(selectedRows);
  };

  const allSelected = selectedSkus.size === signal.confirmationTable.length;
  const noneSelected = selectedSkus.size === 0;

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
      {/* Header */}
      <div className="mb-3 flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
          <LayersIcon className="size-4" />
        </div>
        <div className="flex-1 space-y-1">
          <h3 className="text-sm font-semibold">Bulk Operation Suggested</h3>
          <p className="text-xs text-muted-foreground">
            {signal.patternDescription}
          </p>
          {signal.suggestedBulkAction && (
            <Badge variant="secondary" className="mt-1">
              Suggested: {signal.suggestedBulkAction}
            </Badge>
          )}
        </div>
      </div>

      {/* Confirmation table */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <button
                  type="button"
                  onClick={toggleAll}
                  disabled={disabled}
                  className={cn(
                    "flex size-4 items-center justify-center rounded border transition-colors",
                    allSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30"
                  )}
                  aria-label={allSelected ? "Deselect all" : "Select all"}
                >
                  {allSelected && <CheckIcon className="size-3" />}
                </button>
              </TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-center w-8" />
              <TableHead className="text-right">Proposed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {signal.confirmationTable.map((row) => {
              const isSelected = selectedSkus.has(row.sku);
              return (
                <TableRow
                  key={row.sku}
                  className={cn(
                    "cursor-pointer transition-colors",
                    !isSelected && "opacity-50"
                  )}
                  onClick={() => !disabled && toggleRow(row.sku)}
                >
                  <TableCell>
                    <div
                      className={cn(
                        "flex size-4 items-center justify-center rounded border transition-colors",
                        isSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30"
                      )}
                    >
                      {isSelected && <CheckIcon className="size-3" />}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                      {row.sku}
                    </code>
                  </TableCell>
                  <TableCell className="text-sm">{row.productName}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatPrice(row.currentPrice)}
                  </TableCell>
                  <TableCell className="text-center">
                    <ArrowRightIcon className="size-3 text-muted-foreground" />
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-medium">
                    {formatPrice(row.proposedPrice)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {selectedSkus.size} of {signal.confirmationTable.length} selected
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDismiss}
            disabled={disabled}
          >
            <XIcon className="size-3.5" />
            Keep individual
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            disabled={disabled || noneSelected}
          >
            <CheckIcon className="size-3.5" />
            Apply bulk ({selectedSkus.size})
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────

function formatPrice(value: string | number): string {
  if (value === "N/A" || value === "") return "—";
  const num = Number(value);
  if (isNaN(num)) return String(value);
  return `$${num.toFixed(2)}`;
}
