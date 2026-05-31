import { useMemo } from "react";
import type { ExpenseEntry, ExpenseTag } from "../types/expense";

interface BudgetOverviewProps {
  tags: ExpenseTag[];
  expenses: ExpenseEntry[];
}

export const BudgetOverview = ({ tags, expenses }: BudgetOverviewProps) => {
  const tagsWithBudget = useMemo(
    () => tags.filter((tag) => tag.budget != null && tag.budget > 0),
    [tags],
  );

  const spentByTagId = useMemo(() => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const spent: Record<string, number> = {};

    for (const expense of expenses) {
      if (!expense.date.startsWith(currentMonthKey)) continue;
      for (const tagId of expense.tagIds) {
        spent[tagId] = (spent[tagId] ?? 0) + expense.amount;
      }
    }

    return spent;
  }, [expenses]);

  if (tagsWithBudget.length === 0) return null;

  return (
    <section className="bg-white rounded-xl shadow-sm p-4 md:p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Monthly Budget</h2>
      <p className="text-sm text-gray-600 mb-4">
        Budget tracking for the current month by tag.
      </p>

      <div className="space-y-3">
        {tagsWithBudget.map((tag) => {
          const budget = tag.budget!;
          const spent = spentByTagId[tag.id] ?? 0;
          const remaining = budget - spent;
          const percentage = Math.min((spent / budget) * 100, 100);
          const isOver = remaining < 0;

          return (
            <div key={tag.id} className="rounded-lg border border-gray-200 p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-900">{tag.name}</span>
                <span className={`text-xs font-medium ${isOver ? "text-red-600" : "text-green-600"}`}>
                  {isOver
                    ? `Over by ₹${Math.abs(remaining).toFixed(2)}`
                    : `₹${remaining.toFixed(2)} remaining`}
                </span>
              </div>

              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    isOver ? "bg-red-500" : percentage > 80 ? "bg-yellow-500" : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                />
              </div>

              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">
                  ₹{spent.toFixed(2)} spent
                </span>
                <span className="text-xs text-gray-500">
                  ₹{budget.toFixed(2)} budget
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
