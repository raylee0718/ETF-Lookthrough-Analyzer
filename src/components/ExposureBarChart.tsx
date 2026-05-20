import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { IndustryExposure } from "../types/portfolio";
import { formatCurrency, formatPercent } from "../lib/formatters";

type ExposureBarChartProps = {
  data: IndustryExposure[];
};

export default function ExposureBarChart({ data }: ExposureBarChartProps) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="industry"
            tick={{ fill: "#475569", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#475569", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `${Number(value) / 1000}k`}
          />
          <Tooltip
            cursor={{ fill: "#f5f5f4" }}
            formatter={(value, _name, item) => [
              formatCurrency(Number(value)),
              `${item.payload.industry} (${formatPercent(item.payload.portfolioWeight)})`,
            ]}
            labelFormatter={() => "產業曝險"}
            contentStyle={{
              borderRadius: 8,
              borderColor: "#e7e5e4",
              boxShadow: "0 10px 30px rgb(15 23 42 / 0.08)",
            }}
          />
          <Bar dataKey="exposureValue" fill="#2563eb" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
