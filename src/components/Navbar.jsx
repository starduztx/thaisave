"use client";
import Link from 'next/link';
import { Menu, User } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function Navbar({ activePage }) {
    const { user, logout } = useAuth();
    const router = useRouter();
    const [isProfileOpen, setProfileOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await logout();
            window.location.href = '/login';
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    return (
        <nav className="bg-[#1E3A8A] text-white w-full shadow-md sticky top-0 z-50">
            <div className="w-full px-6 py-4 flex justify-between items-center">
                {/* Brand */}
                <div className="flex flex-col">
                    <Link href="/" className="text-2xl font-bold tracking-tight hover:opacity-90 transition">
                        ThaiSave(ไทยเซฟ)
                    </Link>
                    <span className="text-[11px] text-blue-200 font-light tracking-widest opacity-80">
                        ระบบกลางจัดการภัยพิบัติแห่งชาติ
                    </span>
                </div>

                {/* Desktop Menu */}
                <div className="hidden md:flex items-center gap-8 text-sm font-medium">
                    {activePage === 'center' ? (
                        <span className="text-yellow-400 font-bold border-b-2 border-yellow-400 pb-1 cursor-default">แดชบอร์ด</span>
                    ) : (
                        <Link href="/center" className="hover:text-yellow-400 transition opacity-80 hover:opacity-100">แดชบอร์ด</Link>
                    )}

                    {activePage === 'rescue' ? (
                        <span className="text-yellow-400 font-bold border-b-2 border-yellow-400 pb-1 cursor-default">ช่วยเหลือ/กู้ภัย</span>
                    ) : (
                        <Link href="/rescue" className="hover:text-yellow-400 transition opacity-80 hover:opacity-100">ช่วยเหลือ/กู้ภัย</Link>
                    )}

                    {activePage === 'admin' && (
                        <span className="text-yellow-400 font-bold border-b-2 border-yellow-400 pb-1 cursor-default">จัดการผู้ใช้งาน</span>
                    )}

                    <div className="relative">
                        <button
                            onClick={() => setProfileOpen(!isProfileOpen)}
                            className="flex items-center hover:bg-white/10 px-3 py-1.5 rounded-lg transition"
                        >
                            <div className="text-right hidden xl:block mr-3">
                                <p className="text-sm font-bold text-white leading-tight">
                                    {user?.displayName || user?.email?.split('@')[0]}
                                </p>
                                <p className="text-[10px] text-blue-200 font-light leading-tight">
                                    {user?.email}
                                </p>
                            </div>
                            <div className="w-9 h-9 rounded-full bg-[#3F6F35] border-2 border-yellow-400 flex items-center justify-center text-white font-bold shadow-sm">
                                {user?.email?.charAt(0).toUpperCase() || <User size={18} />}
                            </div>
                        </button>

                        {/* Dropdown */}
                        {isProfileOpen && (
                            <>
                                <div className="fixed inset-0 z-[40]" onClick={() => setProfileOpen(false)}></div>
                                <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-2xl overflow-hidden z-[50] animate-in fade-in zoom-in-95 duration-150 origin-top-right border border-gray-100/50">
                                    <div className="px-5 py-4 border-b border-gray-100 xl:hidden">
                                        <p className="text-[10px] text-gray-400 font-medium mb-1">เข้าสู่ระบบโดย</p>
                                        <p className="text-sm font-bold text-gray-800 truncate">{user?.email}</p>
                                    </div>

                                    <div className="px-5 py-4 border-b border-gray-100">
                                        <p className="text-[10px] text-gray-400 font-medium mb-1">สถานะ</p>
                                        <p className="text-base font-bold text-[#2563EB]">
                                            {user?.role === 'center' ? 'Admin' : user?.role === 'rescue' ? 'Rescue' : user?.role}
                                        </p>
                                    </div>

                                    <div className="p-2">
                                        <button
                                            onClick={handleLogout}
                                            className="w-full text-left px-4 py-3 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-600 text-sm font-medium transition-colors"
                                        >
                                            ออกจากระบบ
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Mobile Menu Icon */}
                <button className="md:hidden text-white"><Menu size={28} /></button>
            </div>
        </nav>
    );
}
