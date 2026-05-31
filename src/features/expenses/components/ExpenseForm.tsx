import { useState } from "react";
import type { FormEvent } from "react";
import { formatDateLocal } from "../../../utils/dateUtils";
import type { ExpenseEntry, ExpenseTag } from "../types/expense";

interface ExpenseFormPayload {
  amount: number;
  note: string;
  date: string;
  tagIds: string[];
}

interface ExpenseFormProps {
  mode: "create" | "edit";
  loading: boolean;
  tags: ExpenseTag[];
  initialExpense?: ExpenseEntry | null;
  onSubmit: (payload: ExpenseFormPayload) => Promise<void>;
  onCancelEdit?: () => void;
}

export const ExpenseForm = ({
  mode,
  loading,
  tags,
  initialExpense,
  onSubmit,
  onCancelEdit,
}: ExpenseFormProps) => {
  const initialAmountInput =
    mode === "edit" && initialExpense ? String(initialExpense.amount) : "";
  const initialNote = mode === "edit" && initialExpense ? initialExpense.note : "";
  const initialDate =
    mode === "edit" && initialExpense
      ? initialExpense.date
      : formatDateLocal(new Date());
  const initialTagIds =
    mode === "edit" && initialExpense ? initialExpense.tagIds : [];

  const [amountInput, setAmountInput] = useState(initialAmountInput);
  const [note, setNote] = useState(initialNote);
  const [date, setDate] = useState(initialDate);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(initialTagIds);
  const [error, setError] = useState("");

  const toggleTagSelection = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const parsedAmount = Number(amountInput);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }

    if (!date) {
      setError("Date is required.");
      return;
    }

    try {
      await onSubmit({
        amount: parsedAmount,
        note: note.trim(),
        date,
        tagIds: selectedTagIds,
      });

      if (mode === "create") {
        setAmountInput("");
        setNote("");
        setDate(formatDateLocal(new Date()));
        setSelectedTagIds([]);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save expense.");
    }
  };

  const isEditMode = mode === "edit";

  return (
    <section className="bg-white rounded-xl shadow-sm p-4 md:p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        {isEditMode ? "Edit Expense" : "Add Daily Expense"}
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Track daily spending with optional notes and category tags.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="expense-amount">
              Amount
            </label>
            <input
              id="expense-amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amountInput}
              onChange={(event) => setAmountInput(event.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              placeholder="e.g. 12.50"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="expense-date">
              Date
            </label>
            <input
              id="expense-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="expense-note">
            Note
          </label>
          <textarea
            id="expense-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="w-full min-h-20 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="Optional description (e.g. Grocery shopping)"
          />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Tags</p>
          {tags.length === 0 ? (
            <p className="text-sm text-gray-500">No tags available yet. Create tags below.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const selected = selectedTagIds.includes(tag.id);
                return (
                  <button
                    type="button"
                    key={tag.id}
                    onClick={() => toggleTagSelection(tag.id)}
                    className={`px-3 py-2 rounded-full text-xs font-medium border transition ${
                      selected
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-3 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (isEditMode ? "Updating..." : "Adding...") : isEditMode ? "Update Expense" : "Add Expense"}
          </button>

          {isEditMode && onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="px-5 py-3 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>
    </section>
  );
};
