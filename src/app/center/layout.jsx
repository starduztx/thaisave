

export const metadata = {
  title: "Center Dashboard | ThaiSave",
  description: "ระบบบริหารจัดการภัยพิบัติสำหรับเจ้าหน้าที่",
};

import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function CenterLayout({ children }) {
  return (
    <ProtectedRoute allowedRoles={['center', 'rescue']}>
      <div className="w-full min-h-screen font-sans">
        {children}
      </div>
    </ProtectedRoute>
  );
}