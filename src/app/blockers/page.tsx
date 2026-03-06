"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type Family = { id: string; label: string; color: string; icon: string; blockers: string[]; summary: string; useCases: string[] };
type BoardState = Record<string, string[]>;
type Selected = { name: string; familyId: string } | null;

type DynamicFamily = { id: string; label: string; color: string; icon: string };

const BASE_FAMILIES: Family[] = [
  {
    id: "cloud_progression",
    label: "Cloud / Fog Progression",
    color: "from-sky-500/30 to-indigo-500/30",
    icon: "☁️",
    summary: "Use for visibility blockers, atmospheric cover, and soft spatial denial.",
    useCases: ["Obscures tiles", "Builds weather moods", "Can evolve into toxic or storm states"],
    blockers: ["Cloud (light)", "Cloud (dense)", "Mist swirl", "Smoke pocket", "Fog (low)", "Fog (thick)", "Storm cloud (charged)", "Toxic haze"],
  },
  {
    id: "ice_progression",
    label: "Water / Ice Progression",
    color: "from-cyan-400/30 to-blue-500/30",
    icon: "🧊",
    summary: "Use for multi-hit frozen shells, fragile clears, and brittle glass-like blockers.",
    useCases: ["Single to multi-hit break states", "Transparent but obstructive surfaces", "Strong shatter payoff"],
    blockers: ["Frosted glass", "Ice thin", "Ice medium", "Ice thick", "Cracked ice (stage 1)", "Cracked ice (stage 2)", "Shattering ice (clear state)"],
  },
  {
    id: "stone_progression",
    label: "Brick / Stone / Concrete",
    color: "from-orange-500/30 to-stone-600/30",
    icon: "🧱",
    summary: "Use for grounded physical barriers with weight, durability, and structural damage states.",
    useCases: ["Hard-stop solids", "Urban or ruins themes", "Readable crack progression"],
    blockers: ["Brick wall", "Cracked brick", "Concrete slab", "Cracked concrete", "Stone block", "Cracked stone", "Marble tile", "Fractured marble"],
  },
  {
    id: "cage_progression",
    label: "Cage / Lock Progression",
    color: "from-zinc-400/30 to-slate-700/30",
    icon: "⛓️",
    summary: "Use for mechanical gates, lock puzzles, and constrained-object blockers.",
    useCases: ["Keyed gates", "Multi-part unlock fantasies", "Industrial or prison themes"],
    blockers: ["Cage (light bars)", "Cage (heavy bars)", "Rusty cage", "Locked cage", "Electrified cage", "Reinforced crate cage", "Gear lock", "Valve gate", "Pressure gate", "Steel plate", "Bolted plate", "Laser grid"],
  },
  {
    id: "goo_progression",
    label: "Goo / Sticky Growth",
    color: "from-lime-400/30 to-emerald-700/30",
    icon: "🟢",
    summary: "Use for spreadable hazards, sticky slows, and messy organic occupation.",
    useCases: ["Creeping board coverage", "Slow/adhesive fantasy", "Gross or playful texture set"],
    blockers: ["Honey blob", "Syrup pool", "Slime patch", "Tar blob", "Webbed tile", "Vines wrap"],
  },
  {
    id: "arcane_progression",
    label: "Crystal / Arcane Progression",
    color: "from-violet-500/30 to-fuchsia-600/30",
    icon: "🔮",
    summary: "Use for magical seals, crystalline prisons, and ritualized progression states.",
    useCases: ["Mystic gating", "Energy barrier themes", "Corruption or purification arcs"],
    blockers: ["Crystal shell", "Cracked crystal", "Corrupted crystal", "Rune seal", "Arcane barrier", "Void bubble"],
  },
  {
    id: "darkness_progression",
    label: "Darkness Progression",
    color: "from-purple-600/40 to-indigo-900/40",
    icon: "🌒",
    summary: "Use for corruption layers, shadow curtains, and ominous multi-stage reveals.",
    useCases: ["Veil or concealment mechanics", "Corruption growth", "Big dramatic shatter clears"],
    blockers: ["Darkness pulse (intact veil)", "Darkness hardened shell", "Darkness cracked A (stage 1)", "Darkness cracked B (stage 2)", "Darkness shatter clear"],
  },
  {
    id: "terrain_progression",
    label: "Terrain / Roots",
    color: "from-amber-500/30 to-green-700/30",
    icon: "🪨",
    summary: "Use for earthbound blockers, root entanglement, and natural board occupation.",
    useCases: ["Grounded environmental friction", "Nature-overgrowth themes", "Low-tech physical clutter"],
    blockers: ["Mud tile", "Sand pile", "Gravel chunk", "Moss rock", "Root knot", "Thorn cluster"],
  },
];

