"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu } from 'lucide-react';

const LoginPage = () => {
  const { loginWithGoogle, user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
      // Redirect will be handled by the useEffect below
    } catch (err) {
      setError("เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google");
      console.error(err);
    }
  };

  // Redirect Logic
  useEffect(() => {
    // Check if user is logged in
    if (user) {
      // If user is 'victim' (Anonymous), ALLOW them to stay here to login as Admin/Rescue
      if (user.role === 'victim' || user.isAnonymous) {
        return;
      }

      // For actual registered users, redirect to their dashboards
      if (user.role === 'rescue') router.push('/center');
      else if (user.role === 'center') router.push('/center');
      else if (user.role === 'pending') router.push('/pending-approval');
      else {
        router.push('/center');
      }
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white">

      {/* 1. Header (Navbar) */}
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
            <Link href="/center" className="hover:text-yellow-400 transition">แดชบอร์ด</Link>
            <Link href="/rescue" className="hover:text-yellow-400 transition">ช่วยเหลือ/กู้ภัย</Link>
            <div className="flex bg-white rounded-lg shadow-sm border border-transparent hover:border-gray-300 transition overflow-hidden">
              <Link href="/victim">
                <button className="px-4 py-2 text-[#1E3A8A] text-sm font-bold hover:bg-gray-100 transition h-full border-r border-gray-200">
                  แจ้งเหตุ
                </button>
              </Link>
              <Link href="/victim/status">
                <button className="px-4 py-2 text-[#1E3A8A] text-sm font-bold hover:bg-gray-100 transition h-full">
                  สถานะ
                </button>
              </Link>
            </div>
          </div>

          <button className="md:hidden text-white">
            <Menu size={28} />
          </button>
        </div>
      </nav>

      {/* 2. Main Content (Blue Login Card) */}
      <div className="flex-grow flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-[#1E3A8A] p-10 rounded-2xl shadow-2xl text-center">

          <div className="text-white mb-8">
            <h2 className="text-3xl font-bold">เข้าสู่ระบบ</h2>
            <h3 className="text-xl mt-2 font-medium text-blue-100">ผู้ช่วยเหลือ/กู้ภัย</h3>
          </div>

          <div className="space-y-4">
            {/* Google Login */}
            <button
              onClick={handleGoogleLogin}
              className="w-full bg-white text-gray-700 font-bold py-3 px-4 rounded-lg shadow-sm hover:bg-gray-50 transition flex items-center justify-center gap-3 border border-gray-200"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              เข้าสู่ระบบด้วย Google
            </button>
          </div>

          {/* Error Message Display */}
          {error && (
            <div className="mt-4 bg-red-500/20 text-red-100 p-2 rounded text-sm border border-red-500/50">
              {error}
            </div>
          )}

        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white py-10 mt-auto border-t border-gray-100">
        <div className="container mx-auto px-6 text-center">
          <p className="text-gray-600 font-medium mb-2">© 2025 ThaiSave Project. All rights reserved.</p>
          <p className="text-gray-400 text-sm">โครงการเพื่อสังคม โดยทีมพัฒนาอาสาสมัคร</p>
        </div>
      </footer>

    </div>
  );
};

export default LoginPage;