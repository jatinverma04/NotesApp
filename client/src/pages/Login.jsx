import { Link } from "react-router-dom";
import LoginForm from "../components/auth/LoginForm";

const Login = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl w-full max-w-md border border-stone-200">
                <h2 className="text-2xl font-bold text-center text-amber-600 mb-8">Welcome Back</h2>
                <LoginForm />
                <p className="mt-6 text-center text-stone-600 dark:text-stone-400 text-sm">
                    Don't have an account?{" "}
                    <Link to="/register" className="text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 font-semibold hover:underline">
                        Register
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
