import type { ExpenseTag } from "../types/expense";

interface ExpenseFiltersProps {
  tags: ExpenseTag[];
  selectedTagIds: string[];
  onToggleTag: (tagId: string) => void;
  onClear: () => void;
}

export const ExpenseFilters = ({
  tags,
  selectedTagIds,
  onToggleTag,
  onClear,
}: ExpenseFiltersProps) => {
  if (tags.length === 0) {
    return (
      <section className="bg-white rounded-xl shadow-sm p-4 md:p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Filter by Tags</h2>
        <p className="text-sm text-gray-500">Create tags to filter expenses.</p>
      </section>
    );
  }

  return (
    <section className="bg-white rounded-xl shadow-sm p-4 md:p-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">Filter by Tags</h2>
        {selectedTagIds.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs font-medium text-blue-600 hover:text-blue-700"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => {
          const selected = selectedTagIds.includes(tag.id);
          return (
            <button
              key={tag.id}
              onClick={() => onToggleTag(tag.id)}
              className={`px-3 py-2 rounded-full text-xs font-medium border transition ${
                selected
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
              }`}
            >
              {tag.name}
            </button>
          );
        })}
      </div>
    </section>
  );
};
