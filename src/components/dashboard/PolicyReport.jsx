import React, { useMemo } from 'react';

export default function PolicyReport({ reports = [] }) {

    // --- Data Aggregation ---
    const stats = useMemo(() => {
        const total = reports.length || 1; // Avoid division by zero

        // 1. Status Counts
        const approved = reports.filter(r => ['approved', 'accepted', 'completed'].includes(r.status)).length;
        const pending = reports.filter(r => !['approved', 'accepted', 'completed'].includes(r.status)).length;

        // 2. Type Distribution (Pie Chart)
        const types = reports.reduce((acc, curr) => {
            const type = curr.disasterType || 'ไม่ระบุ';
            acc[type] = (acc[type] || 0) + 1;
            return acc;
        }, {});

        // 3. Risk Areas (Top 5 Locations)
        const locations = reports.reduce((acc, curr) => {
            const loc = curr.location || 'ไม่ระบุพิกัด';
            acc[loc] = (acc[loc] || 0) + 1;
            return acc;
        }, {});
        const topLocations = Object.entries(locations)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5);

        // 4. Peak Times (Hour Distribution 00-23)
        const timeDist = new Array(24).fill(0);
        reports.forEach(r => {
            if (r.timestamp) {
                // Timestamp might be Firestore Timestamp or string
                const date = r.timestamp.toDate ? r.timestamp.toDate() : new Date(r.timestamp);
                if (!isNaN(date)) {
                    timeDist[date.getHours()]++;
                }
            }
        });

        return {
            total,
            approved,
            pending,
            successRate: Math.round((approved / total) * 100),
            types,
            topLocations,
            timeDist
        };
    }, [reports]);

    // --- Helpers for Charts ---
    const TYPE_COLORS = {
        'น้ำท่วม': '#2574ebff', // Blue
        'ไฟไหม้': '#ff3300ff', // Red
        'ดินถล่ม': '#FFCE56', // Yellow
        'default': '#E5E7EB'  // Gray
    };
    const DEFAULT_COLORS = ['#2574ebff', '#FFCE56', '#ff3300ff']; // Fallback for other types

    const getPieSlices = () => {
        let cumulativePercent = 0;
        return Object.entries(stats.types).map(([type, count], index) => {
            const percent = count / stats.total;
            const startX = Math.cos(2 * Math.PI * cumulativePercent);
            const startY = Math.sin(2 * Math.PI * cumulativePercent);
            cumulativePercent += percent;
            const endX = Math.cos(2 * Math.PI * cumulativePercent);
            const endY = Math.sin(2 * Math.PI * cumulativePercent);

            const largeArcFlag = percent > 0.5 ? 1 : 0;

            // Determine color
            let color = TYPE_COLORS[type] || DEFAULT_COLORS[index % DEFAULT_COLORS.length];

            // Handle single item case (full circle)
            if (Object.keys(stats.types).length === 1) return { path: '', circle: true, color };

            const pathData = `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
            return { path: pathData, color };
        });
    };

    return (
        <div className="w-full space-y-6 mb-12">
            <div className="flex items-center gap-3">
                <div className="h-8 w-1 bg-[#1E3A8A] rounded-full"></div>
                <h2 className="text-2xl font-bold text-gray-800">รายงานเชิงนโยบาย</h2>
            </div>

            {/* Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

                {/* Card 1: Response Time (Mock) */}
                <div className="bg-white rounded-[20px] p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:shadow-md transition">
                    <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
                    <h3 className="text-gray-500 font-medium mb-4 text-sm">สถิติเวลาเฉลี่ยในการตอบสนอง</h3>
                    <div className="text-4xl font-bold text-blue-600 mb-2">~00:15:00</div>
                    <p className="text-xs text-gray-400">*รอการเก็บข้อมูลจริง</p>
                </div>

                {/* Card 2: Disaster Types (Pie Chart) */}
                <div className="bg-white rounded-[20px] p-6 shadow-sm border border-slate-100 flex flex-col items-center relative overflow-hidden md:col-span-2 lg:col-span-1">
                    <h3 className="text-gray-500 font-medium mb-4 text-sm">สถิติภัยพิบัติทั้งหมด</h3>
                    <div className="mt-2 relative w-32 h-32">
                        <svg viewBox="-1 -1 2 2" className="transform -rotate-90 w-full h-full">
                            {Object.keys(stats.types).length === 0 ? (
                                <circle cx="0" cy="0" r="1" fill="#E5E7EB" />
                            ) : getPieSlices().map((slice, i) => (
                                slice.circle ?
                                    <circle key={i} cx="0" cy="0" r="1" fill={slice.color} /> :
                                    <path key={i} d={slice.path} fill={slice.color} />
                            ))}
                        </svg>
                        {/* Donut Hole */}
                        <div className="absolute inset-0 m-auto w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-inner">
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="flex flex-wrap justify-center gap-2 mt-4">
                        {Object.keys(stats.types).map((type, i) => {
                            const color = TYPE_COLORS[type] || DEFAULT_COLORS[i % DEFAULT_COLORS.length];
                            return (
                                <div key={type} className="flex items-center gap-1 text-[10px] text-gray-500">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }}></span>
                                    {type}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Card 3: Risk Areas (Bar Chart) */}
                <div className="bg-white rounded-[20px] p-6 shadow-sm border border-slate-100 md:col-span-2">
                    <h3 className="text-gray-500 font-medium mb-6 text-sm">พื้นที่เสี่ยงภัยพิบัติสูงสุด</h3>
                    <div className="space-y-3">
                        {stats.topLocations.length === 0 ? (
                            <p className="text-center text-gray-300 text-sm py-4">ไม่มีข้อมูล</p>
                        ) : stats.topLocations.map(([loc, count], i) => (
                            <div key={loc} className="flex items-center gap-3">
                                <div className="w-24 text-right text-xs text-gray-500 truncate">{loc}</div>
                                <div className="flex-grow h-4 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-red-400 rounded-full opacity-80"
                                        style={{
                                            width: `${(count / (stats.topLocations[0][1] || 1)) * 100}%`
                                        }}
                                    ></div>
                                </div>
                                <div className="text-xs font-bold text-gray-700 w-6">{count}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Card 4: Success Rate */}
                <div className="bg-white rounded-[20px] p-6 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:shadow-md transition">
                    <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-green-400 to-green-600"></div>
                    <h3 className="text-gray-500 font-medium mb-4 text-sm">อัตราการช่วยเหลือสำเร็จ</h3>
                    <div className="text-5xl font-bold text-green-500 mb-2">{stats.successRate}%</div>
                    <p className="text-xs text-gray-400">จากเคสทั้งหมด {stats.total} เคส</p>
                </div>

                {/* Card 5: Time Stats (Mock) */}
                <div className="bg-white rounded-[20px] p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center relative overflow-hidden">
                    <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-yellow-600"></div>
                    <h3 className="text-gray-500 font-medium mb-2 text-sm">เวลาเฉลี่ยแยกตามประเภท</h3>
                    <div className="space-y-4 w-full mt-4">
                        <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                            <span className="text-gray-600">น้ำท่วม</span>
                            <span className="font-bold text-blue-600">~02:00:00</span>
                        </div>
                        <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                            <span className="text-gray-600">ไฟไหม้</span>
                            <span className="font-bold text-red-600">~00:45:00</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-600">ดินถล่ม</span>
                            <span className="font-bold text-yellow-700">~05:00:00</span>
                        </div>
                    </div>
                </div>

                {/* Card 6: Peak Times (Vertical Bar) */}
                <div className="bg-white rounded-[20px] p-6 shadow-sm border border-slate-100 md:col-span-2">
                    <h3 className="text-gray-500 font-medium mb-4 text-sm">ช่วงเวลาที่เกิดเหตุบ่อยที่สุด</h3>
                    <div className="h-48 flex items-end justify-between px-2 gap-1">
                        {stats.timeDist.map((count, hour) => {
                            const max = Math.max(...stats.timeDist) || 1;
                            const height = (count / max) * 100;
                            return (
                                <div key={hour} className="flex flex-col items-center flex-1 group">
                                    {/* Tooltip */}
                                    <div className="hidden group-hover:block absolute bg-black text-white text-[10px] px-2 py-1 rounded -mt-8 z-10">
                                        {hour}:00 น. ({count})
                                    </div>
                                    <div
                                        className={`w-full rounded-t-sm transition-all duration-500 ${height > 0 ? 'bg-green-400 hover:bg-green-500' : 'bg-gray-100'}`}
                                        style={{ height: `${height}%` }}
                                    ></div>
                                    {/* Axis Label (Show every 6 hours) */}
                                    {hour % 6 === 0 && (
                                        <span className="text-[10px] text-gray-400 mt-2">{hour}</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="text-[10px] text-gray-400 text-center mt-2 w-full border-t border-gray-100 pt-1">
                        24 ชั่วโมง (00:00 - 23:59)
                    </div>
                </div>

            </div>
        </div>
    );
}
