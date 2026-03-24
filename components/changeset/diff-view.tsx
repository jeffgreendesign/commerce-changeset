import type { OperationDiff } from "@/lib/changeset/types";

export function DiffView({ diffs }: { diffs: OperationDiff[] }) {
  if (diffs.length === 0) return null;

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b text-muted-foreground">
          <th className="pb-1 pr-3 text-left font-medium">Field</th>
          <th className="pb-1 pr-3 text-left font-medium">Before</th>
          <th className="pb-1 text-left font-medium">After</th>
        </tr>
      </thead>
      <tbody>
        {diffs.map((d, i) => (
          <tr key={i} className="border-b border-border/50 last:border-0">
            <td className="py-1.5 pr-3 font-medium">{d.field}</td>
            <td className="py-1.5 pr-3 text-red-600 line-through dark:text-red-400">
              {String(d.before)}
            </td>
            <td className="py-1.5 text-emerald-600 dark:text-emerald-400">
              {String(d.after)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
