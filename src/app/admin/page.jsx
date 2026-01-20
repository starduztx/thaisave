"use client";

import { useState, useEffect } from "react";
import Link from 'next/link';
import { db } from "@/lib/db";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { Check, X, Shield, User, Trash2, Users } from "lucide-react";
import RescueTeamTable from "@/components/dashboard/RescueTeamTable";

export default function AdminPage() {
    const [pendingUsers, setPendingUsers] = useState([]);
    const [activeUsers, setActiveUsers] = useState([]);
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // --- ส่วนที่ A: ดึงข้อมูล Users (ของเดิม) ---
        const qUsers = query(collection(db, "users"), orderBy("createdAt", "desc"));
        const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
            const allUsers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPendingUsers(allUsers.filter(u => u.role === 'pending'));
            setActiveUsers(allUsers.filter(u => u.role !== 'pending'));
        });

        // --- ส่วนที่ B: ดึงข้อมูล Reports
        const qReports = query(collection(db, "reports"));
        const unsubscribeReports = onSnapshot(qReports, (snapshot) => {
            const allReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setReports(allReports); // เก็บลง State
            setLoading(false);
        });

        return () => {
            unsubscribeUsers();
            unsubscribeReports();
        };
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

    const handleDeleteUser = async (userId, userName) => {
        if (!confirm(`⚠️ คำเตือน: คุณต้องการลบผู้ใช้ "${userName}" ออกจากระบบถาวรใช่หรือไม่?\n\nข้อมูลใน Database จะหายไปและกู้คืนไม่ได้!`)) return;

        try {
            await deleteDoc(doc(db, "users", userId));
        } catch (error) {
            console.error(error);
            alert("เกิดข้อผิดพลาดในการลบ: " + error.message);
        }
    };

    return (
        <main className="container mx-auto px-4 py-8 max-w-5xl">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">แผงควบคุมผู้ดูแลระบบ</h1>
                    <p className="text-gray-500 text-sm">จัดการสิทธิ์ผู้ใช้งานและติดตามประสิทธิภาพทีมกู้ภัย</p>
                </div>

                <Link
                    href="/admin/teams"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-bold shadow-sm flex items-center gap-2 transition"
                >
                    <Users size={20} />
                    จัดการทีมกู้ภัย
                </Link>
            </div>

            <section className="mb-10">
                {/* ส่งข้อมูล reports ไปให้ตารางคำนวณเอง */}
                <RescueTeamTable reports={reports} />
            </section>

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
                                                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1"
                                                    title="อนุมัติ"
                                                >
                                                    <Check size={14} /> อนุมัติ
                                                </button>
                                                <button
                                                    onClick={() => handleReject(user.id, user.name)}
                                                    className="bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1"
                                                    title="ปฏิเสธ (เก็บประวัติ)"
                                                >
                                                    <X size={14} /> ปฏิเสธ
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user.id, user.name)}
                                                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1"
                                                    title="ลบทิ้งถาวร"
                                                >
                                                    <Trash2 size={14} /> ลบ
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

            {/* Rescue Officers List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-green-600" /> เจ้าหน้าที่กู้ภัย ({activeUsers.filter(u => u.role === 'rescue').length})
                    </h2>
                </div>

                <div className="p-0">
                    {activeUsers.filter(u => u.role === 'rescue').length === 0 ? (
                        <div className="p-8 text-center text-gray-400">ยังไม่มีเจ้าหน้าที่กู้ภัยในระบบ</div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                                <tr>
                                    <th className="px-6 py-3 font-medium">ชื่อเจ้าหน้าที่</th>
                                    <th className="px-6 py-3 font-medium">อีเมล</th>
                                    <th className="px-6 py-3 font-medium">วันที่เข้าร่วม</th>
                                    <th className="pl-6 pr-6 py-3 font-medium text-right">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {activeUsers.filter(u => u.role === 'rescue').map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition">
                                        <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-3">
                                            {user.photoURL ? (
                                                <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />
                                            ) : (
                                                <div className="w-8 h-8 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center text-xs font-bold">R</div>
                                            )}
                                            {user.name || "ไม่ระบุชื่อ"}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 text-sm">{user.email}</td>
                                        <td className="px-6 py-4 text-gray-400 text-xs">
                                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString('th-TH') : '-'}
                                        </td>
                                        <td className="pl-6 pr-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDeleteUser(user.id, user.name)}
                                                className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition"
                                                title="ลบผู้ใช้"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </main>
    );
}
