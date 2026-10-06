import React from "react";

interface DonutLabelProps {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  percent?: number;
  value?: number;
  index?: number;
}

/**
 * Label donut yang selalu tampil (tanpa hover): nilai & persentase,
 * diposisikan di luar irisan. Warna label mengikuti warna irisan.
 */
export const renderDonutLabel =
  (colors: string[]) => (props: DonutLabelProps) => {
    const {
      cx = 0,
      cy = 0,
      midAngle = 0,
      outerRadius = 0,
      percent,
      value,
      index = 0,
    } = props;
    if (!percent || percent <= 0) return null;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 16;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const align = Math.abs(x - cx) < 10 ? "middle" : x > cx ? "start" : "end";
    return (
      <text
        x={x}
        y={y}
        textAnchor={align}
        dominantBaseline="central"
        fontSize={11}
        fontWeight={700}
        fill={colors[index % colors.length]}
      >
        {`${value} (${Math.round(percent * 100)}%)`}
      </text>
    );
  };

/** Total di tengah donut. Posisi menyesuaikan Pie cx="50%" cy="45%". */
export const DonutCenterTotal = ({
  value,
  unit,
}: {
  value: string;
  unit: string;
}) => (
  <text x="50%" y="45%" textAnchor="middle" dominantBaseline="central">
    <tspan
      x="50%"
      dy="-2"
      fontSize={22}
      fontWeight={800}
      fill="var(--color-text-main)"
    >
      {value}
    </tspan>
    <tspan x="50%" dy={18} fontSize={10} fill="var(--color-muted-text)">
      {unit}
    </tspan>
  </text>
);
