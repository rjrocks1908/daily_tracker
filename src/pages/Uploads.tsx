import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { UploadForm } from "../features/uploads/components/UploadForm";
import { UploadsList } from "../features/uploads/components/UploadsList";
import { firebaseUploadService } from "../features/uploads/services/FirebaseUploadService";
import type { UploadedFileRecord } from "../features/uploads/types/upload";

export const Uploads = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [uploads, setUploads] = useState<UploadedFileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingUpload, setEditingUpload] = useState<UploadedFileRecord | null>(null);
  const [pageError, setPageError] = useState("");

  const fetchUploads = async () => {
    if (!currentUser) return;

    setLoading(true);
    setPageError("");

    try {
      const records = await firebaseUploadService.listUserUploads(currentUser.uid);
      setUploads(records);
    } catch (error) {
      console.error("Error loading uploads:", error);
      setPageError("Could not load uploads right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUploads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const handleCreate = async ({
    displayName,
    file,
  }: {
    displayName: string;
    file: File | null;
  }) => {
    if (!currentUser || !file) {
      throw new Error("Please choose a file.");
    }

    setSaving(true);
    try {
      const created = await firebaseUploadService.uploadFile({
        userId: currentUser.uid,
        file,
        displayName,
      });

      setUploads((prev) => [created, ...prev]);
      setPageError("");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async ({
    displayName,
    file,
  }: {
    displayName: string;
    file: File | null;
  }) => {
    if (!editingUpload) {
      throw new Error("No upload selected for editing.");
    }

    setSaving(true);
    try {
      const updated = await firebaseUploadService.updateUpload({
        record: editingUpload,
        displayName,
        file,
      });

      setUploads((prev) =>
        prev
          .map((upload) => (upload.id === updated.id ? updated : upload))
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      );
      setEditingUpload(null);
      setPageError("");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record: UploadedFileRecord) => {
    const confirmed = window.confirm(`Delete ${record.displayName}?`);
    if (!confirmed) return;

    setBusyId(record.id);

    try {
      await firebaseUploadService.deleteUpload(record);
      setUploads((prev) => prev.filter((item) => item.id !== record.id));
      if (editingUpload?.id === record.id) {
        setEditingUpload(null);
      }
      setPageError("");
    } catch (error) {
      console.error("Error deleting upload:", error);
      setPageError("Failed to delete file. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDownload = async (record: UploadedFileRecord) => {
    setBusyId(record.id);

    try {
      await firebaseUploadService.download(record);
      setPageError("");
    } catch (error) {
      console.error("Error downloading file:", error);
      setPageError("Failed to download file. Please try again.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:gap-4">
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
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Uploads</h1>
          </div>
          <span className="text-xs md:text-sm text-gray-500">{uploads.length} files</span>
        </div>
      </header>

      <main className="p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
          {pageError && (
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
              {pageError}
            </div>
          )}

          <UploadForm
            mode={editingUpload ? "edit" : "create"}
            loading={saving}
            initialDisplayName={editingUpload?.displayName ?? ""}
            onSubmit={editingUpload ? handleUpdate : handleCreate}
            onCancelEdit={editingUpload ? () => setEditingUpload(null) : undefined}
          />

          <UploadsList
            uploads={uploads}
            loading={loading}
            busyId={busyId}
            onEdit={setEditingUpload}
            onDelete={handleDelete}
            onDownload={handleDownload}
          />
        </div>
      </main>
    </div>
  );
};
