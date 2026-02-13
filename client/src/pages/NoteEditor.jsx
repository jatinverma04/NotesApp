import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Share2, ArrowLeft, Trash2, UserPlus, X } from "lucide-react";
import api from "../services/api";
import WebSocketService from "../services/websocket";
import { useAuth } from "../context/AuthContext";

const NoteEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [note, setNote] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [collaborators, setCollaborators] = useState([]);

  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingCollaborators, setPendingCollaborators] = useState(new Set());
  const [isSending, setIsSending] = useState(false);

  // WebSocket Integration
  useEffect(() => {
    if (!id || id === 'new' || !user || !note) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    WebSocketService.connect(id, token, note.shareCode);

    const onEdit = (data) => {
      // Received edit from another client
      if (data.noteId === id) {
        // Only update if content is different to avoid cursor jumps if possible,
        // though naive replace will jump cursor.
        // For this assignment, direct replacement is acceptable.
        setContent(data.content);
        if (data.version) {
          setNote(prev => ({ ...prev, version: data.version }));
        }
      }
    };

    const onEditAck = (data) => {
      if (data.noteId === id && data.version) {
        setNote(prev => ({ ...prev, version: data.version }));
      }
    };

    WebSocketService.on("edit", onEdit);
    WebSocketService.on("edit_ack", onEditAck);

    return () => {
      WebSocketService.off("edit", onEdit);
      WebSocketService.off("edit_ack", onEditAck);
      WebSocketService.disconnect();
    };
  }, [id, user, note?.id]); // Connect when note is loaded (note.id ensures we have details)

  useEffect(() => {
    if (showCollaborators) {
      fetchUsers();
    }
  }, [showCollaborators]);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users/emails");
      setUsers(res.data);
    } catch (err) {
      console.error("Failed to fetch users", err);
    }
  };

  const handleTogglePermission = (userId) => {
    const newPending = new Set(pendingCollaborators);
    if (newPending.has(userId)) {
      newPending.delete(userId);
    } else {
      newPending.add(userId);
    }
    setPendingCollaborators(newPending);
  };

  const handleSendInvites = async () => {
    if (pendingCollaborators.size === 0) return;
    setIsSending(true);
    try {
      const promises = Array.from(pendingCollaborators).map(userId =>
        api.post(`/notes/${id}/collaborators`, { userId, permission: "edit" })
      );
      await Promise.all(promises);

      setPendingCollaborators(new Set());
      setSearchQuery("");
      fetchNote();
      alert("Invitations sent successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to send some invitations");
    } finally {
      setIsSending(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Auto-save timer
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    if (id === "new") return; // Handled by Dashboard create modal usually, but if accessed directly?
    fetchNote();
  }, [id]);

  useEffect(() => {
    // Debounced auto-save to API (Persistence)
    if (!note) return;
    if (title === note.title && content === note.content) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 2000);

    return () => clearTimeout(saveTimeoutRef.current);
  }, [title, content]);

  const fetchNote = async () => {
    try {
      const res = await api.get(`/notes/${id}`);
      setNote(res.data);
      setTitle(res.data.title);
      setContent(res.data.content);

      // Map backend collaborators structure to frontend expected format
      const mappedCollaborators = (res.data.collaborators || []).map(c => ({
        id: c.user.id,
        name: c.user.name,
        email: c.user.email,
        permission: c.permission
      }));
      setCollaborators(mappedCollaborators);

      setLastSaved(new Date(res.data.updatedAt));
    } catch (err) {
      console.error(err);
      if (err.response && err.response.status !== 401) {
        navigate("/");
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put(`/notes/${id}`, { title, content });
      // Update note state but keep version consistent if socket updated it?
      // actually api.put returns updated note.
      setNote(res.data);
      setLastSaved(new Date());
    } catch (err) {
      console.error("Failed to save", err);
    } finally {
      setSaving(false);
    }
  };

  const handleContentChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);
    // Send to WebSocket immediately (or throttled, but immediate is fine for now)
    if (note) {
      WebSocketService.sendEdit(id, newContent, note.version);
    }
  };

  const handleTitleChange = (e) => {
    setTitle(e.target.value);
    // Title realtime update not explicitly requested/handled by handleEdit in backend based on my read
    // Backend handleEdit extracts { content, version }.
    // So title updates might stick to API auto-save only, or need backend update.
    // For now, focusing on content as per "realtime updates" expectation.
  };

  const handleRemoveCollaborator = async (userId) => {
    // Implement removal if API supports it
    alert("Remove collaborator not implemented yet");
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this note?")) return;
    try {
      await api.delete(`/notes/${id}`);
      navigate("/");
    } catch (err) {
      alert("Failed to delete");
    }
  };

  if (!note) return <div className="p-8 text-center text-stone-500">Loading editor...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-stone-200 pb-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-stone-100 rounded-lg text-stone-500 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            className="text-2xl font-bold bg-transparent border-none focus:outline-none focus:ring-0 w-full text-stone-800 placeholder-stone-400"
            placeholder="Untitled Note"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          <div className="text-xs text-stone-400 font-medium mr-2 flex items-center gap-1">
            {saving ? "Saving..." : lastSaved ? `Saved ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ""}
          </div>

          <button
            onClick={() => setShowCollaborators(true)}
            className="flex items-center gap-2 px-3 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-sm transition font-medium"
            title="Collaborators"
          >
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">({collaborators.length})</span>
          </button>

          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-sm transition font-medium"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>

          {user && (note.userId === user.id) && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm transition font-medium"
              title="Delete Note"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="bg-white rounded-xl shadow-sm border border-stone-200 min-h-[60vh] p-6 sm:p-8">
        <textarea
          value={content}
          onChange={handleContentChange}
          className="w-full h-full min-h-[50vh] resize-none border-none focus:outline-none focus:ring-0 text-stone-700 leading-relaxed text-lg"
          placeholder="Start writing..."
        />
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50">
              <h3 className="font-bold text-stone-800">Share Note</h3>
              <button onClick={() => setShowShareModal(false)} className="text-stone-400 hover:text-stone-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-stone-600 mb-4">
                Anyone with this link can view this note. They cannot edit or delete it.
              </p>

              {note.shareCode ? (
                <div>
                  <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">Share Link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/shared/${note.shareCode}`}
                      className="flex-1 px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-sm text-stone-600 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/shared/${note.shareCode}`);
                        alert("Link copied to clipboard!");
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <button
                    onClick={async () => {
                      try {
                        const res = await api.post(`/notes/${id}/share`);
                        setNote(prev => ({ ...prev, shareCode: res.data.shareCode }));
                      } catch (err) {
                        alert("Failed to generate link");
                      }
                    }}
                    className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold shadow-sm transition"
                  >
                    Generate Share Link
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unified Collaborators Modal */}
      {showCollaborators && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center bg-stone-50">
              <h3 className="font-bold text-lg text-stone-800">Collaborators</h3>
              <button onClick={() => setShowCollaborators(false)} className="text-stone-400 hover:text-stone-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              {/* Search */}
              <input
                type="text"
                placeholder="Search users by email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 mb-6"
              />

              {/* List */}
              <div className="space-y-3">
                {(searchQuery ? filteredUsers : collaborators).map(user => {
                  const isExisting = collaborators.some(c => c.id === user.id);
                  const isPending = pendingCollaborators.has(user.id);

                  return (
                    <div key={user.id} className="flex items-center justify-between p-3 border-b border-stone-100 last:border-0 hover:bg-stone-50 transition">
                      <div>
                        <p className="font-medium text-stone-800">{user.name || "User"}</p>
                        <p className="text-xs text-stone-500">{user.email}</p>
                      </div>
                      <button
                        onClick={() => {
                          if (!isExisting) {
                            handleTogglePermission(user.id);
                          }
                        }}
                        disabled={isExisting}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition border ${isExisting || isPending
                          ? "bg-emerald-50 border-emerald-200 text-emerald-600 cursor-default"
                          : "bg-white border-stone-300 text-stone-600 hover:border-amber-400 hover:text-amber-600"
                          }`}
                      >
                        {isExisting || isPending ? "Permission Given" : "Give Permission"}
                      </button>
                    </div>
                  );
                })}

                {searchQuery && filteredUsers.length === 0 && (
                  <div className="text-center py-4 text-stone-400 text-sm">No users found.</div>
                )}

                {!searchQuery && collaborators.length === 0 && (
                  <div className="text-center py-4 text-stone-400 text-sm">No collaborators yet.</div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-stone-100 bg-stone-50 flex justify-end gap-3">
              <button
                onClick={() => setShowCollaborators(false)}
                className="px-4 py-2 border border-stone-300 rounded-lg text-stone-600 hover:bg-stone-100 transition font-medium text-sm"
              >
                Close
              </button>
              <button
                onClick={handleSendInvites}
                disabled={pendingCollaborators.size === 0 || isSending}
                className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-sm transition font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? "Sending..." : "Send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteEditor;
