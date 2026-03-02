'use client';

import { useState, useMemo, useEffect } from 'react';
import { useStore, Student, Department, StudyType } from '../lib/store';
import { useRouter } from 'next/navigation';
import { Search, Download, Trash2, Edit2, Check, X } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function MainPage() {
    const router = useRouter();
    const {
        currentUser, students,
        l1Enabled, l2Enabled, l3Enabled, l4Enabled,
        toggleAssignment, updateStudent, clearAssignmentsByList,
        showAlert
    } = useStore();
    const [mounted, setMounted] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [deptFilter, setDeptFilter] = useState<Department | 'All'>('All');
    const [typeFilter, setTypeFilter] = useState<StudyType | 'All'>('All');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editStage, setEditStage] = useState('');
    const [editDept, setEditDept] = useState<Department>('Art');

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
            const matchDept = deptFilter === 'All' || s.department === deptFilter;
            const matchType = typeFilter === 'All' || s.studyType === typeFilter;
            return matchName && matchDept && matchType;
        });
    }, [students, searchTerm, deptFilter, typeFilter]);

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

    if (!mounted || !currentUser || currentUser.role === 'Viewer') return null;

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
                    <h1 className="text-2xl font-bold text-foreground">Main Student List</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Logged in as <strong className="text-primary">{currentUser.name}</strong> ({currentUser.role})
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
                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search students..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-border focus:ring-2 focus:ring-primary outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-4">
                    <select
                        className="px-4 py-2 rounded-lg border border-border outline-none bg-white min-w-[160px]"
                        value={deptFilter}
                        onChange={(e) => setDeptFilter(e.target.value as any)}
                    >
                        <option value="All">All Departments</option>
                        <option value="Art">Art</option>
                        <option value="English">English</option>
                        <option value="Chemical">Chemical</option>
                        <option value="Math">Math</option>
                        <option value="Computer Science">Computer Science</option>
                    </select>

                    <select
                        className="px-4 py-2 rounded-lg border border-border outline-none bg-white min-w-[140px]"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as any)}
                    >
                        <option value="All">All Types</option>
                        <option value="Morning">Morning</option>
                        <option value="Evening">Evening</option>
                    </select>

                    <button
                        onClick={exportUnassignedToExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm"
                        disabled={filteredStudents.length === 0}
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
                <table className="w-full text-left border-separate border-spacing-0">
                    <thead>
                        <tr className="bg-muted/50 text-muted-foreground text-[11px] font-bold uppercase tracking-wider">
                            <th className="p-4 border-b border-border">Student Name</th>
                            <th className="p-4 border-b border-border">Study Stage</th>
                            <th className="p-4 border-b border-border">Department</th>
                            <th className="p-4 border-b border-border text-center">Study Type</th>
                            <th className="p-4 border-b border-border text-right w-[240px]">
                                <div className="flex flex-col gap-2 items-end">
                                    <span className="text-primary font-black">Assignments</span>
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
                        {filteredStudents.length === 0 ? (
                            <tr>
                                <td colSpan={canEdit ? 6 : 5} className="p-12 text-center text-muted-foreground bg-white italic">
                                    No students match your current filters.
                                </td>
                            </tr>
                        ) : (
                            filteredStudents.map((student: Student) => (
                                <tr key={student.id} className="hover:bg-blue-50/50 transition-all duration-200 group/row bg-white relative">
                                    <td className="p-4 relative">
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary scale-y-0 group-hover/row:scale-y-100 transition-transform origin-top duration-300"></div>
                                        <div className="font-bold text-foreground group-hover/row:text-primary transition-colors duration-200">
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
                                                    className="w-full px-3 py-1.5 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-sm"
                                                />
                                            </td>
                                            <td className="p-4">
                                                <select
                                                    value={editDept}
                                                    onChange={(e) => setEditDept(e.target.value as Department)}
                                                    className="w-full px-3 py-1.5 border border-border rounded-lg outline-none focus:ring-2 focus:ring-primary/20 transition-all font-medium text-sm"
                                                >
                                                    <option value="Art">Art</option>
                                                    <option value="English">English</option>
                                                    <option value="Chemical">Chemical</option>
                                                    <option value="Math">Math</option>
                                                    <option value="Computer Science">Computer Science</option>
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
                                                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs transition-all border shadow-sm
                                                            ${isAssigned ? 'bg-primary text-white border-primary transform scale-105 shadow-md active:scale-95' : 'bg-white text-muted-foreground border-border hover:border-primary/50 hover:text-primary active:scale-95'}
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
                                                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all opacity-0 group-hover:opacity-100"
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
        </div>
    );
}
