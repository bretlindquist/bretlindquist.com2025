"use client";

import { useMemo, useState } from "react";
import { Manrope, Sora } from "next/font/google";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-visualizer-display",
  weight: ["400", "500", "600", "700"],
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-visualizer-body",
  weight: ["400", "500", "600", "700", "800"],
});

type Preset = {
  label: string;
  part: number;
  whole: number;
  partLabel: string;
  wholeLabel: string;
};

const PRESETS: Preset[] = [
  {
    label: "OpenClaw vs world",
    part: 280_000,
    whole: 8_300_000_000,
    partLabel: "OpenClaw stars",
    wholeLabel: "People in the world",
  },
  {
    label: "1 million vs world",
    part: 1_000_000,
    whole: 8_300_000_000,
    partLabel: "Selected group",
    wholeLabel: "People in the world",
  },
  {
    label: "NYC vs world",
    part: 8_300_000,
    whole: 8_300_000_000,
    partLabel: "People in NYC",
    wholeLabel: "People in the world",
  },
];

const GRID_CELLS = 10_000;
const GRID_COLUMNS = 200;

function clampPositive(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function formatInt(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDecimal(value: number, digits = 2) {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

function GridCell({
  fill,
}: {
  fill: number;
}) {
  if (fill <= 0) {
    return <div className="h-2.5 w-2.5 rounded-[3px] border border-slate-200/[0.06] bg-slate-300/[0.12]" />;
  }

  if (fill >= 1) {
    return <div className="h-2.5 w-2.5 rounded-[3px] bg-[linear-gradient(180deg,#f7da79_0%,#f3a14a_100%)] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]" />;
  }

  return (
    <div className="relative h-2.5 w-2.5 overflow-hidden rounded-[3px] border border-slate-200/[0.07] bg-slate-300/[0.12]">
      <div
        className="absolute inset-y-0 left-0 bg-[linear-gradient(180deg,#f7da79_0%,#f3a14a_100%)]"
        style={{ width: `${fill * 100}%` }}
      />
    </div>
  );
}

function SampleRoomCard({
  label,
  count,
}: {
  label: string;
  count: number;
}) {
  const normalizedCount = Math.min(Math.max(count, 0), 10);
  const people = Array.from({ length: 10 }, (_, index) => {
    const threshold = (index + 1) / 10;
    const active = normalizedCount / 10 >= threshold;
    const partial =
      !active && normalizedCount / 10 > index / 10 && normalizedCount / 10 < threshold;
    return { active, partial };
  });

  return (
    <div className="rounded-[28px] border border-cyan-300/12 bg-white/[0.035] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="text-xs uppercase tracking-[0.28em] text-cyan-100/55">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-white">{formatDecimal(count, 2)}</div>
      <div className="mt-4 flex gap-2">
        {people.map((person, index) => (
          <div
            key={`${label}-${index}`}
            className="relative h-10 flex-1 overflow-hidden rounded-full border border-white/8 bg-white/[0.04]"
          >
            {person.active ? (
              <div className="absolute inset-0 bg-[linear-gradient(180deg,#84d8ff_0%,#2d83ff_100%)]" />
            ) : null}
            {person.partial ? (
              <div className="absolute inset-y-0 left-0 w-1/2 bg-[linear-gradient(180deg,#84d8ff_0%,#2d83ff_100%)] opacity-70" />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function VisualizerPage() {
  const [partInput, setPartInput] = useState("280000");
  const [wholeInput, setWholeInput] = useState("8300000000");
  const [partLabel, setPartLabel] = useState("OpenClaw stars");
  const [wholeLabel, setWholeLabel] = useState("People in the world");

  const part = clampPositive(Number(partInput.replace(/,/g, "")));
  const whole = clampPositive(Number(wholeInput.replace(/,/g, "")));

  const stats = useMemo(() => {
    const safeWhole = whole > 0 ? whole : 1;
    const ratio = whole > 0 ? part / whole : 0;
    const percentage = ratio * 100;
    const partsPerMillion = ratio * 1_000_000;
    const oneIn = part > 0 ? whole / part : Infinity;
    const gridFill = ratio * GRID_CELLS;
    const zoomPercentage = Math.min(percentage * 120, 100);
    const room100 = ratio * 100;
    const room10k = ratio * 10_000;
    const room100k = ratio * 100_000;
    const room1m = ratio * 1_000_000;

    return {
      ratio,
      percentage,
      partsPerMillion,
      oneIn,
      gridFill,
      zoomPercentage,
      room100,
      room10k,
      room100k,
      room1m,
      safeWhole,
    };
  }, [part, whole]);

  const gridFills = useMemo(() => {
    const fullCells = Math.floor(stats.gridFill);
    const partialFill = stats.gridFill - fullCells;

    return Array.from({ length: GRID_CELLS }, (_, index) => {
      if (index < fullCells) return 1;
      if (index === fullCells && partialFill > 0) return partialFill;
      return 0;
    });
  }, [stats.gridFill]);

  const headline = `${formatInt(part)} out of ${formatInt(whole)}`;
  const formattedPart = formatInt(part);
  const formattedWhole = formatInt(whole);

  return (
    <main
      className={`${sora.variable} ${manrope.variable} min-h-screen bg-[radial-gradient(circle_at_top,#16346f_0%,#0b1834_38%,#050913_100%)] px-6 py-10 text-white md:px-10`}
      style={{
        fontFamily: "var(--font-visualizer-body)",
        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",
        textRendering: "optimizeLegibility",
      }}
    >
      <div className="mx-auto max-w-7xl">
        <div className="rounded-[36px] border border-cyan-200/10 bg-[linear-gradient(180deg,rgba(10,24,52,0.94),rgba(5,10,22,0.97))] p-8 shadow-[0_20px_80px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.045)] md:p-10">
          <div className="flex flex-col gap-8">
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:items-end">
              <div className="max-w-3xl pt-2">
                <div className="text-[11px] uppercase tracking-[0.34em] text-cyan-100/58">Visualizer</div>
                <h1
                  className="mt-4 max-w-4xl text-4xl font-semibold text-white md:text-[4.35rem] md:leading-[0.98]"
                  style={{ fontFamily: "var(--font-visualizer-display)", letterSpacing: "-0.045em", textWrap: "balance" }}
                >
                  Several ways to feel how small a ratio really is.
                </h1>
                <p className="mt-5 max-w-2xl text-[1.15rem] leading-[1.85] text-slate-300/92">
                  Change the numbers, relabel both sides, and compare the same ratio as a percentage, a
                  one-in-N event, a room-size estimate, and a microscopic grid.
                </p>
              </div>
              <div className="rounded-[32px] border border-cyan-200/12 bg-[linear-gradient(145deg,rgba(20,39,72,0.82),rgba(10,19,38,0.72))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-sm">
                <div className="text-[11px] uppercase tracking-[0.3em] text-cyan-100/52">Live readout</div>
                <div className="mt-4 text-sm text-slate-400/90">{headline}</div>
                <div
                  className="mt-2 text-5xl font-semibold text-white md:text-6xl"
                  style={{ fontFamily: "var(--font-visualizer-display)", letterSpacing: "-0.055em" }}
                >
                  1 in {Number.isFinite(stats.oneIn) ? formatInt(stats.oneIn) : "∞"}
                </div>
                <div className="mt-3 text-base text-slate-300/92">
                  or <span className="text-white">{formatDecimal(stats.partsPerMillion, 2)}</span> per million
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-white/7 bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/55">Percentage</div>
                    <div className="mt-2 text-[1.9rem] font-semibold text-white" style={{ letterSpacing: "-0.04em" }}>{formatDecimal(stats.percentage, 6)}%</div>
                  </div>
                  <div className="rounded-[22px] border border-white/7 bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                    <div className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/55">Compact ratio</div>
                    <div className="mt-2 text-[1.9rem] font-semibold text-white" style={{ letterSpacing: "-0.04em" }}>
                      {formatCompact(part)} / {formatCompact(whole)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <section className="rounded-[30px] border border-white/7 bg-[linear-gradient(180deg,rgba(255,255,255,0.028),rgba(255,255,255,0.018))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.28em] text-cyan-100/52">Inputs</div>
                  <div className="mt-1 text-lg font-medium text-white">Change the comparison</div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className="flex flex-col gap-2">
                      <span className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/55">Part label</span>
                      <input
                        className="rounded-2xl border border-white/7 bg-[linear-gradient(180deg,rgba(1,5,15,0.66),rgba(4,10,25,0.78))] px-4 py-3 text-base text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] placeholder:text-slate-500 focus:border-cyan-300/35 focus:bg-[linear-gradient(180deg,rgba(4,12,28,0.84),rgba(7,16,34,0.92))]"
                        value={partLabel}
                        onChange={(event) => setPartLabel(event.target.value)}
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/55">Whole label</span>
                      <input
                        className="rounded-2xl border border-white/7 bg-[linear-gradient(180deg,rgba(1,5,15,0.66),rgba(4,10,25,0.78))] px-4 py-3 text-base text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] placeholder:text-slate-500 focus:border-cyan-300/35 focus:bg-[linear-gradient(180deg,rgba(4,12,28,0.84),rgba(7,16,34,0.92))]"
                        value={wholeLabel}
                        onChange={(event) => setWholeLabel(event.target.value)}
                      />
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/55">Part value</span>
                      <input
                        inputMode="numeric"
                        className="rounded-2xl border border-white/7 bg-[linear-gradient(180deg,rgba(1,5,15,0.66),rgba(4,10,25,0.78))] px-4 py-3 text-base text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] placeholder:text-slate-500 focus:border-cyan-300/35 focus:bg-[linear-gradient(180deg,rgba(4,12,28,0.84),rgba(7,16,34,0.92))]"
                        value={partInput}
                        onChange={(event) => setPartInput(event.target.value)}
                      />
                      <span className="text-xs text-slate-500">Formatted: {formattedPart}</span>
                    </label>
                    <label className="flex flex-col gap-2">
                      <span className="text-[11px] uppercase tracking-[0.22em] text-cyan-100/55">Whole value</span>
                      <input
                        inputMode="numeric"
                        className="rounded-2xl border border-white/7 bg-[linear-gradient(180deg,rgba(1,5,15,0.66),rgba(4,10,25,0.78))] px-4 py-3 text-base text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none transition duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] placeholder:text-slate-500 focus:border-cyan-300/35 focus:bg-[linear-gradient(180deg,rgba(4,12,28,0.84),rgba(7,16,34,0.92))]"
                        value={wholeInput}
                        onChange={(event) => setWholeInput(event.target.value)}
                      />
                      <span className="text-xs text-slate-500">Formatted: {formattedWhole}</span>
                    </label>
                  </div>
                </div>
                <div className="rounded-[24px] border border-white/7 bg-[linear-gradient(180deg,rgba(2,7,19,0.56),rgba(2,7,19,0.36))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)]">
                  <div className="text-[11px] uppercase tracking-[0.26em] text-cyan-100/55">Quick presets</div>
                  <div className="mt-2 text-lg font-medium text-white">Start from a familiar scale</div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {PRESETS.map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        className="rounded-full border border-white/10 bg-slate-950/65 px-4 py-2 text-sm text-slate-200 transition duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-[1px] hover:border-cyan-300/35 hover:bg-slate-950/80 hover:text-white"
                        onClick={() => {
                          setPartInput(String(preset.part));
                          setWholeInput(String(preset.whole));
                          setPartLabel(preset.partLabel);
                          setWholeLabel(preset.wholeLabel);
                        }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-6 text-sm leading-7 text-slate-300">
                    This page treats the ratio as <span className="text-white">{partLabel}</span> compared against{" "}
                    <span className="text-white">{wholeLabel}</span>. It works best when the part is smaller than
                    the whole.
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[28px] border border-cyan-300/9 bg-white/[0.022] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.022)]">
                <div className="text-[11px] uppercase tracking-[0.26em] text-cyan-100/55">Per million</div>
                <div className="mt-3 text-[2.35rem] font-semibold text-white" style={{ letterSpacing: "-0.045em" }}>{formatDecimal(stats.partsPerMillion, 2)}</div>
              </div>
              <div className="rounded-[28px] border border-cyan-300/9 bg-white/[0.022] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.022)]">
                <div className="text-[11px] uppercase tracking-[0.26em] text-cyan-100/55">Headline</div>
                <div className="mt-3 text-[2rem] font-semibold text-white" style={{ letterSpacing: "-0.045em" }}>{headline}</div>
              </div>
              <div className="rounded-[28px] border border-cyan-300/9 bg-white/[0.022] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.022)]">
                <div className="text-[11px] uppercase tracking-[0.26em] text-cyan-100/55">Part label</div>
                <div className="mt-3 text-[2rem] font-semibold text-white" style={{ letterSpacing: "-0.04em" }}>{partLabel}</div>
              </div>
              <div className="rounded-[28px] border border-cyan-300/9 bg-white/[0.022] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.022)]">
                <div className="text-[11px] uppercase tracking-[0.26em] text-cyan-100/55">Whole label</div>
                <div className="mt-3 text-[2rem] font-semibold text-white" style={{ letterSpacing: "-0.04em" }}>{wholeLabel}</div>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[34px] border border-white/8 bg-white/[0.03] p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.28em] text-cyan-100/55">Exact scale</div>
                    <h2 className="mt-2 text-2xl font-semibold text-white">A hairline on the full world line</h2>
                  </div>
                  <div className="rounded-full border border-amber-300/15 bg-amber-300/[0.08] px-4 py-2 text-xs uppercase tracking-[0.24em] text-amber-50/75">
                    exact ratio
                  </div>
                </div>

                <div className="mt-8 rounded-[28px] border border-white/8 bg-slate-950/60 p-5">
                  <div className="flex items-center justify-between text-sm text-slate-400">
                    <span>{partLabel}</span>
                    <span>{wholeLabel}</span>
                  </div>
                  <div className="mt-4 h-6 rounded-full bg-white/[0.05] p-[3px]">
                    <div
                      className="h-full min-w-[2px] rounded-full bg-[linear-gradient(90deg,#f7da79_0%,#f3a14a_100%)] shadow-[0_0_24px_rgba(247,218,121,0.45)]"
                      style={{ width: `${Math.max(stats.percentage, 0.08)}%` }}
                    />
                  </div>
                  <div className="mt-3 text-sm leading-7 text-slate-300">
                    On a literal full-width bar, the part is only <span className="text-white">{formatDecimal(stats.percentage, 6)}%</span> of the whole.
                  </div>
                </div>

                <div className="mt-6 rounded-[28px] border border-cyan-300/10 bg-[linear-gradient(180deg,rgba(45,131,255,0.08),rgba(255,255,255,0.02))] p-5">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span>Zoomed to the first sliver of the whole</span>
                    <span>{formatDecimal(Math.min(stats.percentage, 0.833333), 6)}% shown</span>
                  </div>
                  <div className="mt-4 h-10 rounded-full bg-white/[0.05] p-[4px]">
                    <div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#84d8ff_0%,#2d83ff_100%)]"
                      style={{ width: `${stats.zoomPercentage}%` }}
                    />
                  </div>
                  <div className="mt-3 text-sm leading-7 text-slate-300">
                    This second bar exaggerates the tiny ratio so you can actually see it occupy space.
                  </div>
                </div>
              </div>

              <div className="rounded-[34px] border border-white/8 bg-white/[0.03] p-6">
                <div className="text-xs uppercase tracking-[0.28em] text-cyan-100/55">10,000-cell field</div>
                <h2 className="mt-2 text-2xl font-semibold text-white">Even a huge sample barely lights up</h2>
                <div className="mt-6 rounded-[28px] border border-white/8 bg-slate-950/55 p-4">
                  <div
                    className="grid gap-[2px]"
                    style={{ gridTemplateColumns: `repeat(${GRID_COLUMNS}, minmax(0, 1fr))` }}
                  >
                    {gridFills.map((fill, index) => (
                      <GridCell key={index} fill={fill} />
                    ))}
                  </div>
                </div>
                <div className="mt-4 text-sm leading-7 text-slate-300">
                  This grid has <span className="text-white">10,000</span> tiny cells. Your ratio fills{" "}
                  <span className="text-white">{formatDecimal(stats.gridFill, 3)}</span> of them.
                </div>
              </div>
            </section>

            <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[34px] border border-white/8 bg-white/[0.03] p-6">
                <div className="text-xs uppercase tracking-[0.28em] text-cyan-100/55">Human-scale rooms</div>
                <h2 className="mt-2 text-2xl font-semibold text-white">If the whole were a room</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <SampleRoomCard label="Room of 100" count={stats.room100} />
                  <SampleRoomCard label="Room of 10,000" count={stats.room10k} />
                  <SampleRoomCard label="Room of 100,000" count={stats.room100k} />
                  <SampleRoomCard label="Room of 1,000,000" count={stats.room1m} />
                </div>
                <div className="mt-4 text-sm leading-7 text-slate-300">
                  Each card uses a ten-pill meter. The number above it tells you how many of the smaller group would be present in that room size.
                </div>
              </div>

              <div className="rounded-[34px] border border-white/8 bg-white/[0.03] p-6">
                <div className="text-xs uppercase tracking-[0.28em] text-cyan-100/55">Translation cards</div>
                <h2 className="mt-2 text-2xl font-semibold text-white">Four ways to say the same thing</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[28px] border border-white/8 bg-slate-950/60 p-5">
                    <div className="text-xs uppercase tracking-[0.24em] text-cyan-100/55">Ratio</div>
                    <div className="mt-3 text-2xl font-semibold text-white">
                      {formatInt(part)} to {formatInt(stats.safeWhole)}
                    </div>
                  </div>
                  <div className="rounded-[28px] border border-white/8 bg-slate-950/60 p-5">
                    <div className="text-xs uppercase tracking-[0.24em] text-cyan-100/55">Equivalent sentence</div>
                    <div className="mt-3 text-lg leading-8 text-slate-200">
                      That works out to roughly <span className="text-white">1 {partLabel.toLowerCase().replace(/s$/, "")}</span>{" "}
                      for every <span className="text-white">{Number.isFinite(stats.oneIn) ? formatInt(stats.oneIn) : "∞"}</span>{" "}
                      {wholeLabel.toLowerCase()}.
                    </div>
                  </div>
                  <div className="rounded-[28px] border border-white/8 bg-slate-950/60 p-5">
                    <div className="text-xs uppercase tracking-[0.24em] text-cyan-100/55">Per 100,000</div>
                    <div className="mt-3 text-2xl font-semibold text-white">{formatDecimal(stats.room100k, 2)}</div>
                    <div className="mt-2 text-sm text-slate-400">{partLabel} for every 100,000 of the whole</div>
                  </div>
                  <div className="rounded-[28px] border border-white/8 bg-slate-950/60 p-5">
                    <div className="text-xs uppercase tracking-[0.24em] text-cyan-100/55">Per person in the part</div>
                    <div className="mt-3 text-2xl font-semibold text-white">
                      {Number.isFinite(stats.oneIn) ? formatInt(stats.oneIn) : "∞"}
                    </div>
                    <div className="mt-2 text-sm text-slate-400">units of the whole for each unit in the part</div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
