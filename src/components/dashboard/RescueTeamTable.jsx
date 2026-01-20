"use client";
import React from 'react';

const getTeamName = (responderId, teams) => {
    if (!teams || teams.length === 0) return null;
    const team = teams.find(t => t.members && t.members.includes(responderId));
    return team ? team.name : null;
};

const calculateMemberStats = (reports) => {
    const statsMap = reports.reduce((acc, curr) => {
        if (curr.status !== 'traveling' && curr.status !== 'completed') return acc;

        const name = curr.responderName || "ไม่ระบุชื่อ";
        if (!acc[name]) {
            acc[name] = { totalCases: 0, completedCases: 0, totalTime: 0, countWithTime: 0 };
        }
        acc[name].totalCases += 1;

        if (curr.status === 'completed') {
            acc[name].completedCases += 1;
            if (curr.timestamp && curr.lastUpdated) {
                const start = curr.timestamp.seconds ? curr.timestamp.seconds * 1000 : new Date(curr.timestamp).getTime();
                let end = null;
                if (typeof curr.lastUpdated === 'string') end = new Date(curr.lastUpdated).getTime();
                else if (curr.lastUpdated.seconds) end = curr.lastUpdated.seconds * 1000;

                if (start && end && end > start) {
                    acc[name].totalTime += (end - start) / (1000 * 60);
                    acc[name].countWithTime += 1;
                }
            }
        }
        return acc;
    }, {});

    return Object.keys(statsMap).map(name => {
        const s = statsMap[name];
        return {
            name,
            total: s.totalCases,
            success: s.completedCases,
            successRate: s.totalCases > 0 ? Math.round((s.completedCases / s.totalCases) * 100) : 0,
            avgTime: s.countWithTime > 0 ? Math.round(s.totalTime / s.countWithTime) : '-'
        };
    }).sort((a, b) => b.total - a.total);
};

export default function RescueTeamTable({ reports, teams = [], groupByTeam = false }) {

    // --- 🅰️ โหมดปกติ (Admin - ตารางเดียวรวมหมด) ---
    if (!groupByTeam) {
        const tableData = calculateMemberStats(reports);

        if (tableData.length === 0) return <EmptyState />;

        return (
            <div className="space-y-6 mb-6">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 px-1">
                    <h2 className="text-2xl font-bold text-gray-800">ประสิทธิภาพทีมกู้ภัย</h2>
                </div>
                <TableCard data={tableData} headerColor="bg-blue-500" />
            </div>
        );
    }

    // --- 🅱️ โหมดแยกทีม (Center - แยกตารางตามทีม) ---
    // 1. Group reports by Team
    const reportsByTeam = {};
    const noTeamReports = [];

    reports.forEach(r => {
        const teamName = getTeamName(r.responderId, teams);
        if (teamName) {
            if (!reportsByTeam[teamName]) reportsByTeam[teamName] = [];
            reportsByTeam[teamName].push(r);
        } else {
            noTeamReports.push(r);
        }
    });

    // 2. Prepare data for each section
    const teamSections = Object.keys(reportsByTeam).sort().map(teamName => ({
        title: teamName,
        data: calculateMemberStats(reportsByTeam[teamName])
    }));

    // Modified: Hide "No Team" section as requested by user
    /* 
    if (noTeamReports.length > 0) {
        teamSections.push({
            title: "(ไม่มีสังกัด)",
            data: calculateMemberStats(noTeamReports)
        });
    } 
    */

    if (teamSections.length === 0 && noTeamReports.length === 0) return <EmptyState />;

    return (
        <div className="space-y-8 mb-6">
            <h2 className="text-2xl font-bold text-gray-800 px-1">ประสิทธิภาพทีมกู้ภัย (แยกตามทีม)</h2>
            {teamSections.map((section, idx) => (
                section.data.length > 0 && (
                    <div key={idx} className="space-y-2">
                        <h3 className="text-lg font-bold text-gray-700 px-1">{section.title}</h3>
                        <TableCard data={section.data} headerColor={section.title.includes('ไม่มีสังกัด') ? "bg-gray-500" : "bg-blue-500"} />
                    </div>
                )
            ))}
        </div>
    );
}

// --- Sub-components ---
function EmptyState() {
    return (
        <div className="space-y-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 px-1">
                <h2 className="text-xl font-bold text-gray-800">ประสิทธิภาพทีมกู้ภัย</h2>
            </div>
            <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <div className="flex flex-col items-center justify-center gap-3">
                    <div className="bg-gray-100 p-3 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>
                    </div>
                    <h3 className="text-gray-500 font-medium">ยังไม่มีข้อมูลประสิทธิภาพ</h3>
                    <p className="text-sm text-gray-400 max-w-xs">
                        ตารางนี้จะแสดงข้อมูลเมื่อมีการ "กดรับงาน" หรือ "ปิดงาน" แล้วเท่านั้น
                    </p>
                </div>
            </div>
        </div>
    );
}

function TableCard({ data, headerColor }) {
    return (
        <div className="w-full bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] border-collapse">
                    <thead>
                        <tr className={`${headerColor} text-white text-left`}>
                            <th className="p-4 font-semibold w-1/3">ชื่อเจ้าหน้าที่</th>
                            <th className="p-4 font-semibold text-center">รับงาน (เคส)</th>
                            <th className="p-4 font-semibold text-center text-green-100">สำเร็จ (%)</th>
                            <th className="p-4 font-semibold text-right">เวลาเฉลี่ย (นาที)</th>
                        </tr>
                    </thead>
                    <tbody className="text-gray-700">
                        {data.map((row, index) => (
                            <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                                <td className="p-4 font-medium text-gray-900">{row.name}</td>
                                <td className="p-4 font-bold text-center">{row.total}</td>
                                <td className="p-4 text-center">
                                    <div className="flex flex-col items-center">
                                        <span className="font-bold text-green-600">{row.success}</span>
                                        <span className="text-xs text-gray-400">({row.successRate}%)</span>
                                    </div>
                                </td>
                                <td className="p-4 text-right font-mono">{row.avgTime !== '-' ? `${row.avgTime} น.` : '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}