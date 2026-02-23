import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { formatDateLocal } from "../utils/dateUtils";

interface SpecialTask {
  id: string;
  name: string;
  userId: string;
  taskType: "special";
  choices: string[];
  entries: Record<string, number>; // dateStr → choiceIndex
}

const getScore = (choiceIndex: number, totalChoices: number): number =>
  choiceIndex - Math.floor(totalChoices / 2);

const getScoreLabel = (score: number): string =>
  score > 0 ? `+${score}` : `${score}`;

const getScoreColor = (score: number) => {
  if (score > 0)
    return { bg: "bg-green-100", text: "text-green-700", hex: "#22c55e" };
  if (score < 0)
    return { bg: "bg-red-100", text: "text-red-700", hex: "#ef4444" };
  return { bg: "bg-gray-100", text: "text-gray-600", hex: "#9ca3af" };
};

// SVG Line Graph component
const ScoreGraph = ({
  entries,
  choices,
}: {
  entries: Record<string, number>;
  choices: string[];
}) => {
  const totalChoices = choices.length;
  const maxScore = Math.floor(totalChoices / 2);
  const minScore = -maxScore;

  // Get last 30 days with entries
  const today = new Date();
  const days: { date: string; score: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = formatDateLocal(d);
    if (entries[dateStr] !== undefined) {
      days.push({
        date: dateStr,
        score: getScore(entries[dateStr], totalChoices),
      });
    }
  }

  if (days.length < 2) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
        {days.length === 0
          ? "No entries yet — start recording to see your graph"
          : "Record at least 2 entries to see the graph"}
      </div>
    );
  }

  const W = 600;
  const H = 160;
  const PAD = { top: 20, right: 20, bottom: 30, left: 36 };
  const graphW = W - PAD.left - PAD.right;
  const graphH = H - PAD.top - PAD.bottom;

  const xStep = graphW / (days.length - 1);
  const scoreRange = maxScore - minScore || 1;

  const toX = (i: number) => PAD.left + i * xStep;
  const toY = (score: number) =>
    PAD.top + ((maxScore - score) / scoreRange) * graphH;

  const points = days.map((d, i) => ({ x: toX(i), y: toY(d.score), ...d }));
  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  // Y-axis grid lines & labels
  const yValues: number[] = [];
  for (let s = minScore; s <= maxScore; s++) yValues.push(s);

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ minWidth: 280 }}
      >
        {/* Grid lines */}
        {yValues.map((s) => (
          <g key={s}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={toY(s)}
              y2={toY(s)}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={toY(s) + 4}
              textAnchor="end"
              fontSize={10}
              fill={s === 0 ? "#6b7280" : s > 0 ? "#16a34a" : "#dc2626"}
              fontWeight={s === 0 ? "700" : "400"}
            >
              {getScoreLabel(s)}
            </text>
          </g>
        ))}

        {/* Zero line emphasis */}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={toY(0)}
          y2={toY(0)}
          stroke="#d1d5db"
          strokeWidth={1.5}
          strokeDasharray="4 2"
        />

        {/* Line */}
        <polyline
          points={polyline}
          fill="none"
          stroke="#6366f1"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Points */}
        {points.map((p, i) => {
          const color = getScoreColor(p.score);
          return (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={5}
                fill={color.hex}
                stroke="white"
                strokeWidth={2}
              />
              {/* Date label for first, last and every ~7th */}
              {(i === 0 || i === points.length - 1 || i % 7 === 0) && (
                <text
                  x={p.x}
                  y={H - 4}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#9ca3af"
                >
                  {p.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export const SpecialTaskView = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [task, setTask] = useState<SpecialTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const todayStr = formatDateLocal(new Date());
  const selectedDateStr = formatDateLocal(selectedDate);
  const isSelectedToday = selectedDateStr === todayStr;

  const goToPrevDay = () => {
    setSelectedDate((d) => {
      const prev = new Date(d);
      prev.setDate(prev.getDate() - 1);
      return prev;
    });
  };

  const goToNextDay = () => {
    if (isSelectedToday) return;
    setSelectedDate((d) => {
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      return next;
    });
  };

  const formatSelectedDate = (date: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((today.getTime() - date.getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  useEffect(() => {
    const fetchTask = async () => {
      if (!taskId || !currentUser) return;

      try {
        const taskRef = doc(db, "tasks", taskId);
        const taskSnap = await getDoc(taskRef);

        if (taskSnap.exists()) {
          const data = taskSnap.data();
          if (data.userId === currentUser.uid && data.taskType === "special") {
            setTask({ id: taskSnap.id, ...data } as SpecialTask);
          } else {
            navigate("/");
          }
        } else {
          navigate("/");
        }
      } catch (error) {
        console.error("Error fetching task:", error);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [taskId, currentUser, navigate]);

  const handleChoiceSelect = async (choiceIndex: number) => {
    if (!task || !taskId || saving) return;

    // Toggle off if already selected for the selected date
    const currentIndex = task.entries[selectedDateStr];
    const newIndex = currentIndex === choiceIndex ? undefined : choiceIndex;

    const updatedEntries = { ...task.entries };
    if (newIndex === undefined) {
      delete updatedEntries[selectedDateStr];
    } else {
      updatedEntries[selectedDateStr] = newIndex;
    }

    setSaving(true);
    try {
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, { entries: updatedEntries });
      setTask({ ...task, entries: updatedEntries });
    } catch (error) {
      console.error("Error saving entry:", error);
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async () => {
    if (!task || !taskId) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${task.name}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "tasks", taskId));
      navigate("/");
    } catch (error) {
      console.error("Error deleting task:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!task) return null;

  const selectedChoiceIndex = task.entries[selectedDateStr];
  const hasSelectedEntry = selectedChoiceIndex !== undefined;

  // Stats
  const allScores = Object.values(task.entries).map((idx) =>
    getScore(idx, task.choices.length),
  );
  const avgScore =
    allScores.length > 0
      ? (allScores.reduce((a, b) => a + b, 0) / allScores.length).toFixed(2)
      : "—";
  const totalEntries = allScores.length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 transition"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Home
          </button>
          <button
            onClick={deleteTask}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition text-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete
          </button>
        </div>
      </header>

      <main className="p-4 md:p-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Title & badge */}
          <div className="flex items-start gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                  ✨ SPECIAL TASK
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{task.name}</h1>
              <p className="text-gray-500 text-sm mt-1">
                {totalEntries} entries · avg score {avgScore}
              </p>
            </div>
          </div>

          {/* Score Graph */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Score History (last 30 days)
            </h2>
            <ScoreGraph entries={task.entries} choices={task.choices} />
          </div>

          {/* Entry Section */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            {/* Date Navigator */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={goToPrevDay}
                className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-600"
                title="Previous day"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <div className="text-center">
                <h2 className="text-base font-semibold text-gray-900">
                  {formatSelectedDate(selectedDate)}
                </h2>
                <p className="text-xs text-gray-400">{selectedDateStr}</p>
                {!isSelectedToday && (
                  <button
                    onClick={() => {
                      const d = new Date();
                      d.setHours(0, 0, 0, 0);
                      setSelectedDate(d);
                    }}
                    className="text-xs text-indigo-500 hover:text-indigo-700 font-medium mt-0.5"
                  >
                    Go to today
                  </button>
                )}
              </div>

              <button
                onClick={goToNextDay}
                disabled={isSelectedToday}
                className="p-2 rounded-lg hover:bg-gray-100 transition text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
                title="Next day"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4 text-center">
              {hasSelectedEntry
                ? `Selected: "${task.choices[selectedChoiceIndex]}" — tap to change or deselect`
                : isSelectedToday
                  ? "Pick one option for today"
                  : "No entry for this day — pick one to backfill"}
            </p>

            <div className="grid gap-3">
              {task.choices.map((choice, index) => {
                const score = getScore(index, task.choices.length);
                const color = getScoreColor(score);
                const isSelected = selectedChoiceIndex === index;

                return (
                  <button
                    key={index}
                    onClick={() => handleChoiceSelect(index)}
                    disabled={saving}
                    className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border-2 font-medium transition-all ${
                      isSelected
                        ? score > 0
                          ? "border-green-500 bg-green-50"
                          : score < 0
                            ? "border-red-500 bg-red-50"
                            : "border-gray-400 bg-gray-50"
                        : "border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50"
                    } ${saving ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <span
                      className={
                        isSelected
                          ? score > 0
                            ? "text-green-800"
                            : score < 0
                              ? "text-red-800"
                              : "text-gray-800"
                          : "text-gray-700"
                      }
                    >
                      {choice}
                    </span>
                    <span
                      className={`text-sm font-bold px-2.5 py-1 rounded-full ${
                        isSelected
                          ? score > 0
                            ? "bg-green-200 text-green-800"
                            : score < 0
                              ? "bg-red-200 text-red-800"
                              : "bg-gray-200 text-gray-700"
                          : `${color.bg} ${color.text}`
                      }`}
                    >
                      {getScoreLabel(score)}
                    </span>
                  </button>
                );
              })}
            </div>

            {saving && (
              <p className="text-center text-sm text-indigo-500 mt-3">
                Saving...
              </p>
            )}
          </div>

          {/* Choice legend */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Score Legend
            </h3>
            <div className="flex flex-wrap gap-2">
              {task.choices.map((choice, index) => {
                const score = getScore(index, task.choices.length);
                const color = getScoreColor(score);
                return (
                  <span
                    key={index}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium ${color.bg} ${color.text}`}
                  >
                    {getScoreLabel(score)} · {choice}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
