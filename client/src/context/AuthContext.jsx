import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            api.get("/users/me")
                .then((res) => setUser(res.data))
                .catch(() => {
                    localStorage.removeItem("token");
                    setUser(null);
                })
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [navigate]); // Add navigate to dependency if needed, usually empty [] is fine but warning.

    const login = async (email, password) => {
        const { data } = await api.post("/auth/login", { email, password });
        localStorage.setItem("token", data.token);
        // We need to fetch user details if login response doesn't have them, 
        // or usage assumes we have them. 
        // LoginForm used /auth/login. AuthContext used /users/login (wrong).
        // Let's assume /auth/login returns { token, user }?
        // If not, we might need to fetch /users/me.
        // Step 840 AuthContext.login tried `setUser(data.user)`.
        // Let's assume data.user exists or fetch me.
        if (data.user) {
            setUser(data.user);
        } else {
            const res = await api.get("/users/me");
            setUser(res.data);
        }
        navigate("/dashboard");
    };

    const register = async (name, email, password) => {
        const { data } = await api.post("/auth/register", { name, email, password });
        localStorage.setItem("token", data.token);
        // Assume register returns token and user? 
        // If not, fetch me.
        if (data.user) {
            setUser(data.user);
        } else {
            const res = await api.get("/users/me");
            setUser(res.data);
        }
        navigate("/dashboard");
    };

    const logout = () => {
        localStorage.removeItem("token");
        setUser(null);
        navigate("/");
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
