"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/Card";
import { Shirt, HeartHandshake, Utensils, Apple, PenTool, Box, CheckCircle, X, ArrowLeft, Trash2 } from "lucide-react";
import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "@/lib/AuthContext";
import { useEffect } from "react";

export default function DonationPortal() {
    const categories = [
        { name: "Clothes", icon: Shirt, color: "text-blue-500", bg: "bg-blue-50" },
        { name: "Visit", icon: HeartHandshake, color: "text-purple-500", bg: "bg-purple-50" },
        { name: "Utensils", icon: Utensils, color: "text-green-500", bg: "bg-green-50" },
        { name: "Food", icon: Apple, color: "text-red-500", bg: "bg-red-50" },
        { name: "Stationery", icon: PenTool, color: "text-yellow-500", bg: "bg-yellow-50" },
        { name: "Other", icon: Box, color: "text-slate-500", bg: "bg-slate-50" },
    ];

    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { user } = useAuth();
    const [myDonations, setMyDonations] = useState<any[]>([]);

    useEffect(() => {
        if (!user) {
            setMyDonations([]);
            return;
        }

        const q = query(
            collection(db, "donations"),
            where("userId", "==", user.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const donationsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Sort by createdAt descending client-side to avoid Firebase index requirement
            donationsData.sort((a: any, b: any) => {
                const dateA = a.createdAt?.toMillis() || 0;
                const dateB = b.createdAt?.toMillis() || 0;
                return dateB - dateA;
            });

            const visibleDonations = donationsData.filter((d: any) => !d.hiddenFromPledges);
            setMyDonations(visibleDonations);
        }, (error) => {
            console.error("Error fetching user donations:", error);
        });

        return () => unsubscribe();
    }, [user]);

    // Form state
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [description, setDescription] = useState("");
    const [quantity, setQuantity] = useState("");
    const [notes, setNotes] = useState("");

    const handleDeletePledge = async (id: string) => {
        if (confirm("Are you sure you want to remove this pledge from your recent pledges view?")) {
            try {
                await updateDoc(doc(db, "donations", id), { hiddenFromPledges: true });
            } catch (error) {
                console.error("Error hiding pledge:", error);
                alert("Failed to remove pledge. Please try again.");
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "donations"), {
                userId: user?.uid || "guest",
                category: selectedCategory,
                name,
                phone,
                email,
                description,
                quantity,
                notes,
                status: "pending",
                createdAt: serverTimestamp()
            });
            alert("Your pledge has been received! Our team will contact you shortly.");
            setSelectedCategory(null);
            setName("");
            setPhone("");
            setEmail("");
            setDescription("");
            setQuantity("");
            setNotes("");
        } catch (error) {
            console.error("Error submitting donation:", error);
            alert("There was an error submitting your pledge. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="min-h-screen bg-white font-sans">
            <Navbar />

            <div className="pt-24 pb-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-6">
                    <Link href="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-teal-600 transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Home
                    </Link>
                </div>
                <div className="mb-16 bg-gradient-to-r from-teal-700 to-emerald-700 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
                    <div className="relative z-10 max-w-2xl">
                        <h1 className="text-3xl sm:text-4xl font-heading font-extrabold mb-3 tracking-tight">Donation Portal</h1>
                        <p className="text-teal-50 text-base sm:text-lg font-medium">Your contributions make a real difference. Select a category below to pledge physical goods to those in need.</p>
                    </div>
                </div>

                {/* Category Cards */}
                <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mb-16 max-w-5xl mx-auto">
                    {categories.map((cat, idx) => (
                        <div
                            key={idx}
                            onClick={() => setSelectedCategory(cat.name)}
                            className={`flex flex-col items-center justify-center cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md rounded-xl w-[140px] h-[100px] sm:w-[150px] sm:h-[110px] ${cat.bg} border border-[#00000008] ${selectedCategory === cat.name ? 'ring-2 ring-teal-500 shadow-sm' : ''}`}
                        >
                            <cat.icon className={`w-8 h-8 sm:w-10 sm:h-10 mb-2 sm:mb-3 ${cat.color}`} strokeWidth={1.5} />
                            <span className={`text-xs sm:text-sm font-bold ${cat.color} brightness-90`}>{cat.name}</span>
                        </div>
                    ))}
                </div>

                {/* My Donations Section */}
                {user && myDonations.length > 0 && (
                    <div className="mb-16 bg-white rounded-2xl p-8 border border-slate-200 shadow-sm max-w-5xl mx-auto">
                        <h2 className="text-2xl font-bold text-slate-800 mb-6 font-heading">My Recent Pledges</h2>
                        <div className="space-y-4">
                            {myDonations.map((donation) => (
                                <div key={donation.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 rounded-xl border border-slate-100 bg-slate-50 gap-4">
                                    <div>
                                        <h3 className="font-bold text-slate-800">{donation.category}</h3>
                                        <p className="text-sm text-slate-600">
                                            {donation.category === "Visit" 
                                                ? `Date: ${donation.description} • Time: ${donation.quantity}`
                                                : `${donation.description} • Qty: ${donation.quantity}`
                                            }
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            {donation.createdAt?.toDate ? donation.createdAt.toDate().toLocaleDateString() : 'Just now'}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {donation.status === "pending" && (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 shadow-sm border border-amber-200">
                                                Pending Review
                                            </span>
                                        )}
                                        {donation.status === "accepted" && (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 shadow-sm border border-emerald-200">
                                                <CheckCircle className="w-3 h-3 mr-1" /> Accepted
                                            </span>
                                        )}
                                        {donation.status === "rejected" && (
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 shadow-sm border border-red-200">
                                                <X className="w-3 h-3 mr-1" /> Declined
                                            </span>
                                        )}
                                        <button
                                            onClick={() => handleDeletePledge(donation.id)}
                                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                            title="Delete Pledge"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* How Help Section */}
                <div className="bg-teal-50 rounded-2xl p-8 md:p-12 border border-teal-100 mt-16 max-w-5xl mx-auto">
                    <h2 className="text-xl font-bold text-slate-800 mb-2">How Your Donations Help</h2>
                    <p className="text-slate-600 mb-8">Every contribution counts towards building a better community</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                        {[
                            { step: "1", title: "Choose Category", desc: "Select the type of items you'd like to donate" },
                            { step: "3", title: "We'll Contact You", desc: "Our team will reach out to arrange collection" },
                            { step: "2", title: "Fill Details", desc: "Provide information about your donation" },
                            { step: "4", title: "Make an Impact", desc: "Your items help those who need them most" },
                        ].map((item, idx) => (
                            <div key={idx} className="flex items-start gap-4">
                                <div className="w-8 h-8 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                                    {item.step}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg mb-1">{item.title}</h3>
                                    <p className="text-slate-600 text-sm">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Donation Modal */}
                {selectedCategory && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                            {/* Modal Header */}
                            <div className="flex justify-between items-start p-6 pb-2 border-b border-slate-100">
                                <div>
                                    <div className="flex items-center space-x-2">
                                        {(() => {
                                            const cat = categories.find(c => c.name === selectedCategory);
                                            const Icon = cat?.icon || Box;
                                            return <Icon className="w-5 h-5 text-slate-700" />;
                                        })()}
                                        <h2 className="text-xl font-bold text-slate-800">Donate {selectedCategory}</h2>
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {selectedCategory === "Visit" 
                                            ? "Fill in your details and when you'd like to visit" 
                                            : "Fill in your details and we'll contact you to arrange collection"}
                                    </p>
                                </div>
                                <button onClick={() => setSelectedCategory(null)} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Form */}
                            <form className="p-6 space-y-4" onSubmit={handleSubmit}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-700">Your Name</label>
                                        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-sm font-semibold text-slate-700">Phone Number</label>
                                        <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 text-sm" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-slate-700">Email Address</label>
                                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 text-sm" />
                                </div>

                                {selectedCategory === "Visit" ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700">Preferred Date</label>
                                            <input type="date" required value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 text-sm" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700">Preferred Time</label>
                                            <input type="time" required value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 text-sm" />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700">Item Description</label>
                                            <input type="text" required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., Winter jackets, textbooks" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 text-sm" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-semibold text-slate-700">Approximate Quantity</label>
                                            <input type="text" required value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="e.g., 5 items, 2 boxes" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 text-sm" />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1.5 pb-2">
                                    <label className="text-sm font-semibold text-slate-700">Additional Notes</label>
                                    <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={selectedCategory === "Visit" ? "Any specific details or questions you have for your visit..." : "Any specific details about the items or preferred collection time..."} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-900 text-sm leading-relaxed"></textarea>
                                </div>

                                <div className="pt-2 flex justify-end">
                                    <button type="submit" disabled={isSubmitting} className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2.5 px-6 rounded-lg transition-colors text-sm shadow-sm cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed">
                                        {isSubmitting ? 'Submitting...' : (selectedCategory === "Visit" ? 'Schedule Visit' : 'Submit Pledge')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
