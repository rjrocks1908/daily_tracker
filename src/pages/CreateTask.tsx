import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase/config";

const DEFAULT_CHOICES_3 = ["Bad", "Neutral", "Good"];
const DEFAULT_CHOICES_5 = ["Very Bad", "Bad", "Neutral", "Good", "Very Good"];

export const CreateTask = () => {
  const [taskName, setTaskName] = useState("");
  const [taskType, setTaskType] = useState<"normal" | "special">("normal");
  const [numChoices, setNumChoices] = useState<3 | 5>(3);
  const [choices, setChoices] = useState<string[]>(DEFAULT_CHOICES_3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleNumChoicesChange = (n: 3 | 5) => {
    setNumChoices(n);
    setChoices(n === 3 ? [...DEFAULT_CHOICES_3] : [...DEFAULT_CHOICES_5]);
  };

  const handleChoiceChange = (index: number, value: string) => {
    const updated = [...choices];
    updated[index] = value;
    setChoices(updated);
  };

  const getScoreLabel = (index: number, total: number) => {
    const score = index - Math.floor(total / 2);
    if (score > 0) return `+${score}`;
    return `${score}`;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!taskName.trim()) {
      setError("Task name is required");
      return;
    }

    if (taskType === "special") {
      const hasEmpty = choices.some((c) => !c.trim());
      if (hasEmpty) {
        setError("All choice names are required");
        return;
      }
    }

    if (!currentUser) {
      setError("You must be logged in to create a task");
      return;
    }

    try {
      setError("");
      setLoading(true);

      if (taskType === "normal") {
        await addDoc(collection(db, "tasks"), {
          name: taskName.trim(),
          userId: currentUser.uid,
          taskType: "normal",
          completedDates: [],
          createdAt: new Date().toISOString(),
        });
      } else {
        await addDoc(collection(db, "tasks"), {
          name: taskName.trim(),
          userId: currentUser.uid,
          taskType: "special",
          choices: choices.map((c) => c.trim()),
          entries: {},
          createdAt: new Date().toISOString(),
        });
      }

      navigate("/");
    } catch (err) {
      console.error("Error creating task:", err);
      setError("Failed to create task. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4">
        <div className="flex items-center gap-4">
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
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              Create New Task
            </h1>
            <p className="text-gray-600 mb-8">
              Add a new habit or goal to track daily
            </p>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Task Type Toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Task Type
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTaskType("normal")}
                    className={`py-3 px-4 rounded-lg border-2 font-medium text-sm transition-all ${
                      taskType === "normal"
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"
                    }`}
                  >
                    ✅ Normal Task
                    <p className="text-xs mt-1 font-normal opacity-75">
                      Daily done / not done
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskType("special")}
                    className={`py-3 px-4 rounded-lg border-2 font-medium text-sm transition-all ${
                      taskType === "special"
                        ? "border-indigo-600 bg-indigo-600 text-white"
                        : "border-gray-200 bg-white text-gray-600 hover:border-indigo-400"
                    }`}
                  >
                    ✨ Special Task
                    <p className="text-xs mt-1 font-normal opacity-75">
                      Score-based with choices
                    </p>
                  </button>
                </div>
              </div>

              {/* Task Name */}
              <div>
                <label
                  htmlFor="taskName"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Task Name
                </label>
                <input
                  id="taskName"
                  type="text"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder={
                    taskType === "special"
                      ? "e.g., Mood, Energy Level, Diet"
                      : "e.g., Workout, Reading, Study"
                  }
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
                  autoFocus
                />
              </div>

              {/* Special Task Options */}
              {taskType === "special" && (
                <div className="space-y-4 p-5 bg-indigo-50 border border-indigo-200 rounded-xl">
                  <h3 className="text-sm font-semibold text-indigo-900">
                    ✨ Choice Configuration
                  </h3>

                  {/* Number of Choices */}
                  <div>
                    <label className="block text-sm font-medium text-indigo-800 mb-2">
                      Number of Choices
                    </label>
                    <div className="flex gap-3">
                      {([3, 5] as const).map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => handleNumChoicesChange(n)}
                          className={`w-16 h-10 rounded-lg border-2 font-semibold text-sm transition-all ${
                            numChoices === n
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-indigo-300 bg-white text-indigo-700 hover:border-indigo-500"
                          }`}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Choice Name Inputs */}
                  <div>
                    <label className="block text-sm font-medium text-indigo-800 mb-3">
                      Name your choices{" "}
                      <span className="text-indigo-500 font-normal">
                        (worst → best)
                      </span>
                    </label>
                    <div className="space-y-2">
                      {choices.map((choice, index) => {
                        const score = getScoreLabel(index, choices.length);
                        const scoreNum = index - Math.floor(choices.length / 2);
                        return (
                          <div key={index} className="flex items-center gap-3">
                            <span
                              className={`w-10 text-center text-xs font-bold rounded-full py-1 ${
                                scoreNum > 0
                                  ? "bg-green-100 text-green-700"
                                  : scoreNum < 0
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {score}
                            </span>
                            <input
                              type="text"
                              value={choice}
                              onChange={(e) =>
                                handleChoiceChange(index, e.target.value)
                              }
                              placeholder={`Choice ${index + 1}`}
                              className="flex-1 px-3 py-2 bg-white border border-indigo-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 text-white py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    taskType === "special"
                      ? "bg-indigo-600 hover:bg-indigo-700"
                      : "bg-gray-900 hover:bg-gray-800"
                  }`}
                >
                  {loading ? "Creating..." : "Create Task"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/")}
                  className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
                >
                  Cancel
                </button>
              </div>
            </form>

            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">
                💡 Tips
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                {taskType === "normal" ? (
                  <>
                    <li>• Keep task names short and clear</li>
                    <li>• Create tasks for daily habits you want to build</li>
                    <li>• You can track completion for each day of the week</li>
                  </>
                ) : (
                  <>
                    <li>
                      • Great for tracking mood, energy, diet quality, etc.
                    </li>
                    <li>• Choices are mapped to scores (e.g. -1, 0, +1)</li>
                    <li>
                      • View your score graph over time from the task page
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
