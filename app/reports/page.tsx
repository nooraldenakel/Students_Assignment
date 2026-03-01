'use client';

import { useState, useMemo, useEffect } from 'react';
import { useStore, Student } from '../../lib/store';
import { useRouter } from 'next/navigation';
import { Download, Users, CheckCircle, Clock, Percent, BarChart3, LayoutGrid, Building2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    Cell as RechartsCell
} from 'recharts';

export default function ReportsPage() {
    const router = useRouter();
    const { currentUser, students, showAlert } = useStore();
    const [mounted, setMounted] = useState(false);
    const [chartView, setChartView] = useState<'List' | 'Department'>('List');

    useEffect(() => {
        setMounted(true);
        if (!currentUser || currentUser.role !== 'Admin') {
            router.push('/');
        }
    }, [currentUser, router]);

    const stats = useMemo(() => {
        const total = students.length;
        const assigned = students.filter((s: Student) => Object.keys(s.assignments).length > 0).length;

        const today = new Date().toDateString();
        const assignedToday = students.filter((s: Student) => {
            return Object.values(s.assignments).some((meta) => {
                if (!meta) return false;
                return new Date(meta.date).toDateString() === today;
            });
        }).length;

        return { total, assigned, assignedToday };
    }, [students]);

    const chartData = useMemo(() => {
        const listData = (['L1', 'L2', 'L3', 'L4'] as const).map(list => ({
            name: list,
            count: students.filter(s => !!s.assignments[list]).length
        }));

        const uniqueDepts = Array.from(new Set(students.map(s => s.department))).sort();
        const deptData = uniqueDepts.map(dept => ({
            name: dept,
            count: students.filter(s => s.department === dept && Object.keys(s.assignments).length > 0).length
        }));

        return { listData, deptData };
    }, [students]);

    const COLORS = ['#137fec', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#84cc16'];

    const exportStats = () => {
        const workbook = XLSX.utils.book_new();

        // 1. Overview Sheet
        const overviewData = [
            { Metric: 'Total Students', Value: stats.total },
            { Metric: 'Assigned Students', Value: stats.assigned },
            { Metric: 'Percentage Assigned', Value: ((stats.assigned / (stats.total || 1)) * 100).toFixed(1) + '%' },
            { Metric: 'Assignments Today', Value: stats.assignedToday }
        ];
        const overviewWs = XLSX.utils.json_to_sheet(overviewData);
        XLSX.utils.book_append_sheet(workbook, overviewWs, "Overview");

        // 2. Full Assignment Data Sheet (Raw details)
        const rawData: any[] = [];
        students.forEach(s => {
            Object.entries(s.assignments).forEach(([list, meta]) => {
                if (meta) {
                    rawData.push({
                        'Student Name': s.name,
                        'Department': s.department,
                        'Study Type': s.studyType,
                        'List': list,
                        'Assigned Date': new Date(meta.date).toLocaleDateString(),
                        'Assigned Time': new Date(meta.date).toLocaleTimeString(),
                        'Assigned By': meta.assignedByUserName
                    });
                }
            });
        });
        const rawWs = XLSX.utils.json_to_sheet(rawData);
        XLSX.utils.book_append_sheet(workbook, rawWs, "Detailed Assignments");

        // 3. By List Summary
        const listSummary = chartData.listData.map(d => ({
            'List Name': d.name,
            'Total Assignments': d.count,
            'Percentage of Total': ((d.count / (stats.total || 1)) * 100).toFixed(1) + '%'
        }));
        const listWs = XLSX.utils.json_to_sheet(listSummary);
        XLSX.utils.book_append_sheet(workbook, listWs, "Summary By List");

        // 4. By Department Summary
        const deptSummary = chartData.deptData.map(d => {
            const totalInDept = students.filter(s => s.department === d.name).length;
            return {
                'Department': d.name,
                'Assigned Students': d.count,
                'Total Students In Dept': totalInDept,
                'Department Percentage': ((d.count / (totalInDept || 1)) * 100).toFixed(1) + '%'
            };
        });
        const deptWs = XLSX.utils.json_to_sheet(deptSummary);
        XLSX.utils.book_append_sheet(workbook, deptWs, "Summary By Dept");

        XLSX.writeFile(workbook, `full_assignment_stats_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    const [calcType, setCalcType] = useState<'List' | 'Department'>('List');
    const [calcSelection, setCalcSelection] = useState<string>('L1');

    const groupedCalcData = useMemo(() => {
        const uniqueDepts = Array.from(new Set(students.map(s => s.department))).sort();
        if (calcType === 'List') {
            const listKey = calcSelection as 'L1' | 'L2' | 'L3' | 'L4';
            const inList = students.filter(s => !!s.assignments[listKey]);
            const totalInList = inList.length;
            if (totalInList === 0) return [];

            return uniqueDepts.map(dept => {
                const count = inList.filter(s => s.department === dept).length;
                return { name: dept, count, percent: ((count / totalInList) * 100).toFixed(1) };
            }).filter(d => parseFloat(d.percent) > 0);
        } else {
            const inDept = students.filter(s => s.department === calcSelection);
            const totalAssignedInDept = inDept.filter(s => Object.keys(s.assignments).length > 0).length;
            if (totalAssignedInDept === 0) return [];

            return (['L1', 'L2', 'L3', 'L4'] as const).map(list => {
                const count = inDept.filter(s => !!s.assignments[list]).length;
                return { name: list, count, percent: ((count / totalAssignedInDept) * 100).toFixed(1) };
            });
        }
    }, [students, calcType, calcSelection]);

    if (!mounted || !currentUser || currentUser.role !== 'Admin') return null;

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Reports & Statistics</h1>
                    <p className="text-sm text-muted-foreground mt-1">Professional analytics for student assignments</p>
                </div>
                <button
                    onClick={exportStats}
                    className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg transition-all text-sm font-medium shadow-sm active:scale-95"
                >
                    <Download className="w-4 h-4" />
                    Export Full Data (Excel)
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard icon={<Users />} label="Total Students" value={stats.total} color="bg-blue-50 text-blue-600" />
                <StatCard icon={<CheckCircle />} label="Assigned Students" value={stats.assigned} color="bg-green-50 text-green-600" />
                <StatCard icon={<Clock />} label="Assigned Today" value={stats.assignedToday} color="bg-purple-50 text-purple-600" />
            </div>

            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/30">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-bold">Assignment Distribution</h2>
                    </div>

                    <div className="flex p-1 bg-gray-100 rounded-xl">
                        <button
                            onClick={() => setChartView('List')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${chartView === 'List' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            By List
                        </button>
                        <button
                            onClick={() => setChartView('Department')}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${chartView === 'Department' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            <Building2 className="w-4 h-4" />
                            By Department
                        </button>
                    </div>
                </div>

                <div className="p-8">
                    <div className="h-[450px] w-full">
                        {chartView === 'List' ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData.listData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                                    <Tooltip cursor={{ fill: '#F1F5F9', radius: 8 }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                    <Bar dataKey="count" fill="#137fec" radius={[8, 8, 0, 0]} barSize={60} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="w-full h-full overflow-x-auto">
                                <div style={{ minWidth: Math.max(800, chartData.deptData.length * 100) }} className="h-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={chartData.deptData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 11 }} angle={-45} textAnchor="end" interval={0} height={60} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                                            <Tooltip cursor={{ fill: '#F1F5F9', radius: 8 }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                            <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={40}>
                                                {chartData.deptData.map((_entry, index) => (
                                                    <RechartsCell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-border shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                    <div className="p-2 bg-primary/5 rounded-lg text-primary"><Percent className="w-5 h-5" /></div>
                    <h2 className="text-lg font-bold">Percentage Calculator</h2>
                </div>
                <div className="flex flex-col md:flex-row gap-6 items-end">
                    <div className="w-full md:w-64">
                        <label className="block text-sm font-semibold text-muted-foreground mb-2 px-1">Calculate By</label>
                        <select
                            className="w-full px-4 py-2.5 rounded-xl border border-border outline-none bg-white font-medium"
                            value={calcType}
                            onChange={(e) => {
                                setCalcType(e.target.value as 'List' | 'Department');
                                setCalcSelection(e.target.value === 'List' ? 'L1' : Array.from(new Set(students.map(s => s.department)))[0] || '');
                            }}
                        >
                            <option value="List">List (L1-L4)</option>
                            <option value="Department">Department</option>
                        </select>
                    </div>
                    <div className="w-full md:w-64">
                        <label className="block text-sm font-semibold text-muted-foreground mb-2 px-1">Selection</label>
                        <select className="w-full px-4 py-2.5 rounded-xl border border-border outline-none bg-white font-medium" value={calcSelection} onChange={(e) => setCalcSelection(e.target.value)}>
                            {calcType === 'List' ? (
                                <>
                                    <option value="L1">L1</option><option value="L2">L2</option><option value="L3">L3</option><option value="L4">L4</option>
                                </>
                            ) : (
                                Array.from(new Set(students.map(s => s.department))).sort().map(dept => <option key={dept} value={dept}>{dept}</option>)
                            )}
                        </select>
                    </div>
                    <div className="bg-primary/5 px-8 py-2.5 rounded-xl border border-primary/10 flex items-center justify-center min-w-[140px] h-[48px]">
                        <span className="font-extrabold text-xl text-primary">
                            {calcType === 'List'
                                ? ((students.filter(s => !!s.assignments[calcSelection as 'L1']).length / (students.length || 1)) * 100).toFixed(1)
                                : ((students.filter(s => s.department === calcSelection && Object.keys(s.assignments).length > 0).length / (students.filter(s => s.department === calcSelection).length || 1)) * 100).toFixed(1)
                            }% Total
                        </span>
                    </div>
                </div>
                {groupedCalcData.length > 0 && (
                    <div className="mt-8 overflow-hidden rounded-2xl border border-border">
                        <table className="w-full text-left border-collapse text-sm">
                            <thead className="bg-muted/50 text-muted-foreground font-bold border-b border-border">
                                <tr>
                                    <th className="px-6 py-4">{calcType === 'List' ? 'Department' : 'List'}</th>
                                    <th className="px-6 py-4">Assigned</th>
                                    <th className="px-6 py-4">Percentage</th>
                                    <th className="px-6 py-4 w-full">Distribution</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {groupedCalcData.map((row: any) => (
                                    <tr key={row.name} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-6 py-4 font-bold text-foreground">{row.name}</td>
                                        <td className="px-6 py-4 font-medium">{row.count}</td>
                                        <td className="px-6 py-4 text-primary font-bold">{row.percent}%</td>
                                        <td className="px-6 py-4">
                                            <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                                                <div className="bg-primary h-full transition-all duration-700 ease-out" style={{ width: `${row.percent}%` }} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: number, color: string }) {
    return (
        <div className="bg-white p-6 rounded-2xl border border-border shadow-sm flex items-center gap-5 hover:border-primary/20 transition-colors group">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl transition-transform group-hover:scale-110 ${color}`}>{icon}</div>
            <div>
                <p className="text-sm font-bold text-muted-foreground tracking-wide uppercase">{label}</p>
                <p className="text-3xl font-black text-foreground mt-0.5 tracking-tight">{value.toLocaleString()}</p>
            </div>
        </div>
    );
}
