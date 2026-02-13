import { useEffect, useState, useRef } from "react";
import { Plus, Trash2, X, SquarePen } from "lucide-react";
import api from "../services/api";

const Sidebar = ({ onSelectFolder, isOpen, onClose }) => {
    const [folders, setFolders] = useState([]);
    const [showCreateFolder, setShowCreateFolder] = useState(false);
    const [folderName, setFolderName] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [deletingFolderId, setDeletingFolderId] = useState(null);

    const [editingFolderId, setEditingFolderId] = useState(null);
    const [editFolderName, setEditFolderName] = useState("");

    const dropdownRef = useRef(null);
    const inputRef = useRef(null);
    const editInputRef = useRef(null);

    useEffect(() => {
        fetchFolders();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowCreateFolder(false);
                setFolderName("");
                setError("");
            }
        };
        if (showCreateFolder) {
            document.addEventListener("mousedown", handleClickOutside);
            setTimeout(() => { if (inputRef.current) inputRef.current.focus(); }, 100);
        }
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [showCreateFolder]);

    useEffect(() => {
        if (editingFolderId) {
            setTimeout(() => { if (editInputRef.current) editInputRef.current.focus(); }, 100);
        }
    }, [editingFolderId]);

    const fetchFolders = () => {
        api.get("/folders").then((res) => setFolders(res.data));
    };

    const handleCreateFolder = async (e) => {
        e.preventDefault();
        setError("");
        if (!folderName.trim()) { setError("Folder name is required"); return; }
        setLoading(true);
        try {
            await api.post("/folders", { name: folderName.trim() });
            setFolderName("");
            setShowCreateFolder(false);
            fetchFolders();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to create folder");
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteFolder = async (folderId) => {
        try {
            await api.delete(`/folders/${folderId}`);
            setDeletingFolderId(null);
            fetchFolders();
            onSelectFolder(null);
        } catch (err) {
            setError(err.response?.data?.message || "Failed to delete folder");
            setDeletingFolderId(null);
        }
    };

    const handleUpdateFolder = async (e) => {
        e.preventDefault();
        if (!editFolderName.trim()) { setError("Folder name is required"); return; }
        try {
            await api.put(`/folders/${editingFolderId}`, { name: editFolderName.trim() });
            setEditingFolderId(null);
            setEditFolderName("");
            fetchFolders();
        } catch (err) {
            setError(err.response?.data?.message || "Failed to update folder");
        }
    };

    const handleFolderClick = (folderId) => {
        onSelectFolder(folderId);
        if (onClose) onClose();
    };

    return (
        <>
            {/* Mobile backdrop */}
            {isOpen && (
                <div className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={onClose} />
            )}

            <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-stone-50 text-stone-800 p-4 flex flex-col border-r border-stone-200
        transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:z-auto
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
                <div className="flex-shrink-0 mb-2">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">Folders</p>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setShowCreateFolder(!showCreateFolder)}
                                className="text-amber-600 hover:text-amber-700 transition-colors p-1 rounded hover:bg-amber-50"
                                title="Create folder"
                            >
                                <Plus className="h-5 w-5" />
                            </button>
                            {onClose && (
                                <button
                                    onClick={onClose}
                                    className="md:hidden text-stone-400 hover:text-stone-600 p-1 rounded hover:bg-stone-100"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {showCreateFolder && (
                        <div ref={dropdownRef} className="relative bg-white rounded-xl shadow-lg p-3 z-10 border border-stone-200 mb-2">
                            <form onSubmit={handleCreateFolder}>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    placeholder="Folder name"
                                    value={folderName}
                                    onChange={(e) => setFolderName(e.target.value)}
                                    className="w-full px-3 py-2 bg-stone-50 text-stone-800 placeholder-stone-400 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 mb-2"
                                    disabled={loading}
                                />
                                {error && <p className="text-red-600 text-xs mb-2 bg-red-50 p-2 rounded">{error}</p>}
                                <div className="flex gap-2">
                                    <button type="submit" disabled={loading} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-sm transition shadow-sm disabled:opacity-50">
                                        {loading ? "Creating..." : "Create"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setShowCreateFolder(false); setFolderName(""); setError(""); }}
                                        className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-sm transition border border-stone-200"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 -mr-2">
                    <div className="space-y-1">
                        {folders.map((folder) => (
                            <div
                                key={folder.id}
                                className="group relative cursor-pointer px-3 py-2.5 rounded-lg hover:bg-amber-50 hover:shadow-sm flex items-center justify-between transition-all duration-200 border border-transparent hover:border-amber-100"
                            >
                                <div
                                    onClick={() => handleFolderClick(folder.id)}
                                    className="flex-1 text-stone-700 hover:text-amber-700 transition-colors truncate font-medium mr-2"
                                    title={folder.name}
                                >
                                    {folder.name}
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setEditingFolderId(folder.id); setEditFolderName(folder.name); }}
                                        className="p-1.5 text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                        title="Edit folder"
                                    >
                                        <SquarePen className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setDeletingFolderId(folder.id); }}
                                        className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                        title="Delete folder"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {deletingFolderId && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100] px-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-stone-200">
                        <h3 className="text-xl font-semibold mb-4 text-stone-800">Delete Folder</h3>
                        <p className="text-stone-600 mb-6">Are you sure you want to delete this folder? All notes will also be deleted.</p>
                        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{error}</div>}
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => { setDeletingFolderId(null); setError(""); }} className="px-4 py-2 border border-stone-300 rounded-lg hover:bg-stone-50 transition text-stone-700 text-sm font-medium">Cancel</button>
                            <button onClick={() => handleDeleteFolder(deletingFolderId)} className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition shadow-sm text-sm font-semibold">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {editingFolderId && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100] px-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-stone-200">
                        <h3 className="text-xl font-semibold mb-4 text-stone-800">Edit Folder</h3>
                        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">{error}</div>}
                        <form onSubmit={handleUpdateFolder}>
                            <input
                                ref={editInputRef}
                                type="text"
                                value={editFolderName}
                                onChange={(e) => setEditFolderName(e.target.value)}
                                className="w-full px-4 py-2 bg-stone-50 text-stone-800 placeholder-stone-400 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 mb-6"
                            />
                            <div className="flex gap-3 justify-end">
                                <button type="button" onClick={() => { setEditingFolderId(null); setEditFolderName(""); setError(""); }} className="px-4 py-2 border border-stone-300 rounded-lg hover:bg-stone-50 transition text-stone-700 text-sm font-medium">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition shadow-sm text-sm font-semibold">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default Sidebar;
