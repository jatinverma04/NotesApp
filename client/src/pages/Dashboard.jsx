import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Menu, X, StickyNote, FolderOpen, Eye, Trash2 } from "lucide-react";
import api from "../services/api";
import Sidebar from "../components/Sidebar";

const Dashboard = () => {
    const [notes, setNotes] = useState([]);
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    // Create Note Modal State
    const [showCreateNote, setShowCreateNote] = useState(false);
    const [newNoteTitle, setNewNoteTitle] = useState("");
    const [newNoteContent, setNewNoteContent] = useState("");
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");

    // Tab State
    const [myAllNotes, setMyAllNotes] = useState([]); // All notes owned by me

    const navigate = useNavigate();

    useEffect(() => {
        fetchNotes();
    }, [selectedFolder]);

    const fetchNotes = async () => {
        setLoading(true);
        try {
            if (selectedFolder) {
                const res = await api.get(`/notes/folder/${selectedFolder}`);
                setNotes(res.data);
            } else {
                // Fetch My Notes
                const resMy = await api.get("/notes");
                setMyAllNotes(resMy.data);
            }
        } catch (err) {
            console.error("Failed to fetch notes", err);
        } finally {
            setLoading(false);
        }
    };

    // Derived state for current view
    const getCurrentNotes = () => {
        if (selectedFolder) return notes; // Folder view uses 'notes' state directly
        // Default Dashboard View: Show all my notes (including shared by me)
        return myAllNotes;
    };

    const currentNotes = getCurrentNotes();

    const handleCreateNote = async (e) => {
        e.preventDefault();
        if (!newNoteTitle.trim()) {
            setError("Title is required");
            return;
        }
        setCreating(true);
        try {
            const res = await api.post("/notes", {
                title: newNoteTitle,
                content: newNoteContent,
                folderId: selectedFolder
            });

            if (selectedFolder) {
                setNotes([res.data, ...notes]);
            } else {
                setMyAllNotes([res.data, ...myAllNotes]);
                // If the new note has collaborators (unlikely on create), handle it. 
                // Newly created note won't have collaborators immediately usually.
                setActiveTab('my-notes'); // Switch to my notes to see it
            }

            setShowCreateNote(false);
            setNewNoteTitle("");
            setNewNoteContent("");
            setError("");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to create note");
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteNote = async (e, noteId) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this note?")) return;
        try {
            await api.delete(`/notes/${noteId}`);

            if (selectedFolder) {
                setNotes(notes.filter(n => n.id !== noteId));
            } else {
                setMyAllNotes(myAllNotes.filter(n => n.id !== noteId));
                // No need to update collaboratorNotes because delete button is hidden for them
            }
        } catch (err) {
            alert("Failed to delete note");
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-white">
            {/* Sidebar - responsive */}
            <Sidebar
                onSelectFolder={(folderId) => {
                    setSelectedFolder(folderId);
                    setSidebarOpen(false);
                }}
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
            />

            <div className="flex-1 flex flex-col h-full w-full overflow-hidden relative">
                {/* Mobile Header / Sidebar Toggle */}
                <div className="md:hidden flex items-center justify-between p-4 border-b border-stone-200 bg-white sticky top-0 z-20">
                    <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-stone-600 rounded-lg hover:bg-stone-100">
                        <Menu className="w-6 h-6" />
                    </button>
                    <span className="font-semibold text-stone-700">
                        {selectedFolder ? "Folder View" : "Dashboard"}
                    </span>
                    <div className="w-6" /> {/* spacer */}
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-stone-800">
                                {selectedFolder ? "Folder Notes" : "Dashboard"}
                            </h1>
                            <p className="text-stone-500 mt-1">Manage your ideas and tasks</p>
                        </div>
                        <button
                            onClick={() => setShowCreateNote(true)}
                            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition shadow-sm font-semibold"
                        >
                            <Plus className="w-5 h-5" />
                            New Note
                        </button>
                    </div>

                    {/* Simple Header for Recent/All Notes if no folder selected */}
                    {!selectedFolder && (
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-stone-700">Recent Notes</h2>
                        </div>
                    )}

                    {loading ? (
                        <div className="flex justify-center py-20">
                            <div className="w-8 h-8 border-4 border-amber-300 border-t-amber-600 rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <>
                            {/* Empty State */}
                            {currentNotes.length === 0 ? (
                                <div className="text-center py-20 bg-stone-50 rounded-2xl border border-stone-200 border-dashed m-1">
                                    {selectedFolder ? (
                                        <>
                                            <FolderOpen className="w-16 h-16 text-stone-300 mx-auto mb-4" />
                                            <h3 className="text-xl font-semibold text-stone-600 mb-2">Empty Folder</h3>
                                            <p className="text-stone-500 max-w-sm mx-auto">No notes in this folder yet.</p>
                                        </>
                                    ) : (
                                        <>
                                            <StickyNote className="w-16 h-16 text-stone-300 mx-auto mb-4" />
                                            <h3 className="text-xl font-semibold text-stone-600 mb-2">No notes found</h3>
                                            <p className="text-stone-500 max-w-sm mx-auto mb-6">Create your first note to get started.</p>
                                            <button
                                                onClick={() => setShowCreateNote(true)}
                                                className="inline-flex items-center gap-2 text-amber-600 font-medium bg-amber-50 px-4 py-2 rounded-lg hover:bg-amber-100 transition"
                                            >
                                                <Plus className="w-4 h-4" /> Create Note
                                            </button>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {currentNotes.map((note) => (
                                        <div
                                            key={note.id}
                                            onClick={() => navigate(`/notes/${note.id}`)}
                                            className="bg-white p-5 rounded-xl shadow-sm border border-stone-200 hover:shadow-md hover:border-amber-200 transition cursor-pointer group flex flex-col h-60 relative"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-lg text-stone-800 line-clamp-1 group-hover:text-amber-700 transition-colors pr-2">
                                                    {note.title || "Untitled"}
                                                </h3>
                                                {/* Show badge if Shared By Me */}
                                                {note.collaborators && note.collaborators.length > 0 && (
                                                    <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded border border-purple-100 font-medium">
                                                        Shared
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-stone-600 text-sm line-clamp-4 flex-1 mb-4 leading-relaxed">
                                                {note.content || "No content..."}
                                            </p>

                                            <div className="flex items-center justify-between pt-4 border-t border-stone-100 mt-auto">
                                                <span className="text-xs text-stone-400 font-medium">
                                                    {new Date(note.updatedAt).toLocaleDateString()}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); navigate(`/notes/${note.id}`); }}
                                                        className="p-1.5 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                                        title="View"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteNote(e, note.id)}
                                                        className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Create Note Modal */}
                {showCreateNote && (
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="flex justify-between items-center p-4 border-b border-stone-200">
                                <h3 className="text-xl font-bold text-stone-800">Create New Note</h3>
                                <button onClick={() => setShowCreateNote(false)} className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateNote} className="flex-1 overflow-y-auto p-4 sm:p-6">
                                {error && (
                                    <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm border border-red-200">
                                        {error}
                                    </div>
                                )}
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
                                    <input
                                        type="text"
                                        value={newNoteTitle}
                                        onChange={(e) => setNewNoteTitle(e.target.value)}
                                        placeholder="Note title"
                                        className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400"
                                        autoFocus
                                    />
                                </div>
                                <div className="mb-4">
                                    <label className="block text-sm font-medium text-stone-700 mb-1">Content</label>
                                    <textarea
                                        value={newNoteContent}
                                        onChange={(e) => setNewNoteContent(e.target.value)}
                                        placeholder="Start typing..."
                                        className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 h-40 resize-none"
                                    />
                                </div>
                            </form>

                            <div className="p-4 border-t border-stone-200 flex justify-end gap-3 bg-stone-50">
                                <button
                                    onClick={() => setShowCreateNote(false)}
                                    className="px-4 py-2 text-stone-600 hover:bg-stone-200 rounded-lg transition font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateNote}
                                    disabled={creating}
                                    className="px-6 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition shadow-sm font-semibold disabled:opacity-50"
                                >
                                    {creating ? "Creating..." : "Create Note"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
