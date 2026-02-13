import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, StickyNote, Calendar, User, Trash2, Eye } from "lucide-react";
import api from "../services/api";

const NotesList = () => {
    const [myNotes, setMyNotes] = useState([]);
    const [sharedNotes, setSharedNotes] = useState([]); // Shared With Me
    const [sharedByMeNotes, setSharedByMeNotes] = useState([]); // Shared By Me
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchNotes();
    }, []);

    const fetchNotes = async () => {
        setLoading(true);
        try {
            const [allMyNotesRes, sharedWithMeRes] = await Promise.all([
                api.get("/notes"),
                api.get("/notes/collaborator")
            ]);

            const allMy = allMyNotesRes.data;
            setMyNotes(allMy.filter(n => !n.collaborators || n.collaborators.length === 0));
            setSharedByMeNotes(allMy.filter(n => n.collaborators && n.collaborators.length > 0));

            setSharedNotes(sharedWithMeRes.data);
        } catch (err) {
            console.error("Failed to fetch notes", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[60vh]">
                <div className="w-8 h-8 border-4 border-amber-300 border-t-amber-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    const NoteCard = ({ note, isShared }) => (
        <div
            onClick={() => navigate(`/notes/${note.id}`)}
            className="bg-white p-6 rounded-xl shadow-sm border border-stone-200 hover:shadow-md hover:border-amber-200 transition cursor-pointer group flex flex-col h-56 relative overflow-hidden"
        >
            {isShared && (
                <div className="absolute top-0 right-0 bg-amber-100 text-amber-800 text-[10px] px-2 py-1 rounded-bl-lg font-semibold flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Shared by {note.ownerName || "Unknown"}
                </div>
            )}
            {!isShared && note.collaborators && note.collaborators.length > 0 && (
                <div className="absolute top-0 right-0 bg-purple-100 text-purple-800 text-[10px] px-2 py-1 rounded-bl-lg font-semibold flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Shared
                </div>
            )}
            <h3 className="font-bold text-lg text-stone-800 mb-2 line-clamp-1 group-hover:text-amber-700 transition-colors pr-16">
                {note.title || "Untitled Note"}
            </h3>
            <p className="text-stone-600 text-sm line-clamp-4 flex-1 mb-4">
                {note.content || "No content..."}
            </p>
            <div className="flex items-center justify-between text-xs text-stone-400 pt-4 border-t border-stone-100 mt-auto">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(note.updatedAt).toLocaleDateString()}
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/notes/${note.id}`); }}
                        className="p-1.5 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                        title="View"
                    >
                        <Eye className="w-4 h-4" />
                    </button>

                    {!isShared && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (window.confirm("Delete this note?")) {
                                    api.delete(`/notes/${note.id}`).then(() => fetchNotes());
                                }
                            }}
                            className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
            <div className="flex justify-end items-center mb-6">
                <Link to="/" className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition shadow-sm font-medium">
                    <Plus className="w-5 h-5" />
                    New Note
                </Link>
            </div>

            {/* My Notes Section */}
            <div>
                <h2 className="text-xl font-bold text-stone-700 dark:text-stone-200 mb-4 flex items-center gap-2">
                    <StickyNote className="w-5 h-5" />
                    My Notes
                </h2>
                {myNotes.length === 0 ? (
                    <div className="text-center py-10 bg-stone-50 dark:bg-stone-900/50 rounded-2xl border border-stone-200 dark:border-stone-800 border-dashed">
                        <p className="text-stone-500 dark:text-stone-400">You haven't created any notes yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {myNotes.map((note) => (
                            <NoteCard key={note.id} note={note} isShared={false} />
                        ))}
                    </div>
                )}
            </div>

            {/* Shared With Me Section */}
            {sharedNotes.length > 0 && (
                <div>
                    <h2 className="text-xl font-bold text-stone-700 dark:text-stone-200 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Shared With Me
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sharedNotes.map((note) => (
                            <NoteCard key={note.id} note={note} isShared={true} />
                        ))}
                    </div>
                </div>
            )}

            {/* Shared By Me Section */}
            {sharedByMeNotes.length > 0 && (
                <div>
                    <h2 className="text-xl font-bold text-stone-700 dark:text-stone-200 mb-4 flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Shared By Me
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sharedByMeNotes.map((note) => (
                            <NoteCard key={note.id} note={note} isShared={false} />
                        ))}
                    </div>
                </div>
            )}

            {myNotes.length === 0 && sharedNotes.length === 0 && sharedByMeNotes.length === 0 && (
                <div className="text-center py-20 bg-stone-50 dark:bg-stone-900/50 rounded-2xl border border-stone-200 dark:border-stone-800 border-dashed">
                    <StickyNote className="w-16 h-16 text-stone-300 dark:text-stone-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-stone-600 dark:text-stone-300 mb-2">No notes found</h3>
                    <p className="text-stone-500 dark:text-stone-400 max-w-sm mx-auto mb-6">Create your first note to get started capturing your thoughts and ideas.</p>
                </div>
            )}
        </div>
    );
};

export default NotesList;
