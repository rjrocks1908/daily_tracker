import type { ExpenseEntry } from "../types/expense";

export interface ExpenseMonthGroup {
  monthKey: string;
  monthLabel: string;
  totalAmount: number;
  expenses: ExpenseEntry[];
}

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
};

export const sortExpensesByDateDesc = (expenses: ExpenseEntry[]): ExpenseEntry[] => {
  return [...expenses].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return b.updatedAt.localeCompare(a.updatedAt);
  });
};

const getMonthLabelFromKey = (monthKey: string): string => {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};

export const groupExpensesByMonth = (
  expenses: ExpenseEntry[],
): ExpenseMonthGroup[] => {
  const groups = new Map<string, ExpenseEntry[]>();

  for (const expense of sortExpensesByDateDesc(expenses)) {
    const monthKey = expense.date.slice(0, 7);
    const existing = groups.get(monthKey) ?? [];
    existing.push(expense);
    groups.set(monthKey, existing);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([monthKey, monthExpenses]) => ({
      monthKey,
      monthLabel: getMonthLabelFromKey(monthKey),
      totalAmount: monthExpenses.reduce((sum, item) => sum + item.amount, 0),
      expenses: monthExpenses,
    }));
};
