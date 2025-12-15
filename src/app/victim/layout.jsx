// File: src/app/victim/layout.jsx
// Location: Layout สำหรับส่วนผู้ประสบภัย
// แก้ไข: ปรับให้เต็มจอ (Full Screen) และลบการ import css ที่ซ้ำซ้อน/ผิด path ออก

export const metadata = {
  title: "แจ้งเหตุฉุกเฉิน | ThaiSave",
  description: "ระบบแจ้งเหตุและติดตามสถานะสำหรับผู้ประสบภัย",
};

export default function VictimLayout({ children }) {
  return (
    // เปลี่ยนจาก bg-slate-200 เป็น bg-white และลบ flex justify-center เพื่อไม่ให้มันบีบตรงกลาง
    <div className="min-h-screen bg-white font-sans w-full">
      
      {/* ลบ max-w-md ออกเพื่อให้กว้างเต็มจอ (w-full) */}
      <div className="w-full min-h-screen relative overflow-hidden">
        {children}
      </div>
      
    </div>
  );
}