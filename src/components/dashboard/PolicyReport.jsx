"use client";
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend ,CartesianGrid} from 'recharts';

const COLORS = ['#93C5FD', '#FCA5A5', '#FCD34D', '#86EFAC', '#C4B5FD'];

export default function PolicyReport({ reports }) {
  const [barData, setBarData] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. คำนวณอัตราความสำเร็จ
  const totalCases = reports.length;
  const successCases = reports.filter(r => r.status === 'completed').length;
  const successRate = totalCases > 0 ? Math.round((successCases / totalCases) * 100) : 0;

  // 2. ข้อมูลกราฟวงกลม (Donut Chart)
  const disasterStats = reports.reduce((acc, curr) => {
    const type = curr.disasterType || "อื่นๆ";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  
  const pieData = Object.keys(disasterStats).map(key => ({
    name: key,
    value: disasterStats[key]
  }));

  // 3. ระบบแปลงพิกัดเป็นชื่อจังหวัด (ทำงานอัตโนมัติ)
  useEffect(() => {
    const processLocations = async () => {
      setLoading(true);
      const provinceCount = {};

      // วนลูปเช็คทุกเคส
      const promises = reports.map(async (report) => {
        let provinceName = "ไม่ระบุ";

        // กรณี A: มีชื่อจังหวัดใน field location อยู่แล้ว (เช่น "จ.สงขลา")
        if (report.location && (report.location.includes("จ.") || report.location.includes("จังหวัด"))) {
           const match = report.location.match(/(?:จ\.|จังหวัด)\s*([^\s]+)/);
           if (match) provinceName = match[1];
        } 
        // กรณี B: ไม่มีชื่อ แต่มีพิกัด (Lat/Long) -> ให้ยิง API ไปถามชื่อจังหวัด
        else if (report.latitude && report.longitude) {
            try {
                // ใช้ API ฟรีของ BigDataCloud (แม่นยำระดับจังหวัด)
                const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${report.latitude}&longitude=${report.longitude}&localityLanguage=th`);
                const data = await res.json();
                // ดึงชื่อจังหวัดจากผลลัพธ์ (principalSubdivision = จังหวัด)
                if (data.principalSubdivision) {
                    provinceName = data.principalSubdivision.replace("จังหวัด", "").trim(); // ตัดคำว่าจังหวัดออกเพื่อความสวยงาม
                }
            } catch (error) {
                console.error("Geocoding error", error);
            }
        }

        // นับจำนวน
        provinceCount[provinceName] = (provinceCount[provinceName] || 0) + 1;
      });

      // รอให้แปลงทุกเคสเสร็จ
      await Promise.all(promises);

      // จัดรูปแบบข้อมูลลงกราฟ
      const formattedData = Object.keys(provinceCount)
        .map(key => ({ name: key, count: provinceCount[key] }))
        .sort((a, b) => b.count - a.count) // เรียงมากไปน้อย
        .slice(0, 5); // เอาท็อป 5

      setBarData(formattedData);
      setLoading(false);
    };

    if (reports.length > 0) {
      processLocations();
    }
  }, [reports]);

  // Label ตัวเลขใน Donut Chart
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, value }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="black" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-bold">
        {value}
      </text>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">รายงานเชิงนโยบาย</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* CARD 1: อัตราความสำเร็จ */}
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center justify-center border-b-4 border-green-500 min-h-[300px]">
          <h3 className="text-gray-600 mb-8 font-medium">อัตราการรับช่วยเหลือสำเร็จ</h3>
          <div className="text-center">
             <span className="text-6xl font-bold text-green-500">{successRate}%</span>
             <p className="text-gray-500 mt-4 text-sm">
                จากเคสทั้งหมด {totalCases} เคส
             </p>
             <p className="text-gray-600 font-bold text-lg">
                ช่วยเหลือสำเร็จ {successCases} เคส
             </p>
          </div>
        </div>

        {/* CARD 2: สถิติภัยพิบัติ */}
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center border-b-4 border-blue-500 min-h-[300px]">
          <h3 className="text-gray-600 mb-4 font-medium">สถิติภัยพิบัติทั้งหมด</h3>
          <div className="w-full h-[200px] relative">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    labelLine={false}
                    label={renderCustomizedLabel}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
             </ResponsiveContainer>
          </div>
        </div>

        {/* CARD 3: พื้นที่เสี่ยง (แก้ไขส่วนนี้) */}
        <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center border-b-4 border-yellow-400 min-h-[300px]">
          <h3 className="text-gray-600 mb-4 font-medium">พื้นที่เกิดภัยพิบัติสูงสุด</h3>
          <div className="w-full h-[200px] pl-2 flex items-center justify-center">
            {loading ? (
                <div className="text-gray-400 text-sm animate-pulse">กำลังวิเคราะห์ข้อมูลพิกัด...</div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    layout="vertical"
                    data={barData}
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                    {/* ✅ 1. เพิ่ม Grid แนวตั้ง (เส้นจางๆ) */}
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.5} />

                    {/* ✅ 2. เอา hide ออก และปรับแต่งตัวเลขแกน X */}
                    <XAxis 
                        type="number" 
                        tick={{fontSize: 10}} // ปรับขนาดตัวเลข
                        axisLine={false}      // ซ่อนเส้นแกนทึบๆ
                        tickLine={false}      // ซ่อนขีดเล็กๆ
                    />

                    <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={90} 
                        tick={{fontSize: 12}}
                        interval={0}
                    />
                    <Tooltip cursor={{fill: 'transparent'}} />
                    <Bar dataKey="count" fill="#FCA5A5" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
                </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}