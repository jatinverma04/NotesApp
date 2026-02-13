import { Link } from "react-router-dom";
import RegisterForm from "../components/auth/RegisterForm";

const Register = () => {
    return (
        <div className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl w-full max-w-md border border-stone-200">
                <h2 className="text-2xl font-bold text-center text-amber-600 mb-8">Create Account</h2>
                <RegisterForm />
                <p className="mt-6 text-center text-stone-600 dark:text-stone-400 text-sm">
                    Already have an account?{" "}
                    <Link to="/login" className="text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 font-semibold hover:underline">
                        Login
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
