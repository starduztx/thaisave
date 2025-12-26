"use client";

import { Target, Eye, Users, Heart, Award, ShieldCheck, Menu } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function AboutPage() {
    return (
        <div className="min-h-screen flex flex-col bg-slate-50">

            {/* --- NAVBAR (Consistent with Landing Page) --- */}
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
                        <Link href="/contact" className="hover:text-yellow-400 transition">ติดต่อ</Link>
                        <Link href="/about" className="text-yellow-400 font-bold">เกี่ยวกับ</Link>
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
                <h1 className="text-4xl md:text-5xl font-bold text-[#1E3A8A] mb-12">เกี่ยวกับเรา</h1>

                <div className="flex flex-col gap-8">
                    {/* Mission Card */}
                    <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-sm relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <ShieldCheck className="w-8 h-8 text-blue-600" />
                                <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A8A]">เกี่ยวกับ</h2>
                            </div>

                            <div className="space-y-6 text-gray-600 leading-relaxed text-lg md:text-xl">
                                <p>
                                    เราคือระบบกลางจัดการภัยพิบัติแห่งชาติ ที่มุ่งมั่นพัฒนา
                                    เทคโนโลยีเพื่อเชื่อมโยงข้อมูลระหว่างผู้ประสบภัย หน่วยงาน
                                    กู้ภัย และศูนย์ประสานงาน ให้เป็นหนึ่งเดียว
                                    เป้าหมายหลักคือการลดความสูญเสีย และเพิ่มประสิทธิภาพการเข้าถึง
                                    พื้นที่เกิดเหตุให้รวดเร็วที่สุด เพื่อให้ทุกชีวิตได้รับการช่วยเหลืออย่างทัน
                                    ท่วงทีและปลอดภัย
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Vision Card */}
                    <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-sm relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <Eye className="w-8 h-8 text-blue-600" />
                                <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A8A]">วิสัยทัศน์</h2>
                            </div>

                            <div className="text-gray-600 leading-relaxed text-lg md:text-xl">
                                <p>
                                    เป็นแพลตฟอร์มหลักที่ได้รับความไว้วางใจใน
                                    การบริหารจัดการสถานการณ์ฉุกเฉินระดับชาติ
                                    สร้างมาตรฐานความปลอดภัยใหม่ให้กับสังคม
                                    และเป็นต้นแบบเทคโนโลยีเพื่อการช่วยเหลือที่
                                    ยั่งยืน
                                </p>

                            </div>
                        </div>
                    </div>
                </div>



            </main>

            <footer className="bg-white py-8 border-t border-gray-100">
                <div className="container mx-auto px-6 text-center">
                    <p className="text-gray-600 font-medium mb-1">© 2025 ThaiSave Project. All rights reserved.</p>
                    <p className="text-gray-400 text-sm">โครงการเพื่อสังคม โดยทีมพัฒนาอาสาสมัคร</p>
                </div>
            </footer>
        </div >
    );
}