const STORAGE_KEY = "blockers-board-v4";
const CUSTOM_FAMILIES_KEY = "blockers-custom-families-v1";

const imageMap: Record<string, string> = {
  "Cloud (light)": "/blockers/tiles/cloud_light.png",
  "Cloud (dense)": "/blockers/tiles/cloud_dense.png",
  "Fog (low)": "/blockers/tiles/fog_low.png",
  "Fog (thick)": "/blockers/tiles/fog_thick.png",
  "Mist swirl": "/blockers/tiles/mist_swirl.png",
  "Smoke pocket": "/blockers/tiles/smoke_pocket.png",
  "Toxic haze": "/blockers/tiles/toxic_haze.png",
  "Storm cloud (charged)": "/blockers/tiles/storm_cloud_charged.png",
  "Brick wall": "/blockers/tiles/brick_wall.png",
  "Cracked brick": "/blockers/tiles/brick_cracked.png",
  "Concrete slab": "/blockers/tiles/concrete_slab.png",
  "Cracked concrete": "/blockers/tiles/concrete_cracked.png",
  "Stone block": "/blockers/tiles/stone_block.png",
  "Cracked stone": "/blockers/tiles/stone_cracked.png",
  "Marble tile": "/blockers/tiles/marble_tile.png",
  "Fractured marble": "/blockers/tiles/marble_fractured.png",
  "Ice thin": "/blockers/tiles/ice_thin.png",
  "Ice medium": "/blockers/tiles/ice_medium.png",
  "Ice thick": "/blockers/tiles/ice_thick.png",
  "Frosted glass": "/blockers/tiles/frosted_glass.png",
  "Cracked ice (stage 1)": "/blockers/tiles/ice_cracked_1.png",
  "Cracked ice (stage 2)": "/blockers/tiles/ice_cracked_2.png",
  "Shattering ice (clear state)": "/blockers/tiles/ice_shatter.png",
  "Cage (light bars)": "/blockers/tiles/cage_light.png",
  "Cage (heavy bars)": "/blockers/tiles/cage_heavy.png",
  "Rusty cage": "/blockers/tiles/cage_rusty.png",
  "Locked cage": "/blockers/tiles/cage_locked.png",
  "Electrified cage": "/blockers/tiles/cage_electrified.png",
  "Reinforced crate cage": "/blockers/tiles/cage_reinforced.png",
  "Gear lock": "/blockers/tiles/gear_lock.png",
  "Honey blob": "/blockers/tiles/honey_blob.png",
  "Syrup pool": "/blockers/tiles/syrup_pool.png",
  "Slime patch": "/blockers/tiles/slime_patch.png",
  "Tar blob": "/blockers/tiles/tar_blob.png",
  "Webbed tile": "/blockers/tiles/webbed_tile.png",
  "Vines wrap": "/blockers/tiles/vines_wrap.png",
  "Crystal shell": "/blockers/tiles/crystal_shell.png",
  "Cracked crystal": "/blockers/tiles/crystal_cracked.png",
  "Corrupted crystal": "/blockers/tiles/crystal_corrupted.png",
  "Rune seal": "/blockers/tiles/rune_seal.png",
  "Arcane barrier": "/blockers/tiles/arcane_barrier.png",
  "Void bubble": "/blockers/tiles/void_bubble.png",
  "Darkness pulse (intact veil)": "/blockers/tiles/darkness_pulse.png",
  "Darkness hardened shell": "/blockers/tiles/darkness_hardened.png",
  "Darkness cracked A (stage 1)": "/blockers/tiles/darkness_cracked_a.png",
  "Darkness cracked B (stage 2)": "/blockers/tiles/darkness_cracked_b.png",
  "Darkness shatter clear": "/blockers/tiles/darkness_cracked_b.png",
  "Mud tile": "/blockers/tiles/tar_blob_alt.png",
  "Sand pile": "/blockers/tiles/marble_tile.png",
  "Gravel chunk": "/blockers/tiles/stone_cracked.png",
  "Moss rock": "/blockers/tiles/stone_block.png",
  "Root knot": "/blockers/tiles/vines_wrap.png",
  "Thorn cluster": "/blockers/tiles/webbed_tile.png",
};

