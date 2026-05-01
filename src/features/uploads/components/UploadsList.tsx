import type { UploadedFileRecord } from "../types/upload";

interface UploadsListProps {
  uploads: UploadedFileRecord[];
  loading: boolean;
  busyId: string | null;
  onEdit: (record: UploadedFileRecord) => void;
  onDelete: (record: UploadedFileRecord) => Promise<void>;
  onDownload: (record: UploadedFileRecord) => Promise<void>;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** unitIndex;
  return `${value.toFixed(value >= 100 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const formatDate = (value: string): string => {
  try {
    return new Date(value).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
};

export const UploadsList = ({
  uploads,
  loading,
  busyId,
  onEdit,
  onDelete,
  onDownload,
}: UploadsListProps) => {
  return (
    <section className="bg-white rounded-xl shadow-sm p-4 md:p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Uploads</h2>

      {loading ? (
        <p className="text-sm text-gray-600">Loading uploads...</p>
      ) : uploads.length === 0 ? (
        <p className="text-sm text-gray-500">No uploads yet. Add your first file above.</p>
      ) : (
        <ul className="space-y-3">
          {uploads.map((upload) => {
            const isBusy = busyId === upload.id;

            return (
              <li
                key={upload.id}
                className="rounded-lg border border-gray-200 p-3 md:p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 break-all">
                      {upload.displayName}
                    </p>
                    <p className="text-xs text-gray-600 break-all mt-1">
                      Original: {upload.originalFileName}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatFileSize(upload.fileSize)} • {upload.contentType || "unknown"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Updated: {formatDate(upload.updatedAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => void onDownload(upload)}
                    disabled={isBusy}
                    className="px-3 py-2 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isBusy ? "Working..." : "Download"}
                  </button>
                  <button
                    onClick={() => onEdit(upload)}
                    disabled={isBusy}
                    className="px-3 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => void onDelete(upload)}
                    disabled={isBusy}
                    className="px-3 py-2 text-sm rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
