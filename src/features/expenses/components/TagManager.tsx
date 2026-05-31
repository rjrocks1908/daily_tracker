import { useMemo, useState } from "react";
import type { ExpenseTag } from "../types/expense";

const BudgetIndicator = ({ budget, spent }: { budget: number; spent: number }) => {
  const remaining = budget - spent;
  const percentage = Math.min((spent / budget) * 100, 100);
  const isOver = remaining < 0;

  return (
    <span className={`text-xs font-medium ${isOver ? "text-red-600" : "text-green-600"}`}>
      Budget: ₹{budget.toFixed(2)} | Spent: ₹{spent.toFixed(2)} |{" "}
      {isOver
        ? `Over by ₹${Math.abs(remaining).toFixed(2)}`
        : `₹${remaining.toFixed(2)} left (${percentage.toFixed(0)}% used)`}
    </span>
  );
};

interface TagManagerProps {
  tags: ExpenseTag[];
  usageByTagId: Record<string, number>;
  spentByTagId: Record<string, number>;
  loading: boolean;
  onCreateTag: (name: string, budget?: number) => Promise<void>;
  onUpdateTag: (id: string, name: string, budget?: number) => Promise<void>;
  onDeleteTag: (tag: ExpenseTag) => Promise<void>;
}

export const TagManager = ({
  tags,
  usageByTagId,
  spentByTagId,
  loading,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
}: TagManagerProps) => {
  const [newTagName, setNewTagName] = useState("");
  const [newTagBudget, setNewTagBudget] = useState("");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");
  const [editingTagBudget, setEditingTagBudget] = useState("");
  const [error, setError] = useState("");

  const sortedTags = useMemo(() => {
    return [...tags].sort((a, b) => a.name.localeCompare(b.name));
  }, [tags]);

  const handleCreate = async () => {
    if (!newTagName.trim()) {
      setError("Tag name cannot be empty.");
      return;
    }

    const budget = newTagBudget ? Number(newTagBudget) : undefined;
    if (budget !== undefined && (!Number.isFinite(budget) || budget < 0)) {
      setError("Budget must be a valid positive number.");
      return;
    }

    try {
      setError("");
      await onCreateTag(newTagName, budget);
      setNewTagName("");
      setNewTagBudget("");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create tag.");
    }
  };

  const handleStartEdit = (tag: ExpenseTag) => {
    setEditingTagId(tag.id);
    setEditingTagName(tag.name);
    setEditingTagBudget(tag.budget != null ? String(tag.budget) : "");
    setError("");
  };

  const handleSaveEdit = async () => {
    if (!editingTagId) return;

    if (!editingTagName.trim()) {
      setError("Tag name cannot be empty.");
      return;
    }

    const budget = editingTagBudget ? Number(editingTagBudget) : undefined;
    if (budget !== undefined && (!Number.isFinite(budget) || budget < 0)) {
      setError("Budget must be a valid positive number.");
      return;
    }

    try {
      setError("");
      await onUpdateTag(editingTagId, editingTagName, budget);
      setEditingTagId(null);
      setEditingTagName("");
      setEditingTagBudget("");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update tag.");
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-sm p-4 md:p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Expense Tags</h2>
      <p className="text-sm text-gray-600 mb-4">
        Create, rename, and delete tags to organize your expenses.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          type="text"
          value={newTagName}
          onChange={(event) => setNewTagName(event.target.value)}
          placeholder="e.g. Food, Rent, Travel"
          className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <input
          type="number"
          step="0.01"
          min="0"
          value={newTagBudget}
          onChange={(event) => setNewTagBudget(event.target.value)}
          placeholder="Budget (optional)"
          className="w-full sm:w-36 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <button
          onClick={() => void handleCreate()}
          disabled={loading}
          className="px-4 py-3 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add Tag
        </button>
      </div>

      {sortedTags.length === 0 ? (
        <p className="text-sm text-gray-500">No tags yet.</p>
      ) : (
        <ul className="space-y-2">
          {sortedTags.map((tag) => {
            const usageCount = usageByTagId[tag.id] ?? 0;
            const isEditing = editingTagId === tag.id;

            return (
              <li
                key={tag.id}
                className="rounded-lg border border-gray-200 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              >
                <div className="min-w-0 flex-1">
                  {isEditing ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={editingTagName}
                        onChange={(event) => setEditingTagName(event.target.value)}
                        className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingTagBudget}
                        onChange={(event) => setEditingTagBudget(event.target.value)}
                        placeholder="Budget"
                        className="w-full sm:w-32 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-gray-900 break-words">{tag.name}</p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-1">
                    <p className="text-xs text-gray-500">Used in {usageCount} expense(s)</p>
                    {tag.budget != null && tag.budget > 0 && (
                      <BudgetIndicator budget={tag.budget} spent={spentByTagId[tag.id] ?? 0} />
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => void handleSaveEdit()}
                        disabled={loading}
                        className="px-3 py-2 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditingTagId(null);
                          setEditingTagName("");
                          setError("");
                        }}
                        className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleStartEdit(tag)}
                        className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void onDeleteTag(tag)}
                        disabled={loading}
                        className="px-3 py-2 rounded-lg bg-red-50 text-red-700 text-xs font-medium hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
