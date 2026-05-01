import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { MAX_UPLOAD_SIZE_MB, MAX_UPLOAD_SIZE_BYTES } from "../services/FirebaseUploadService";

interface UploadFormSubmitPayload {
  displayName: string;
  file: File | null;
}

interface UploadFormProps {
  mode: "create" | "edit";
  loading: boolean;
  initialDisplayName?: string;
  onSubmit: (payload: UploadFormSubmitPayload) => Promise<void>;
  onCancelEdit?: () => void;
}

export const UploadForm = ({
  mode,
  loading,
  initialDisplayName = "",
  onSubmit,
  onCancelEdit,
}: UploadFormProps) => {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setDisplayName(initialDisplayName);
    setFile(null);
    setError("");
  }, [initialDisplayName, mode]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (mode === "create" && !file) {
      setError("Please select a file to upload.");
      return;
    }

    if (file && file.size > MAX_UPLOAD_SIZE_BYTES) {
      setError(`File must be ${MAX_UPLOAD_SIZE_MB} MB or smaller.`);
      return;
    }

    try {
      await onSubmit({
        displayName: displayName.trim(),
        file,
      });

      if (mode === "create") {
        setDisplayName("");
        setFile(null);
      }
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Upload failed. Please try again.";
      setError(message);
    }
  };

  const isEditMode = mode === "edit";

  return (
    <section className="bg-white rounded-xl shadow-sm p-4 md:p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">
        {isEditMode ? "Update Upload" : "Upload a File"}
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Any file type is supported. Maximum file size is {MAX_UPLOAD_SIZE_MB} MB.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          placeholder="Display name (optional)"
        />

        <input
          type="file"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-gray-900 file:px-3 file:py-2 file:text-sm file:text-white hover:file:bg-gray-800"
        />

        {isEditMode && (
          <p className="text-xs text-gray-500">
            Select a new file only if you want to replace the current file.
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-1">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-5 py-3 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading
              ? isEditMode
                ? "Updating..."
                : "Uploading..."
              : isEditMode
                ? "Update Upload"
                : "Upload File"}
          </button>

          {isEditMode && onCancelEdit && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="w-full sm:w-auto px-5 py-3 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>
    </section>
  );
};
