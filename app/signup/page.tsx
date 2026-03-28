"use client";

import Link from "next/link";
import { Heart, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export default function SignUpPage() {
    const router = useRouter();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [role, setRole] = useState("local");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            if (userCredential.user) {
                await updateProfile(userCredential.user, { displayName: name });
                
                // Save role to Firestore
                await setDoc(doc(db, "users", userCredential.user.uid), {
                    role: role,
                    email: email,
                    name: name
                });
            }
            
            if (role === "local") {
                router.push("/campaigns");
            } else if (role === "volunteer") {
                router.push("/volunteer/register");
            } else if (role === "vendor") {
                router.push("/vendor/register");
            }
        } catch (err: any) {
            setError(err.message || "Failed to create an account. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pt-20 flex items-center justify-center bg-slate-50 px-4 relative">
            <Link href="/" className="absolute top-8 left-8 flex items-center text-sm font-medium text-slate-500 hover:text-teal-600 transition-colors">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Home
            </Link>
            <div className="max-w-md w-full mx-auto p-8 bg-white rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-teal-50 rounded-full opacity-50 blur-xl"></div>
                <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-orange-50 rounded-full opacity-50 blur-xl"></div>

                <div className="relative text-center mb-8">
                    <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center text-white mx-auto mb-4 shadow-sm">
                        <Heart className="w-6 h-6 fill-current" />
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 font-heading">Create Account</h1>
                    <p className="text-sm text-slate-500 mt-2">Join Seva Trust to make a difference</p>
                </div>

                <form className="relative space-y-5" onSubmit={handleSignUp}>
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="name">
                            Full Name
                        </label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors text-slate-800"
                            placeholder="Enter your full name"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email">
                            Email
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors text-slate-800"
                            placeholder="Enter your email"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">
                            Password
                        </label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors text-slate-800"
                            placeholder="Create a password (min 6 chars)"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="role">
                            Join as
                        </label>
                        <select
                            id="role"
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="w-full px-4 py-2 text-slate-700 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-colors bg-white cursor-pointer"
                        >
                            <option value="local">Local User</option>
                            <option value="volunteer">Volunteer</option>
                            <option value="vendor">Vendor</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg transition-colors shadow-sm mt-6 flex justify-center items-center cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? "Creating Account..." : "Sign Up"}
                    </button>
                </form>

                <div className="relative mt-6 text-center text-sm text-slate-500">
                    Already have an account?{" "}
                    <Link href="/login" className="text-teal-600 hover:text-teal-700 hover:underline font-medium transition-colors">
                        Sign In
                    </Link>
                </div>
            </div>
        </div>
    );
}
