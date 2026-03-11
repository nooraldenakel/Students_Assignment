'use client';

import { useState, useMemo, useEffect } from 'react';
import { useStore, Student, Department, StudyType } from '../lib/store';
import { useRouter } from 'next/navigation';
import { Search, Download, Trash2, Edit2, Check, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import Pagination from '../components/Pagination';
import Dropdown from '../components/Dropdown';

export default function MainPage() {
    const router = useRouter();
    const {
        currentUser, students,
        l1Enabled, l2Enabled, l3Enabled, l4Enabled,
        toggleAssignment, updateStudent, clearAssignmentsByList,
        showAlert, isInitialized, isHydrated, departments
    } = useStore();
    const [mounted, setMounted] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [deptFilter, setDeptFilter] = useState<Department | 'All'>('All');
    const [typeFilter, setTypeFilter] = useState<StudyType | 'All'>('All');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editStage, setEditStage] = useState('');
    const [editDept, setEditDept] = useState<Department>('Art');

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState<number | 'All'>(10);

    useEffect(() => {
        setMounted(true);
        if (!currentUser) {
            router.push('/login');
        } else if (currentUser.role === 'Viewer') {
            router.push('/list/l1');
        }
    }, [currentUser, router]);

    const filteredStudents = useMemo(() => {
        return students.filter((s: Student) => {
            const matchName = s.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchDept = deptFilter === 'All' || s.department?.trim().toLowerCase() === deptFilter?.trim().toLowerCase();
            const matchType = typeFilter === 'All' || s.studyType === typeFilter;
            return matchName && matchDept && matchType;
        });
    }, [students, searchTerm, deptFilter, typeFilter]);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, deptFilter, typeFilter]);

    const paginatedStudents = useMemo(() => {
        if (pageSize === 'All') return filteredStudents;
        const startIndex = (currentPage - 1) * pageSize;
        return filteredStudents.slice(startIndex, startIndex + pageSize);
    }, [filteredStudents, currentPage, pageSize]);

    const stats = useMemo(() => {
        let totalAssigned = 0;
        let assignedToday = 0;
        if (!currentUser) return { totalAssigned: 0, assignedToday: 0 };
        const isAdminStore = currentUser.role === 'Admin';
        const todayStr = new Date().toDateString();

        students.forEach((s) => {
            const assignmentValues = Object.values(s.assignments);
            if (assignmentValues.length === 0) return;

            const relevantAssignments = isAdminStore
                ? assignmentValues
                : assignmentValues.filter(a => a?.assignedByUserId === currentUser.id);

            if (relevantAssignments.length > 0) {
                totalAssigned++;
                const hasAssignedToday = relevantAssignments.some(a => {
                    if (!a) return false;
                    return new Date(a.date).toDateString() === todayStr;
                });
                if (hasAssignedToday) assignedToday++;
            }
        });

        return { totalAssigned, assignedToday };
    }, [students, currentUser]);

    if (!mounted || !isInitialized || !isHydrated) return (
        <div className="flex items-center justify-center h-[50vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );
    if (!currentUser || currentUser.role === 'Viewer') return null;

    const canEdit = currentUser.role === 'Admin' || currentUser.role === 'Operator';
    const canAssign = currentUser.role === 'Admin' || currentUser.role === 'Operator';
    const isAdmin = currentUser.role === 'Admin';

    const exportUnassignedToExcel = () => {
        const unassigned = filteredStudents.filter(s => Object.keys(s.assignments).length === 0);
        if (unassigned.length === 0) {
            showAlert('Export Failed', 'No unassigned students match your criteria.', 'error');
            return;
        }
        const data = unassigned.map(s => ({
            Name: s.name,
            Stage: s.stage,
            Department: s.department,
            'Study Type': s.studyType
        }));
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Unassigned");
        XLSX.writeFile(workbook, "unassigned_filtered_students.xlsx");
    };

    const handleSaveEdit = (id: string) => {
        updateStudent(id, { stage: editStage, department: editDept });
        setEditingId(null);
    };

    const startEdit = (student: any) => {
        setEditStage(student.stage);
        setEditDept(student.department);
        setEditingId(student.id);
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-700 tracking-tight">Main Student List</h1>
                    <p className="text-sm font-medium text-slate-500 mt-2">
                        Logged in as <strong className="text-indigo-600">{currentUser.name}</strong> ({currentUser.role})
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-white px-4 py-2 flex items-center gap-4 rounded-lg border border-border shadow-sm text-sm">
                        <div>
                            <span className="text-muted-foreground mr-2">Total Assigned:</span>
                            <span className="font-bold text-foreground">{stats.totalAssigned}</span>
                        </div>
                        <div className="w-px h-4 bg-border"></div>
                        <div>
                            <span className="text-muted-foreground mr-2">Assigned Today:</span>
                            <span className="font-bold text-green-600">{stats.assignedToday}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search students..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all duration-300 font-medium text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-4">
                    <div className="w-[180px] sm:w-[220px]">
                        <Dropdown
                            value={deptFilter}
                            searchable={true}
                            onChange={(val) => setDeptFilter(val as any)}
                            options={[
                                { label: 'All Departments', value: 'All' },
                                ...departments.map((dept: string) => ({ label: dept, value: dept }))
                            ]}
                        />
                    </div>

                    <div className="w-[140px]">
                        <Dropdown
                            value={typeFilter}
                            onChange={(val) => setTypeFilter(val as any)}
                            options={[
                                { label: 'All Types', value: 'All' },
                                { label: 'Morning', value: 'Morning' },
                                { label: 'Evening', value: 'Evening' }
                            ]}
                        />
                    </div>

                    <button
                        onClick={exportUnassignedToExcel}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all duration-300 transform active:scale-95 text-sm font-bold shadow-[0_5px_15px_-5px_rgba(79,70,229,0.5)] hover:shadow-[0_10px_20px_-5px_rgba(79,70,229,0.6)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        disabled={filteredStudents.length === 0}
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-border flex flex-col relative z-10 overflow-visible">
                <div className="overflow-x-auto rounded-t-2xl w-full">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-muted/50 text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                                <th className="p-4 border-b border-border">Student Name</th>
                                <th className="p-4 border-b border-border">Study Stage</th>
                                <th className="p-4 border-b border-border">Department</th>
                                <th className="p-4 border-b border-border text-center">Study Type</th>
                                <th className="p-4 border-b border-border text-right w-[240px]">
                                    <div className="flex flex-col gap-2 items-end">
                                        <span className="text-indigo-600 font-extrabold">Assignments</span>
                                        {isAdmin && (
                                            <div className="flex gap-1 items-center bg-white p-1 rounded-lg border border-border shadow-sm">
                                                {(['L1', 'L2', 'L3', 'L4'] as const).map(list => {
                                                    const hasAssignments = students.some(s => !!s.assignments[list]);
                                                    return (
                                                        <button
                                                            key={`clear-${list}`}
                                                            disabled={!hasAssignments}
                                                            onClick={() => {
                                                                showAlert(
                                                                    `Clear ${list}?`,
                                                                    `This will remove all student assignments for ${list}. This action cannot be undone.`,
                                                                    'confirm',
                                                                    () => clearAssignmentsByList(list)
                                                                );
                                                            }}
                                                            title={`Clear all ${list}`}
                                                            className={`flex flex-col items-center justify-center rounded transition-all active:scale-95 border
                                                            ${hasAssignments
                                                                    ? 'bg-red-50 hover:bg-red-600 text-red-600 hover:text-white border-red-100'
                                                                    : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'}
                                                            px-1 py-0.5 min-w-[36px]
                                                        `}
                                                        >
                                                            <span className="text-[8px] font-bold leading-none mb-0.5 uppercase">{list}</span>
                                                            <Trash2 className="w-2.5 h-2.5" />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </th>
                                {canEdit && <th className="p-4 border-b border-border w-16"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-sm">
                            {paginatedStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={canEdit ? 6 : 5} className="p-12 text-center text-muted-foreground bg-white italic">
                                        No students match your current filters.
                                    </td>
                                </tr>
                            ) : (
                                paginatedStudents.map((student: Student) => (
                                    <tr key={student.id} className={`hover:bg-blue-50/50 transition-all duration-200 group/row bg-white relative ${editingId === student.id ? 'bg-blue-50/30' : ''}`}>
                                        <td className="p-4 relative">
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 origin-top duration-300 transition-transform ${editingId === student.id ? 'scale-y-100' : 'scale-y-0 group-hover/row:scale-y-100'}`}></div>
                                            <div className="font-bold text-slate-800 group-hover/row:text-indigo-600 transition-colors duration-200">
                                                {student.name}
                                            </div>
                                        </td>
                                        {editingId === student.id ? (
                                            <>
                                                <td className="p-4">
                                                    <input
                                                        type="text"
                                                        value={editStage}
                                                        onChange={(e) => setEditStage(e.target.value)}
                                                        className="w-full px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-sm text-slate-800 bg-white shadow-sm"
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <select
                                                        value={editDept}
                                                        onChange={(e) => setEditDept(e.target.value as Department)}
                                                        className="w-full px-4 py-2 border border-transparent bg-slate-100 hover:bg-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-bold text-sm text-slate-800"
                                                    >
                                                        {departments.map((dept: string) => (
                                                            <option key={dept} value={dept}>{dept}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="p-4 text-muted-foreground font-medium">{student.stage}</td>
                                                <td className="p-4 text-muted-foreground font-medium">{student.department}</td>
                                            </>
                                        )}
                                        <td className="p-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight shadow-sm
                                            ${student.studyType === 'Morning' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-purple-50 text-purple-600 border border-purple-100'}`}>
                                                {student.studyType}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-1.5 justify-end">
                                                {(['L1', 'L2', 'L3', 'L4'] as const).map(list => {
                                                    const isAssigned = !!student.assignments[list];
                                                    const isDisabled = !canAssign ||
                                                        (list === 'L1' && !l1Enabled) ||
                                                        (list === 'L2' && !l2Enabled) ||
                                                        (list === 'L3' && !l3Enabled) ||
                                                        (list === 'L4' && !l4Enabled);

                                                    return (
                                                        <button
                                                            key={list}
                                                            disabled={isDisabled && !isAssigned}
                                                            onClick={() => toggleAssignment(student.id, list, currentUser)}
                                                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xs transition-all border
                                                            ${isAssigned ? 'bg-indigo-600 text-white border-indigo-600 transform scale-105 shadow-[0_4px_10px_-2px_rgba(79,70,229,0.5)] active:scale-95' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-400 hover:text-indigo-600 active:scale-95 hover:bg-indigo-50'}
                                                            ${isDisabled && !isAssigned ? 'opacity-30 cursor-not-allowed grayscale' : ''}
                                                        `}
                                                        >
                                                            {list}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </td>
                                        {canEdit && (
                                            <td className="p-4 text-right">
                                                {editingId === student.id ? (
                                                    <div className="flex items-center gap-2 justify-end">
                                                        <button onClick={() => handleSaveEdit(student.id)} className="p-1.5 text-green-600 hover:bg-green-100 rounded-lg transition-colors"><Check className="w-5 h-5" /></button>
                                                        <button onClick={() => setEditingId(null)} className="p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => startEdit(student)}
                                                        className="p-2 text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-600 hover:text-white rounded-xl transition-all opacity-70 group-hover:opacity-100 flex items-center justify-center ml-auto shadow-sm"
                                                        title="Edit Student"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    currentPage={currentPage}
                    totalItems={filteredStudents.length}
                    pageSize={pageSize}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={setPageSize}
                />
            </div>
        </div>
    );
}
