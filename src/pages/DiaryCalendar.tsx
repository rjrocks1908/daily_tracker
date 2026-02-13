import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";

interface DiaryPlaceholder {
  id: string;
  userId: string;
  date: string;
  hasEntry: boolean;
}

export const DiaryCalendar = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [highlightedDates, setHighlightedDates] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // Used to force refresh
  // Cache: Map<"YYYY-MM", Set<date strings>>
  const [cache, setCache] = useState<Map<string, Set<string>>>(new Map());

  const getMonthKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  };

  const getMonthRange = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const formatDate = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    return {
      start: formatDate(firstDay),
      end: formatDate(lastDay),
    };
  };

  useEffect(() => {
    const fetchPlaceholders = async () => {
      if (!currentUser) return;

      const monthKey = getMonthKey(currentMonth);

      // If refreshKey changed, clear the cache for this month
      if (refreshKey > 0) {
        setCache((prev) => {
          const newCache = new Map(prev);
          newCache.delete(monthKey);
          return newCache;
        });
      }

      // Check cache first (but skip if we just cleared it)
      if (refreshKey === 0 && cache.has(monthKey)) {
        setHighlightedDates(cache.get(monthKey)!);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { start, end } = getMonthRange(currentMonth);

        console.log(
          `Fetching placeholders for ${monthKey} (${start} to ${end})`,
        );

        const placeholdersRef = collection(db, "diary_placeholders");
        const q = query(
          placeholdersRef,
          where("userId", "==", currentUser.uid),
          where("date", ">=", start),
          where("date", "<=", end),
        );

        const querySnapshot = await getDocs(q);
        const dates = new Set<string>();

        querySnapshot.forEach((doc) => {
          const data = doc.data() as DiaryPlaceholder;
          console.log("Found placeholder:", data);
          dates.add(data.date);
        });

        console.log(`Found ${dates.size} diary entries for ${monthKey}`);

        // Update cache
        setCache((prev) => new Map(prev).set(monthKey, dates));
        setHighlightedDates(dates);
      } catch (error) {
        console.error("Error fetching diary placeholders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlaceholders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth, currentUser, refreshKey]);

  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  };

  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const isDateHighlighted = (date: Date): boolean => {
    const dateStr = formatDateString(date);
    return highlightedDates.has(dateStr);
  };

  const handleDateClick = (date: Date) => {
    const dateStr = formatDateString(date);
    navigate(`/diary/entry/${dateStr}`);
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  };

  const goToCurrentMonth = () => {
    setCurrentMonth(new Date());
  };

  const getMonthYearDisplay = (): string => {
    return currentMonth.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const isCurrentMonth = (): boolean => {
    const now = new Date();
    return (
      currentMonth.getMonth() === now.getMonth() &&
      currentMonth.getFullYear() === now.getFullYear()
    );
  };

  const calendarDays = generateCalendarDays();
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
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
              Back
            </button>
            <h1 className="text-2xl font-bold text-gray-900">My Diary</h1>
          </div>
          <button
            onClick={() => setRefreshKey((prev) => prev + 1)}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
            title="Refresh diary entries"
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 md:p-8">
        {/* Month Navigation */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousMonth}
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
              Previous
            </button>
            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900">
                {getMonthYearDisplay()}
              </div>
              {!isCurrentMonth() && (
                <button
                  onClick={goToCurrentMonth}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Go to Current Month
                </button>
              )}
            </div>
            <button
              onClick={goToNextMonth}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition font-medium"
            >
              Next
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

        {/* Calendar Grid */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-600">Loading...</div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {/* Week day headers */}
              {weekDays.map((day) => (
                <div
                  key={day}
                  className="text-center font-semibold text-gray-700 py-2 text-sm md:text-base"
                >
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return (
                    <div key={`empty-${index}`} className="aspect-square" />
                  );
                }

                const isHighlighted = isDateHighlighted(day);
                const isToday =
                  day.toDateString() === new Date().toDateString();
                const isFuture = day > new Date();

                return (
                  <button
                    key={index}
                    onClick={() => handleDateClick(day)}
                    disabled={isFuture}
                    className={`aspect-square rounded-lg border-2 transition-all flex items-center justify-center font-medium text-sm md:text-base ${
                      isFuture
                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                        : isHighlighted
                          ? "bg-blue-500 text-white border-blue-600 hover:bg-blue-600"
                          : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300"
                    } ${
                      isToday && !isHighlighted && !isFuture
                        ? "border-gray-900 font-bold"
                        : ""
                    }`}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-6 text-center text-sm text-gray-500">
            Click on any date to create or view a diary entry
          </div>
        </div>
      </main>
    </div>
  );
};
