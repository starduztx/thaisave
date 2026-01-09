"use client";

import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Navbar from "@/components/Navbar";
import { useAuth } from '@/context/AuthContext';

export default function AdminLayout({ children }) {
    const { user } = useAuth();

    return (
        <ProtectedRoute allowedRoles={['center']}>
            <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-10">
                {/* Navbar (Reused style) */}
                {/* Shared Navbar */}
                <Navbar activePage="admin" />
                {children}
            </div>
        </ProtectedRoute>
    );
}
