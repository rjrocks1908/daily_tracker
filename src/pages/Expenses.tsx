import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { ExpenseFilters } from "../features/expenses/components/ExpenseFilters";
import { ExpenseFormModal } from "../features/expenses/components/ExpenseFormModal";
import { ExpensesByMonth } from "../features/expenses/components/ExpensesByMonth";
import { BudgetOverview } from "../features/expenses/components/BudgetOverview";
import { firebaseExpensesService } from "../features/expenses/services/FirebaseExpensesService";
import type { ExpenseEntry, ExpenseTag } from "../features/expenses/types/expense";
import { sortExpensesByDateDesc } from "../features/expenses/utils/expenseUtils";

export const Expenses = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [tags, setTags] = useState<ExpenseTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingExpense, setSavingExpense] = useState(false);
  const [busyExpenseId, setBusyExpenseId] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<ExpenseEntry | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedTagFilters, setSelectedTagFilters] = useState<string[]>([]);
  const [pageError, setPageError] = useState("");

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
        console.error("Error loading expenses page data:", error);
        setPageError("Could not load expenses right now.");
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [currentUser]);

  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const thisMonthExpenses = useMemo(
    () => expenses.filter((expense) => expense.date.startsWith(currentMonthKey)),
    [expenses, currentMonthKey],
  );

  const handleCreateExpense = async (payload: {
    amount: number;
    note: string;
    date: string;
    tagIds: string[];
  }) => {
    if (!currentUser) {
      throw new Error("You need to be logged in.");
    }

    setSavingExpense(true);
    try {
      const created = await firebaseExpensesService.createExpense({
        userId: currentUser.uid,
        ...payload,
      });

      setExpenses((prev) => sortExpensesByDateDesc([created, ...prev]));
      setPageError("");
    } finally {
      setSavingExpense(false);
    }
  };

  const handleUpdateExpense = async (payload: {
    amount: number;
    note: string;
    date: string;
    tagIds: string[];
  }) => {
    if (!editingExpense) {
      throw new Error("No expense selected for editing.");
    }

    setSavingExpense(true);
    try {
      await firebaseExpensesService.updateExpense({
        id: editingExpense.id,
        ...payload,
      });

      const updatedAt = new Date().toISOString();
      setExpenses((prev) =>
        sortExpensesByDateDesc(
          prev.map((expense) =>
            expense.id === editingExpense.id
              ? {
                  ...expense,
                  ...payload,
                  amount: Number(payload.amount.toFixed(2)),
                  updatedAt,
                }
              : expense,
          ),
        ),
      );

      setEditingExpense(null);
      setPageError("");
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (expense: ExpenseEntry) => {
    const confirmed = window.confirm("Delete this expense?");
    if (!confirmed) return;

    setBusyExpenseId(expense.id);
    try {
      await firebaseExpensesService.deleteExpense(expense.id);
      setExpenses((prev) => prev.filter((item) => item.id !== expense.id));
      if (editingExpense?.id === expense.id) {
        setEditingExpense(null);
        setShowModal(false);
      }
      setPageError("");
    } catch (error) {
      console.error("Error deleting expense:", error);
      setPageError("Failed to delete expense.");
    } finally {
      setBusyExpenseId(null);
    }
  };

  const handleOpenCreate = () => {
    setEditingExpense(null);
    setShowModal(true);
  };

  const handleOpenEdit = (expense: ExpenseEntry) => {
    setEditingExpense(expense);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingExpense(null);
  };

  const handleToggleFilterTag = (tagId: string) => {
    setSelectedTagFilters((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 md:gap-4">
            <button
              onClick={() => navigate("/")}
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
              Back
            </button>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Daily Expenses</h1>
          </div>
          <span className="text-xs md:text-sm text-gray-500">
            {thisMonthExpenses.length} entry(s) this month
          </span>
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
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition"
              >
                + Add Expense
              </button>
              <button
                onClick={() => navigate("/expenses/tags")}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition"
              >
                Manage Tags
              </button>
              <button
                onClick={() => navigate("/expenses/calendar")}
                className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition"
              >
                View Monthly Calendar
              </button>
            </div>
          </section>

          {showModal && (
            <ExpenseFormModal
              key={editingExpense?.id ?? "create-expense"}
              mode={editingExpense ? "edit" : "create"}
              loading={savingExpense}
              tags={tags}
              initialExpense={editingExpense}
              onSubmit={editingExpense ? handleUpdateExpense : handleCreateExpense}
              onClose={handleCloseModal}
            />
          )}

          <BudgetOverview tags={tags} expenses={expenses} />

          <ExpenseFilters
            tags={tags}
            selectedTagIds={selectedTagFilters}
            onToggleTag={handleToggleFilterTag}
            onClear={() => setSelectedTagFilters([])}
          />

          <ExpensesByMonth
            expenses={thisMonthExpenses}
            tags={tags}
            selectedTagIds={selectedTagFilters}
            loading={loading}
            busyExpenseId={busyExpenseId}
            onEdit={handleOpenEdit}
            onDelete={handleDeleteExpense}
          />
        </div>
      </main>
    </div>
  );
};
