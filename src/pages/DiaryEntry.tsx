import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/config";

interface DiaryEntry {
  id: string;
  userId: string;
  date: string;
  content: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const DiaryEntry = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { date } = useParams<{ date: string }>();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingEntryId, setExistingEntryId] = useState<string | null>(null);

  useEffect(() => {
    const fetchEntry = async () => {
      if (!currentUser || !date) return;

      try {
        setLoading(true);
        const entriesRef = collection(db, "diary_entries");
        const q = query(
          entriesRef,
          where("userId", "==", currentUser.uid),
          where("date", "==", date),
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const entryDoc = querySnapshot.docs[0];
          const entryData = entryDoc.data() as DiaryEntry;
          setContent(entryData.content);
          setExistingEntryId(entryDoc.id);
        }
      } catch (error) {
        console.error("Error fetching diary entry:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEntry();
  }, [currentUser, date]);

  // Prevent creating entries for future dates
  useEffect(() => {
    if (!date) return;

    const [year, month, day] = date.split("-").map(Number);
    const entryDate = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    entryDate.setHours(0, 0, 0, 0);

    if (entryDate > today) {
      alert("You cannot create diary entries for future dates.");
      navigate("/diary");
    }
  }, [date, navigate]);

  const handleSave = async () => {
    if (!currentUser || !date || !content.trim()) {
      alert("Please write something before saving.");
      return;
    }

    try {
      setSaving(true);

      const now = Timestamp.now();

      // Save or update diary entry
      const entryId = existingEntryId || `${currentUser.uid}_${date}`;
      const entryRef = doc(db, "diary_entries", entryId);

      // Build the data object conditionally to avoid undefined values
      const entryData: Record<string, any> = {
        userId: currentUser.uid,
        date: date,
        content: content,
        updatedAt: now,
      };

      // Only set createdAt for new entries
      if (!existingEntryId) {
        entryData.createdAt = now;
      }

      await setDoc(entryRef, entryData, { merge: true });

      // Create or update placeholder
      const placeholderId = `${currentUser.uid}_${date}`;
      const placeholderRef = doc(db, "diary_placeholders", placeholderId);

      await setDoc(placeholderRef, {
        userId: currentUser.uid,
        date: date,
        hasEntry: true,
      });

      // Navigate back to calendar
      navigate("/diary");
    } catch (error) {
      console.error("Error saving diary entry:", error);
      alert("Failed to save entry. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentUser || !date || !existingEntryId) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this diary entry? This action cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    try {
      setSaving(true);

      // Delete diary entry
      const entryRef = doc(db, "diary_entries", existingEntryId);
      await deleteDoc(entryRef);

      // Delete placeholder
      const placeholderId = `${currentUser.uid}_${date}`;
      const placeholderRef = doc(db, "diary_placeholders", placeholderId);
      await deleteDoc(placeholderRef);

      // Navigate back to calendar
      navigate("/diary");
    } catch (error) {
      console.error("Error deleting diary entry:", error);
      alert("Failed to delete entry. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const formatDisplayDate = (dateStr: string): string => {
    const [year, month, day] = dateStr.split("-");
    const dateObj = new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
    );
    return dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/diary")}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
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
              Back to Calendar
            </button>
          </div>
          <div className="flex items-center gap-2">
            {existingEntryId && (
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-6 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Deleting..." : "Delete Entry"}
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !content.trim()}
              className="px-6 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Entry"}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 md:p-8 max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-6 md:p-8">
          {/* Date Display */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {date && formatDisplayDate(date)}
            </h1>
            <div className="h-1 w-20 bg-gray-900 rounded"></div>
          </div>

          {/* Textarea */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your thoughts for today..."
            className="w-full min-h-[400px] p-4 border-2 border-gray-200 rounded-lg focus:border-gray-900 focus:outline-none resize-y text-gray-900 placeholder-gray-400"
            style={{ fontFamily: "inherit" }}
          />

          {/* Helper Text */}
          <div className="mt-4 text-sm text-gray-500">
            {content.length} characters
          </div>
        </div>
      </main>
    </div>
  );
};