function imageFor(name: string): string {
  return imageMap[name] || "/blockers/tiles/stone_block.png";
}

function initialBoardState(): BoardState {
  return Object.fromEntries(BASE_FAMILIES.map((f) => [f.id, [...f.blockers]]));
}

export default function BlockersPage() {
  const [board, setBoard] = useState<BoardState>(() => {
    if (typeof window === "undefined") return initialBoardState();
    const raw = localStorage.getItem(STORAGE_KEY);
    const base = initialBoardState();
    if (!raw) return base;
    try {
      const parsed = JSON.parse(raw) as BoardState;
      for (const key of Object.keys(parsed)) if (Array.isArray(parsed[key])) base[key] = parsed[key];
      return base;
    } catch {
      return base;
    }
  });

  const [customFamilies, setCustomFamilies] = useState<DynamicFamily[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(CUSTOM_FAMILIES_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw) as DynamicFamily[];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  });

  const [selected, setSelected] = useState<Selected>(null);
  const [longPressTarget, setLongPressTarget] = useState<Selected>(null);
  const [newFamilyName, setNewFamilyName] = useState("");

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const renderFamilies = useMemo<DynamicFamily[]>(() => {
    const base = BASE_FAMILIES.map(({ id, label, color, icon }) => ({ id, label, color, icon }));
    return [...base, ...customFamilies];
  }, [customFamilies]);

  const familyMeta = useMemo(() => {
    return Object.fromEntries(BASE_FAMILIES.map((family) => [family.id, family])) as Record<string, Family>;
  }, []);

  const currentModalFamily = longPressTarget ? renderFamilies.find((family) => family.id === longPressTarget.familyId) ?? null : null;
  const currentModalBaseFamily = longPressTarget ? familyMeta[longPressTarget.familyId] ?? null : null;

  const total = useMemo(() => Object.values(board).reduce((sum, list) => sum + list.length, 0), [board]);

  useEffect(() => {
    if (!longPressTarget) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setLongPressTarget(null);
        setSelected(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [longPressTarget]);

  const persist = (next: BoardState, nextCustom?: DynamicFamily[]) => {
    setBoard(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (nextCustom) {
      setCustomFamilies(nextCustom);
      localStorage.setItem(CUSTOM_FAMILIES_KEY, JSON.stringify(nextCustom));
    }
  };

  const move = (name: string, fromFamily: string, toFamily: string, toIndex?: number) => {
    if (!name || !fromFamily || !toFamily) return;
    const next: BoardState = JSON.parse(JSON.stringify(board));
    next[fromFamily] = (next[fromFamily] || []).filter((b) => b !== name);
    if (!next[toFamily]) next[toFamily] = [];
    if (typeof toIndex === "number" && toIndex >= 0 && toIndex <= next[toFamily].length) next[toFamily].splice(toIndex, 0, name);
    else next[toFamily].push(name);
    persist(next);
  };

  const swapWithinFamily = (familyId: string, a: string, b: string) => {
    const list = [...(board[familyId] || [])];
    const ia = list.indexOf(a);
    const ib = list.indexOf(b);
    if (ia < 0 || ib < 0 || ia === ib) return;
    [list[ia], list[ib]] = [list[ib], list[ia]];
    persist({ ...board, [familyId]: list });
  };

  const onCardTap = (name: string, familyId: string) => {
    if (!selected) {
      setSelected({ name, familyId });
      return;
    }

    if (selected.name === name && selected.familyId === familyId) {
      setSelected(null);
      return;
    }

    if (selected.familyId === familyId) {
      swapWithinFamily(familyId, selected.name, name);
    } else {
      const targetIndex = (board[familyId] || []).indexOf(name);
      move(selected.name, selected.familyId, familyId, targetIndex >= 0 ? targetIndex : undefined);
    }

    setSelected(null);
  };

  const startLongPress = (name: string, familyId: string) => {
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      setLongPressTarget({ name, familyId });
      setSelected({ name, familyId });
    }, 500);
  };

  const clearLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const moveFromModal = (targetFamilyId: string) => {
    if (!longPressTarget) return;
    move(longPressTarget.name, longPressTarget.familyId, targetFamilyId);
    setLongPressTarget(null);
    setSelected(null);
  };

  const createFamilyAndMove = () => {
    const label = newFamilyName.trim();
    if (!label || !longPressTarget) return;
    const id = `custom_${label.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${Date.now().toString(36)}`;
    const fam: DynamicFamily = { id, label, color: "from-emerald-500/30 to-cyan-600/30", icon: "🗂️" };
    const nextCustom = [...customFamilies, fam];
    const nextBoard: BoardState = { ...board, [id]: [] };
    nextBoard[longPressTarget.familyId] = (nextBoard[longPressTarget.familyId] || []).filter((b) => b !== longPressTarget.name);
    nextBoard[id].push(longPressTarget.name);
    persist(nextBoard, nextCustom);
    setNewFamilyName("");
    setLongPressTarget(null);
    setSelected(null);
  };

  const reset = () => {
    const base = initialBoardState();
    setSelected(null);
    setLongPressTarget(null);
    persist(base, []);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6">
      <div className="max-w-[1700px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold">Blocker Progression Board</h1>
            <p className="text-sm text-zinc-400">Tap to select, tap another to reorganize. Long press for category menu.</p>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-sm" onClick={() => navigator.clipboard.writeText(JSON.stringify(board, null, 2))}>Copy JSON</button>
            <button className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-sm" onClick={reset}>Reset</button>
          </div>
        </div>

        <p className="text-xs text-zinc-500 mb-4">Total blockers: {total}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {renderFamilies.map((family) => (
            <section key={family.id} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
              <header className={`rounded-lg bg-gradient-to-r ${family.color} p-2 mb-3`}>
                <h2 className="font-semibold text-sm">{family.icon} {family.label}</h2>
                <p className="text-xs text-zinc-300">{(board[family.id] || []).length} items</p>
              </header>

              <div className="grid grid-cols-2 gap-2 min-h-20">
                {(board[family.id] || []).map((name) => {
                  const isSelected = selected?.name === name && selected?.familyId === family.id;
                  return (
                    <article
                      key={`${family.id}-${name}`}
                      onClick={() => onCardTap(name, family.id)}
                      onMouseDown={() => startLongPress(name, family.id)}
                      onMouseUp={clearLongPress}
                      onMouseLeave={clearLongPress}
                      onTouchStart={() => startLongPress(name, family.id)}
                      onTouchEnd={clearLongPress}
                      onContextMenu={(e) => e.preventDefault()}
                      className={`rounded-lg border border-zinc-700 bg-zinc-800 p-2 cursor-pointer select-none ${isSelected ? "ring-2 ring-blue-400" : ""}`}
                      style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="aspect-square rounded-md overflow-hidden bg-zinc-700/40" style={{ WebkitTouchCallout: "none" }}>
                          <Image
                            src={imageFor(name)}
                            alt={name}
                            width={256}
                            height={256}
                            draggable={false}
                            onDragStart={(e) => e.preventDefault()}
                            onContextMenu={(e) => e.preventDefault()}
                            className="w-full h-full object-cover pointer-events-none"
                            style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
                          />
                        </div>
                        <p className="text-xs leading-tight line-clamp-2">{name}</p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      {longPressTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm"
          onClick={() => {
            setLongPressTarget(null);
            setSelected(null);
          }}
        >
          <div className="absolute inset-x-0 bottom-0 flex justify-center p-3 md:p-5">
            <div
              className="w-full max-w-6xl rounded-[2rem] border border-zinc-700/80 bg-zinc-950/95 shadow-2xl shadow-black/40"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mt-3 h-1.5 w-20 rounded-full bg-zinc-700/80" />

              <div className="grid gap-6 p-5 md:grid-cols-[320px_minmax(0,1fr)] md:p-7">
                <section className="space-y-4">
                  <div className="overflow-hidden rounded-[1.5rem] border border-zinc-800 bg-zinc-900/90">
                    <div className="aspect-square bg-zinc-900">
                      <Image
                        src={imageFor(longPressTarget.name)}
                        alt={longPressTarget.name}
                        width={512}
                        height={512}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="space-y-3 p-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Selected blocker</p>
                        <h3 className="mt-1 text-xl font-semibold text-zinc-100">{longPressTarget.name}</h3>
                      </div>

                      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Current family</p>
                        <div className="mt-2 flex items-start gap-3">
                          <span className="text-2xl">{currentModalFamily?.icon ?? "🗂️"}</span>
                          <div>
                            <p className="font-medium text-zinc-100">{currentModalFamily?.label ?? "Custom family"}</p>
                            <p className="mt-1 text-sm leading-6 text-zinc-400">
                              {currentModalBaseFamily?.summary ?? "Use custom families for experiments, theme packs, or one-off blocker buckets."}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-3">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Sheet use cases</p>
                        <ul className="mt-2 space-y-2 text-sm leading-6 text-zinc-300">
                          <li>Move this blocker into an existing progression family.</li>
                          <li>Create a new family when the blocker suggests a missing taxonomy.</li>
                          <li>Cross-check the matrix below before inventing duplicate categories.</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">Reclassify blocker</p>
                      <h2 className="mt-1 text-2xl font-semibold text-zinc-50">Bottom-sheet move matrix</h2>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-400">
                        Use this sheet when a blocker fits a different mechanic family, should live in a custom track, or needs to be checked against the existing board taxonomy before you create something new.
                      </p>
                    </div>

                    <button
                      className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white"
                      onClick={() => {
                        setLongPressTarget(null);
                        setSelected(null);
                      }}
                    >
                      Close
                    </button>
                  </div>

                  <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-900/80 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Move to family</p>
                        <p className="mt-1 text-sm text-zinc-400">Tap a destination family. Existing categories stay fast; custom categories stay possible.</p>
                      </div>
                      <p className="text-xs text-zinc-500">{renderFamilies.length} available families</p>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {renderFamilies.map((family) => {
                        const familyCount = (board[family.id] || []).length;
                        const isCurrent = family.id === longPressTarget.familyId;
                        const familyDetails = familyMeta[family.id];

                        return (
                          <button
                            key={`move-${family.id}`}
                            className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${
                              isCurrent
                                ? "border-cyan-400/40 bg-cyan-500/10 shadow-lg shadow-cyan-950/20"
                                : "border-zinc-800 bg-zinc-950/70 hover:-translate-y-0.5 hover:border-zinc-600 hover:bg-zinc-900"
                            }`}
                            onClick={() => moveFromModal(family.id)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-lg">{family.icon}</p>
                                <p className="mt-2 font-medium text-zinc-100">{family.label}</p>
                              </div>
                              <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-zinc-400">
                                {familyCount} items
                              </span>
                            </div>

                            <p className="mt-3 text-sm leading-6 text-zinc-400">
                              {familyDetails?.summary ?? "Custom family for special-case blocker experiments."}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {(familyDetails?.useCases ?? ["Custom grouping", "Experimental category"]).map((item) => (
                                <span key={`${family.id}-${item}`} className="rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-300">
                                  {item}
                                </span>
                              ))}
                            </div>

                            {isCurrent ? (
                              <p className="mt-4 text-xs uppercase tracking-[0.18em] text-cyan-300">Current family</p>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                    <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-900/80 p-4">
                      <div className="mb-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Use-case matrix</p>
                        <p className="mt-1 text-sm text-zinc-400">The current board covers atmospheric, physical, mechanical, sticky, magical, darkness, and terrain blocker roles.</p>
                      </div>

                      <div className="grid gap-3 lg:grid-cols-2">
                        {BASE_FAMILIES.map((family) => (
                          <div key={`matrix-${family.id}`} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                            <div className="flex items-start gap-3">
                              <span className="text-xl">{family.icon}</span>
                              <div>
                                <p className="font-medium text-zinc-100">{family.label}</p>
                                <p className="mt-1 text-sm leading-6 text-zinc-400">{family.summary}</p>
                              </div>
                            </div>

                            <ul className="mt-3 space-y-2 text-sm leading-6 text-zinc-300">
                              {family.useCases.map((item) => (
                                <li key={`${family.id}-use-${item}`}>• {item}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-900/80 p-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Create new family</p>
                      <p className="mt-1 text-sm leading-6 text-zinc-400">
                        Add a new family only when the blocker genuinely introduces a missing taxonomy, not just a visual variant of an existing one.
                      </p>

                      <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
                        <p className="text-sm font-medium text-zinc-100">Good reasons to create one</p>
                        <ul className="mt-2 space-y-2 text-sm leading-6 text-zinc-300">
                          <li>• It introduces a mechanic family not covered by the current matrix.</li>
                          <li>• It needs a distinct progression logic, not just a new material skin.</li>
                          <li>• It represents a recurring theme pack you expect to reuse.</li>
                        </ul>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <input
                          value={newFamilyName}
                          onChange={(e) => setNewFamilyName(e.target.value)}
                          placeholder="New category name"
                          className="flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 outline-none transition focus:border-cyan-400/60"
                        />
                        <button className="rounded-xl bg-emerald-700 px-4 py-3 text-sm font-medium transition hover:bg-emerald-600" onClick={createFamilyAndMove}>
                          Create
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
