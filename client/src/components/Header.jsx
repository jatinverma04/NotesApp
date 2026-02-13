import { useNavigate } from "react-router-dom";

const Header = ({ title = "Notes", onCreateNote }) => {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <header className="w-full h-14 px-6 flex items-center justify-between border-b bg-white">
      {/* Left */}
      <h1 className="text-lg font-semibold text-gray-800">
        {title}
      </h1>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {onCreateNote && (
          <button
            onClick={onCreateNote}
            className="px-4 py-1.5 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 transition"
          >
            New Note
          </button>
        )}

        <button
          onClick={logout}
          className="px-4 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition"
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Header;
