import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";

const SharedNote = () => {
  const { shareCode } = useParams();
  const navigate = useNavigate();
  const [note, setNote] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { loadSharedNote(); }, [shareCode]);

  const loadSharedNote = async () => {
    setLoading(true); setError("");
    try {
      const response = await api.get(`/shared/${shareCode}`);
      const noteData = response.data;
      setNote(noteData); setTitle(noteData.title); setContent(noteData.content);
      setLoading(false);
    } catch (err) {
      setError(err.response?.status === 404 ? "Shared note not found or link is invalid" : "Failed to load shared note");
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-stone-50"><p className="text-lg text-stone-600">Loading shared note...</p></div>;

  if (error && !note) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-stone-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={() => navigate("/")} className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600">Back to Home</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      <div className="bg-white border-b border-stone-200 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-stone-700">Shared Note</span>
            <span className="text-xs text-stone-500">View Only</span>
          </div>
        </div>

        {error && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${error.includes("successfully") ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
            {error}
          </div>
        )}

        <input type="text" value={title} readOnly className="w-full text-2xl font-bold bg-transparent border-none outline-none text-stone-800 cursor-default" />
      </div>

      <div className="bg-white border-b border-stone-200 px-4 sm:px-6 py-2 flex items-center gap-2" />

      <div className="flex-1 overflow-auto">
        <textarea value={content} readOnly placeholder="No content" className="w-full h-full p-4 sm:p-6 text-stone-800 bg-white border-none outline-none resize-none font-mono text-sm leading-relaxed cursor-default" style={{ minHeight: "100%" }} />
      </div>
    </div>
  );
};

export default SharedNote;
