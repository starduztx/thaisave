"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Wait for loading to finish before making any decisions
        if (!loading) {
            if (!user) {
                // No user found -> Redirect to login
                router.push("/login");
            } else if (allowedRoles && !allowedRoles.includes(user.role)) {
                // User exists but wrong role -> Redirect based on their actual role
                if (user.role === 'rescue') router.push('/rescue');
                else if (user.role === 'center') router.push('/center');
                else router.push('/victim');
            }
        }
    }, [user, loading, router, allowedRoles]);

    // Show loading spinner while AuthContext is initializing OR while we are deciding where to redirect
    if (loading || !user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Role check for rendering content (double safety)
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return null;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
