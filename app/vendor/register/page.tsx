"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { Store, Phone, MapPin, ArrowLeft, Package } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export default function VendorRegisterPage() {
    const router = useRouter();
    const { user, role, loading } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form fields
    const [businessName, setBusinessName] = useState("");
    const [contactName, setContactName] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [providedProducts, setProvidedProducts] = useState<string[]>([]);

    const productOptions = ["Medicine", "Wheelchair", "Specs", "Walking Sticks", "Other"];

    useEffect(() => {
        const checkStatus = async () => {
            if (user) {
                const vendorDoc = await getDoc(doc(db, "vendors", user.uid));
                if (vendorDoc.exists()) {
                    router.push("/vendor/dashboard");
                }
            }
        };
        if (!loading) {
             checkStatus();
        }
    }, [user, loading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!user) {
            alert("Please log in to register as a specific vendor.");
            router.push("/login");
            return;
        }

        if (providedProducts.length === 0) {
            alert("Please select at least one product you provide.");
            return;
        }

        setIsSubmitting(true);
        try {
            await setDoc(doc(db, "vendors", user.uid), {
                userId: user.uid,
                businessName,
                contactName,
                email: user.email,
                phone,
                address,
                providedProducts,
                createdAt: serverTimestamp()
            });

            alert("Vendor registration complete! Welcome to the Seva Trust vendor network.");
            router.push("/vendor/dashboard");
        } catch (error) {
            console.error("Vendor registration error:", error);
            alert("There was an error completing your registration. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return null;

    if (role !== "vendor") {
        return (
            <div className="min-h-screen pt-24 text-center">
                <p>Only users registered as vendors can access this page.</p>
                <Link href="/" className="text-teal-600 underline mt-4 block">Return Home</Link>
            </div>
        );
    }

    return (
        <main className="min-h-screen bg-slate-50 font-sans pb-16">
            <Navbar />

            <div className="pt-24 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-6">
                    <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-teal-600 transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Home
                    </Link>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="bg-teal-600 px-8 py-8 text-white relative overflow-hidden">
                        <div className="relative z-10 flex items-center">
                            <Store className="w-10 h-10 mr-4 opacity-80" />
                            <div>
                                <h1 className="text-2xl font-heading font-bold mb-1">Vendor Onboarding</h1>
                                <p className="text-teal-50 text-sm">Join us to provide essential supplies for the elderly.</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">Business Details</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Business Name</label>
                                    <input type="text" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. HealthCare Pharmacy" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Contact Person Name</label>
                                    <input type="text" required value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="John Doe" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Phone Number</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Phone className="h-4 w-4 text-slate-400" />
                                        </div>
                                        <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your contact number" className="w-full pl-10 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Full Address</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 pt-3 pointer-events-none">
                                            <MapPin className="h-4 w-4 text-slate-400" />
                                        </div>
                                        <textarea rows={2} required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Shop address..." className="w-full pl-10 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900"></textarea>
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2 mt-8 flex items-center">
                                <Package className="w-5 h-5 mr-2 text-teal-600" />
                                Products You Provide
                            </h3>
                            <p className="text-sm text-slate-500">Select all categories you can supply to the NGO.</p>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {productOptions.map((product) => (
                                    <label key={product} className="flex items-center space-x-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 bg-white">
                                        <input 
                                            type="checkbox" 
                                            checked={providedProducts.includes(product)}
                                            onChange={(e) => {
                                                if (e.target.checked) setProvidedProducts([...providedProducts, product]);
                                                else setProvidedProducts(providedProducts.filter(p => p !== product));
                                            }}
                                            className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500" 
                                        />
                                        <span className="text-sm font-medium text-slate-700">{product}</span>
                                    </label>
                                ))}
                            </div>

                            <div className="pt-8 text-right">
                                <Button type="submit" size="lg" className="bg-teal-600 hover:bg-teal-700 text-white min-w-[200px]" disabled={isSubmitting}>
                                    {isSubmitting ? "Registering..." : "Complete Registration"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            <Footer />
        </main>
    );
}
