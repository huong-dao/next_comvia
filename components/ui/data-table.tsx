import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/cn";

type Row = {
  name: string;
  type: string;
  status: "active" | "pending" | "error";
  date: string;
};

const statusMap: Record<Row["status"], { tone: "active" | "pending" | "error"; label: string }> = {
  active: { tone: "active", label: "ACTIVE" },
  pending: { tone: "pending", label: "PENDING" },
  error: { tone: "error", label: "ERROR" },
};

export function DataTable({
  rows,
  className,
}: {
  rows: Row[];
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-card", className)}>
      <table className="w-full text-left">
        <thead className="bg-surface-muted text-xs uppercase tracking-widest text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const item = statusMap[row.status];

            return (
              <tr key={row.name} className="border-t border-border/70 text-sm">
                <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.type}</td>
                <td className="px-4 py-3">
                  <StatusBadge tone={item.tone}>{item.label}</StatusBadge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.date}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
