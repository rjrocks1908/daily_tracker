import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";

interface BlogLink {
  id: string;
  userId: string;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

const normalizeUrl = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const isValidHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const getDefaultTitle = (url: string): string => {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./i, "");
  } catch {
    return "Untitled blog";
  }
};

const copyText = async (text: string): Promise<boolean> => {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Falls back to the textarea approach below.
    }
  }

  const area = document.createElement("textarea");
  area.value = text;
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.appendChild(area);
  area.focus();
  area.select();

  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(area);
  }
};

export const Blogs = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [links, setLinks] = useState<BlogLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const totalLinks = useMemo(() => links.length, [links]);

  useEffect(() => {
    const fetchLinks = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        const linksRef = collection(db, "blog_links");
        const q = query(linksRef, where("userId", "==", currentUser.uid));
        const snapshot = await getDocs(q);

        const fetchedLinks = snapshot.docs
          .map((item) => ({
            id: item.id,
            ...(item.data() as Omit<BlogLink, "id">),
          }))
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

        setLinks(fetchedLinks);
      } catch (fetchError) {
        console.error("Error fetching blog links:", fetchError);
        setError("Could not load blog links right now.");
      } finally {
        setLoading(false);
      }
    };

    fetchLinks();
  }, [currentUser]);

  const resetForm = () => {
    setTitle("");
    setUrl("");
    setEditingId(null);
    setError("");
  };

  const handleEdit = (link: BlogLink) => {
    setEditingId(link.id);
    setTitle(link.title);
    setUrl(link.url);
    setError("");
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Delete this blog link?");
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, "blog_links", id));
      setLinks((prev) => prev.filter((link) => link.id !== id));
      if (editingId === id) resetForm();
    } catch (deleteError) {
      console.error("Error deleting blog link:", deleteError);
      setError("Failed to delete the link. Please try again.");
    }
  };

  const handleCopy = async (value: string, id: string) => {
    const copied = await copyText(value);
    if (!copied) {
      setError("Could not copy the link. Please copy manually.");
      return;
    }

    setCopiedId(id);
    setError("");
    window.setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1200);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentUser) {
      setError("You must be logged in to save links.");
      return;
    }

    const normalized = normalizeUrl(url);

    if (!normalized || !isValidHttpUrl(normalized)) {
      setError("Enter a valid blog URL.");
      return;
    }

    const safeTitle = title.trim() || getDefaultTitle(normalized);
    const now = new Date().toISOString();

    setSaving(true);
    setError("");

    try {
      if (editingId) {
        await updateDoc(doc(db, "blog_links", editingId), {
          title: safeTitle,
          url: normalized,
          updatedAt: now,
        });

        setLinks((prev) =>
          prev
            .map((link) =>
              link.id === editingId
                ? {
                    ...link,
                    title: safeTitle,
                    url: normalized,
                    updatedAt: now,
                  }
                : link,
            )
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        );
      } else {
        const payload: Omit<BlogLink, "id"> = {
          title: safeTitle,
          url: normalized,
          userId: currentUser.uid,
          createdAt: now,
          updatedAt: now,
        };

        const created = await addDoc(collection(db, "blog_links"), payload);

        setLinks((prev) => [{ id: created.id, ...payload }, ...prev]);
      }

      resetForm();
    } catch (saveError) {
      console.error("Error saving blog link:", saveError);
      setError("Failed to save the link. Please try again.");
    } finally {
      setSaving(false);
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
            <h1 className="text-xl md:text-2xl font-bold text-gray-900">Blogs</h1>
          </div>
          <span className="text-xs md:text-sm text-gray-500">{totalLinks} saved</span>
        </div>
      </header>

      <main className="p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
          <section className="bg-white rounded-xl shadow-sm p-4 md:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              {editingId ? "Edit Blog Link" : "Add Blog Link"}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Save useful blog links and quickly copy them when you need to share.
            </p>

            {error && (
              <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Title (optional)"
              />
              <input
                type="url"
                required
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="https://example.com/blog-post"
              />

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full sm:w-auto px-5 py-3 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? "Saving..." : editingId ? "Update Link" : "Save Link"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="w-full sm:w-auto px-5 py-3 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </section>

          <section className="bg-white rounded-xl shadow-sm p-4 md:p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Saved Links</h2>

            {loading ? (
              <p className="text-sm text-gray-600">Loading links...</p>
            ) : links.length === 0 ? (
              <p className="text-sm text-gray-500">No blog links yet. Add your first one above.</p>
            ) : (
              <ul className="space-y-3">
                {links.map((link) => (
                  <li
                    key={link.id}
                    className="rounded-lg border border-gray-200 p-3 md:p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 wrap-break-word">{link.title}</p>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-700 hover:underline break-all"
                        >
                          {link.url}
                        </a>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        onClick={() => handleCopy(link.url, link.id)}
                        className="px-3 py-2 text-sm rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition"
                      >
                        {copiedId === link.id ? "Copied" : "Copy"}
                      </button>
                      <button
                        onClick={() => handleEdit(link)}
                        className="px-3 py-2 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(link.id)}
                        className="px-3 py-2 text-sm rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};
