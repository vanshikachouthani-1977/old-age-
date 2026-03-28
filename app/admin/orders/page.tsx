"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDocs, collection, query, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { ShoppingCart, Download, CheckCircle, Clock, XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Link from "next/link";

interface Vendor {
    id: string;
    businessName: string;
    contactName: string;
    providedProducts: string[];
    pricing?: { [key: string]: number };
    availability?: { [key: string]: string };
}

interface Order {
    id: string;
    vendorId: string;
    vendorName: string;
    productName: string;
    quantity: number;
    unitPrice?: number;
    totalPrice?: number;
    status: string;
    createdAt: any;
}

export default function AdminOrdersDashboard() {
    const { user, role, loading } = useAuth();
    const router = useRouter();

    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(true);

    // Form states
    const [selectedProduct, setSelectedProduct] = useState("");
    const [selectedVendorId, setSelectedVendorId] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Helper to normalize keys (strips whitespace, lowercase)
    const normalizeKey = (key: string) => key?.trim()?.toLowerCase() || "";

    const selectedVendor = vendors.find(v => v.id === selectedVendorId);

    // Improved lookup with normalization
    const getVendorPrice = (vendor: Vendor | undefined, product: string) => {
        if (!vendor?.pricing || !product) return 0;
        const normProduct = normalizeKey(product);
        const matchKey = Object.keys(vendor.pricing).find(k => normalizeKey(k) === normProduct);
        return matchKey ? vendor.pricing[matchKey] : 0;
    };

    const getVendorStockStatus = (vendor: Vendor | undefined, product: string) => {
        if (!vendor?.availability || !product) return "available";
        const normProduct = normalizeKey(product);
        const matchKey = Object.keys(vendor.availability).find(k => normalizeKey(k) === normProduct);
        return matchKey ? vendor.availability[matchKey] : "available";
    };

    const unitPrice = getVendorPrice(selectedVendor, selectedProduct);
    const totalCost = unitPrice * quantity;
    const isOutOfStock = getVendorStockStatus(selectedVendor, selectedProduct) === "out_of_stock";

    const productOptions = ["Medicine", "Wheelchair", "Specs", "Walking Sticks", "Other"];

    useEffect(() => {
        if (!loading && role !== "admin") {
            router.push("/admin/login");
            return;
        }

        if (user && role === "admin") {
            const unsubscribeVendors = onSnapshot(collection(db, "vendors"), (snapshot) => {
                const fetchedVendors = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Vendor[];
                setVendors(fetchedVendors);
            });

            const unsubscribeOrders = onSnapshot(collection(db, "orders"), (snapshot) => {
                const fetchedOrders = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Order[];
                // Safer sort handling null timestamps
                fetchedOrders.sort((a, b) => {
                    const timeA = a.createdAt?.toMillis?.() || 0;
                    const timeB = b.createdAt?.toMillis?.() || 0;
                    return timeB - timeA;
                });
                setOrders(fetchedOrders);
                setIsLoadingData(false);
            });

            return () => {
                unsubscribeVendors();
                unsubscribeOrders();
            };
        }
    }, [user, role, loading, router]);

    const handleCreateOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedVendorId || !selectedProduct || quantity < 1) {
            alert("Please fill all fields correctly.");
            return;
        }

        const vendor = vendors.find(v => v.id === selectedVendorId);
        if (!vendor) return;

        if (isOutOfStock) {
            alert("This item is currently Out of Stock from this vendor. Please select another vendor.");
            return;
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "orders"), {
                vendorId: vendor.id,
                vendorName: vendor.businessName,
                productName: selectedProduct,
                quantity: quantity,
                unitPrice: unitPrice,
                totalPrice: totalCost,
                status: "pending",
                adminId: user?.uid,
                createdAt: serverTimestamp()
            });

            alert("Order placed successfully!");
            setSelectedProduct("");
            setSelectedVendorId("");
            setQuantity(1);
        } catch (error) {
            console.error(error);
            alert("Error placing order.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleExportCSV = () => {
        const headers = ["Order ID", "Product", "Quantity", "Unit Price", "Total Cost", "Vendor Name", "Status", "Date"];
        const rows = orders.map(o => [
            o.id,
            `"${o.productName}"`,
            o.quantity,
            o.unitPrice || 0,
            o.totalPrice || 0,
            `"${o.vendorName}"`,
            o.status,
            o.createdAt ? `"${new Date(o.createdAt.toDate()).toLocaleDateString()}"` : "N/A"
        ]);
        
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "vendor_orders_history.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading || isLoadingData) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    const availableVendors = selectedProduct 
        ? vendors.filter(v => 
            v.providedProducts.some(p => normalizeKey(p) === normalizeKey(selectedProduct)) && 
            getVendorStockStatus(v, selectedProduct) !== "out_of_stock"
          )
        : [];

    return (
        <main className="min-h-screen flex flex-col bg-slate-50 font-sans">
            <Navbar />

            <div className="pt-24 pb-16 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
                {/* Modern Breadcrumb */}
                <div className="mb-8">
                    <Link href="/admin" className="inline-flex items-center text-sm font-bold text-slate-400 hover:text-teal-600 transition-all group">
                        <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 mr-3 group-hover:border-teal-200 group-hover:bg-teal-50 transition-all">
                            <ArrowLeft className="w-4 h-4" />
                        </div>
                        Back to Admin Dashboard
                    </Link>
                </div>

                {/* Gradient Header Banner */}
                <div className="mb-10 bg-gradient-to-br from-teal-600 to-emerald-700 rounded-3xl p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white opacity-5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-400 opacity-10 rounded-full translate-y-1/3 -translate-x-1/4 blur-2xl"></div>
                    
                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <div className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-widest mb-4">
                                Procurement Management
                            </div>
                            <h1 className="text-4xl sm:text-5xl font-heading font-black mb-3 tracking-tight">Vendor Orders</h1>
                            <p className="text-teal-50 text-base sm:text-lg max-w-2xl font-medium opacity-90">
                                Efficiently book items from your trusted vendor network and oversee supply logistics in real-time.
                            </p>
                        </div>
                        <Button 
                            onClick={handleExportCSV}
                            variant="outline"
                            className="bg-white hover:bg-teal-50 text-teal-700 font-extrabold px-6 py-6 rounded-2xl shadow-xl shadow-teal-900/10 flex items-center transition-all hover:scale-105 active:scale-95 border-none"
                        >
                            <Download className="w-5 h-5 mr-3" />
                            <span className="text-teal-700">Export Inventory History</span>
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Book Order Form */}
                    <div className="lg:col-span-4 border border-slate-200/60 bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 self-start overflow-hidden">
                        <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex items-center">
                            <div className="p-3 bg-amber-100 text-amber-600 rounded-2xl mr-4">
                                <ShoppingCart className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-black text-slate-800 tracking-tight">Book New Item</h2>
                        </div>
                        <div className="p-8">
                            <form onSubmit={handleCreateOrder} className="space-y-6">
                                <div className="space-y-2.5">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Requirement</label>
                                    <select 
                                        required 
                                        value={selectedProduct} 
                                        onChange={(e) => {
                                            setSelectedProduct(e.target.value);
                                            setSelectedVendorId("");
                                        }} 
                                        className="w-full px-5 py-3.5 text-slate-900 font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all appearance-none cursor-pointer text-slate-900"
                                        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '16px' }}
                                    >
                                        <option value="">-- Select Category --</option>
                                        {productOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                    </select>
                                </div>

                                {selectedProduct && (
                                    <div className="space-y-2.5 animate-in fade-in slide-in-from-top-4 duration-500">
                                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Preferred Vendor</label>
                                        <select 
                                            required 
                                            value={selectedVendorId} 
                                            onChange={(e) => setSelectedVendorId(e.target.value)} 
                                            className="w-full px-5 py-3.5 text-slate-900 font-bold bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all appearance-none cursor-pointer text-slate-900"
                                            style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'currentColor\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\' /%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '16px' }}
                                        >
                                            <option value="">-- Choose registered vendor --</option>
                                            {availableVendors.length === 0 && <option disabled>No available vendors for this product</option>}
                                            {availableVendors.map(v => <option key={v.id} value={v.id}>{v.businessName || v.contactName}</option>)}
                                        </select>
                                    </div>
                                )}

                                <div className="space-y-2.5">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">Quantity Needed</label>
                                    <div className="relative group">
                                        <input 
                                            type="number" 
                                            min="1" 
                                            required 
                                            value={quantity || ""} 
                                            onChange={(e) => setQuantity(e.target.value === "" ? 0 : parseInt(e.target.value))} 
                                            className="w-full pl-5 pr-12 py-3.5 text-slate-900 font-mono font-bold text-lg bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 outline-none transition-all text-slate-900"
                                            placeholder="Enter amount"
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold group-focus-within:text-amber-500 transition-colors">units</div>
                                    </div>
                                </div>

                                {selectedProduct && selectedVendorId && (
                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mt-6 space-y-4 relative overflow-hidden ring-4 ring-transparent transition-all">
                                        {isOutOfStock && (
                                            <div className="absolute inset-0 bg-white/95 backdrop-blur-md flex items-center justify-center z-20 p-6 text-center animate-in fade-in zoom-in-95 duration-300">
                                                <div className="flex flex-col items-center">
                                                    <div className="p-4 bg-red-100 rounded-full mb-3 shadow-[0_0_25px_rgba(239,68,68,0.15)]">
                                                        <XCircle className="w-10 h-10 text-red-600" />
                                                    </div>
                                                    <p className="text-red-700 font-extrabold text-xl tracking-tight uppercase">Out of Stock</p>
                                                    <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed px-4">This vendor has marked this product as unavailable. Please select another source.</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500 font-bold uppercase tracking-wider">Unit Price</span>
                                            <span className="font-mono font-extrabold text-slate-800 text-lg text-slate-900">₹ {unitPrice}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-t border-slate-200/60 pt-4">
                                            <span className="text-slate-800 font-extrabold text-slate-900">Final Total</span>
                                            <span className="font-mono font-black text-amber-600 text-2xl">₹ {totalCost}</span>
                                        </div>
                                    </div>
                                )}

                                <Button 
                                    type="submit" 
                                    disabled={isSubmitting || !selectedVendorId || totalCost === 0 || isOutOfStock} 
                                    className="w-full bg-slate-900 hover:bg-black text-white py-8 rounded-2xl shadow-xl shadow-slate-200 transition-all font-bold text-lg flex items-center justify-center hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center"><Clock className="w-5 h-5 mr-3 animate-spin"/> Processing...</span>
                                    ) : (
                                        <span className="flex items-center"><CheckCircle className="w-5 h-5 mr-3"/> Confirm Order</span>
                                    )}
                                </Button>
                            </form>
                        </div>
                    </div>

                    {/* Order History */}
                    <div className="lg:col-span-8 space-y-8">
                        <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-200/60 overflow-hidden">
                            <div className="px-10 py-8 border-b border-slate-100 flex items-center justify-between">
                                <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center">
                                    <Clock className="w-6 h-6 mr-3 text-teal-600" />
                                    Order Tracking
                                </h2>
                                <div className="text-slate-400 font-bold text-sm bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                                    Total Records: {orders.length}
                                </div>
                            </div>
                            <div className="p-0 overflow-x-auto">
                                <table className="w-full min-w-max text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/80 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                                            <th className="p-10 pb-4">Date</th>
                                            <th className="p-10 pb-4">Product Details</th>
                                            <th className="p-10 pb-4 text-center">Qty</th>
                                            <th className="p-10 pb-4">Financials</th>
                                            <th className="p-10 pb-4 text-right pr-14">Source Vendor</th>
                                            <th className="p-10 pb-4 text-center">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {orders.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="p-20 text-center text-slate-400 font-bold italic">
                                                    No orders found in recent history.
                                                </td>
                                            </tr>
                                        ) : (
                                            orders.map(order => (
                                                <tr key={order.id} className="hover:bg-teal-50/30 transition-all duration-300 group">
                                                    <td className="p-10 py-8">
                                                        <p className="text-sm font-black text-slate-800">{order.createdAt?.toDate().toLocaleDateString()}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{order.id.slice(0, 8)}</p>
                                                    </td>
                                                    <td className="p-10 py-8">
                                                        <p className="font-extrabold text-slate-900 text-lg group-hover:text-teal-700 transition-colors">{order.productName}</p>
                                                        <div className="text-[11px] text-slate-400 font-bold mt-1">₹{order.unitPrice || 0} / unit</div>
                                                    </td>
                                                    <td className="p-10 py-8 text-center">
                                                        <span className="inline-block px-4 py-2 bg-slate-50 text-slate-800 font-mono font-black rounded-xl border border-slate-100 group-hover:border-teal-200">
                                                            {order.quantity}
                                                        </span>
                                                    </td>
                                                    <td className="p-10 py-8">
                                                        <p className="text-slate-900 font-black font-mono text-xl">₹{order.totalPrice || 0}</p>
                                                    </td>
                                                    <td className="p-10 py-8 text-right pr-14">
                                                        <p className="text-sm font-extrabold text-slate-700">{order.vendorName}</p>
                                                        <p className="text-[10px] font-bold text-teal-600/60 uppercase tracking-widest mt-1">Trusted Partner</p>
                                                    </td>
                                                    <td className="p-10 py-8">
                                                        <div className="flex justify-center">
                                                            {order.status === "pending" && (
                                                                <span className="inline-flex items-center text-orange-600 bg-orange-50 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-100">
                                                                    <Clock className="w-3.5 h-3.5 mr-2" /> Pending
                                                                </span>
                                                            )}
                                                            {order.status === "accepted" && (
                                                                <span className="inline-flex items-center text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                                                    <CheckCircle className="w-3.5 h-3.5 mr-2" /> Accepted
                                                                </span>
                                                            )}
                                                            {order.status === "rejected" && (
                                                                <span className="inline-flex items-center text-red-600 bg-red-50 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-100">
                                                                    <XCircle className="w-3.5 h-3.5 mr-2" /> Rejected
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </main>
    );
}
