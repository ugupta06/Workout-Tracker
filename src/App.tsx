// @ts-nocheck
import { useState } from "react";

const BASE_DAYS = [
  {
    day: "Day 1",
    label: "Upper A",
    focus: "Chest · Triceps · Shoulders",
    color: "#3B82F6",
    exercises: [
      { name: "Incline DB Press", sets: 4, reps: "6–8" },
      { name: "Overhead DB Press", sets: 3, reps: "6–8" },
      { name: "Flat Cable Fly", sets: 3, reps: "12–15" },
      { name: "Tricep Pushdowns (V-bar)", sets: 3, reps: "10–12" },
      { name: "Face Pulls", sets: 2, reps: "15" },
    ],
  },
  {
    day: "Day 2",
    label: "Lower A",
    focus: "Quad Focus",
    color: "#22C55E",
    exercises: [
      { name: "Hack Squat / Barbell Squat", sets: 4, reps: "5–8" },
      { name: "Leg Press", sets: 3, reps: "8–10" },
      { name: "Leg Extensions", sets: 3, reps: "12–15" },
      { name: "Standing Calf Raises", sets: 3, reps: "15–20" },
    ],
  },
  {
    day: "Day 3",
    label: "Rest",
    focus: "Recovery",
    color: "#6B7280",
    exercises: [],
  },
  {
    day: "Day 4",
    label: "Upper B",
    focus: "Back · Biceps",
    color: "#3B82F6",
    exercises: [
      { name: "Lat Pulldowns", sets: 4, reps: "6–8" },
      { name: "Chest-Supported Rows", sets: 3, reps: "6–8" },
      { name: "Face Pulls", sets: 2, reps: "15" },
      { name: "Incline Bicep Curls", sets: 3, reps: "10–12" },
      { name: "Rope Hammer Curls", sets: 2, reps: "12–15" },
    ],
  },
  {
    day: "Day 5",
    label: "Lower B",
    focus: "Hamstring · Glute Focus",
    color: "#22C55E",
    exercises: [
      { name: "Romanian Deadlift", sets: 4, reps: "6–8" },
      { name: "Lying Leg Curl", sets: 3, reps: "8–10" },
      { name: "Hip Thrust Machine", sets: 3, reps: "10–12" },
      { name: "Seated Calf Raises", sets: 3, reps: "15–20" },
    ],
  },
  {
    day: "Day 6",
    label: "Rest",
    focus: "Recovery",
    color: "#6B7280",
    exercises: [],
  },
];

const TABS = ["Log", "Plan", "Progress"];
const todayKey = () => new Date().toISOString().slice(0, 10);

