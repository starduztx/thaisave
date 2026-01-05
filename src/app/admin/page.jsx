"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/db";
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from "firebase/firestore";
import { Check, X, Shield, User } from "lucide-react";

export default function AdminPage() {
    const [pendingUsers, setPendingUsers] = useState([]);
    const [activeUsers, setActiveUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch users
        const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            setPendingUsers(allUsers.filter(u => u.role === 'pending'));
            setActiveUsers(allUsers.filter(u => u.role !== 'pending'));
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleApprove = async (userId, userName) => {
        if (!confirm(`ยืนยันการอนุมัติสิทธิ์ให้คุณ ${userName || 'User'}?`)) return;

        try {
            await updateDoc(doc(db, "users", userId), {
                role: 'rescue'
            });
            // Optional: alert('อนุมัติเรียบร้อย');
        } catch (error) {
            console.error(error);
            alert("เกิดข้อผิดพลาด: " + error.message);
        }
    };

    const handleReject = async (userId, userName) => {
        if (!confirm(`ยืนยันการปฏิเสธสิทธิ์คุณ ${userName || 'User'}?`)) return;

        try {
            await updateDoc(doc(db, "users", userId), {
                role: 'rejected'
            });
        } catch (error) {
            console.error(error);
            alert("เกิดข้อผิดพลาด: " + error.message);
        }
    };

    return (
        <main className="container mx-auto px-4 py-8 max-w-5xl">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">จัดการสิทธิ์การเข้าใช้งาน</h1>
                <p className="text-gray-500 text-sm">อนุมัติผู้ขอใช้งานใหม่เพื่อเข้าสู่ระบบกู้ภัย</p>
            </div>

            {/* Pending Section */}
            <div className="bg-white rounded-xl shadow-sm border border-orange-200 overflow-hidden mb-8">
                <div className="bg-orange-50 px-6 py-4 border-b border-orange-100 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-orange-800 flex items-center gap-2">
                        <User className="w-5 h-5" /> รอการอนุมัติ ({pendingUsers.length})
                    </h2>
                </div>

                <div className="p-0">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>
                    ) : pendingUsers.length === 0 ? (
                        <div className="p-8 text-center text-gray-400">ไม่มีคำขอที่รออนุมัติ</div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-orange-50/50 text-xs text-gray-500 uppercase">
                                <tr>
                                    <th className="px-6 py-3 font-medium">ชื่อผู้ใช้งาน</th>
                                    <th className="px-6 py-3 font-medium">อีเมล</th>
                                    <th className="px-6 py-3 font-medium">วันที่สมัคร</th>
                                    <th className="pl-6 pr-6 py-3 font-medium">ดำเนินการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {pendingUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                                            {user.photoURL ? (
                                                <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />
                                            ) : (
                                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 text-xs">U</div>
                                            )}
                                            {user.name || "ไม่ระบุชื่อ"}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 text-sm">{user.email}</td>
                                        <td className="px-6 py-4 text-gray-400 text-xs">
                                            {user.createdAt ? new Date(user.createdAt).toLocaleString('th-TH') : '-'}
                                        </td>
                                        <td className="pl-6 pr-6 py-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleApprove(user.id, user.name)}
                                                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1"
                                                >
                                                    <Check size={14} /> อนุมัติ
                                                </button>
                                                <button
                                                    onClick={() => handleReject(user.id, user.name)}
                                                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1"
                                                >
                                                    <X size={14} /> ปฏิเสธ
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Approved List (Collapsible or just list) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-green-600" /> เจ้าหน้าที่กู้ภัย ({activeUsers.filter(u => u.role === 'rescue').length})
                    </h2>
                </div>
                {/* Simple list of approved users could go here, for now keeping it collapsed/simple */}
                <div className="p-6 text-sm text-gray-500">
                    มีเจ้าหน้าที่กู้ภัยทั้งหมด {activeUsers.filter(u => u.role === 'rescue').length} คน (และ Admin {activeUsers.filter(u => u.role === 'center').length} คน)
                </div>
            </div>
        </main>
    );
}
