"use client";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDocs, collection, query, onSnapshot, addDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { ShoppingCart, Download, CheckCircle, Clock, XCircle, ArrowLeft, Trash2, Plus, Minus, Eye, Check } from "lucide-react";
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

interface OrderItem {
    name: string;
    quantity: number;
    price?: number;
    specNo?: string;
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
    deleted?: boolean;
    orderType?: "simple" | "detailed";
    items?: OrderItem[];
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
    
    // Detailed items for Medicine/Specs
    const [detailedItems, setDetailedItems] = useState<OrderItem[]>([]);
    const [reviewingOrder, setReviewingOrder] = useState<Order | null>(null);

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
        
        const isDetailed = selectedProduct === "Medicine" || selectedProduct === "Specs";
        
        if (!selectedVendorId || !selectedProduct) {
            alert("Please select a vendor and product.");
            return;
        }

        if (isDetailed && detailedItems.length === 0) {
            alert("Please add at least one item to your list.");
            return;
        }

        if (!isDetailed && quantity < 1) {
            alert("Please enter a valid quantity.");
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
            const orderData: any = {
                vendorId: vendor.id,
                vendorName: vendor.businessName,
                productName: selectedProduct,
                status: isDetailed ? "quotation_pending" : "pending",
                adminId: user?.uid,
                createdAt: serverTimestamp(),
                orderType: isDetailed ? "detailed" : "simple",
            };

            if (isDetailed) {
                orderData.items = detailedItems;
                orderData.quantity = detailedItems.reduce((acc, item) => acc + item.quantity, 0);
            } else {
                orderData.quantity = quantity;
                orderData.unitPrice = unitPrice;
                orderData.totalPrice = totalCost;
            }

            await addDoc(collection(db, "orders"), orderData);

            alert(isDetailed ? "Quotation request sent to vendor!" : "Order placed successfully!");
            setSelectedProduct("");
            setSelectedVendorId("");
            setQuantity(1);
            setDetailedItems([]);
        } catch (error) {
            console.error(error);
            alert("Error placing order.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const addDetailedItem = () => {
        setDetailedItems([...detailedItems, { name: "", quantity: 1, specNo: "" }]);
    };

    const removeDetailedItem = (index: number) => {
        setDetailedItems(detailedItems.filter((_, i) => i !== index));
    };

    const updateDetailedItem = (index: number, field: "name" | "quantity" | "price" | "specNo", value: string | number) => {
        const newItems = [...detailedItems];
        newItems[index] = { ...newItems[index], [field]: value };
        setDetailedItems(newItems);
    };

    const handleAcceptQuote = async (orderId: string, totalPrice: number) => {
        try {
            await updateDoc(doc(db, "orders", orderId), { 
                status: "accepted",
                totalPrice: totalPrice 
            });
            setReviewingOrder(null);
        } catch (error) {
            console.error(error);
            alert("Error accepting quote.");
        }
    };

    const handleRejectQuote = async (orderId: string) => {
        try {
            await updateDoc(doc(db, "orders", orderId), { status: "rejected" });
            setReviewingOrder(null);
        } catch (error) {
            console.error(error);
            alert("Error rejecting quote.");
        }
    };

    const handleSoftDelete = async (orderId: string) => {
        if (!confirm("Are you sure you want to remove this order from your view? (It will still remain in the database history)")) return;
        try {
            await updateDoc(doc(db, "orders", orderId), { deleted: true });
        } catch (error) {
            console.error(error);
            alert("Error updating order.");
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

                                {selectedProduct && (selectedProduct === "Medicine" || selectedProduct === "Specs") ? (
                                    <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Items List</label>
                                            <button 
                                                type="button" 
                                                onClick={addDetailedItem}
                                                className="text-[10px] font-black uppercase text-teal-600 hover:text-teal-700 flex items-center bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100 transition-all active:scale-95"
                                            >
                                                <Plus className="w-3 h-3 mr-1.5" /> Add New Row
                                            </button>
                                        </div>
                                        
                                        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                            {detailedItems.length === 0 && (
                                                <div className="p-8 border-2 border-dashed border-slate-200 rounded-3xl text-center">
                                                    <p className="text-xs text-slate-400 font-bold">Start by adding individual items</p>
                                                </div>
                                            )}
                                            {detailedItems.map((item, idx) => (
                                                <div key={idx} className="flex gap-3 group animate-in zoom-in-95 duration-200">
                                                    {selectedProduct === "Medicine" && (
                                                        <div className="flex-1 relative">
                                                            <input 
                                                                required
                                                                placeholder="Medicine Name"
                                                                value={item.name}
                                                                onChange={(e) => updateDetailedItem(idx, "name", e.target.value)}
                                                                className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:border-teal-500 outline-none transition-all shadow-sm"
                                                            />
                                                        </div>
                                                    )}
                                                    {selectedProduct === "Specs" && (
                                                        <div className="flex-1 relative">
                                                            <input 
                                                                required
                                                                placeholder="Spec No."
                                                                value={item.specNo || ""}
                                                                onChange={(e) => updateDetailedItem(idx, "specNo", e.target.value)}
                                                                className="w-full px-5 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 placeholder:text-slate-300 focus:border-teal-500 outline-none transition-all shadow-sm"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="w-24 relative">
                                                        <input 
                                                            type="number"
                                                            min="1"
                                                            required
                                                            value={item.quantity}
                                                            onChange={(e) => updateDetailedItem(idx, "quantity", parseInt(e.target.value) || 0)}
                                                            className="w-full px-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-mono font-black text-slate-900 focus:border-teal-500 outline-none transition-all text-center shadow-sm"
                                                        />
                                                    </div>
                                                    <button 
                                                        type="button" 
                                                        onClick={() => removeDetailedItem(idx)}
                                                        className="p-3.5 bg-slate-50 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all border border-transparent hover:border-rose-100"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
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
                                )}

                                {selectedProduct && selectedVendorId && (
                                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mt-6 space-y-4 relative overflow-hidden ring-4 ring-transparent transition-all">
                                        {isOutOfStock && (
                                            <div className="absolute inset-0 bg-white/90 backdrop-blur-md flex items-center justify-center z-20 p-4 text-center animate-in fade-in zoom-in-95 duration-500">
                                                <div className="flex flex-col items-center max-w-[200px]">
                                                    <div className="relative mb-3 group">
                                                        <div className="absolute inset-0 bg-rose-400/20 blur-2xl rounded-full scale-110 animate-pulse transition-all duration-1000"></div>
                                                        <div className="relative p-4 bg-white rounded-2xl shadow-xl shadow-rose-100 ring-1 ring-rose-100/50 flex items-center justify-center transition-transform duration-500">
                                                            <XCircle className="w-10 h-10 text-rose-500 stroke-[2.5px] relative z-10" />
                                                        </div>
                                                    </div>
                                                    <h3 className="text-rose-600 font-black text-lg tracking-tighter uppercase mb-1 drop-shadow-sm">Out of Stock</h3>
                                                    <p className="text-[11px] text-slate-500 font-bold leading-tight tracking-tight px-1">
                                                        Source <span className="text-slate-900 font-extrabold">unavailable</span>. Please choose another vendor.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        {selectedProduct === "Medicine" || selectedProduct === "Specs" ? (
                                            <div className="py-2 text-center">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 font-black">Pricing Strategy</p>
                                                <div className="inline-flex items-center text-teal-600 bg-teal-100/50 px-4 py-2 rounded-xl text-xs font-black border border-teal-200/50">
                                                    <Clock className="w-3 h-3 mr-2" /> Cost to be quoted by vendor
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-500 font-bold uppercase tracking-wider">Unit Price</span>
                                                    <span className="font-mono font-extrabold text-slate-800 text-lg text-slate-900">₹ {unitPrice}</span>
                                                </div>
                                                <div className="flex justify-between items-center border-t border-slate-200/60 pt-4">
                                                    <span className="text-slate-800 font-extrabold text-slate-900">Final Total</span>
                                                    <span className="font-mono font-black text-amber-600 text-2xl">₹ {totalCost}</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                )}

                                <Button 
                                    type="submit" 
                                    disabled={
                                        isSubmitting || 
                                        !selectedVendorId || 
                                        isOutOfStock ||
                                        (totalCost === 0 && !(selectedProduct === "Medicine" || selectedProduct === "Specs"))
                                    } 
                                    className="w-full bg-slate-900 hover:bg-black text-white py-8 rounded-2xl shadow-xl shadow-slate-200 transition-all font-bold text-lg flex items-center justify-center hover:scale-[1.02] active:scale-95 disabled:opacity-30 disabled:hover:scale-100"
                                >
                                    {isSubmitting ? (
                                        <span className="flex items-center"><Clock className="w-5 h-5 mr-3 animate-spin"/> Processing...</span>
                                    ) : (
                                        <span className="flex items-center">
                                            {selectedProduct === "Medicine" || selectedProduct === "Specs" ? (
                                                <><Clock className="w-5 h-5 mr-3"/> Request Quotation</>
                                            ) : (
                                                <><CheckCircle className="w-5 h-5 mr-3"/> Confirm Order</>
                                            )}
                                        </span>
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
                                            <th className="p-10 pb-4 text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {orders.filter(o => !o.deleted).length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="p-20 text-center text-slate-400 font-bold italic">
                                                    No orders found in recent history.
                                                </td>
                                            </tr>
                                        ) : (
                                            orders.filter(o => !o.deleted).map(order => (
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
                                                        <div className="flex justify-center flex-col items-center gap-2">
                                                            {order.status === "quotation_pending" && (
                                                                <span className="inline-flex items-center text-blue-600 bg-blue-50 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                                                                    <Clock className="w-3.5 h-3.5 mr-2" /> Waiting for Quote
                                                                </span>
                                                            )}
                                                            {order.status === "quotation_received" && (
                                                                <button 
                                                                    onClick={() => setReviewingOrder(order)}
                                                                    className="inline-flex items-center text-amber-600 bg-amber-50 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-200 hover:bg-amber-100 transition-all shadow-sm"
                                                                >
                                                                    <Eye className="w-3.5 h-3.5 mr-2" /> Review Quote
                                                                </button>
                                                            )}
                                                            {order.status === "pending" && (
                                                                <span className="inline-flex items-center text-orange-600 bg-orange-50 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-orange-100">
                                                                    <Clock className="w-3.5 h-3.5 mr-2" /> Pending
                                                                </span>
                                                            )}
                                                            {order.status === "accepted" && (
                                                                <>
                                                                    <span className="inline-flex items-center text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                                                                        <CheckCircle className="w-3.5 h-3.5 mr-2" /> Accepted
                                                                    </span>
                                                                    {order.items && order.items.length > 0 && (
                                                                        <button onClick={() => setReviewingOrder(order)} className="mt-1 inline-flex items-center text-slate-400 hover:text-teal-600 text-[10px] font-black uppercase tracking-widest transition-colors bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                                                                            <Eye className="w-3 h-3 mr-1.5" /> Details
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                            {order.status === "rejected" && (
                                                                <>
                                                                    <span className="inline-flex items-center text-red-600 bg-red-50 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-red-100">
                                                                        <XCircle className="w-3.5 h-3.5 mr-2" /> Rejected
                                                                    </span>
                                                                    {order.items && order.items.length > 0 && (
                                                                        <button onClick={() => setReviewingOrder(order)} className="mt-1 inline-flex items-center text-slate-400 hover:text-teal-600 text-[10px] font-black uppercase tracking-widest transition-colors bg-white px-3 py-1 rounded-full border border-slate-100 shadow-sm">
                                                                            <Eye className="w-3 h-3 mr-1.5" /> Details
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-10 py-8 text-center">
                                                        <button 
                                                            onClick={() => handleSoftDelete(order.id)}
                                                            className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-100"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
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

            {/* Review Quote Modal */}
            {reviewingOrder && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setReviewingOrder(null)}></div>
                    <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="bg-slate-50 px-10 py-8 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                                    {reviewingOrder.status === "quotation_received" ? "Review Vendor Quote" : "Order Details"}
                                </h3>
                                <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-wider">{reviewingOrder.vendorName} • {reviewingOrder.productName}</p>
                            </div>
                            <button onClick={() => setReviewingOrder(null)} className="p-3 hover:bg-slate-200 rounded-full transition-colors">
                                <XCircle className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>
                        
                        <div className="p-10 space-y-8">
                            <div className="space-y-4">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Itemized Pricing</h4>
                                <div className="space-y-3">
                                    {reviewingOrder.items?.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-5 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div>
                                                <p className="font-extrabold text-slate-900">
                                                    {item.name || (reviewingOrder.productName === "Specs" ? "Spectacles" : "Unknown Item")}
                                                    {reviewingOrder.productName === "Specs" && item.specNo ? <span className="text-teal-600 ml-2 text-sm">(No: {item.specNo})</span> : ""}
                                                </p>
                                                <p className="text-xs text-slate-500 font-bold mt-0.5">Quantity: {item.quantity}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-teal-600 font-black font-mono text-lg">₹ {item.price || 0}</p>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Subtotal: ₹ {(item.price || 0) * item.quantity}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-teal-600 rounded-3xl p-8 text-white flex justify-between items-center shadow-xl shadow-teal-900/10">
                                <div>
                                    <p className="text-teal-100 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Total Quoted Amount</p>
                                    <p className="text-4xl font-black font-mono tracking-tighter">
                                        ₹ {reviewingOrder.items?.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0)}
                                    </p>
                                </div>
                                <div className="flex gap-4">
                                    {reviewingOrder.status === "quotation_received" ? (
                                        <>
                                            <button 
                                                onClick={() => handleRejectQuote(reviewingOrder.id)}
                                                className="bg-transparent hover:bg-white/10 text-white font-black px-8 py-4 rounded-2xl transition-all hover:scale-105 active:scale-95 border-2 border-white"
                                            >
                                                Reject
                                            </button>
                                            <button 
                                                onClick={() => handleAcceptQuote(reviewingOrder.id, reviewingOrder.items?.reduce((acc, item) => acc + (item.price || 0) * item.quantity, 0) || 0)}
                                                className="bg-white hover:bg-teal-50 text-teal-600 font-black px-10 py-4 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 border border-white"
                                            >
                                                Accept Quote
                                            </button>
                                        </>
                                    ) : (
                                        <button 
                                            onClick={() => setReviewingOrder(null)}
                                            className="bg-white hover:bg-slate-50 text-teal-700 font-black px-10 py-3 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 border border-white"
                                        >
                                            Close Details
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Footer />
        </main>
    );
}