function getStorage(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function setStorage(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

export default function App() {
  const [tab, setTab] = useState("Log");
  const [logs, setLogs] = useState(() => getStorage("wt_logs", {}));
  const [planDay, setPlanDay] = useState(0);
  // customExercises: { [dayIdx]: [{ name, sets, reps, removed: false }] }
  const [customExercises, setCustomExercises] = useState(() =>
    getStorage("wt_custom", {})
  );
  // new exercise form state
  const [newEx, setNewEx] = useState({ name: "", sets: "", reps: "" });
  const [showAddForm, setShowAddForm] = useState(false);

  const today = todayKey();
  const todayLog = logs[today] || {
    dayIdx: 0,
    sets: {},
    calories: "",
    protein: "",
    weight: "",
  };

  function updateLog(patch) {
    const updated = { ...logs, [today]: { ...todayLog, ...patch } };
    setLogs(updated);
    setStorage("wt_logs", updated);
  }

  function updateSet(exName, setIdx, field, val) {
    const prev = todayLog.sets || {};
    const exSets = prev[exName] ? [...prev[exName]] : [];
    if (!exSets[setIdx]) exSets[setIdx] = { weight: "", reps: "", done: false };
    exSets[setIdx] = { ...exSets[setIdx], [field]: val };
    updateLog({ sets: { ...prev, [exName]: exSets } });
  }

  function toggleSet(exName, setIdx) {
    const prev = todayLog.sets || {};
    const exSets = prev[exName] ? [...prev[exName]] : [];
    if (!exSets[setIdx]) exSets[setIdx] = { weight: "", reps: "", done: false };
    exSets[setIdx] = { ...exSets[setIdx], done: !exSets[setIdx].done };
    updateLog({ sets: { ...prev, [exName]: exSets } });
  }

  // Get merged exercises for a day (base + custom, respecting removed flags)
  function getDayExercises(dayIdx) {
    const base = BASE_DAYS[dayIdx].exercises;
    const custom = customExercises[dayIdx] || [];
    const removedNames = custom.filter((c) => c.removed).map((c) => c.name);
    const additions = custom.filter(
      (c) => !c.removed && !base.find((b) => b.name === c.name)
    );
    return [
      ...base.filter((e) => !removedNames.includes(e.name)),
      ...additions,
    ];
  }

  function removeExercise(dayIdx, exName) {
    const prev = customExercises[dayIdx] || [];
    // If it's a base exercise, mark as removed
    const isBase = BASE_DAYS[dayIdx].exercises.find((e) => e.name === exName);
    let updated;
    if (isBase) {
      const already = prev.find((c) => c.name === exName);
      updated = already
        ? prev.map((c) => (c.name === exName ? { ...c, removed: true } : c))
        : [...prev, { name: exName, sets: 0, reps: "", removed: true }];
    } else {
      // Remove custom exercise entirely
      updated = prev.filter((c) => c.name !== exName);
    }
    const next = { ...customExercises, [dayIdx]: updated };
    setCustomExercises(next);
    setStorage("wt_custom", next);
  }

  function restoreExercise(dayIdx, exName) {
    const prev = customExercises[dayIdx] || [];
    const updated = prev.map((c) =>
      c.name === exName ? { ...c, removed: false } : c
    );
    const next = { ...customExercises, [dayIdx]: updated };
    setCustomExercises(next);
    setStorage("wt_custom", next);
  }

  function addExercise(dayIdx) {
    if (!newEx.name.trim() || !newEx.sets || !newEx.reps.trim()) return;
    const prev = customExercises[dayIdx] || [];
    const updated = [
      ...prev.filter((c) => c.name !== newEx.name.trim()),
      {
        name: newEx.name.trim(),
        sets: parseInt(newEx.sets),
        reps: newEx.reps.trim(),
        removed: false,
      },
    ];
    const next = { ...customExercises, [dayIdx]: updated };
    setCustomExercises(next);
    setStorage("wt_custom", next);
    setNewEx({ name: "", sets: "", reps: "" });
    setShowAddForm(false);
  }

  const activeDay = BASE_DAYS[todayLog.dayIdx] || BASE_DAYS[0];
  const activeDayIdx = todayLog.dayIdx || 0;
  const activeExercises = getDayExercises(activeDayIdx);
  const removedInActive = (customExercises[activeDayIdx] || []).filter(
    (c) => c.removed
  );

  const [goals, setGoals] = useState(() =>
    getStorage("wt_goals", { calories: 2000, protein: 160 })
  );
  const [showGoalEditor, setShowGoalEditor] = useState(false);
  const [goalDraft, setGoalDraft] = useState({ calories: "", protein: "" });

  function openGoalEditor() {
    setGoalDraft({
      calories: String(goals.calories),
      protein: String(goals.protein),
    });
    setShowGoalEditor(true);
  }

  function saveGoals() {
    const updated = {
      calories: parseInt(goalDraft.calories) || goals.calories,
      protein: parseInt(goalDraft.protein) || goals.protein,
    };
    setGoals(updated);
    setStorage("wt_goals", updated);
    setShowGoalEditor(false);
  }

  const calGoal = goals.calories;
  const proteinGoal = goals.protein;

  const weightHistory = Object.entries(logs)
    .filter(([, v]) => v.weight)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, v]) => ({
      date: date.slice(5),
      weight: parseFloat(v.weight),
    }));

  const weights = weightHistory.map((w) => w.weight).filter(Boolean);
  const minW = weights.length ? Math.min(...weights) - 1 : 60;
  const maxW = weights.length ? Math.max(...weights) + 1 : 80;

  function graphY(w, h) {
    return h - ((w - minW) / (maxW - minW)) * h;
  }

  const S = {
    app: {
      minHeight: "100vh",
      background: "#080808",
      color: "#F0F0F0",
      fontFamily: "system-ui, sans-serif",
      maxWidth: 480,
      margin: "0 auto",
      paddingBottom: 80,
    },
    header: {
      padding: "20px 16px 0",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
    },
    title: { fontSize: 20, fontWeight: 700, letterSpacing: -0.5 },
    date: { fontSize: 12, color: "#4B5563" },
    tabs: {
      display: "flex",
      gap: 0,
      margin: "16px 16px 0",
      background: "#111",
      borderRadius: 12,
      padding: 4,
    },
    tab: (active) => ({
      flex: 1,
      padding: "8px 0",
      borderRadius: 9,
      border: "none",
      background: active ? "#1F1F1F" : "transparent",
      color: active ? "#F0F0F0" : "#4B5563",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
    }),
    section: { padding: "16px 16px 0" },
    card: {
      background: "#111",
      borderRadius: 14,
      border: "1px solid #1A1A1A",
      marginBottom: 12,
      overflow: "hidden",
    },
    cardHead: (color) => ({
      padding: "12px 16px",
      borderBottom: "1px solid #1A1A1A",
      display: "flex",
      alignItems: "center",
      gap: 10,
      background: `${color}08`,
    }),
    dot: (color) => ({
      width: 9,
      height: 9,
      borderRadius: "50%",
      background: color,
      flexShrink: 0,
    }),
    label: {
      fontSize: 11,
      color: "#4B5563",
      letterSpacing: 1.5,
      textTransform: "uppercase",
      marginBottom: 8,
    },
    input: {
      background: "#1A1A1A",
      border: "1px solid #222",
      borderRadius: 8,
      color: "#F0F0F0",
      fontSize: 14,
      padding: "8px 12px",
      width: "100%",
      outline: "none",
      boxSizing: "border-box",
    },
    bar: (pct, color) => ({
      height: 6,
      borderRadius: 3,
      background: "#1A1A1A",
      overflow: "hidden",
      marginTop: 6,
    }),
    barFill: (pct, color) => ({
      height: "100%",
      width: `${Math.min(pct, 100)}%`,
      background: color,
      borderRadius: 3,
      transition: "width 0.4s",
    }),
    statRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    smallBtn: (color) => ({
      padding: "4px 10px",
      borderRadius: 7,
      border: `1px solid ${color}44`,
      background: `${color}14`,
      color: color,
      fontSize: 11,
      fontWeight: 700,
      cursor: "pointer",
    }),
  };

  const daySelector = (
    <div style={{ padding: "12px 16px 0" }}>
      <div style={S.label}>Today's workout</div>
      <div
        style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}
      >
        {BASE_DAYS.map((d, i) => (
          <button
            key={i}
            onClick={() => {
              updateLog({ dayIdx: i });
              setShowAddForm(false);
            }}
            style={{
              flexShrink: 0,
              padding: "6px 12px",
              borderRadius: 8,
              border:
                todayLog.dayIdx === i
                  ? `1.5px solid ${d.color}`
                  : "1.5px solid #1F1F1F",
              background: todayLog.dayIdx === i ? `${d.color}18` : "#111",
              color: todayLog.dayIdx === i ? d.color : "#4B5563",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {d.day}
          </button>
        ))}
      </div>
    </div>
  );

  // ── LOG TAB ──
  const logTab = (
    <div>
      {daySelector}
      <div style={S.section}>
        {activeDay.exercises.length === 0 ? (
          <div
            style={{
              ...S.card,
              padding: "24px 16px",
              textAlign: "center",
              color: "#4B5563",
            }}
          >
            <div style={{ fontSize: 26, marginBottom: 8 }}>💤</div>
            <div style={{ fontSize: 14 }}>Rest day — recover well</div>
          </div>
        ) : (
          <>
            {activeExercises.map((ex) => {
              const exSets = (todayLog.sets || {})[ex.name] || [];
              const done = exSets.filter((s) => s?.done).length;
              const isCustom = !BASE_DAYS[activeDayIdx].exercises.find(
                (b) => b.name === ex.name
              );
              return (
                <div key={ex.name} style={S.card}>
                  <div style={S.cardHead(activeDay.color)}>
                    <div
                      style={S.dot(isCustom ? "#A855F7" : activeDay.color)}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>
                        {ex.name}
                        {isCustom && (
                          <span
                            style={{
                              fontSize: 10,
                              color: "#A855F7",
                              marginLeft: 6,
                              fontWeight: 700,
                            }}
                          >
                            CUSTOM
                          </span>
                        )}
                      </div>
                      <div
                        style={{ fontSize: 11, color: "#6B7280", marginTop: 1 }}
                      >
                        {ex.sets} sets · ×{ex.reps}
                      </div>
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: done === ex.sets ? "#22C55E" : "#4B5563",
                          fontWeight: 700,
                        }}
                      >
                        {done}/{ex.sets}
                      </div>
                      <button
                        onClick={() => removeExercise(activeDayIdx, ex.name)}
                        style={{
                          ...S.smallBtn("#EF4444"),
                          padding: "3px 8px",
                          fontSize: 13,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div style={{ padding: "10px 16px 12px" }}>
                    {Array.from({ length: ex.sets }).map((_, si) => {
                      const s = exSets[si] || {};
                      return (
                        <div
                          key={si}
                          style={{
                            display: "flex",
                            gap: 8,
                            marginBottom: 8,
                            alignItems: "center",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 11,
                              color: "#4B5563",
                              width: 18,
                              textAlign: "center",
                            }}
                          >
                            {si + 1}
                          </div>
                          <input
                            placeholder="kg"
                            value={s.weight || ""}
                            onChange={(e) =>
                              updateSet(ex.name, si, "weight", e.target.value)
                            }
                            style={{
                              ...S.input,
                              width: 64,
                              textAlign: "center",
                              padding: "6px 8px",
                            }}
                          />
                          <input
                            placeholder="reps"
                            value={s.reps || ""}
                            onChange={(e) =>
                              updateSet(ex.name, si, "reps", e.target.value)
                            }
                            style={{
                              ...S.input,
                              width: 64,
                              textAlign: "center",
                              padding: "6px 8px",
                            }}
                          />
                          <button
                            onClick={() => toggleSet(ex.name, si)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              border: "none",
                              cursor: "pointer",
                              background: s.done ? "#22C55E22" : "#1A1A1A",
                              color: s.done ? "#22C55E" : "#4B5563",
                              fontSize: 16,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            ✓
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {/* Removed exercises — restore option */}
            {removedInActive.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div
                  style={{ fontSize: 11, color: "#4B5563", marginBottom: 6 }}
                >
                  REMOVED TODAY
                </div>
                {removedInActive.map((r) => (
                  <div
                    key={r.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      background: "#111",
                      borderRadius: 10,
                      marginBottom: 6,
                      border: "1px solid #1A1A1A",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: "#4B5563",
                        textDecoration: "line-through",
                      }}
                    >
                      {r.name}
                    </span>
                    <button
                      onClick={() => restoreExercise(activeDayIdx, r.name)}
                      style={S.smallBtn("#22C55E")}
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add exercise */}
            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: 12,
                  border: "1.5px dashed #2A2A2A",
                  background: "transparent",
                  color: "#4B5563",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  marginBottom: 12,
                }}
              >
                + Add exercise
              </button>
            ) : (
              <div
                style={{ ...S.card, padding: "14px 16px", marginBottom: 12 }}
              >
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#A855F7",
                    marginBottom: 10,
                  }}
                >
                  New exercise
                </div>
                <input
                  placeholder="Exercise name"
                  value={newEx.name}
                  onChange={(e) =>
                    setNewEx((p) => ({ ...p, name: e.target.value }))
                  }
                  style={{ ...S.input, marginBottom: 8 }}
                />
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#6B7280",
                        marginBottom: 4,
                      }}
                    >
                      Sets
                    </div>
                    <input
                      placeholder="e.g. 3"
                      value={newEx.sets}
                      onChange={(e) =>
                        setNewEx((p) => ({ ...p, sets: e.target.value }))
                      }
                      style={{ ...S.input, textAlign: "center" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#6B7280",
                        marginBottom: 4,
                      }}
                    >
                      Reps
                    </div>
                    <input
                      placeholder="e.g. 8–10"
                      value={newEx.reps}
                      onChange={(e) =>
                        setNewEx((p) => ({ ...p, reps: e.target.value }))
                      }
                      style={{ ...S.input, textAlign: "center" }}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => addExercise(activeDayIdx)}
                    style={{
                      flex: 1,
                      padding: "9px",
                      borderRadius: 9,
                      border: "none",
                      background: "#A855F722",
                      color: "#A855F7",
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewEx({ name: "", sets: "", reps: "" });
                    }}
                    style={{
                      flex: 1,
                      padding: "9px",
                      borderRadius: 9,
                      border: "none",
                      background: "#1A1A1A",
                      color: "#6B7280",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Calories & Macros */}
      <div style={S.section}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <div style={S.label}>Nutrition</div>
          <button
            onClick={openGoalEditor}
            style={{
              fontSize: 11,
              color: "#F59E0B",
              background: "#F59E0B14",
              border: "1px solid #F59E0B33",
              borderRadius: 7,
              padding: "3px 10px",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            ⚙ Goals
          </button>
        </div>

        {showGoalEditor && (
          <div
            style={{
              ...S.card,
              padding: "14px 16px",
              marginBottom: 12,
              border: "1px solid #F59E0B44",
            }}
          >
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "#F59E0B",
                marginBottom: 10,
              }}
            >
              Edit daily goals
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div
                  style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}
                >
                  Calorie goal
                </div>
                <input
                  placeholder={String(calGoal)}
                  value={goalDraft.calories}
                  onChange={(e) =>
                    setGoalDraft((p) => ({ ...p, calories: e.target.value }))
                  }
                  style={{ ...S.input, textAlign: "center" }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}
                >
                  Protein goal (g)
                </div>
                <input
                  placeholder={String(proteinGoal)}
                  value={goalDraft.protein}
                  onChange={(e) =>
                    setGoalDraft((p) => ({ ...p, protein: e.target.value }))
                  }
                  style={{ ...S.input, textAlign: "center" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={saveGoals}
                style={{
                  flex: 1,
                  padding: "9px",
                  borderRadius: 9,
                  border: "none",
                  background: "#F59E0B22",
                  color: "#F59E0B",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Save
              </button>
              <button
                onClick={() => setShowGoalEditor(false)}
                style={{
                  flex: 1,
                  padding: "9px",
                  borderRadius: 9,
                  border: "none",
                  background: "#1A1A1A",
                  color: "#6B7280",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div style={S.card}>
          <div style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <div
                  style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}
                >
                  Calories <span style={{ color: "#374151" }}>/ {calGoal}</span>
                </div>
                <input
                  placeholder="e.g. 1800"
                  value={todayLog.calories || ""}
                  onChange={(e) => updateLog({ calories: e.target.value })}
                  style={S.input}
                />
                {todayLog.calories && (
                  <div>
                    <div style={{ ...S.statRow, marginTop: 6 }}>
                      <span style={{ fontSize: 11, color: "#4B5563" }}>
                        {todayLog.calories} kcal
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color:
                            parseFloat(todayLog.calories) <= calGoal
                              ? "#22C55E"
                              : "#EF4444",
                          fontWeight: 700,
                        }}
                      >
                        {parseFloat(todayLog.calories) <= calGoal
                          ? `${calGoal - parseFloat(todayLog.calories)} left`
                          : `${parseFloat(todayLog.calories) - calGoal} over`}
                      </span>
                    </div>
                    <div
                      style={S.bar(
                        (parseFloat(todayLog.calories) / calGoal) * 100,
                        "#F59E0B"
                      )}
                    >
                      <div
                        style={S.barFill(
                          (parseFloat(todayLog.calories) / calGoal) * 100,
                          "#F59E0B"
                        )}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}
                >
                  Protein{" "}
                  <span style={{ color: "#374151" }}>/ {proteinGoal}g</span>
                </div>
                <input
                  placeholder="e.g. 150"
                  value={todayLog.protein || ""}
                  onChange={(e) => updateLog({ protein: e.target.value })}
                  style={S.input}
                />
                {todayLog.protein && (
                  <div>
                    <div style={{ ...S.statRow, marginTop: 6 }}>
                      <span style={{ fontSize: 11, color: "#4B5563" }}>
                        {todayLog.protein}g
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color:
                            parseFloat(todayLog.protein) >= proteinGoal
                              ? "#22C55E"
                              : "#EF4444",
                          fontWeight: 700,
                        }}
                      >
                        {parseFloat(todayLog.protein) >= proteinGoal
                          ? "✓ Hit"
                          : `${
                              proteinGoal - parseFloat(todayLog.protein)
                            }g left`}
                      </span>
                    </div>
                    <div
                      style={S.bar(
                        (parseFloat(todayLog.protein) / proteinGoal) * 100,
                        "#3B82F6"
                      )}
                    >
                      <div
                        style={S.barFill(
                          (parseFloat(todayLog.protein) / proteinGoal) * 100,
                          "#3B82F6"
                        )}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#6B7280", marginBottom: 4 }}>
              Bodyweight (lbs)
            </div>
            <input
              placeholder="e.g. 165"
              value={todayLog.weight || ""}
              onChange={(e) => updateLog({ weight: e.target.value })}
              style={S.input}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // ── PLAN TAB ──
  const planTab = (
    <div style={S.section}>
      <div
        style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8 }}
      >
        {BASE_DAYS.map((d, i) => (
          <button
            key={i}
            onClick={() => setPlanDay(i)}
            style={{
              flexShrink: 0,
              padding: "6px 12px",
              borderRadius: 8,
              border:
                planDay === i
                  ? `1.5px solid ${d.color}`
                  : "1.5px solid #1F1F1F",
              background: planDay === i ? `${d.color}18` : "#111",
              color: planDay === i ? d.color : "#4B5563",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {d.day}
          </button>
        ))}
      </div>
      {(() => {
        const d = BASE_DAYS[planDay];
        const merged = getDayExercises(planDay);
        return (
          <div style={S.card}>
            <div style={S.cardHead(d.color)}>
              <div style={S.dot(d.color)} />
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{d.label}</div>
                <div style={{ fontSize: 12, color: "#6B7280", marginTop: 2 }}>
                  {d.focus}
                </div>
              </div>
            </div>
            {merged.length === 0 ? (
              <div
                style={{
                  padding: "24px 16px",
                  textAlign: "center",
                  color: "#4B5563",
                  fontSize: 14,
                }}
              >
                💤 Rest & recover
              </div>
            ) : (
              merged.map((ex, i) => {
                const isCustom = !d.exercises.find((b) => b.name === ex.name);
                return (
                  <div
                    key={i}
                    style={{
                      padding: "12px 16px",
                      borderBottom:
                        i < merged.length - 1 ? "1px solid #1A1A1A" : "none",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontSize: 14, color: "#E5E7EB" }}>
                      {ex.name}
                      {isCustom && (
                        <span
                          style={{
                            fontSize: 10,
                            color: "#A855F7",
                            marginLeft: 6,
                            fontWeight: 700,
                          }}
                        >
                          CUSTOM
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#9CA3AF",
                          background: "#1A1A1A",
                          padding: "3px 7px",
                          borderRadius: 5,
                        }}
                      >
                        {ex.sets}×
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: isCustom ? "#A855F7" : d.color,
                          background: isCustom ? "#A855F722" : `${d.color}18`,
                          padding: "3px 7px",
                          borderRadius: 5,
                        }}
                      >
                        {ex.reps}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        );
      })()}
      <div style={{ marginTop: 4 }}>
        <div style={S.label}>Rep range logic</div>
        {[
          { r: "5–8", desc: "Compounds — mechanical tension", c: "#EF4444" },
          { r: "10–12", desc: "Machines — less CNS fatigue", c: "#F59E0B" },
          { r: "12–15+", desc: "Isolation — metabolic stress", c: "#22C55E" },
          { r: "Custom", desc: "Your added exercises", c: "#A855F7" },
        ].map((x) => (
          <div
            key={x.r}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "#111",
              borderRadius: 10,
              padding: "9px 14px",
              marginBottom: 6,
              border: "1px solid #1A1A1A",
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: x.c,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: x.c,
                minWidth: 60,
              }}
            >
              {x.r}
            </span>
            <span style={{ fontSize: 12, color: "#6B7280" }}>{x.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // ── PROGRESS TAB ──
  const progressTab = (
    <div style={S.section}>
      <div style={S.label}>Bodyweight — last 14 days (lbs)</div>
      <div style={S.card}>
        <div style={{ padding: "16px" }}>
          {weightHistory.length < 2 ? (
            <div
              style={{
                textAlign: "center",
                color: "#4B5563",
                fontSize: 13,
                padding: "20px 0",
              }}
            >
              Log your weight for 2+ days to see the trend
            </div>
          ) : (
            <svg
              width="100%"
              viewBox={`0 0 ${Math.max(weightHistory.length * 30, 300)} 100`}
              style={{ overflow: "visible" }}
            >
              <polyline
                points={weightHistory
                  .map((w, i) => `${i * 30 + 15},${graphY(w.weight, 80)}`)
                  .join(" ")}
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              {weightHistory.map((w, i) => (
                <g key={i}>
                  <circle
                    cx={i * 30 + 15}
                    cy={graphY(w.weight, 80)}
                    r="3.5"
                    fill="#3B82F6"
                  />
                  <text
                    x={i * 30 + 15}
                    y="98"
                    textAnchor="middle"
                    fontSize="8"
                    fill="#4B5563"
                  >
                    {w.date}
                  </text>
                  <text
                    x={i * 30 + 15}
                    y={graphY(w.weight, 80) - 7}
                    textAnchor="middle"
                    fontSize="8"
                    fill="#9CA3AF"
                  >
                    {w.weight}
                  </text>
                </g>
              ))}
            </svg>
          )}
          {weightHistory.length >= 2 &&
            (() => {
              const diff = (
                weightHistory[weightHistory.length - 1].weight -
                weightHistory[0].weight
              ).toFixed(1);
              const up = diff > 0;
              return (
                <div
                  style={{
                    textAlign: "center",
                    marginTop: 8,
                    fontSize: 13,
                    color: up ? "#EF4444" : "#22C55E",
                    fontWeight: 700,
                  }}
                >
                  {up ? "▲" : "▼"} {Math.abs(diff)} lbs over this period
                </div>
              );
            })()}
        </div>
      </div>
      <div style={{ marginTop: 4 }}>
        <div style={S.label}>Recent logs</div>
        {Object.entries(logs)
          .sort(([a], [b]) => b.localeCompare(a))
          .slice(0, 7)
          .map(([date, log]) => {
            const d = BASE_DAYS[log.dayIdx] || BASE_DAYS[0];
            const totalSets = Object.values(log.sets || {}).reduce(
              (a, arr) => a + arr.filter((s) => s?.done).length,
              0
            );
            return (
              <div
                key={date}
                style={{
                  ...S.card,
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: d.color,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {d.label}{" "}
                    <span style={{ color: "#4B5563", fontWeight: 400 }}>
                      — {date}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "#4B5563", marginTop: 2 }}>
                    {totalSets > 0 && `${totalSets} sets logged`}
                    {log.calories && ` · ${log.calories} kcal`}
                    {log.weight && ` · ${log.weight} lbs`}
                  </div>
                </div>
              </div>
            );
          })}
        {Object.keys(logs).length === 0 && (
          <div
            style={{
              color: "#4B5563",
              fontSize: 13,
              textAlign: "center",
              padding: "20px 0",
            }}
          >
            No logs yet — start in the Log tab
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={S.app}>
      <div style={S.header}>
        <div>
          <div style={S.title}>Workout Tracker</div>
          <div style={S.date}>
            {new Date().toLocaleDateString("en-CA", {
              weekday: "long",
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>
        <div style={{ fontSize: 22 }}>💪</div>
      </div>
      <div style={S.tabs}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setShowAddForm(false);
            }}
            style={S.tab(tab === t)}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Log" && logTab}
      {tab === "Plan" && planTab}
      {tab === "Progress" && progressTab}
    </div>
  );
}
