import { Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { StickyNote, Bell, User, LogOut, Trash2, Menu, X } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";


const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const token = localStorage.getItem("token");
    const isAuthenticated = !!token;
    const isSharedMode = location.pathname.startsWith("/shared/");

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const searchRefDesktop = useRef(null);
    const searchRefMobile = useRef(null);

    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const notificationRefDesktop = useRef(null);
    const notificationRefMobile = useRef(null);

    const [showUserMenu, setShowUserMenu] = useState(false);
    const [userInfo, setUserInfo] = useState(null);
    const userMenuRef = useRef(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const loadNotifications = async () => {
        try {
            const res = await api.get("/notes/notifications");
            setNotifications(res.data);
        } catch (err) { }
    };

    const loadUserInfo = async () => {
        try {
            const res = await api.get("/users/me");
            setUserInfo(res.data);
        } catch (err) { }
    };

    useEffect(() => {
        if (isAuthenticated) {
            loadNotifications();
            loadUserInfo();
        } else {
            setUserInfo(null);
        }
    }, [token]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            const inDesktop = searchRefDesktop.current?.contains(event.target);
            const inMobile = searchRefMobile.current?.contains(event.target);
            if (!inDesktop && !inMobile) {
                setShowSearchResults(false);
            }
        };
        if (showSearchResults) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showSearchResults]);

    useEffect(() => {
        const handler = (e) => {
            const inDesktop = notificationRefDesktop.current?.contains(e.target);
            const inMobile = notificationRefMobile.current?.contains(e.target);
            // If click is outside both refs, close notifications
            if (!inDesktop && !inMobile) {
                setShowNotifications(false);
            }
        };
        if (showNotifications) {
            document.addEventListener("mousedown", handler);
        }
        return () => document.removeEventListener("mousedown", handler);
    }, [showNotifications]);

    useEffect(() => {
        const handler = (e) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
                setShowUserMenu(false);
            }
        };
        if (showUserMenu) {
            document.addEventListener("mousedown", handler);
        }
        return () => document.removeEventListener("mousedown", handler);
    }, [showUserMenu]);

    useEffect(() => {
        setMobileMenuOpen(false);
    }, [location.pathname]);

    const { user, logout } = useAuth();

    const handleLogout = () => {
        logout();
    };
    // userInfo state is redundant if we use user from context, but keeping existing structure for now to minimize changes, just replacing logout.
    // actually, Navbar uses 'userInfo' state which fetches /users/me. AuthContext has 'user'.
    // The requirement says "Fix routing / redirect logic only on frontend."
    // I will replace the manual logout in proper place.

    // Let's first import useAuth properly.
    // Wait, Navbar import doesn't have useAuth. I need to add it.

    // ... logic below ...

    const handleDeleteAccount = async () => {
        setDeleting(true);
        try {
            await api.delete("/users/me");
            localStorage.removeItem("token");
            navigate("/login");
        } catch (err) {
            alert(err.response?.data?.message || "Failed to delete account");
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);
        if (query.trim().length === 0) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }
        try {
            const response = await api.get(`/notes/search?q=${encodeURIComponent(query)}`);
            setSearchResults(response.data);
            setShowSearchResults(true);
        } catch {
            setSearchResults([]);
        }
    };

    const handleSearchResultClick = (noteId) => {
        setSearchQuery("");
        setShowSearchResults(false);
        setMobileMenuOpen(false);
        navigate(`/notes/${noteId}`);
    };

    const handleNotificationClick = async (n) => {
        setShowNotifications(false);
        setMobileMenuOpen(false);
        navigate(`/notes/${n.noteId}`);
        try {
            await api.post(`/notes/notifications/${n.id}/read`);
            loadNotifications();
        } catch (err) {
            console.error("Failed to mark notification as read", err);
        }
    };



    return (
        <>
            <nav className="sticky top-0 z-50 bg-white shadow-sm border-b border-stone-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <Link
                                to={isAuthenticated ? "/dashboard" : "/"}
                                className="flex items-center gap-2 text-xl font-bold text-amber-600 hover:text-amber-500 transition"
                            >
                                <StickyNote className="w-5 h-5" />
                                NotesApp
                            </Link>
                        </div>



                        {/* Desktop search */}
                        {isAuthenticated && !isSharedMode && (
                            <div ref={searchRefDesktop} className="hidden md:block flex-1 max-w-md mx-4 relative">
                                <input
                                    type="text"
                                    placeholder="Search notes..."
                                    value={searchQuery}
                                    onChange={handleSearch}
                                    onFocus={() => searchQuery && setShowSearchResults(true)}
                                    className="w-full px-4 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 bg-stone-50 text-stone-800"
                                />
                                {showSearchResults && searchResults.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                                        {searchResults.map((note) => (
                                            <div
                                                key={note.id}
                                                onClick={() => handleSearchResultClick(note.id)}
                                                className="p-3 hover:bg-amber-50 cursor-pointer border-b border-stone-100 last:border-b-0"
                                            >
                                                <h4 className="font-semibold text-sm text-stone-800">{note.title}</h4>
                                                <p className="text-xs text-stone-500 line-clamp-2 mt-1">{note.content || "No content"}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Desktop nav items */}
                        <div className="hidden md:flex items-center gap-4">
                            {isAuthenticated ? (
                                <>
                                    {!isSharedMode && (
                                        <>
                                            <Link
                                                to="/dashboard"
                                                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${location.pathname === "/dashboard"
                                                    ? "text-amber-800 bg-amber-100"
                                                    : "text-stone-600 hover:text-amber-700 hover:bg-amber-50"
                                                    }`}
                                            >
                                                Dashboard
                                            </Link>

                                            <Link
                                                to="/notes"
                                                className={`px-3 py-2 rounded-lg text-sm font-medium transition ${location.pathname === "/notes"
                                                    ? "text-amber-800 bg-amber-100"
                                                    : "text-stone-600 hover:text-amber-700 hover:bg-amber-50"
                                                    }`}
                                            >
                                                All Notes
                                            </Link>

                                            <div className="relative" ref={notificationRefDesktop}>
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation();
                                                        await loadNotifications();
                                                        setShowNotifications((p) => !p);
                                                    }}
                                                    className="relative px-3 py-2 rounded-lg text-sm font-medium text-stone-600 hover:text-amber-700 hover:bg-amber-50"
                                                >
                                                    <Bell className="w-5 h-5" />
                                                    {unreadCount > 0 && (
                                                        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-semibold">
                                                            {unreadCount}
                                                        </span>
                                                    )}
                                                </button>

                                                {showNotifications && (
                                                    <div className="absolute right-0 mt-2 w-72 bg-white border border-stone-200 rounded-lg shadow-lg z-[100] max-h-80 overflow-y-auto">
                                                        {notifications.length === 0 && (
                                                            <div className="p-3 text-sm text-stone-500">No notifications</div>
                                                        )}
                                                        {notifications.map((n) => (
                                                            <div
                                                                key={n.id}
                                                                onClick={() => handleNotificationClick(n)}
                                                                className={`p-3 text-sm cursor-pointer hover:bg-amber-50 border-b border-stone-100 last:border-b-0 ${!n.isRead ? "bg-amber-50/60" : ""
                                                                    }`}
                                                            >
                                                                <div className="flex items-start justify-between">
                                                                    <div className="font-medium text-stone-800">{n.title}</div>
                                                                    <span className="text-[10px] text-red-400 font-medium whitespace-nowrap ml-2">1d expire</span>
                                                                </div>
                                                                <div className="flex items-center justify-between text-xs text-stone-500 mt-1">
                                                                    <div className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {n.ownerName} shared with you</div>
                                                                    <div className="text-[10px] whitespace-nowrap ml-2">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {!isSharedMode && (
                                        <div className="relative" ref={userMenuRef}>
                                            <button
                                                onClick={() => setShowUserMenu((p) => !p)}
                                                className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center hover:bg-amber-600 transition font-semibold text-sm"
                                                title={userInfo?.name || "User"}
                                            >
                                                {userInfo?.name ? userInfo.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                                            </button>

                                            {showUserMenu && (
                                                <div className="absolute right-0 mt-2 w-64 bg-white border border-stone-200 rounded-xl shadow-lg z-50 overflow-hidden">
                                                    <div className="px-4 py-4 border-b border-stone-100">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-base flex-shrink-0">
                                                                {userInfo?.name ? userInfo.name.charAt(0).toUpperCase() : "?"}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-semibold text-stone-800 text-sm truncate">{userInfo?.name || "User"}</p>
                                                                <p className="text-xs text-stone-400 truncate">{userInfo?.email || ""}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="p-2 space-y-1">
                                                        <button
                                                            onClick={() => { setShowUserMenu(false); setShowDeleteConfirm(true); }}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg transition-all duration-200 font-medium"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            Delete Account
                                                        </button>
                                                        <button
                                                            onClick={() => { setShowUserMenu(false); handleLogout(); }}
                                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-500 hover:text-white rounded-lg transition-all duration-200 font-medium"
                                                        >
                                                            <LogOut className="w-4 h-4" />
                                                            Logout
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <Link to="/login" className="px-3 py-2 rounded-lg text-sm font-medium text-stone-600 hover:text-amber-700 hover:bg-amber-50 transition">
                                        Login
                                    </Link>
                                    <Link to="/register" className="px-4 py-2 rounded-lg text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 transition shadow-sm">
                                        Register
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* Mobile: bell + hamburger */}
                        <div className="flex md:hidden items-center gap-2">
                            {isAuthenticated && !isSharedMode && (
                                <div className="relative" ref={notificationRefMobile}>
                                    <button
                                        onClick={async () => {
                                            await loadNotifications();
                                            setShowNotifications((p) => !p);
                                        }}
                                        className="relative p-2 rounded-lg text-stone-600 hover:text-amber-700 hover:bg-amber-50"
                                    >
                                        <Bell className="w-5 h-5" />
                                        {unreadCount > 0 && (
                                            <span className="absolute top-0 right-0 min-w-[16px] h-[16px] px-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-semibold">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </button>

                                    {showNotifications && (
                                        <div className="absolute right-0 mt-2 w-72 bg-white border border-stone-200 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                                            {notifications.length === 0 && (
                                                <div className="p-3 text-sm text-stone-500">No notifications</div>
                                            )}
                                            {notifications.map((n) => (
                                                <div
                                                    key={n.id}
                                                    onClick={() => handleNotificationClick(n)}
                                                    className={`p-3 text-sm cursor-pointer hover:bg-amber-50 border-b border-stone-100 last:border-b-0 ${!n.isRead ? "bg-amber-50/60" : ""}`}
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="font-medium text-stone-800">{n.title}</div>
                                                        <span className="text-[10px] text-red-400 font-medium whitespace-nowrap ml-2">1d expire</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-xs text-stone-500 mt-1">
                                                        <div className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {n.ownerName} shared with you</div>
                                                        <div className="text-[10px] whitespace-nowrap ml-2">{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            <button
                                onClick={() => setMobileMenuOpen((p) => !p)}
                                className="p-2 rounded-lg text-stone-600 hover:text-amber-700 hover:bg-amber-50"
                            >
                                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile dropdown menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden border-t border-stone-200 bg-white">
                        <div className="px-4 py-3 space-y-3">

                            {isAuthenticated && !isSharedMode && (
                                <>
                                    <div ref={searchRefMobile} className="relative">
                                        <input
                                            type="text"
                                            placeholder="Search notes..."
                                            value={searchQuery}
                                            onChange={handleSearch}
                                            onFocus={() => searchQuery && setShowSearchResults(true)}
                                            className="w-full px-4 py-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400 bg-stone-50 text-stone-800"
                                        />
                                        {showSearchResults && searchResults.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                                                {searchResults.map((note) => (
                                                    <div
                                                        key={note.id}
                                                        onClick={() => handleSearchResultClick(note.id)}
                                                        className="p-3 hover:bg-amber-50 cursor-pointer border-b border-stone-100 last:border-b-0"
                                                    >
                                                        <h4 className="font-semibold text-sm text-stone-800">{note.title}</h4>
                                                        <p className="text-xs text-stone-500 line-clamp-2 mt-1">{note.content || "No content"}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    <Link
                                        to="/dashboard"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`block px-3 py-2 rounded-lg text-sm font-medium transition ${location.pathname === "/dashboard"
                                            ? "text-amber-800 bg-amber-100"
                                            : "text-stone-600 hover:text-amber-700 hover:bg-amber-50"
                                            }`}
                                    >
                                        Dashboard
                                    </Link>

                                    <Link
                                        to="/notes"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`block px-3 py-2 rounded-lg text-sm font-medium transition ${location.pathname === "/notes"
                                            ? "text-amber-800 bg-amber-100"
                                            : "text-stone-600 hover:text-amber-700 hover:bg-amber-50"
                                            }`}
                                    >
                                        All Notes
                                    </Link>
                                </>
                            )}

                            {isAuthenticated ? (
                                <div className="border-t border-stone-100 pt-3">
                                    <div className="flex items-center gap-3 px-3 py-2">
                                        <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                                            {userInfo?.name ? userInfo.name.charAt(0).toUpperCase() : "?"}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-stone-800 text-sm truncate">{userInfo?.name || "User"}</p>
                                            <p className="text-xs text-stone-400 truncate">{userInfo?.email || ""}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { setMobileMenuOpen(false); setShowDeleteConfirm(true); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-600 hover:bg-stone-100 rounded-lg font-medium mt-1"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete Account
                                    </button>
                                    <button
                                        onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg font-medium"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Logout
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="block px-3 py-2 rounded-lg text-sm font-medium text-stone-600 hover:text-amber-700 hover:bg-amber-50">
                                        Login
                                    </Link>
                                    <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="block px-4 py-2 rounded-lg text-sm font-semibold bg-amber-500 text-white hover:bg-amber-600 text-center">
                                        Register
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </nav>

            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100]">
                    <div className="bg-white rounded-2xl shadow-2xl w-[95%] max-w-md p-6 border border-red-200">
                        <h3 className="text-xl font-bold text-red-600 mb-2">Delete Account</h3>
                        <p className="text-stone-600 text-sm mb-1">Are you sure you want to delete your account?</p>
                        <p className="text-stone-400 text-xs mb-6">This will permanently delete all your notes, folders, and data. This action cannot be undone.</p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-sm border border-stone-300 rounded-xl hover:bg-stone-50 transition text-stone-600" disabled={deleting}>Cancel</button>
                            <button onClick={handleDeleteAccount} disabled={deleting} className="px-5 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600 transition shadow-sm font-semibold disabled:opacity-50">{deleting ? "Deleting..." : "Delete Account"}</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Navbar;
