// File: src/app/rescue/layout.jsx
// Location: Layout สำหรับส่วนกู้ภัย (Rescue)
// หน้าที่: กำหนด Metadata และโครงสร้างพื้นฐานของหน้ากู้ภัย

export const metadata = {
  title: "Rescue Dashboard | ThaiSave",
  description: "ระบบบริหารจัดการภัยพิบัติสำหรับเจ้าหน้าที่กู้ภัย",
};

import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function RescueLayout({ children }) {
  return (
    <ProtectedRoute allowedRoles={['rescue', 'center']}>
      <div className="w-full min-h-screen font-sans">
        {children}
      </div>
    </ProtectedRoute>
  );
}