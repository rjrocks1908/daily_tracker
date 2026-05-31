import { useMemo, useState } from "react";
import type { ExpenseTag } from "../types/expense";

interface TagManagerProps {
  tags: ExpenseTag[];
  usageByTagId: Record<string, number>;
  loading: boolean;
  onCreateTag: (name: string) => Promise<void>;
  onUpdateTag: (id: string, name: string) => Promise<void>;
  onDeleteTag: (tag: ExpenseTag) => Promise<void>;
}

export const TagManager = ({
  tags,
  usageByTagId,
  loading,
  onCreateTag,
  onUpdateTag,
  onDeleteTag,
}: TagManagerProps) => {
  const [newTagName, setNewTagName] = useState("");
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState("");
  const [error, setError] = useState("");

  const sortedTags = useMemo(() => {
    return [...tags].sort((a, b) => a.name.localeCompare(b.name));
  }, [tags]);

  const handleCreate = async () => {
    if (!newTagName.trim()) {
      setError("Tag name cannot be empty.");
      return;
    }

    try {
      setError("");
      await onCreateTag(newTagName);
      setNewTagName("");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create tag.");
    }
  };

  const handleStartEdit = (tag: ExpenseTag) => {
    setEditingTagId(tag.id);
    setEditingTagName(tag.name);
    setError("");
  };

  const handleSaveEdit = async () => {
    if (!editingTagId) return;

    if (!editingTagName.trim()) {
      setError("Tag name cannot be empty.");
      return;
    }

    try {
      setError("");
      await onUpdateTag(editingTagId, editingTagName);
      setEditingTagId(null);
      setEditingTagName("");
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
                    <input
                      type="text"
                      value={editingTagName}
                      onChange={(event) => setEditingTagName(event.target.value)}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-900 break-words">{tag.name}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-1">Used in {usageCount} expense(s)</p>
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
