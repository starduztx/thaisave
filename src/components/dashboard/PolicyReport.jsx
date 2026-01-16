"use client";
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

const COLORS = ['#93C5FD', '#FCA5A5', '#FCD34D', '#86EFAC', '#C4B5FD'];

export default function PolicyReport({ reports }) {
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

    // 3. ข้อมูลกราฟแท่ง (Bar Chart)
    const provinceStats = reports.reduce((acc, curr) => {
        let provinceName = curr.province || "ไม่ระบุ";

        // ล้างคำนำหน้าทั่วไป
        provinceName = provinceName.replace("จังหวัด", "").replace("จ.", "").trim();

        // ✅ เพิ่มตรงนี้: ดักจับ "กรุงเทพ" ให้เป็นชื่อสั้นๆ
        if (provinceName.includes("กรุงเทพ") || provinceName.includes("กทม")) {
            provinceName = "กรุงเทพฯ";
        }

        // เช็คอีกทีเผื่อค่าว่าง
        if (!provinceName) provinceName = "ไม่ระบุ";

        acc[provinceName] = (acc[provinceName] || 0) + 1;
        return acc;
    }, {});

    // 1. แปลงข้อมูล + กรอง "ไม่ระบุ" ทิ้งก่อนเลย (จะได้ไม่มาแย่งที่)
    let processedData = Object.keys(provinceStats)
        .map(key => ({ name: key, count: provinceStats[key] }))
        .filter(item => item.name !== "ไม่ระบุ") 
        .sort((a, b) => b.count - a.count); // เรียงมาก -> น้อย

    // 2. กำหนดว่าจะโชว์กี่อันดับ (ตามโค้ดคุณคือ 7)
    const TOP_LIMIT = 7; 

    // 3. ตัดเอาพวกตัวท็อปมา
    const topList = processedData.slice(0, TOP_LIMIT);
    
    // 4. เอาพวกที่เหลือ (ลำดับที่ 8 เป็นต้นไป) มารวมพลังกัน
    const othersList = processedData.slice(TOP_LIMIT);
    
    if (othersList.length > 0) {
        // บวกเลขจำนวนของพวกที่เหลือทั้งหมด
        const othersCount = othersList.reduce((sum, item) => sum + item.count, 0);
        
        // สร้างแท่งใหม่ชื่อ "อื่นๆ" ต่อท้าย
        topList.push({ name: "อื่นๆ", count: othersCount });
    }

    // ส่งค่าไปใช้ในกราฟ
    const barData = topList; 

    // Label ตัวเลขใน Donut Chart
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, value }) => {
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        return (
            <text x={x} y={y} fill="black" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">รายงานเชิงนโยบาย</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* CARD 1: อัตราความสำเร็จ */}
                <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center border-b-4 border-green-500 min-h-[300px]">
                    <h3 className="text-gray-600 mb-4 font-medium">อัตราการรับช่วยเหลือสำเร็จ</h3>
                    <div className="text-center mt-6">
                        <span className="text-7xl font-bold text-green-500 tracking-tight">{successRate}%</span>
                        <p className="text-gray-500 mt-6 text-sm">
                            จากเคสทั้งหมด {totalCases} เคส
                        </p>
                        <p className="text-gray-600 font-bold text-lg mt-4">
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
                                    {pieData.map((entry, index) => {
                                        let fillColor = '#CBD5E1'; // Default Gray
                                        const name = entry.name.toLowerCase();

                                        if (name.includes('น้ำท่วม') || name.includes('flood')) fillColor = '#60A5FA';
                                        else if (name.includes('ไฟไหม้') || name.includes('fire')) fillColor = '#F87171';
                                        else if (name.includes('ดินถล่ม') || name.includes('landslide')) fillColor = '#FCD34D';

                                        return <Cell key={`cell-${index}`} fill={fillColor} />;
                                    })}
                                </Pie>
                                <Tooltip />
                                <Legend layout="vertical" verticalAlign="middle" align="left" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* CARD 3: พื้นที่เสี่ยง (แก้ไขแล้ว: ดึงจาก province) */}
                <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col items-center border-b-4 border-yellow-400 min-h-[300px]">
                    <h3 className="text-gray-600 mb-4 font-medium">พื้นที่เกิดภัยพิบัติสูงสุด</h3>
                    <div className="w-full h-[200px] pl-2 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                layout="vertical"
                                data={barData}
                                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                            >
                                {/* Grid แนวตั้ง */}
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.5} />

                                <XAxis
                                    type="number"
                                    tick={{ fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                />

                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={70}
                                    tick={{ fontSize: 12 }}
                                    interval={0}
                                />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="count" fill="#FCA5A5" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
}