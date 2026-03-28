"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { Package, Users, ShieldAlert, ArrowRight, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { useEffect } from "react";

export default function AdminDashboard() {
    const { role, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && role !== "admin") {
            router.push("/admin/login");
        }
    }, [role, loading, router]);

    if (loading || role !== "admin") return null;

    return (
        <main className="min-h-screen flex flex-col bg-slate-50 font-sans">
            <Navbar />

            <div className="pt-24 pb-16 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-heading font-bold text-slate-900 mb-2">Admin Dashboard</h1>
                    <p className="text-slate-600">
                        Welcome to the administration panel. Manage donations, volunteers, and campaigns here.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    <Link href="/admin/donations" className="block outline-none">
                        <Card className="hover:border-teal-400 cursor-pointer transition-all border-slate-200 shadow-sm hover:shadow-md">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-teal-50 text-teal-600 rounded-lg">
                                        <Package className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">Incoming Donations</h2>
                                        <p className="text-sm text-slate-500">Review and approve physical donation pledges</p>
                                    </div>
                                </div>
                                <div className="inline-flex items-center text-sm font-semibold text-teal-600">
                                    View Donations <ArrowRight className="w-4 h-4 ml-1" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                    
                    <Link href="/admin/volunteers" className="block outline-none">
                        <Card className="hover:border-indigo-400 cursor-pointer transition-all border-slate-200 shadow-sm hover:shadow-md">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
                                        <Users className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">Volunteer Management</h2>
                                        <p className="text-sm text-slate-500">Verify new volunteers and appoint them</p>
                                    </div>
                                </div>
                                <div className="inline-flex items-center text-sm font-semibold text-indigo-600">
                                    Manage Volunteers <ArrowRight className="w-4 h-4 ml-1" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                    <Link href="/admin/orders" className="block outline-none">
                        <Card className="hover:border-amber-400 cursor-pointer transition-all border-slate-200 shadow-sm hover:shadow-md">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
                                        <ShoppingCart className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">Vendor Orders</h2>
                                        <p className="text-sm text-slate-500">Book supplies from vendors and manage order history</p>
                                    </div>
                                </div>
                                <div className="inline-flex items-center text-sm font-semibold text-amber-600">
                                    Manage Orders <ArrowRight className="w-4 h-4 ml-1" />
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>
            </div>

            <Footer />
        </main>
    );
}
