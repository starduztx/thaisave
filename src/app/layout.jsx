// File: src/app/layout.jsx
// Location: ไฟล์โครงสร้างหลักของเว็บ (Root Layout)

import { Sarabun } from "next/font/google";
import "./globals.css"; // <--- บรรทัดสำคัญ! เรียกใช้ Tailwind CSS

// ตั้งค่าฟอนต์ภาษาไทย (Sarabun)
const sarabun = Sarabun({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  display: 'swap',
  variable: '--font-sarabun',
});

// ข้อมูลที่จะแสดงบนแถบ Browser (Metadata)
export const metadata = {
  title: "ThaiSave - ระบบช่วยเหลือผู้ประสบภัย",
  description: "Web application for disaster management and rescue coordination",
};

// Component หลักที่เป็นโครงสร้างของทุกหน้า
export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body className={sarabun.className}>
        {children}
      </body>
    </html>
  );
}