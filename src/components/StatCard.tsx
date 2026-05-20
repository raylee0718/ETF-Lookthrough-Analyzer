type StatCardProps = {
  label: string;
  value: string;
  helperText?: string;
};

export default function StatCard({ label, value, helperText }: StatCardProps) {
  return (
    <div className="min-w-0 rounded-lg border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 break-words text-2xl font-semibold tracking-normal text-slate-950">
        {value}
      </p>
      {helperText ? (
        <p className="mt-2 text-sm leading-6 text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
}
