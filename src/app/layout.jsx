// File: src/app/layout.jsx
// Location: ไฟล์โครงสร้างหลักของเว็บ (Root Layout)

import { Sarabun } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const sarabun = Sarabun({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['thai', 'latin'],
  display: 'swap',
  variable: '--font-sarabun',
});

export const metadata = {
  title: "ThaiSave - ระบบช่วยเหลือผู้ประสบภัย",
  description: "Web application for disaster management and rescue coordination",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body className={sarabun.className}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}