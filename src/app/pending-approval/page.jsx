"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";

export default function PendingApprovalPage() {
    const { user, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // If user is not logged in, go to login
        if (!user) {
            router.push("/login");
        } else if (user.role && user.role !== "pending") {
            // If user is approved (rescue/center), go to dashboard
            router.push("/center");
        }
    }, [user, router]);

    const handleLogout = async () => {
        await logout();
        router.push("/login"); // Explicit redirect after logout
    };

    if (!user) return null; // Or a loading spinner

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden p-8 text-center space-y-6">

                {/* Icon / Image Placeholder */}
                <div className="mx-auto w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clock">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                    </svg>
                </div>

                <h1 className="text-2xl font-bold text-gray-900">รอการอนุมัติสิทธิ์</h1>

                <p className="text-gray-500">
                    บัญชีของคุณ <strong>{user.email}</strong> ได้รับการลงทะเบียนแล้ว <br />
                    กรุณารอเจ้าหน้าที่ตรวจสอบและอนุมัติสิทธิ์การเข้าใช้งาน
                </p>

                <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 text-left">
                    <p className="font-bold mb-1">ขั้นตอนต่อไป:</p>
                    <ul className="list-disc list-inside space-y-1 opacity-90">
                        <li>เจ้าหน้าที่จะตรวจสอบข้อมูลของคุณ</li>
                        <li>เมื่อได้รับการอนุมัติ คุณจะสามารถเข้าใช้งานเมนู "ช่วยเหลือ/กู้ภัย" ได้</li>
                        <li>หากรอนานเกินไป โปรดติดต่อ Admin</li>
                    </ul>
                </div>

                <button
                    onClick={handleLogout}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition"
                >
                    ออกจากระบบ
                </button>
            </div>

            <p className="mt-8 text-gray-400 text-sm">© ThaiSave National Disaster Management</p>
        </div>
    );
}
