import { useMemo } from "react";
import type { ExpenseEntry, ExpenseTag } from "../types/expense";
import { formatCurrency, groupExpensesByMonth } from "../utils/expenseUtils";

interface ExpensesByMonthProps {
  expenses: ExpenseEntry[];
  tags: ExpenseTag[];
  selectedTagIds: string[];
  loading: boolean;
  busyExpenseId: string | null;
  onEdit: (expense: ExpenseEntry) => void;
  onDelete: (expense: ExpenseEntry) => Promise<void>;
}

const formatDate = (dateValue: string) => {
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const ExpensesByMonth = ({
  expenses,
  tags,
  selectedTagIds,
  loading,
  busyExpenseId,
  onEdit,
  onDelete,
}: ExpensesByMonthProps) => {
  const tagMap = useMemo(
    () => Object.fromEntries(tags.map((tag) => [tag.id, tag.name])),
    [tags],
  );

  const filteredExpenses = useMemo(() => {
    if (selectedTagIds.length === 0) {
      return expenses;
    }

    const selectedSet = new Set(selectedTagIds);
    return expenses.filter((expense) => expense.tagIds.some((id) => selectedSet.has(id)));
  }, [expenses, selectedTagIds]);

  const grouped = useMemo(() => groupExpensesByMonth(filteredExpenses), [filteredExpenses]);

  const total = useMemo(
    () => filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [filteredExpenses],
  );

  return (
    <section className="bg-white rounded-xl shadow-sm p-4 md:p-6">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Expenses by Month</h2>
        <p className="text-sm text-gray-500">
          {filteredExpenses.length} expense(s) • Total {formatCurrency(total)}
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-600">Loading expenses...</p>
      ) : grouped.length === 0 ? (
        <p className="text-sm text-gray-500">No expenses for the selected filters.</p>
      ) : (
        <div className="space-y-5">
          {grouped.map((monthGroup) => (
            <article key={monthGroup.monthKey} className="rounded-xl border border-gray-200">
              <header className="px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-xl flex items-center justify-between gap-2">
                <h3 className="text-sm md:text-base font-semibold text-gray-900">
                  {monthGroup.monthLabel}
                </h3>
                <p className="text-sm font-medium text-gray-700">
                  {formatCurrency(monthGroup.totalAmount)}
                </p>
              </header>

              <ul className="divide-y divide-gray-100">
                {monthGroup.expenses.map((expense) => {
                  const isBusy = busyExpenseId === expense.id;

                  return (
                    <li
                      key={expense.id}
                      className="px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(expense.amount)}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(expense.date)}</p>
                        {expense.note && (
                          <p className="text-sm text-gray-700 mt-2 break-words">{expense.note}</p>
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

                      <div className="flex gap-2">
                        <button
                          onClick={() => onEdit(expense)}
                          disabled={isBusy}
                          className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => void onDelete(expense)}
                          disabled={isBusy}
                          className="px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
