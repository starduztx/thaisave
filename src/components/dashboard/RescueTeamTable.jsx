"use client";
import React from 'react';

export default function RescueTeamTable({ reports }) {

    // 1. จัดกลุ่มข้อมูล (Logic เดิม)
    const teamStats = reports.reduce((acc, curr) => {
        if (curr.status !== 'traveling' && curr.status !== 'completed') {
            return acc;
        }

        const teamName = curr.responderName || "ไม่ระบุทีม";
        
        if (!acc[teamName]) {
            acc[teamName] = {
                totalCases: 0,
                completedCases: 0,
                totalTime: 0,
                countWithTime: 0
            };
        }

        acc[teamName].totalCases += 1;

        if (curr.status === 'completed') {
            acc[teamName].completedCases += 1;

            if (curr.timestamp && curr.lastUpdated) {
                const start = curr.timestamp.seconds ? curr.timestamp.seconds * 1000 : new Date(curr.timestamp).getTime();
                let end = null;
                if (typeof curr.lastUpdated === 'string') {
                    end = new Date(curr.lastUpdated).getTime();
                } else if (curr.lastUpdated.seconds) {
                    end = curr.lastUpdated.seconds * 1000;
                }
                
                if (start && end && end > start) {
                    const diffMinutes = (end - start) / (1000 * 60);
                    acc[teamName].totalTime += diffMinutes;
                    acc[teamName].countWithTime += 1;
                }
            }
        }

        return acc;
    }, {});

    // 2. จัดเรียงข้อมูล (Logic เดิม)
    const tableData = Object.keys(teamStats).map(name => {
        const stats = teamStats[name];
        const successRate = stats.totalCases > 0 
            ? Math.round((stats.completedCases / stats.totalCases) * 100) 
            : 0;

        return {
            name: name,
            total: stats.totalCases,
            success: stats.completedCases,
            successRate: successRate,
            avgTime: stats.countWithTime > 0 ? Math.round(stats.totalTime / stats.countWithTime) : '-'
        };
    }).sort((a, b) => b.total - a.total);

    if (tableData.length === 0) {
        return (
            <div className="space-y-4 mb-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 px-1">
                    <h2 className="text-xl font-bold text-gray-800">ประสิทธิภาพทีมกู้ภัย</h2>
                </div>
                <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                        <div className="bg-gray-100 p-3 rounded-full">
                           {/* ไอคอน Chart */}
                           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>
                        </div>
                        <h3 className="text-gray-500 font-medium">ยังไม่มีข้อมูลประสิทธิภาพ</h3>
                        <p className="text-sm text-gray-400 max-w-xs">
                            ตารางนี้จะแสดงข้อมูลเมื่อมีการ "กดรับงาน (กำลังช่วยเหลือ)" หรือ "ปิดงาน (เสร็จสิ้น)" แล้วเท่านั้น
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // --- ส่วนแสดงผลที่ปรับแก้ ---
    return (
        <div className="space-y-6 mb-6"> {/* Wrapper หลัก */}
            
            {/* 1. หัวข้อ (อยู่นอกการ์ดแล้ว) */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 px-1">
                <h2 className="text-2xl font-bold text-gray-800">ประสิทธิภาพทีมกู้ภัย</h2>
            </div>
            
            {/* 2. การ์ดสีขาว (เหลือแค่ตาราง) */}
            <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[600px] border-collapse">
                        <thead>
                            <tr className="bg-blue-500 text-white text-left">
                                <th className="p-4 font-semibold w-1/3">ชื่อทีม</th>
                                <th className="p-4 font-semibold text-center">รับงาน (เคส)</th>
                                <th className="p-4 font-semibold text-center text-green-100">สำเร็จ (%)</th>
                                <th className="p-4 font-semibold text-right">เวลาเฉลี่ย (นาที)</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-700">
                            {tableData.map((row, index) => (
                                <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-medium text-gray-900">
                                        {row.name}
                                    </td>
                                    
                                    <td className="p-4 font-bold text-center">
                                        {row.total}
                                    </td>

                                    <td className="p-4 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="font-bold text-green-600">{row.success}</span>
                                            <span className="text-xs text-gray-400">({row.successRate}%)</span>
                                        </div>
                                    </td>

                                    <td className="p-4 text-right font-mono">
                                        {row.avgTime !== '-' ? `${row.avgTime} น.` : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}