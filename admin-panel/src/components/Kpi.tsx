export default function Kpi({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "navy" | "cyan" | "danger" | "success";
}) {
  const accentClass =
    accent === "danger"
      ? "text-red-600"
      : accent === "success"
      ? "text-green-600"
      : accent === "cyan"
      ? "text-cyan"
      : "text-navy";
  return (
    <div className="bg-white rounded-2xl border border-border p-5 shadow-sm">
      <div className="text-sm text-texts">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${accentClass}`}>{value}</div>
      {sub && <div className="text-xs text-texts mt-1">{sub}</div>}
    </div>
  );
}
