import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { formatDateLocal } from "../utils/dateUtils";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import Diary from "../assets/Diary";
import Logout from "../assets/Logout";
import Header from "../components/header/Header";

interface Task {
  id: string;
  name: string;
  userId: string;
  taskType?: string; // "normal" | "special" | undefined (legacy = normal)
  completedDates: string[]; // for normal tasks
  choices?: string[]; // for special tasks
  entries?: Record<string, number>; // for special tasks: dateStr → choiceIndex
}

const getScore = (choiceIndex: number, totalChoices: number): number =>
  choiceIndex - Math.floor(totalChoices / 2);

const isSpecial = (task: Task) => task.taskType === "special";

export const Home = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [weekDates, setWeekDates] = useState<Date[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const generateWeekDates = (offset: number) => {
      const dates: Date[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const currentDay = today.getDay();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - currentDay + offset * 7);
      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        dates.push(date);
      }
      return dates.reverse();
    };
    setWeekDates(generateWeekDates(weekOffset));
  }, [weekOffset]);

  useEffect(() => {
    const fetchTasks = async () => {
      if (!currentUser) return;
      try {
        const tasksRef = collection(db, "tasks");
        const q = query(tasksRef, where("userId", "==", currentUser.uid));
        const querySnapshot = await getDocs(q);
        const fetchedTasks: Task[] = [];
        querySnapshot.forEach((doc) => {
          fetchedTasks.push({ id: doc.id, ...doc.data() } as Task);
        });
        setTasks(fetchedTasks);
      } catch (error) {
        console.error("Error fetching tasks:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to logout:", error);
    }
  };

  const toggleTaskCompletion = async (taskId: string, dateStr: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || isSpecial(task)) return;

    const isCompleted = task.completedDates.includes(dateStr);
    const updatedDates = isCompleted
      ? task.completedDates.filter((d) => d !== dateStr)
      : [...task.completedDates, dateStr];

    try {
      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, { completedDates: updatedDates });
      setTasks(
        tasks.map((t) =>
          t.id === taskId ? { ...t, completedDates: updatedDates } : t,
        ),
      );
    } catch (error) {
      console.error("Error updating task:", error);
    }
  };

  const isTaskCompleted = (task: Task, date: Date): boolean => {
    const dateStr = formatDateLocal(date);
    return task.completedDates?.includes(dateStr) ?? false;
  };

  const formatDate = (date: Date): string =>
    date.toLocaleDateString("en-US", { day: "numeric", month: "short" });

  const isToday = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate.getTime() === today.getTime();
  };

  const isFutureDate = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate.getTime() > today.getTime();
  };

  const getFilteredDates = (): Date[] => {
    if (!isMobile || weekOffset !== 0) return weekDates;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return weekDates.filter((date) => {
      const compareDate = new Date(date);
      compareDate.setHours(0, 0, 0, 0);
      return compareDate.getTime() <= today.getTime();
    });
  };

  const calculateProgress = (): number => {
    const filteredDates = getFilteredDates();
    const normalTasks = tasks.filter((t) => !isSpecial(t));
    if (normalTasks.length === 0 || filteredDates.length === 0) return 0;
    const totalPossible = normalTasks.length * filteredDates.length;
    let completed = 0;
    normalTasks.forEach((task) => {
      filteredDates.forEach((date) => {
        if (isTaskCompleted(task, date)) completed++;
      });
    });
    return (completed / totalPossible) * 100;
  };

  const goToPreviousWeek = () => setWeekOffset(weekOffset - 1);
  const goToNextWeek = () => setWeekOffset(weekOffset + 1);
  const goToCurrentWeek = () => setWeekOffset(0);

  const getWeekRange = (): string => {
    if (weekDates.length === 0) return "";
    const firstDate = weekDates[weekDates.length - 1];
    const lastDate = weekDates[0];
    const format = (date: Date) =>
      date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${format(firstDate)} - ${format(lastDate)}`;
  };

  // Special task cell renderer
  const renderSpecialCell = (task: Task, date: Date, index: number) => {
    const dateStr = formatDateLocal(date);
    const today = isToday(date);
    const future = isFutureDate(date);
    const entryIndex = task.entries?.[dateStr];
    const hasEntry = entryIndex !== undefined;
    const totalChoices = task.choices?.length ?? 3;
    const score = hasEntry ? getScore(entryIndex, totalChoices) : null;
    const choiceName = hasEntry ? task.choices?.[entryIndex] : null;

    let pillStyle = "";
    if (hasEntry && score !== null) {
      if (score > 0) pillStyle = "bg-green-100 text-green-800";
      else if (score < 0) pillStyle = "bg-red-100 text-red-700";
      else pillStyle = "bg-gray-100 text-gray-600";
    }

    return (
      <td
        key={index}
        className={`px-2 md:px-4 py-4 border-r border-gray-200 last:border-r-0 ${today ? "bg-blue-50" : ""}`}
      >
        <div className="flex items-center justify-center">
          {future ? (
            <span className="text-gray-300 text-xs">—</span>
          ) : hasEntry ? (
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full truncate max-w-[90px] inline-block text-center ${pillStyle}`}
              title={choiceName ?? ""}
            >
              {choiceName}
            </span>
          ) : (
            <span className="text-gray-300 text-xs border border-dashed border-gray-300 rounded-full px-2 py-1">
              —
            </span>
          )}
        </div>
      </td>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header>
        <h1 className="text-2xl font-bold text-gray-900">Daily Tracker</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/diary")}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
          >
            <Diary />
            Diary
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition cursor-pointer"
          >
            <Logout />
            Logout
          </button>
        </div>
      </Header>

      <main className="p-4 md:p-8">
        {/* Week Navigation */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousWeek}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition font-medium"
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
              Previous Week
            </button>
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">
                {weekOffset === 0
                  ? "Current Week"
                  : weekOffset < 0
                    ? `${Math.abs(weekOffset)} week${Math.abs(weekOffset) > 1 ? "s" : ""} ago`
                    : `${weekOffset} week${weekOffset > 1 ? "s" : ""} ahead`}
              </div>
              <div className="text-lg font-semibold text-gray-900">
                {getWeekRange()}
              </div>
              {weekOffset !== 0 && (
                <button
                  onClick={goToCurrentWeek}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Go to Current Week
                </button>
              )}
            </div>
            <button
              onClick={goToNextWeek}
              disabled={weekOffset >= 0}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              Next Week
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
        </div>

        {/* Progress Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            Progress
          </h2>
          <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
            <div
              className="bg-gray-900 h-full transition-all duration-500 rounded-full"
              style={{ width: `${calculateProgress()}%` }}
            />
          </div>
        </div>

        {/* Task Grid */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <div className="inline-block min-w-full">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="sticky left-0 bg-white z-10 px-4 md:px-6 py-4 text-left text-sm font-semibold text-gray-900 border-r border-gray-200 min-w-[140px]">
                      Task
                    </th>
                    {getFilteredDates().map((date, index) => {
                      const today = isToday(date);
                      const future = isFutureDate(date);
                      return (
                        <th
                          key={index}
                          className={`px-4 md:px-6 py-4 text-center text-sm font-semibold border-r border-gray-200 last:border-r-0 min-w-[100px] ${
                            today
                              ? "bg-blue-50 text-blue-900"
                              : future && !isMobile
                                ? "text-gray-400"
                                : "text-gray-900"
                          }`}
                        >
                          {formatDate(date)}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {tasks.length === 0 ? (
                    <tr>
                      <td
                        colSpan={getFilteredDates().length + 1}
                        className="px-6 py-12 text-center text-gray-500"
                      >
                        No tasks yet.{" "}
                        <button
                          onClick={() => navigate("/create-task")}
                          className="text-gray-900 font-medium hover:underline"
                        >
                          Create your first task
                        </button>
                      </td>
                    </tr>
                  ) : (
                    tasks.map((task) => (
                      <tr
                        key={task.id}
                        className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50"
                      >
                        {/* Task Name Cell */}
                        <td
                          className="sticky left-0 bg-white z-10 px-4 md:px-6 py-4 border-r border-gray-200 cursor-pointer hover:text-gray-600"
                          onClick={() =>
                            navigate(
                              isSpecial(task)
                                ? `/special-task/${task.id}`
                                : `/task/${task.id}`,
                            )
                          }
                        >
                          <div className="text-sm font-medium text-gray-900">
                            {task.name}
                          </div>
                          {isSpecial(task) && (
                            <div className="text-xs text-indigo-500 font-medium mt-0.5">
                              ✨ special
                            </div>
                          )}
                        </td>

                        {/* Date Cells */}
                        {getFilteredDates().map((date, index) => {
                          if (isSpecial(task)) {
                            return renderSpecialCell(task, date, index);
                          }

                          const dateStr = formatDateLocal(date);
                          const completed = isTaskCompleted(task, date);
                          const today = isToday(date);
                          const future = isFutureDate(date);
                          const isDisabled = !isMobile && future;

                          return (
                            <td
                              key={index}
                              className={`px-4 md:px-6 py-4 border-r border-gray-200 last:border-r-0 ${
                                isDisabled
                                  ? "cursor-not-allowed"
                                  : "cursor-pointer"
                              } ${today ? "bg-blue-50" : ""}`}
                              onClick={() =>
                                !isDisabled &&
                                toggleTaskCompletion(task.id, dateStr)
                              }
                            >
                              <div className="flex items-center justify-center">
                                <div
                                  className={`w-full h-12 rounded-lg transition-all ${
                                    completed
                                      ? "bg-green-500"
                                      : isDisabled
                                        ? "bg-gray-100 opacity-50"
                                        : "bg-transparent hover:bg-gray-100"
                                  }`}
                                />
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {tasks.length > 0 && (
            <div className="px-6 py-4 text-center text-sm text-gray-500 border-t border-gray-200">
              Click a task name to view details · Normal tasks: click a date to
              toggle · Special tasks: view-only on this page
            </div>
          )}
        </div>

        {/* Add Task Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate("/create-task")}
            className="px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition"
          >
            + Add New Task
          </button>
        </div>
      </main>
    </div>
  );
};
