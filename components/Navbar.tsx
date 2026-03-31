"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, X, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function Navbar() {
    const { user, role, loading } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [vStatus, setVStatus] = useState<string | null>(null);
    const pathname = usePathname();
    const router = useRouter();

    // Still checking volunteerStatus from localStorage temporarily if needed, 
    // or this should also ideally move to Firestore. 
    // We'll keep it as is since instructions only specified migrating "role".
    useState(() => {
        if (typeof window !== "undefined") {
            setVStatus(localStorage.getItem("volunteerStatus"));
        }
    });

    let navLinks = [
        { name: "Campaigns", href: "/campaigns" },
        { name: "Donate", href: "/donate" },
        { name: "Contact", href: "/contact" },
    ];

    if (role === "local") {
        navLinks = [
            { name: "Campaigns", href: "/campaigns" },
            { name: "Donate", href: "/donate" },
            { name: "My Activity", href: "/my-activity" },
            { name: "Contact", href: "/contact" },
        ];
    } else if (role === "admin") {
        navLinks = [
            { name: "Campaigns", href: "/campaigns" },
            { name: "Incoming Donations", href: "/admin/donations" },
            { name: "Volunteers", href: "/admin/volunteers" },
            { name: "Vendor Orders", href: "/admin/orders" },
        ];
    } else if (role === "volunteer") {
        navLinks = [
            { name: "Current Events", href: "/campaigns" },
            { name: "Dashboard", href: "/volunteer" },
            { name: "Donate", href: "/donate" },
            { name: "Contact", href: "/contact" },
        ];
    } else if (role === "vendor") {
        navLinks = [
            { name: "Dashboard", href: "/vendor/dashboard" },
            { name: "Campaigns", href: "/campaigns" },
            { name: "Donate", href: "/donate" },
            { name: "Contact", href: "/contact" },
        ];
    }

    const handleLogout = async () => {
        try {
            await signOut(auth);
            localStorage.removeItem("volunteerStatus"); // Clear anything auxiliary
            router.push("/");
        } catch (error) {
            console.error("Logout error", error);
        }
    };

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-zinc-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    {/* Logo */}
                    <Link href="/" className="flex items-center space-x-2 group">
                        <div className="w-10 h-10 bg-teal-600 rounded-full flex items-center justify-center text-white">
                            <Heart className="w-6 h-6 fill-current" />
                        </div>
                        <div className="flex flex-col">
                            <span className="font-heading font-bold text-2xl text-slate-800 leading-tight group-hover:text-teal-600 transition-colors">
                                Shantai
                            </span>
                            <span className="text-sm text-teal-600 font-medium uppercase tracking-wide">
                                old age home
                            </span>
                        </div>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden md:flex items-center space-x-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.name}
                                href={link.href}
                                className={`text-sm font-medium transition-colors hover:text-teal-600 ${pathname === link.href ? "text-teal-600" : "text-slate-600"
                                    }`}
                            >
                                {link.name}
                            </Link>
                        ))}

                        <div className="h-6 w-px bg-zinc-200 mx-2" />

                        <div className="flex items-center space-x-3">
                            {/* DEMO DEBUG PILL */}
                            <div className="text-xs font-mono bg-amber-100 text-amber-800 px-2 py-1 rounded">
                                Role: {role || "null"} | {user?.email || "No User"}
                            </div>

                            {loading ? (
                                <div className="h-9 w-20 bg-slate-200 animate-pulse rounded-full"></div>
                            ) : user ? (
                                <button
                                    onClick={handleLogout}
                                    className="px-5 py-2 text-sm font-medium text-white bg-slate-600 rounded-full hover:bg-slate-700 transition-colors shadow-sm hover:shadow-md cursor-pointer"
                                >
                                    Logout
                                </button>
                            ) : (
                                <Link
                                    href="/login"
                                    className="px-5 py-2 text-sm font-medium text-white bg-teal-600 rounded-full hover:bg-teal-700 transition-colors shadow-sm hover:shadow-md"
                                >
                                    Login
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className="text-slate-600 hover:text-teal-600 focus:outline-none"
                        >
                            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden bg-white border-b border-zinc-100 overflow-hidden"
                    >
                        <div className="px-4 pt-2 pb-6 space-y-2">
                            {/* DEMO DEBUG PILL */}
                            <div className="text-xs font-mono bg-amber-100 text-amber-800 px-3 py-2 rounded mb-2 text-center">
                                Role: {role || "null"} | {user?.email || "No User"}
                            </div>

                            {navLinks.map((link) => (
                                <Link
                                    key={link.name}
                                    href={link.href}
                                    className="block px-3 py-2 text-base font-medium text-slate-600 hover:text-teal-600 hover:bg-teal-50 rounded-md"
                                    onClick={() => setIsOpen(false)}
                                >
                                    {link.name}
                                </Link>
                            ))}
                            <div className="h-px bg-zinc-100 my-4" />
                            <div className="px-2">
                                {loading ? (
                                    <div className="h-9 w-full bg-slate-200 animate-pulse rounded-md"></div>
                                ) : user ? (
                                    <button
                                        onClick={() => {
                                            setIsOpen(false);
                                            handleLogout();
                                        }}
                                        className="w-full block text-center px-4 py-2 text-sm font-medium text-white bg-slate-600 rounded-md shadow-sm hover:bg-slate-700 cursor-pointer"
                                    >
                                        Logout
                                    </button>
                                ) : (
                                    <Link
                                        href="/login"
                                        className="block text-center px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-md shadow-sm hover:bg-teal-700"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        Login
                                    </Link>
                                )}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </nav>
    );
}
