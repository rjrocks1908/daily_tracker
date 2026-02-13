import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase/config";

export const CreateTask = () => {
  const [taskName, setTaskName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!taskName.trim()) {
      setError("Task name is required");
      return;
    }

    if (!currentUser) {
      setError("You must be logged in to create a task");
      return;
    }

    try {
      setError("");
      setLoading(true);

      await addDoc(collection(db, "tasks"), {
        name: taskName.trim(),
        userId: currentUser.uid,
        completedDates: [],
        createdAt: new Date().toISOString(),
      });

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
                  placeholder="e.g., Workout, Reading, Study, Work"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
                  autoFocus
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
                <li>• Keep task names short and clear</li>
                <li>• Create tasks for daily habits you want to build</li>
                <li>• You can track completion for each day of the week</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
