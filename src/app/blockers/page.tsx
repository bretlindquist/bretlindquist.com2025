"use client";

import { useMemo, useState } from "react";

type Family = {
  id: string;
  label: string;
  color: string;
  icon: string;
  blockers: string[];
};

type BoardState = Record<string, string[]>;

const FAMILIES: Family[] = [
  {
    id: "atmospheric",
    label: "Atmospheric / Soft",
    color: "from-sky-500/30 to-indigo-500/30",
    icon: "☁️",
    blockers: [
      "Cloud (light)",
      "Cloud (dense)",
      "Fog (low)",
      "Fog (thick)",
      "Mist swirl",
      "Smoke pocket",
      "Toxic haze",
      "Storm cloud (charged)",
    ],
  },
  {
    id: "hard_surface",
    label: "Hard Surface",
    color: "from-orange-500/30 to-stone-600/30",
    icon: "🧱",
    blockers: [
      "Brick wall",
      "Cracked brick",
      "Concrete slab",
      "Cracked concrete",
      "Stone block",
      "Cracked stone",
      "Marble tile",
      "Fractured marble",
    ],
  },
  {
    id: "frozen",
    label: "Frozen",
    color: "from-cyan-400/30 to-blue-500/30",
    icon: "🧊",
    blockers: [
      "Ice thin",
      "Ice medium",
      "Ice thick",
      "Frosted glass",
      "Cracked ice (stage 1)",
      "Cracked ice (stage 2)",
      "Shattering ice (clear state)",
    ],
  },
  {
    id: "metal_cage",
    label: "Metal / Cage",
    color: "from-zinc-400/30 to-slate-600/30",
    icon: "⛓️",
    blockers: [
      "Cage (light bars)",
      "Cage (heavy bars)",
      "Rusty cage",
      "Locked cage",
      "Electrified cage",
      "Reinforced crate cage",
    ],
  },
  {
    id: "sticky",
    label: "Sticky / Goo",
    color: "from-lime-400/30 to-emerald-600/30",
    icon: "🟢",
    blockers: [
      "Honey blob",
      "Syrup pool",
      "Slime patch",
      "Tar blob",
      "Webbed tile",
      "Vines wrap",
    ],
  },
  {
    id: "magic",
    label: "Crystal / Magic",
    color: "from-violet-500/30 to-fuchsia-500/30",
    icon: "🔮",
    blockers: [
      "Crystal shell",
      "Cracked crystal",
      "Corrupted crystal",
      "Rune seal",
      "Arcane barrier",
      "Void bubble",
    ],
  },
  {
    id: "mechanical",
    label: "Mechanical",
    color: "from-gray-500/30 to-neutral-700/30",
    icon: "⚙️",
    blockers: [
      "Steel plate",
      "Bolted plate",
      "Gear lock",
      "Valve gate",
      "Laser grid",
      "Pressure gate",
    ],
  },
  {
    id: "terrain",
    label: "Terrain",
    color: "from-amber-500/30 to-green-700/30",
    icon: "🪨",
    blockers: [
      "Mud tile",
      "Sand pile",
      "Gravel chunk",
      "Moss rock",
      "Root knot",
      "Thorn cluster",
    ],
  },
  {
    id: "darkness",
    label: "Darkness Family",
    color: "from-purple-600/40 to-indigo-900/40",
    icon: "🌒",
    blockers: [
      "Darkness pulse (intact veil)",
      "Darkness hardened shell",
      "Darkness cracked A (stage 1)",
      "Darkness cracked B (stage 2)",
      "Darkness shatter clear",
    ],
  },
];

const STORAGE_KEY = "blockers-board-v1";

function initialState(): BoardState {
  return Object.fromEntries(FAMILIES.map((f) => [f.id, [...f.blockers]]));
}

export default function BlockersPage() {
  const [board, setBoard] = useState<BoardState>(() => {
    if (typeof window === "undefined") return initialState();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialState();
    try {
      const parsed = JSON.parse(raw) as BoardState;
      const base = initialState();
      for (const family of FAMILIES) {
        if (Array.isArray(parsed[family.id])) base[family.id] = parsed[family.id];
      }
      return base;
    } catch {
      return initialState();
    }
  });

  const [dragging, setDragging] = useState<{ name: string; fromFamily: string } | null>(null);

  const total = useMemo(
    () => Object.values(board).reduce((sum, list) => sum + list.length, 0),
    [board]
  );

  const persist = (next: BoardState) => {
    setBoard(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const onDropToFamily = (toFamily: string) => {
    if (!dragging) return;
    const { name, fromFamily } = dragging;
    if (fromFamily === toFamily) {
      setDragging(null);
      return;
    }
    const next: BoardState = JSON.parse(JSON.stringify(board));
    next[fromFamily] = next[fromFamily].filter((b) => b !== name);
    next[toFamily].push(name);
    persist(next);
    setDragging(null);
  };

  const moveWithin = (familyId: string, name: string, dir: -1 | 1) => {
    const list = [...board[familyId]];
    const i = list.indexOf(name);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    persist({ ...board, [familyId]: list });
  };

  const reset = () => persist(initialState());

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-[1700px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold">Blocker Family Board</h1>
            <p className="text-sm text-zinc-400">
              /blockers · private working board (not linked) · drag blockers across families
            </p>
          </div>
          <div className="flex gap-2">
            <button
              className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-sm"
              onClick={() => navigator.clipboard.writeText(JSON.stringify(board, null, 2))}
            >
              Copy JSON
            </button>
            <button className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-sm" onClick={reset}>
              Reset
            </button>
          </div>
        </div>

        <p className="text-xs text-zinc-500 mb-4">Total blockers: {total}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {FAMILIES.map((family) => (
            <section
              key={family.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDropToFamily(family.id)}
              className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3"
            >
              <header className={`rounded-lg bg-gradient-to-r ${family.color} p-2 mb-3`}>
                <h2 className="font-semibold text-sm">
                  {family.icon} {family.label}
                </h2>
                <p className="text-xs text-zinc-300">{board[family.id]?.length ?? 0} items</p>
              </header>

              <div className="space-y-2 min-h-16">
                {(board[family.id] || []).map((name) => (
                  <article
                    key={name}
                    draggable
                    onDragStart={() => setDragging({ name, fromFamily: family.id })}
                    onDragEnd={() => setDragging(null)}
                    className="rounded-lg border border-zinc-700 bg-zinc-800 p-2 cursor-grab active:cursor-grabbing"
                  >
                    <div className="flex gap-2 items-start">
                      <div className={`w-10 h-10 rounded bg-gradient-to-br ${family.color} flex items-center justify-center text-lg shrink-0`}>
                        {family.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm leading-tight break-words">{name}</p>
                        <div className="mt-2 flex gap-1">
                          <button
                            onClick={() => moveWithin(family.id, name, -1)}
                            className="text-xs px-2 py-0.5 rounded bg-zinc-700 hover:bg-zinc-600"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveWithin(family.id, name, 1)}
                            className="text-xs px-2 py-0.5 rounded bg-zinc-700 hover:bg-zinc-600"
                          >
                            ↓
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
