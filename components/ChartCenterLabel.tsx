import React from "react";

interface Props {
  cx: number;
  cy: number;
  big: string | number;
  small: string;
  bigSize?: "text-xl" | "text-2xl";
}

/**
 * Texto central de um PieChart em rosca (donut). Evita sobreposicao entre as
 * duas linhas usando um espacamento fixo calibrado para as combinacoes de
 * fonte usadas no Dashboard (24px/20px em cima, 9-10px embaixo) -- ver
 * discussao de dominant-baseline em ChartCenterLabel: nao usar
 * dominantBaseline="middle" no <text> pai, pois ele se propaga para os
 * tspans filhos e aperta demais o espaco entre as duas linhas.
 */
export function ChartCenterLabel({ cx, cy, big, small, bigSize = "text-2xl" }: Props) {
  return (
    <text x={cx} y={cy} textAnchor="middle">
      <tspan x={cx} y={cy} className={`fill-foreground font-black ${bigSize}`}>
        {big}
      </tspan>
      <tspan x={cx} y={cy + 22} className="fill-muted-foreground text-[9px]">
        {small}
      </tspan>
    </text>
  );
}
