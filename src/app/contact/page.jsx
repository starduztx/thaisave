"use client";

import { Mail, Phone, MapPin, Send, MessageSquare, Menu } from 'lucide-react';
import Link from 'next/link';

export default function ContactPage() {
    return (
        <div className="min-h-screen flex flex-col font-sans bg-slate-50">

            {/* --- NAVBAR --- */}
            <nav className="bg-[#1E3A8A] text-white w-full shadow-md sticky top-0 z-50">
                <div className="w-full px-6 py-4 flex justify-between items-center">
                    <div className="flex flex-col">
                        <Link href="/" className="text-2xl font-bold tracking-tight hover:opacity-90 transition">
                            ThaiSave(ไทยเซฟ)
                        </Link>
                        <span className="text-[11px] text-blue-200 font-light tracking-widest opacity-80">
                            ระบบกลางจัดการภัยพิบัติแห่งชาติ
                        </span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium">
                        <Link href="/center" className="hover:text-yellow-400 transition">ส่วนกลาง/ศูนย์ช่วยเหลือ</Link>
                        <Link href="/rescue" className="hover:text-yellow-400 transition">ช่วยเหลือ/กู้ภัย</Link>
                        <Link href="/contact" className="text-yellow-400 font-bold">ติดต่อ</Link>
                        <Link href="/about" className="hover:text-yellow-400 transition">เกี่ยวกับ</Link>
                        <Link href="/victim">
                            <button className="bg-white text-[#1E3A8A] px-6 py-2 rounded font-bold hover:bg-gray-100 transition shadow-sm border border-transparent hover:border-gray-300">
                                แจ้งเหตุ
                            </button>
                        </Link>
                    </div>
                    <button className="md:hidden text-white">
                        <Menu size={28} />
                    </button>
                </div>
            </nav>

            <main className="container mx-auto px-6 py-12 flex-grow">
                <h1 className="text-4xl md:text-5xl font-bold text-[#1E3A8A] mb-12">ติดต่อ</h1>

                {/* --- MAIN CONTENT --- */}


                <div className="flex flex-col gap-8">
                    {/* Contact Channels Card */}
                    <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-sm relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-8">
                            <Phone className="w-8 h-8 text-blue-600" />
                            <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A8A]">ช่องทางการติดต่อ</h2>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8 text-gray-600">
                            <div className="flex flex-col gap-2">
                                <span className="text-lg font-bold text-[#1E3A8A]">โทรศัพท์ฉุกเฉิน</span>
                                <div className="text-xl md:text-2xl font-bold">
                                    <p>1669</p>
                                    <p>02-123-4567</p>
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <span className="text-lg font-bold text-[#1E3A8A]">อีเมล</span>
                                <p className="text-xl md:text-2xl">contact@thaisave.org</p>
                            </div>
                        </div>
                    </div>

                    {/* Line Official Card */}
                    <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-sm relative overflow-hidden">
                        <div className="flex items-center gap-3 mb-8">
                            <MessageSquare className="w-8 h-8 text-green-500" />
                            <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A8A]">LINE Official</h2>
                        </div>

                        <div className="flex flex-col md:flex-row items-center gap-8">
                            {/* QR Code from API */}
                            <div className="bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                                <img
                                    src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://line.me/ti/p/@ThaiSave"
                                    alt="Line Official QR Code"
                                    className="w-48 h-48 object-contain"
                                />
                            </div>

                            <div className="text-center md:text-left space-y-2">
                                <p className="text-lg text-gray-600">แอดไลน์เพื่อแจ้งเหตุหรือสอบถามข้อมูล</p>
                                <p className="text-2xl font-bold text-green-600">@ThaiSave</p>
                                <button className="mt-2 bg-green-500 text-white px-6 py-2 rounded-full font-bold hover:bg-green-600 transition shadow-sm">
                                    เพิ่มเพื่อน
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            </main>

            {/* Footer */}
            <footer className="bg-white py-10 mt-auto border-t border-gray-100">
                <div className="container mx-auto px-6 text-center">
                    <p className="text-gray-600 font-medium mb-2">© 2025 ThaiSave Project. All rights reserved.</p>
                    <p className="text-gray-400 text-sm">โครงการเพื่อสังคม โดยทีมพัฒนาอาสาสมัคร</p>
                </div>
            </footer>
        </div>
    );
}
