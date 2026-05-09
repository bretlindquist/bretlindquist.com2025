"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type Family = {
  id: string;
  label: string;
  color: string;
  icon: string;
  blockers: string[];
  summary: string;
  useCases: string[];
  avoidWhen: string;
  examples: string[];
};
type BoardState = Record<string, string[]>;
type Selected = { name: string; familyId: string } | null;
type ModalTab = "move" | "matrix" | "create";

type DynamicFamily = { id: string; label: string; color: string; icon: string };

const BASE_FAMILIES: Family[] = [
  {
    id: "cloud_progression",
    label: "Cloud / Fog Progression",
    color: "from-sky-500/30 to-indigo-500/30",
    icon: "☁️",
    summary: "Use for visibility blockers, atmospheric cover, and soft spatial denial.",
    useCases: ["Obscures tiles", "Builds weather moods", "Can evolve into toxic or storm states"],
    avoidWhen: "The blocker behaves like a hard shell, lock, or impact-driven break progression.",
    examples: ["Cloud (dense)", "Fog (thick)", "Storm cloud (charged)"],
    blockers: ["Cloud (light)", "Cloud (dense)", "Mist swirl", "Smoke pocket", "Fog (low)", "Fog (thick)", "Storm cloud (charged)", "Toxic haze"],
  },
  {
    id: "ice_progression",
    label: "Water / Ice Progression",
    color: "from-cyan-400/30 to-blue-500/30",
    icon: "🧊",
    summary: "Use for multi-hit frozen shells, fragile clears, and brittle glass-like blockers.",
    useCases: ["Single to multi-hit break states", "Transparent but obstructive surfaces", "Strong shatter payoff"],
    avoidWhen: "The blocker spreads, oozes, or reads more like terrain clutter than a brittle shell.",
    examples: ["Frosted glass", "Ice thick", "Shattering ice (clear state)"],
    blockers: ["Frosted glass", "Ice thin", "Ice medium", "Ice thick", "Cracked ice (stage 1)", "Cracked ice (stage 2)", "Shattering ice (clear state)"],
  },
  {
    id: "stone_progression",
    label: "Brick / Stone / Concrete",
    color: "from-orange-500/30 to-stone-600/30",
    icon: "🧱",
    summary: "Use for grounded physical barriers with weight, durability, and structural damage states.",
    useCases: ["Hard-stop solids", "Urban or ruins themes", "Readable crack progression"],
    avoidWhen: "The blocker is magical, gooey, or primarily about lock/unlock logic.",
    examples: ["Brick wall", "Concrete slab", "Fractured marble"],
    blockers: ["Brick wall", "Cracked brick", "Concrete slab", "Cracked concrete", "Stone block", "Cracked stone", "Marble tile", "Fractured marble"],
  },
  {
    id: "cage_progression",
    label: "Cage / Lock Progression",
    color: "from-zinc-400/30 to-slate-700/30",
    icon: "⛓️",
    summary: "Use for mechanical gates, lock puzzles, and constrained-object blockers.",
    useCases: ["Keyed gates", "Multi-part unlock fantasies", "Industrial or prison themes"],
    avoidWhen: "The blocker is mostly visual fog, organic spread, or terrain friction without a lock fantasy.",
    examples: ["Locked cage", "Valve gate", "Laser grid"],
    blockers: ["Cage (light bars)", "Cage (heavy bars)", "Rusty cage", "Locked cage", "Electrified cage", "Reinforced crate cage", "Gear lock", "Valve gate", "Pressure gate", "Steel plate", "Bolted plate", "Laser grid"],
  },
  {
    id: "goo_progression",
    label: "Goo / Sticky Growth",
    color: "from-lime-400/30 to-emerald-700/30",
    icon: "🟢",
    summary: "Use for spreadable hazards, sticky slows, and messy organic occupation.",
    useCases: ["Creeping board coverage", "Slow/adhesive fantasy", "Gross or playful texture set"],
    avoidWhen: "The blocker should read as a discrete shell, cage, or polished magical seal.",
    examples: ["Slime patch", "Tar blob", "Vines wrap"],
    blockers: ["Honey blob", "Syrup pool", "Slime patch", "Tar blob", "Webbed tile", "Vines wrap"],
  },
  {
    id: "arcane_progression",
    label: "Crystal / Arcane Progression",
    color: "from-violet-500/30 to-fuchsia-600/30",
    icon: "🔮",
    summary: "Use for magical seals, crystalline prisons, and ritualized progression states.",
    useCases: ["Mystic gating", "Energy barrier themes", "Corruption or purification arcs"],
    avoidWhen: "The blocker is better explained by physical materials or grounded terrain.",
    examples: ["Crystal shell", "Rune seal", "Void bubble"],
    blockers: ["Crystal shell", "Cracked crystal", "Corrupted crystal", "Rune seal", "Arcane barrier", "Void bubble"],
  },
  {
    id: "darkness_progression",
    label: "Darkness Progression",
    color: "from-purple-600/40 to-indigo-900/40",
    icon: "🌒",
    summary: "Use for corruption layers, shadow curtains, and ominous multi-stage reveals.",
    useCases: ["Veil or concealment mechanics", "Corruption growth", "Big dramatic shatter clears"],
    avoidWhen: "The blocker is bright arcane energy or a straightforward material shell without shadow identity.",
    examples: ["Darkness pulse (intact veil)", "Darkness cracked B (stage 2)", "Darkness shatter clear"],
    blockers: ["Darkness pulse (intact veil)", "Darkness hardened shell", "Darkness cracked A (stage 1)", "Darkness cracked B (stage 2)", "Darkness shatter clear"],
  },
  {
    id: "terrain_progression",
    label: "Terrain / Roots",
    color: "from-amber-500/30 to-green-700/30",
    icon: "🪨",
    summary: "Use for earthbound blockers, root entanglement, and natural board occupation.",
    useCases: ["Grounded environmental friction", "Nature-overgrowth themes", "Low-tech physical clutter"],
    avoidWhen: "The blocker wants a lock fantasy, brittle shell, or fully mystical energy treatment.",
    examples: ["Mud tile", "Moss rock", "Thorn cluster"],
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

function inferSuggestedFamilyIds(name: string, currentFamilyId: string): string[] {
  const normalized = name.toLowerCase();
  const checks: Array<[string, string[]]> = [
    ["cloud_progression", ["cloud", "fog", "mist", "smoke", "haze", "storm"]],
    ["ice_progression", ["ice", "frost", "glass", "frozen", "shatter"]],
    ["stone_progression", ["brick", "concrete", "stone", "marble", "slab", "wall"]],
    ["cage_progression", ["cage", "lock", "gate", "plate", "gear", "valve", "grid", "bolt"]],
    ["goo_progression", ["honey", "syrup", "slime", "tar", "web", "vine", "goo"]],
    ["arcane_progression", ["crystal", "rune", "arcane", "void", "seal", "barrier"]],
    ["darkness_progression", ["dark", "shadow", "veil", "corrupt"]],
    ["terrain_progression", ["mud", "sand", "gravel", "moss", "root", "thorn"]],
  ];

  const suggested = checks
    .filter(([, keywords]) => keywords.some((keyword) => normalized.includes(keyword)))
    .map(([familyId]) => familyId);

  const ordered = [currentFamilyId, ...suggested.filter((familyId) => familyId !== currentFamilyId)];
  return Array.from(new Set(ordered)).slice(0, 3);
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

  const [modalTarget, setModalTarget] = useState<Selected>(null);
  const [modalTab, setModalTab] = useState<ModalTab>("move");
  const [newFamilyName, setNewFamilyName] = useState("");

  const renderFamilies = useMemo<DynamicFamily[]>(() => {
    const base = BASE_FAMILIES.map(({ id, label, color, icon }) => ({ id, label, color, icon }));
    return [...base, ...customFamilies];
  }, [customFamilies]);

  const familyMeta = useMemo(() => {
    return Object.fromEntries(BASE_FAMILIES.map((family) => [family.id, family])) as Record<string, Family>;
  }, []);

  const currentModalFamily = modalTarget ? renderFamilies.find((family) => family.id === modalTarget.familyId) ?? null : null;
  const currentModalBaseFamily = modalTarget ? familyMeta[modalTarget.familyId] ?? null : null;
  const suggestedFamilies = useMemo(() => {
    if (!modalTarget) return [];
    return inferSuggestedFamilyIds(modalTarget.name, modalTarget.familyId)
      .map((familyId) => renderFamilies.find((family) => family.id === familyId))
      .filter((family): family is DynamicFamily => Boolean(family));
  }, [modalTarget, renderFamilies]);

  const total = useMemo(() => Object.values(board).reduce((sum, list) => sum + list.length, 0), [board]);

  useEffect(() => {
    if (!modalTarget) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setModalTarget(null);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [modalTarget]);

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

  const openModal = (name: string, familyId: string) => {
    setNewFamilyName("");
    setModalTab("move");
    setModalTarget({ name, familyId });
  };

  const closeModal = () => {
    setModalTarget(null);
    setModalTab("move");
  };

  const moveFromModal = (targetFamilyId: string) => {
    if (!modalTarget) return;
    move(modalTarget.name, modalTarget.familyId, targetFamilyId);
    setModalTarget(null);
  };

  const createFamilyAndMove = () => {
    const label = newFamilyName.trim();
    if (!label || !modalTarget) return;
    const id = `custom_${label.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_${Date.now().toString(36)}`;
    const fam: DynamicFamily = { id, label, color: "from-emerald-500/30 to-cyan-600/30", icon: "🗂️" };
    const nextCustom = [...customFamilies, fam];
    const nextBoard: BoardState = { ...board, [id]: [] };
    nextBoard[modalTarget.familyId] = (nextBoard[modalTarget.familyId] || []).filter((b) => b !== modalTarget.name);
    nextBoard[id].push(modalTarget.name);
    persist(nextBoard, nextCustom);
    setNewFamilyName("");
    setModalTarget(null);
  };

  const reset = () => {
    const base = initialBoardState();
    setModalTarget(null);
    persist(base, []);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6">
      <div className="max-w-[1700px] mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold">Blocker Progression Board</h1>
            <p className="text-sm text-zinc-400">Click any blocker to reclassify it. The sheet opens with recommended families first, then the full taxonomy.</p>
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
                  const isSelected = modalTarget?.name === name && modalTarget?.familyId === family.id;
                  return (
                    <article
                      key={`${family.id}-${name}`}
                      onClick={() => openModal(name, family.id)}
                      className={`group rounded-lg border border-zinc-700 bg-zinc-800 p-2 cursor-pointer transition hover:-translate-y-0.5 hover:border-cyan-400/50 hover:bg-zinc-800/95 ${isSelected ? "ring-2 ring-cyan-400" : ""}`}
                    >
                      <div className="flex flex-col gap-2">
                        <div className="aspect-square rounded-md overflow-hidden bg-zinc-700/40">
                          <Image
                            src={imageFor(name)}
                            alt={name}
                            width={256}
                            height={256}
                            draggable={false}
                            onDragStart={(e) => e.preventDefault()}
                            onContextMenu={(e) => e.preventDefault()}
                            className="pointer-events-none h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs leading-tight line-clamp-2">{name}</p>
                          <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-zinc-400 transition group-hover:border-cyan-400/40 group-hover:text-cyan-200">
                            Move
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      {modalTarget && (
        <div
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div className="absolute inset-x-0 bottom-0 flex justify-center p-3 md:p-5">
            <div
              className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-zinc-700/80 bg-zinc-950/95 shadow-2xl shadow-black/40"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mt-3 h-1.5 w-20 rounded-full bg-zinc-700/80" />

              <div className="flex min-h-0 flex-col overflow-y-auto overflow-x-hidden p-5 md:p-7">
                <section className="rounded-[1.5rem] border border-zinc-800 bg-zinc-950/95 px-4 py-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-4">
                      <div className="h-24 w-24 overflow-hidden rounded-[1.2rem] border border-zinc-800 bg-zinc-900">
                        <Image
                          src={imageFor(modalTarget.name)}
                          alt={modalTarget.name}
                          width={256}
                          height={256}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-cyan-300">Reclassify blocker</p>
                        <h2 className="mt-1 text-2xl font-semibold text-zinc-50">{modalTarget.name}</h2>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300">
                            Current: {currentModalFamily?.icon ?? "🗂️"} {currentModalFamily?.label ?? "Custom family"}
                          </span>
                          <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300">
                            {currentModalBaseFamily?.summary ?? "Custom grouping for one-off experiments or edge cases."}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white"
                      onClick={closeModal}
                    >
                      Close
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {([
                      ["move", "Move"],
                      ["matrix", "Matrix"],
                      ["create", "New Family"],
                    ] as Array<[ModalTab, string]>).map(([tabId, label]) => {
                      const isActive = modalTab === tabId;
                      return (
                        <button
                          key={tabId}
                          className={`rounded-full border px-4 py-2 text-sm transition ${
                            isActive
                              ? "border-cyan-400/50 bg-cyan-500/12 text-cyan-100"
                              : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500 hover:text-zinc-100"
                          }`}
                          onClick={() => setModalTab(tabId)}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section className="mt-5">
                  {modalTab === "move" ? (
                    <div className="space-y-5">
                      <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-900/80 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Fast route</p>
                            <p className="mt-1 text-sm text-zinc-300">Start with the most likely fits. Most moves should finish here.</p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-[11px] text-zinc-300">
                            <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1.5">Reuse a family when the mechanic matches</span>
                            <span className="rounded-full border border-zinc-700 bg-zinc-950 px-3 py-1.5">Open Matrix only if classification is still unclear</span>
                          </div>
                        </div>

                        <div className="mt-4 grid gap-3 lg:grid-cols-3">
                          {suggestedFamilies.map((family, index) => {
                            const familyDetails = familyMeta[family.id];
                            const isCurrent = family.id === modalTarget.familyId;

                            return (
                              <button
                                key={`suggested-${family.id}`}
                                className={`rounded-[1.25rem] border px-4 py-4 text-left transition ${
                                  isCurrent
                                    ? "border-cyan-400/40 bg-cyan-500/12 shadow-lg shadow-cyan-950/20"
                                    : "border-zinc-800 bg-zinc-950/70 hover:-translate-y-0.5 hover:border-zinc-600 hover:bg-zinc-900"
                                }`}
                                onClick={() => moveFromModal(family.id)}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                                      {isCurrent ? "Already assigned" : index === 0 ? "Best fit" : "Alternate fit"}
                                    </p>
                                    <div className="mt-2 flex items-center gap-2">
                                      <span className="text-xl">{family.icon}</span>
                                      <p className="font-medium text-zinc-100">{family.label}</p>
                                    </div>
                                  </div>
                                  <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-zinc-400">
                                    {(board[family.id] || []).length} items
                                  </span>
                                </div>

                                <p className="mt-3 text-sm leading-6 text-zinc-400">
                                  {familyDetails?.summary ?? "Custom family for special-case blocker experiments."}
                                </p>

                                {familyDetails?.examples?.length ? (
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {familyDetails.examples.slice(0, 2).map((example) => (
                                      <span key={`${family.id}-example-${example}`} className="rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-300">
                                        {example}
                                      </span>
                                    ))}
                                  </div>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-900/80 p-4">
                        <div className="mb-4 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">All families</p>
                            <p className="mt-1 text-sm text-zinc-400">Everything stays reachable here, but this should scan quickly.</p>
                          </div>
                          <p className="text-xs text-zinc-500">{renderFamilies.length} available families</p>
                        </div>

                        <div className="space-y-2">
                          {renderFamilies.map((family) => {
                            const familyCount = (board[family.id] || []).length;
                            const isCurrent = family.id === modalTarget.familyId;
                            const familyDetails = familyMeta[family.id];

                            return (
                              <button
                                key={`move-${family.id}`}
                                className={`flex w-full items-start justify-between gap-4 rounded-[1.25rem] border px-4 py-4 text-left transition ${
                                  isCurrent
                                    ? "border-cyan-400/40 bg-cyan-500/10 shadow-lg shadow-cyan-950/20"
                                    : "border-zinc-800 bg-zinc-950/70 hover:border-zinc-600 hover:bg-zinc-900"
                                }`}
                                onClick={() => moveFromModal(family.id)}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-lg">{family.icon}</span>
                                    <p className="font-medium text-zinc-100">{family.label}</p>
                                    <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-zinc-400">
                                      {familyCount} items
                                    </span>
                                  </div>

                                  <p className="mt-2 text-sm leading-6 text-zinc-400">
                                    {familyDetails?.summary ?? "Custom family for special-case blocker experiments."}
                                  </p>

                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {(familyDetails?.useCases ?? ["Custom grouping", "Experimental category"]).slice(0, 3).map((item) => (
                                      <span key={`${family.id}-${item}`} className="rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-300">
                                        {item}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <div className="shrink-0 text-right">
                                  {isCurrent ? (
                                    <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Current</p>
                                  ) : (
                                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Move here</p>
                                  )}
                                  {familyDetails?.avoidWhen ? (
                                    <p className="mt-3 max-w-[14rem] text-xs leading-5 text-zinc-500">
                                      <span className="uppercase tracking-[0.18em] text-zinc-600">Avoid</span>{" "}
                                      {familyDetails.avoidWhen}
                                    </p>
                                  ) : null}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {modalTab === "matrix" ? (
                    <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-900/80 p-4">
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Use-case matrix</p>
                          <p className="mt-1 text-sm text-zinc-400">Reference mode. Use this when two families still feel plausible.</p>
                        </div>
                        <button
                          className="rounded-full border border-zinc-700 bg-zinc-950 px-4 py-2 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white"
                          onClick={() => setModalTab("move")}
                        >
                          Back to move
                        </button>
                      </div>

                      <div className="grid gap-3 lg:grid-cols-2">
                        {BASE_FAMILIES.map((family) => (
                          <div key={`matrix-${family.id}`} className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <span className="text-xl">{family.icon}</span>
                                <div>
                                  <p className="font-medium text-zinc-100">{family.label}</p>
                                  <p className="mt-1 text-sm leading-6 text-zinc-400">{family.summary}</p>
                                </div>
                              </div>
                              <button
                                className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-zinc-500 hover:text-white"
                                onClick={() => moveFromModal(family.id)}
                              >
                                {family.id === modalTarget.familyId ? "Current" : "Move here"}
                              </button>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              {family.useCases.map((item) => (
                                <span key={`${family.id}-use-${item}`} className="rounded-full border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-300">
                                  {item}
                                </span>
                              ))}
                            </div>

                            <div className="mt-4">
                              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">Typical examples</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                {family.examples.map((example) => (
                                  <span key={`${family.id}-matrix-example-${example}`} className="rounded-full bg-zinc-900 px-2.5 py-1 text-[11px] text-zinc-300">
                                    {example}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <p className="mt-4 text-xs leading-5 text-zinc-500">
                              <span className="uppercase tracking-[0.18em] text-zinc-600">Avoid when</span> {family.avoidWhen}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {modalTab === "create" ? (
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                      <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-900/80 p-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Create new family</p>
                        <p className="mt-2 text-sm leading-6 text-zinc-300">
                          This is intentionally secondary. Only do it when the blocker truly introduces a missing mechanic family.
                        </p>

                        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                          <p className="text-sm font-medium text-zinc-100">Good reasons to create one</p>
                          <ul className="mt-2 space-y-2 text-sm leading-6 text-zinc-300">
                            <li>• It introduces a mechanic family not covered by the current matrix.</li>
                            <li>• It needs a distinct progression logic, not just a new material skin.</li>
                            <li>• It represents a recurring theme pack you expect to reuse.</li>
                          </ul>
                        </div>

                        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
                          <p className="text-sm font-medium text-zinc-100">Do not create one just because…</p>
                          <ul className="mt-2 space-y-2 text-sm leading-6 text-zinc-300">
                            <li>• The art style changed but the progression logic stayed the same.</li>
                            <li>• The blocker is a variant of an existing shell, fog, lock, goo, or terrain family.</li>
                            <li>• You have not checked the Matrix tab yet.</li>
                          </ul>
                        </div>
                      </div>

                      <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-900/80 p-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">New category name</p>
                        <div className="mt-4 space-y-3">
                          <input
                            value={newFamilyName}
                            onChange={(e) => setNewFamilyName(e.target.value)}
                            placeholder="New category name"
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-3 outline-none transition focus:border-cyan-400/60"
                          />
                          <button className="w-full rounded-xl bg-emerald-700 px-4 py-3 text-sm font-medium transition hover:bg-emerald-600" onClick={createFamilyAndMove}>
                            Create family and move blocker
                          </button>
                          <button
                            className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white"
                            onClick={() => setModalTab("matrix")}
                          >
                            Review matrix first
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </section>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
