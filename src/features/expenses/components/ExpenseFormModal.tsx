import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { formatDateLocal } from "../../../utils/dateUtils";
import type { ExpenseEntry, ExpenseTag } from "../types/expense";

interface ExpenseFormPayload {
  amount: number;
  note: string;
  date: string;
  tagIds: string[];
}

interface ExpenseFormModalProps {
  mode: "create" | "edit";
  loading: boolean;
  tags: ExpenseTag[];
  initialExpense?: ExpenseEntry | null;
  onSubmit: (payload: ExpenseFormPayload) => Promise<void>;
  onClose: () => void;
}

export const ExpenseFormModal = ({
  mode,
  loading,
  tags,
  initialExpense,
  onSubmit,
  onClose,
}: ExpenseFormModalProps) => {
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

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, loading]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

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
      onClose();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to save expense.");
    }
  };

  const isEditMode = mode === "edit";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => !loading && onClose()}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl p-5 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 id="expense-modal-title" className="text-lg font-semibold text-gray-900">
              {isEditMode ? "Edit Expense" : "Add Expense"}
            </h2>
            <p className="text-sm text-gray-600 mt-0.5">
              {isEditMode
                ? "Update the expense details below."
                : "Track daily spending with optional notes and tags."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition disabled:opacity-50"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

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
                autoFocus
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
              <p className="text-sm text-gray-500">No tags available yet.</p>
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

          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-5 py-3 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? isEditMode
                  ? "Updating..."
                  : "Adding..."
                : isEditMode
                  ? "Update Expense"
                  : "Add Expense"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-3 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
