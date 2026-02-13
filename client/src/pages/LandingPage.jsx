import { useState, useEffect } from "react";
import { StickyNote, CheckCircle, Brain, Share2, Zap } from "lucide-react";
import LoginForm from "../components/auth/LoginForm";
import RegisterForm from "../components/auth/RegisterForm";


const LandingPage = ({ defaultTab = "login" }) => {
    const [activeTab, setActiveTab] = useState(defaultTab);

    // Update tab if defaultTab prop changes (e.g. navigation from /login to /register)
    useEffect(() => {
        setActiveTab(defaultTab);
    }, [defaultTab]);

    return (

        <div className="min-h-screen bg-stone-50 transition-colors duration-300 flex flex-col items-center justify-center relative">
            {/* Hero Content */}
            <div className="px-6 sm:px-12 lg:px-20 py-12 text-center max-w-4xl mx-auto">
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="p-4 bg-amber-500 rounded-3xl shadow-lg shadow-amber-500/20">
                        <StickyNote className="w-10 h-10 text-white" />
                    </div>
                </div>

                <h1 className="text-4xl sm:text-6xl font-extrabold text-stone-900 leading-tight mb-8 tracking-tight">
                    Capture your thoughts, <br className="hidden sm:block" />
                    <span className="text-amber-500">unleash your creativity.</span>
                </h1>

                <p className="text-xl text-stone-600 mb-12 leading-relaxed max-w-2xl mx-auto">
                    A powerful, beautifully designed workspace for your notes, ideas, and collaborations.
                    Simple yet robust, built for modern thinkers.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left">
                    {[
                        { icon: Brain, text: "Smart Organization" },
                        { icon: Zap, text: "Instant Search" },
                        { icon: Share2, text: "Real-time Collaboration" },
                        { icon: CheckCircle, text: "Cloud Synced" }
                    ].map((feature, idx) => (
                        <div key={idx} className="group flex flex-col items-center sm:items-start gap-3 p-4 rounded-2xl bg-white border border-stone-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all duration-300">
                            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-200 transition-colors">
                                <feature.icon className="w-5 h-5 text-amber-600" />
                            </div>
                            <span className="font-semibold text-stone-800">{feature.text}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
