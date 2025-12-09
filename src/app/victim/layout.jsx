// File: src/app/victim/layout.jsx
// Location: Layout สำหรับส่วนผู้ประสบภัย (Mobile First Wrapper)

export const metadata = {
  title: "แจ้งเหตุฉุกเฉิน | ThaiSave",
  description: "ระบบแจ้งเหตุและติดตามสถานะสำหรับผู้ประสบภัย",
};

export default function VictimLayout({ children }) {
  return (
    // พื้นหลังข้างนอกเป็นสีเทาเข้มหน่อย เพื่อเน้นตัวแอปตรงกลาง
    <div className="min-h-screen bg-slate-200 flex justify-center font-sans">
      
      {/* Mobile Container: บีบความกว้างให้เหมือนมือถือ และอยู่ตรงกลาง */}
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl relative overflow-hidden">
        {children}
      </div>
      
    </div>
  );
}