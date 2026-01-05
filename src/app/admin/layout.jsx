"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Link from 'next/link';
import { Menu } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function AdminLayout({ children }) {
    const { user } = useAuth();

    return (
        <ProtectedRoute allowedRoles={['center']}>
            <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-10">
                {/* Navbar (Reused style) */}
                <nav className="bg-[#1E3A8A] text-white w-full shadow-md sticky top-0 z-50">
                    <div className="w-full px-6 py-4 flex justify-between items-center">
                        <div className="flex flex-col">
                            <Link href="/" className="text-2xl font-bold tracking-tight hover:opacity-90 transition">
                                ThaiSave(ไทยเซฟ)
                            </Link>
                            <span className="text-[11px] text-blue-200 font-light tracking-widest opacity-80">
                                ระบบจัดการแอดมิน
                            </span>
                        </div>

                        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
                            <Link href="/center" className="hover:text-yellow-400 transition opacity-80 hover:opacity-100">แดชบอร์ด</Link>
                            <span className="text-yellow-400 font-bold border-b-2 border-yellow-400 pb-1 cursor-default">จัดการผู้ใช้งาน</span>

                            {/* Current Admin Profile */}
                            <div className="flex items-center gap-3 pl-6 border-l border-blue-700/50">
                                <div className="text-right hidden lg:block">
                                    <div className="text-sm font-bold leading-tight">{user?.displayName || 'Admin'}</div>
                                    <div className="text-[10px] text-blue-200 font-light">{user?.email}</div>
                                </div>
                                <div className="w-9 h-9 rounded-full bg-yellow-400 border-2 border-yellow-200 overflow-hidden flex items-center justify-center text-[#1E3A8A] font-bold shadow-sm">
                                    {user?.photoURL ? (
                                        <img src={user.photoURL} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span>{user?.displayName?.[0] || 'A'}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>
                {children}
            </div>
        </ProtectedRoute>
    );
}
