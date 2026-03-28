"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, onSnapshot, updateDoc } from "firebase/firestore";
import { Package, Clock, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface OrderItem {
    name: string;
    quantity: number;
    price?: number;
}

interface Order {
    id: string;
    productName: string;
    quantity: number;
    status: "pending" | "accepted" | "rejected" | "quotation_pending" | "quotation_received";
    createdAt: any;
    orderType?: "simple" | "detailed";
    items?: OrderItem[];
}

export default function VendorDashboard() {
    const { user, role, loading } = useAuth();
    const router = useRouter();

    const [vendorData, setVendorData] = useState<any>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [prices, setPrices] = useState<{[key: string]: number}>({});
    const [availability, setAvailability] = useState<{[key: string]: string}>({});
    const [isSavingPrices, setIsSavingPrices] = useState(false);
    const [activeProductIndex, setActiveProductIndex] = useState(0);
    const [quotingOrder, setQuotingOrder] = useState<Order | null>(null);
    const [quoteItems, setQuoteItems] = useState<OrderItem[]>([]);

    // Helper to normalize keys (strips whitespace, lowercase)
    const normalizeKey = (key: string) => key?.trim()?.toLowerCase() || "";

    useEffect(() => {
        if (!loading && role !== "vendor") {
            router.push("/");
            return;
        }

        if (user && role === "vendor") {
            // Fetch Vendor Data
            const fetchVendorData = async () => {
                const docRef = doc(db, "vendors", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setVendorData(data);
                    if (data.pricing) {
                        setPrices(data.pricing);
                    }
                    if (data.availability) {
                        setAvailability(data.availability);
                    } else {
                        // Initialize as available for all provided products if missing
                        const initialAvailability: {[key: string]: string} = {};
                        (data.providedProducts || []).forEach((p: string) => {
                            initialAvailability[p] = "available";
                        });
                        setAvailability(initialAvailability);
                    }
                } else {
                    router.push("/vendor/register");
                }
            };

            fetchVendorData();

            // Listen to Orders
            const q = query(collection(db, "orders"), where("vendorId", "==", user.uid));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const fetchedOrders = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Order[];
                // Sort by creation date descending
                fetchedOrders.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
                setOrders(fetchedOrders);
                setIsLoadingData(false);
            });

            return () => unsubscribe();
        }
    }, [user, role, loading, router]);

    const handleUpdateOrder = async (orderId: string, status: "accepted" | "rejected") => {
        try {
            await updateDoc(doc(db, "orders", orderId), { status });
        } catch (error) {
            console.error("Error updating order:", error);
            alert("Failed to update the order.");
        }
    };

    const handleUpdateQuote = async (orderId: string) => {
        if (quoteItems.some(item => !item.price || item.price <= 0)) {
            alert("Please provide valid prices for all items.");
            return;
        }

        try {
            await updateDoc(doc(db, "orders", orderId), { 
                items: quoteItems,
                status: "quotation_received" 
            });
            alert("Quotation submitted successfully!");
            setQuotingOrder(null);
        } catch (error) {
            console.error("Error submitting quote:", error);
            alert("Failed to submit quotation.");
        }
    };

    const handlePriceChange = (product: string, value: string) => {
        setPrices(prev => ({ ...prev, [product]: Number(value) }));
    };

    const handleAvailabilityChange = (product: string, value: string) => {
        setAvailability(prev => ({ ...prev, [product]: value }));
    };

    const handleSavePrices = async () => {
        if (!user) return;
        setIsSavingPrices(true);
        try {
            // Optional: normalize all keys in the maps before saving to ensure consistency
            const normalizedPricing: {[key: string]: number} = {};
            Object.entries(prices).forEach(([k, v]) => {
                normalizedPricing[k.trim()] = v;
            });

            const normalizedAvailability: {[key: string]: string} = {};
            Object.entries(availability).forEach(([k, v]) => {
                normalizedAvailability[k.trim()] = v;
            });

            await updateDoc(doc(db, "vendors", user.uid), { 
                pricing: normalizedPricing,
                availability: normalizedAvailability 
            });
            alert("Prices and availability updated successfully!");
        } catch (error) {
            console.error("Error saving updates:", error);
            alert("Failed to save updates.");
        } finally {
            setIsSavingPrices(false);
        }
    };

    if (loading || isLoadingData) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    const pendingOrders = orders.filter(o => o.status === "pending" || o.status === "quotation_pending");
    const historyOrders = orders.filter(o => o.status !== "pending" && o.status !== "quotation_pending");

    return (
        <main className="min-h-screen bg-slate-50 flex flex-col font-sans">
            <Navbar />

            <div className="flex-1 pt-24 pb-16 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-10 bg-gradient-to-r from-teal-600 to-emerald-700 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/3 blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-white opacity-10 rounded-full translate-y-1/3 -translate-x-1/4 blur-xl"></div>
                    <div className="relative z-10">
                        <h1 className="text-3xl sm:text-4xl font-heading font-extrabold mb-3 tracking-tight">Vendor Dashboard</h1>
                        <p className="text-teal-50 text-base sm:text-lg max-w-2xl font-medium">
                            Welcome back, {vendorData?.contactName}! Manage your inventory and incoming orders here.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Orders List (Main Content) */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Pending Orders */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center">
                                    <Clock className="w-5 h-5 mr-2 text-orange-500" />
                                    New Requests
                                </h2>
                                <span className="bg-orange-100 text-orange-800 text-xs px-2 py-1 rounded-full font-bold">
                                    {pendingOrders.length}
                                </span>
                            </div>
                            
                            <div className="p-6">
                                {pendingOrders.length === 0 ? (
                                    <p className="text-slate-500 text-center py-4">No new incoming requests.</p>
                                ) : (
                                    <div className="space-y-4">
                                        {pendingOrders.map(order => (
                                            <div key={order.id} className="border border-slate-200 rounded-lg p-4 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 hover:bg-white transition-colors animate-in fade-in slide-in-from-top-2 duration-300">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <h3 className="font-bold text-slate-800 text-lg">{order.productName}</h3>
                                                        {order.orderType === "detailed" && (
                                                            <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Detailed Quote</span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-slate-500">
                                                        {order.orderType === "detailed" ? (
                                                            <span className="italic font-medium">Contains {order.items?.length || 0} unique items</span>
                                                        ) : (
                                                            <>Quantity Required: <span className="font-semibold text-slate-700">{order.quantity}</span></>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-slate-400 mt-1">
                                                        Requested on: {order.createdAt?.toDate().toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2 w-full sm:w-auto">
                                                    {order.status === "quotation_pending" ? (
                                                        <Button 
                                                            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white"
                                                            onClick={() => {
                                                                setQuotingOrder(order);
                                                                setQuoteItems(order.items || []);
                                                            }}
                                                        >
                                                            Enter Prices
                                                        </Button>
                                                    ) : (
                                                        <>
                                                            <Button 
                                                                variant="outline" 
                                                                className="flex-1 sm:flex-none border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                                onClick={() => handleUpdateOrder(order.id, "rejected")}
                                                            >
                                                                Reject
                                                            </Button>
                                                            <Button 
                                                                className="flex-1 sm:flex-none bg-teal-600 hover:bg-teal-700 text-white"
                                                                onClick={() => handleUpdateOrder(order.id, "accepted")}
                                                            >
                                                                Accept
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Order History */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                                <h2 className="text-lg font-bold text-slate-800">Order History</h2>
                            </div>
                            <div className="p-6">
                                {historyOrders.length === 0 ? (
                                    <p className="text-slate-500 text-center py-4">No past orders.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {historyOrders.map(order => (
                                            <div key={order.id} className="flex justify-between items-center p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                                                <div>
                                                    <p className="font-bold text-slate-700">{order.productName} x {order.quantity}</p>
                                                    <p className="text-xs text-slate-400">{order.createdAt?.toDate().toLocaleDateString()}</p>
                                                </div>
                                                <div>
                                                    {order.status === "accepted" ? (
                                                        <span className="flex items-center text-teal-600 text-sm font-semibold bg-teal-50 px-3 py-1 rounded-full">
                                                            <CheckCircle className="w-4 h-4 mr-1" /> Accepted
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center text-red-500 text-sm font-semibold bg-red-50 px-3 py-1 rounded-full">
                                                            <XCircle className="w-4 h-4 mr-1" /> Rejected
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Inventory/Profile Sidebar (Now on the right) */}
                    <div className="lg:col-span-1 border border-slate-200 bg-white rounded-xl p-6 shadow-sm self-start">
                        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                            <div className="p-3 bg-teal-50 text-teal-600 rounded-lg">
                                <Package className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800">Your Offerings</h2>
                        </div>
                        
                        <div className="space-y-6">
                            {/* Dropdown Selector if more than 1 product */}
                            {vendorData?.providedProducts?.length > 1 && (
                                <div className="space-y-2">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Select Product to Edit</label>
                                    <select 
                                        value={activeProductIndex}
                                        onChange={(e) => setActiveProductIndex(Number(e.target.value))}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-bold focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none appearance-none cursor-pointer transition-all"
                                        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
                                    >
                                        {vendorData.providedProducts.map((p: string, i: number) => (
                                            <option key={i} value={i}>{p}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {vendorData?.providedProducts?.length > 0 && (
                                <div className="flex flex-col bg-slate-50 p-6 rounded-2xl border border-slate-200/60 shadow-inner group transition-all duration-300">
                                    <div className="flex justify-between items-center w-full mb-6">
                                        <span className="font-extrabold text-xl text-slate-900 tracking-tight">
                                            {vendorData.providedProducts[activeProductIndex]}
                                        </span>
                                        <div className="relative">
                                            <select
                                                value={availability[vendorData.providedProducts[activeProductIndex]] || "available"}
                                                onChange={(e) => handleAvailabilityChange(vendorData.providedProducts[activeProductIndex], e.target.value)}
                                                className={`text-[10px] font-extrabold uppercase tracking-widest px-4 py-1.5 rounded-full border-2 outline-none cursor-pointer transition-all appearance-none pr-8 shadow-sm ${
                                                    (availability[vendorData.providedProducts[activeProductIndex]] || "available") === "available"
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100"
                                                        : "bg-red-50 text-red-700 border-red-100 hover:bg-red-100"
                                                }`}
                                                style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'3\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center', backgroundSize: '12px' }}
                                            >
                                                <option value="available">Available</option>
                                                <option value="out_of_stock">Out of Stock</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Unit Price (₹)</label>
                                        <div className="relative group/input">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold group-focus-within/input:text-teal-500 transition-colors">₹</span>
                                            <input 
                                                type="number" 
                                                min="0"
                                                placeholder="0.00"
                                                value={prices[vendorData.providedProducts[activeProductIndex]] || ""}
                                                onChange={(e) => handlePriceChange(vendorData.providedProducts[activeProductIndex], e.target.value)}
                                                className="w-full pl-9 pr-5 py-3 text-slate-900 font-mono font-bold text-xl bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 outline-none transition-all shadow-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {vendorData?.providedProducts?.length > 0 && (
                            <Button 
                                onClick={handleSavePrices} 
                                disabled={isSavingPrices}
                                className="w-full mt-6 bg-teal-600 hover:bg-teal-700 text-white shadow-xl shadow-teal-100"
                            >
                                {isSavingPrices ? "Saving..." : "Update Details"}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Vendor Quoting Modal */}
            {quotingOrder && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setQuotingOrder(null)}></div>
                    <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight">Prepare Quote</h3>
                                <p className="text-xs font-bold text-slate-400 mt-0.5 uppercase tracking-wider">{quotingOrder.productName} Request</p>
                            </div>
                            <button onClick={() => setQuotingOrder(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <XCircle className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-6">
                            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                                {quoteItems.map((item, idx) => (
                                    <div key={idx} className="flex flex-col gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex justify-between items-start">
                                            <p className="font-extrabold text-slate-900">{item.name}</p>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-2 py-0.5 rounded-full border border-slate-100">Qty: {item.quantity}</span>
                                        </div>
                                        <div className="relative mt-2">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                                            <input 
                                                type="number" 
                                                placeholder="Price per unit"
                                                value={item.price || ""}
                                                onChange={(e) => {
                                                    const newQuote = [...quoteItems];
                                                    newQuote[idx] = { ...newQuote[idx], price: parseFloat(e.target.value) || 0 };
                                                    setQuoteItems(newQuote);
                                                }}
                                                className="w-full pl-9 pr-5 py-3 text-slate-900 font-mono font-bold bg-white border border-slate-200 rounded-xl focus:border-blue-500 outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <Button 
                                onClick={() => handleUpdateQuote(quotingOrder.id)}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-6 rounded-2xl shadow-xl shadow-blue-900/10"
                            >
                                Submit Full Quotation
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </main>
    );
}
