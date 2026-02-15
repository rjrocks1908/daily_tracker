import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";
import { formatDateLocal } from "../utils/dateUtils";

interface Task {
  id: string;
  name: string;
  userId: string;
  completedDates: string[];
}

export const TaskCalendar = () => {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const fetchTask = async () => {
      if (!taskId || !currentUser) return;

      try {
        const taskRef = doc(db, "tasks", taskId);
        const taskSnap = await getDoc(taskRef);

        if (taskSnap.exists()) {
          const taskData = taskSnap.data();
          if (taskData.userId === currentUser.uid) {
            setTask({ id: taskSnap.id, ...taskData } as Task);
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

  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: Date[] = [];

    // Add empty cells for days before the first day of the month
    const firstDayOfWeek = firstDay.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(new Date(0)); // Placeholder
    }

    // Add all days of the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const toggleDate = async (date: Date) => {
    if (!task || !taskId || date.getTime() === 0) return;

    const dateStr = formatDateLocal(date);
    const isCompleted = task.completedDates.includes(dateStr);
    const updatedDates = isCompleted
      ? task.completedDates.filter((d) => d !== dateStr)
      : [...task.completedDates, dateStr];

    try {
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, {
        completedDates: updatedDates,
      });

      setTask({ ...task, completedDates: updatedDates });
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const deleteTask = async () => {
    if (!task || !taskId) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${task.name}"? This action cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      const taskRef = doc(db, "tasks", taskId);
      await deleteDoc(taskRef);
      navigate("/");
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Failed to delete task. Please try again.");
    }
  };

  const isDateCompleted = (date: Date): boolean => {
    if (!task || date.getTime() === 0) return false;
    const dateStr = formatDateLocal(date);
    return task.completedDates.includes(dateStr);
  };

  const isToday = (date: Date): boolean => {
    if (date.getTime() === 0) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isFutureDate = (date: Date): boolean => {
    if (date.getTime() === 0) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate.getTime() > today.getTime();
  };

  const previousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1),
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1),
    );
  };

  const getCompletionStats = (): { completed: number; total: number } => {
    if (!task) return { completed: 0, total: 0 };

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let completed = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      if (isDateCompleted(date)) {
        completed++;
      }
    }

    return { completed, total: daysInMonth };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!task) {
    return null;
  }

  const days = getDaysInMonth(currentMonth);
  const stats = getCompletionStats();
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

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
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition"
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
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            Delete Task
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {task.name}
            </h1>
            <p className="text-gray-600">
              {stats.completed} of {stats.total} days completed this month
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
            {/* Calendar Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={previousMonth}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition font-medium"
              >
                Previous
              </button>
              <h2 className="text-xl font-semibold text-gray-900">
                {currentMonth.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </h2>
              <button
                onClick={nextMonth}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition font-medium"
              >
                Next
              </button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2 md:gap-4">
              {/* Week day headers */}
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center font-semibold text-gray-700 py-2"
                >
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {days.map((date, index) => {
                const isEmpty = date.getTime() === 0;
                const completed = isDateCompleted(date);
                const today = isToday(date);
                const isFuture = isFutureDate(date);
                const isDisabled = isEmpty || isFuture;

                return (
                  <div
                    key={index}
                    onClick={() => !isDisabled && toggleDate(date)}
                    className={`
                      aspect-square flex items-center justify-center rounded-lg text-sm md:text-base font-medium
                      ${isEmpty ? "invisible" : ""}
                      ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"}
                      ${completed ? "bg-green-500 text-white" : isFuture ? "bg-gray-100 text-gray-400" : "bg-gray-50 text-gray-900 hover:bg-gray-100"}
                      ${today ? "ring-2 ring-blue-500" : ""}
                      ${isFuture && !isEmpty ? "opacity-60" : ""}
                      transition-all
                    `}
                  >
                    {!isEmpty && date.getDate()}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-green-500 rounded"></div>
                <span className="text-gray-700">Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-50 border-2 border-gray-200 rounded"></div>
                <span className="text-gray-700">Not completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-50 border-2 border-blue-500 rounded"></div>
                <span className="text-gray-700">Today</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
