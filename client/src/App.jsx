import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import NotesList from "./pages/NotesList";
import NoteEditor from "./pages/NoteEditor";
import SharedNote from "./pages/SharedNote";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { AuthProvider, useAuth } from "./context/AuthContext";


const HomeRoute = () => {
  return <LandingPage />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  // If logged in, redirect to dashboard, not /
  return user ? <Navigate to="/dashboard" replace /> : children;
};

// Wrapper ensuring Navbar is not shown on LandingPage if we want strict separation, 
// but user said "Existing Navbar... break nahi hona chahiye".
// "Logged-in user ko hero page dikhai nahi dena chahiye".
// If not logged in, they see LandingPage. LandingPage has its own header?
// Yes, LandingPage.jsx has absolute ThemeToggle.
// Navbar.jsx has `if (isAuthPage) return null;`
// We should add `LandingPage` routes to `isAuthPage` check or similar.
// Actually, `LandingPage` replaces `Login/Register`.
// So if route is `/` and not logged in, we show `LandingPage`.
// Navbar should probably NOT show on LandingPage because LandingPage has its own layout.
// I'll update Navbar to hide on `/` if not logged in.

function AppContent() {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans transition-colors duration-300">
      <Navbar />
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/shared/:id" element={<SharedNote />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/notes" element={<NotesList />} />
          <Route path="/notes/:id" element={<NoteEditor />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
