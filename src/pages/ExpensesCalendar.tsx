import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { firebaseExpensesService } from "../features/expenses/services/FirebaseExpensesService";
import type { ExpenseEntry, ExpenseTag } from "../features/expenses/types/expense";
import { formatCurrency } from "../features/expenses/utils/expenseUtils";

const getMonthKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const getDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const generateCalendarDays = (month: Date): Array<Date | null> => {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);

  const days: Array<Date | null> = [];

  for (let i = 0; i < firstDay.getDay(); i++) {
    days.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {
    days.push(new Date(year, monthIndex, day));
  }

  return days;
};

export const ExpensesCalendar = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [tags, setTags] = useState<ExpenseTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState("");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;

      setLoading(true);
      setPageError("");

      try {
        const [userExpenses, userTags] = await Promise.all([
          firebaseExpensesService.listUserExpenses(currentUser.uid),
          firebaseExpensesService.listUserTags(currentUser.uid),
        ]);

        setExpenses(userExpenses);
        setTags(userTags);
      } catch (error) {
        console.error("Error loading expenses calendar data:", error);
        setPageError("Could not load calendar right now.");
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [currentUser]);

  const monthKey = getMonthKey(currentMonth);

  const monthExpenses = useMemo(
    () => expenses.filter((expense) => expense.date.startsWith(monthKey)),
    [expenses, monthKey],
  );

  const expensesByDate = useMemo(() => {
    const map = new Map<string, ExpenseEntry[]>();

    for (const expense of monthExpenses) {
      const entries = map.get(expense.date) ?? [];
      entries.push(expense);
      map.set(expense.date, entries);
    }

    return map;
  }, [monthExpenses]);

  useEffect(() => {
    if (selectedDateKey && expensesByDate.has(selectedDateKey)) {
      return;
    }

    const firstDateWithExpense = Array.from(expensesByDate.keys()).sort()[0] ?? null;
    setSelectedDateKey(firstDateWithExpense);
  }, [selectedDateKey, expensesByDate]);

  const tagMap = useMemo(
    () => Object.fromEntries(tags.map((tag) => [tag.id, tag.name])),
    [tags],
  );

  const monthTotal = useMemo(
    () => monthExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [monthExpenses],
  );

  const selectedDateExpenses = useMemo(() => {
    if (!selectedDateKey) return [];

    return [...(expensesByDate.get(selectedDateKey) ?? [])].sort((a, b) => {
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [selectedDateKey, expensesByDate]);

  const calendarDays = generateCalendarDays(currentMonth);
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const isCurrentMonth = getMonthKey(new Date()) === monthKey;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={() => navigate("/expenses")}
              className="flex items-center gap-2 px-3 py-2 md:px-4 text-gray-700 hover:bg-gray-100 rounded-lg transition"
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
              Back to Expenses
            </button>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Expenses Calendar</h1>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-8">
        <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
          {pageError && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
              {pageError}
            </div>
          )}

          <section className="bg-white rounded-xl shadow-sm p-4 md:p-6">
            <div className="flex items-center justify-between">
              <button
                onClick={goToPreviousMonth}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition font-medium"
              >
                Previous
              </button>
              <div className="text-center">
                <h2 className="text-lg md:text-xl font-semibold text-gray-900">
                  {currentMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {monthExpenses.length} expense(s) • Total {formatCurrency(monthTotal)}
                </p>
              </div>
              <button
                onClick={goToNextMonth}
                disabled={isCurrentMonth}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
              >
                Next
              </button>
            </div>
          </section>

          <section className="bg-white rounded-xl shadow-sm p-4 md:p-6">
            {loading ? (
              <p className="text-sm text-gray-600">Loading calendar...</p>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {weekDays.map((day) => (
                    <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {calendarDays.map((day, index) => {
                    if (!day) {
                      return <div key={`empty-${index}`} className="aspect-square" />;
                    }

                    const dateKey = getDateKey(day);
                    const dailyExpenses = expensesByDate.get(dateKey) ?? [];
                    const dailyTotal = dailyExpenses.reduce((sum, item) => sum + item.amount, 0);
                    const hasExpenses = dailyExpenses.length > 0;
                    const isSelected = selectedDateKey === dateKey;

                    return (
                      <button
                        key={dateKey}
                        onClick={() => setSelectedDateKey(dateKey)}
                        className={`aspect-square rounded-lg border text-left p-2 transition ${
                          isSelected
                            ? "border-blue-600 ring-2 ring-blue-200"
                            : "border-gray-200 hover:border-gray-300"
                        } ${hasExpenses ? "bg-blue-50" : "bg-white"}`}
                      >
                        <div className="text-xs font-semibold text-gray-700">{day.getDate()}</div>
                        {hasExpenses ? (
                          <>
                            <div className="mt-1 text-xs font-medium text-blue-800 truncate">
                              {formatCurrency(dailyTotal)}
                            </div>
                            <div className="text-[10px] text-blue-700 truncate">
                              {dailyExpenses.length} item(s)
                            </div>
                          </>
                        ) : (
                          <div className="mt-2 text-[10px] text-gray-400">No spend</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          <section className="bg-white rounded-xl shadow-sm p-4 md:p-6">
            <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3">
              {selectedDateKey ? `Expenses on ${selectedDateKey}` : "Select a date to view expenses"}
            </h3>

            {!selectedDateKey ? (
              <p className="text-sm text-gray-500">No date selected.</p>
            ) : selectedDateExpenses.length === 0 ? (
              <p className="text-sm text-gray-500">No expenses on this date.</p>
            ) : (
              <ul className="space-y-3">
                {selectedDateExpenses.map((expense) => (
                  <li
                    key={expense.id}
                    className="rounded-lg border border-gray-200 p-3 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(expense.amount)}</p>
                      {expense.note && (
                        <p className="text-sm text-gray-700 mt-1 wrap-break-word">{expense.note}</p>
                      )}
                      {expense.tagIds.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {expense.tagIds.map((tagId) => (
                            <span
                              key={`${expense.id}-${tagId}`}
                              className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                            >
                              {tagMap[tagId] ?? "Deleted tag"}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};
