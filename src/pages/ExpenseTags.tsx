import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { TagManager } from "../features/expenses/components/TagManager";
import { firebaseExpensesService } from "../features/expenses/services/FirebaseExpensesService";
import type { ExpenseEntry, ExpenseTag } from "../features/expenses/types/expense";

export const ExpenseTags = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [tags, setTags] = useState<ExpenseTag[]>([]);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingTag, setSavingTag] = useState(false);
  const [pageError, setPageError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;

      setLoading(true);
      setPageError("");

      try {
        const [userTags, userExpenses] = await Promise.all([
          firebaseExpensesService.listUserTags(currentUser.uid),
          firebaseExpensesService.listUserExpenses(currentUser.uid),
        ]);

        setTags(userTags);
        setExpenses(userExpenses);
      } catch (error) {
        console.error("Error loading expense tags page data:", error);
        setPageError("Could not load tags right now.");
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [currentUser]);

  const usageByTagId = useMemo(() => {
    const usage: Record<string, number> = {};

    for (const expense of expenses) {
      for (const tagId of expense.tagIds) {
        usage[tagId] = (usage[tagId] ?? 0) + 1;
      }
    }

    return usage;
  }, [expenses]);

  const handleCreateTag = async (name: string) => {
    if (!currentUser) {
      throw new Error("You need to be logged in.");
    }

    setSavingTag(true);
    try {
      const created = await firebaseExpensesService.createTag({
        userId: currentUser.uid,
        name,
      });

      setTags((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setPageError("");
    } finally {
      setSavingTag(false);
    }
  };

  const handleUpdateTag = async (id: string, name: string) => {
    setSavingTag(true);
    try {
      await firebaseExpensesService.updateTag({ id, name });
      setTags((prev) =>
        [...prev]
          .map((tag) =>
            tag.id === id
              ? {
                  ...tag,
                  name: name.trim().replace(/\s+/g, " "),
                  updatedAt: new Date().toISOString(),
                }
              : tag,
          )
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      setPageError("");
    } finally {
      setSavingTag(false);
    }
  };

  const handleDeleteTag = async (tag: ExpenseTag) => {
    const confirmed = window.confirm(
      `Delete tag "${tag.name}"? It will be removed from all linked expenses.`,
    );
    if (!confirmed || !currentUser) return;

    setSavingTag(true);
    try {
      await firebaseExpensesService.deleteTagAndDetachExpenses(currentUser.uid, tag.id);

      setTags((prev) => prev.filter((item) => item.id !== tag.id));
      setExpenses((prev) =>
        prev.map((expense) => ({
          ...expense,
          tagIds: expense.tagIds.filter((tagId) => tagId !== tag.id),
        })),
      );
      setPageError("");
    } finally {
      setSavingTag(false);
    }
  };

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
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Expense Tags</h1>
          </div>
        </div>
      </header>

      <main className="p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
          {pageError && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
              {pageError}
            </div>
          )}

          {loading ? (
            <section className="bg-white rounded-xl shadow-sm p-4 md:p-6">
              <p className="text-sm text-gray-600">Loading tags...</p>
            </section>
          ) : (
            <TagManager
              tags={tags}
              usageByTagId={usageByTagId}
              loading={savingTag}
              onCreateTag={handleCreateTag}
              onUpdateTag={handleUpdateTag}
              onDeleteTag={handleDeleteTag}
            />
          )}
        </div>
      </main>
    </div>
  );
};
