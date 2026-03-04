'use client';

import { useState, useMemo, useEffect } from 'react';
import { useStore, Student, Department } from '../../../lib/store';
import { useRouter } from 'next/navigation';
import { Trash2, Download, Search, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ListPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { id } = params;
    const listName = id.toUpperCase() as 'L1' | 'L2' | 'L3' | 'L4';

    const { currentUser, students, departments, removeAssignment, showAlert, isInitialized, isHydrated } = useStore();
    const [mounted, setMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [deptFilter, setDeptFilter] = useState<Department | 'All'>('All');
    const [stageFilter, setStageFilter] = useState<string>('All');

    useEffect(() => {
        setMounted(true);
        if (!currentUser) router.push('/login');
    }, [currentUser, router]);

    const filteredStudents = useMemo(() => {
        return students.filter((s: Student) => {
            if (!s.assignments[listName]) return false;

            // Viewer restriction
            if (currentUser?.role === 'Viewer') {
                if (!currentUser.allowedDepartments?.includes(s.department)) return false;
            }

            const matchName = s.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchDept = deptFilter === 'All' || s.department === deptFilter;
            const matchStage = stageFilter === 'All' || s.stage === stageFilter;

            return matchName && matchDept && matchStage;
        });
    }, [students, listName, currentUser, searchTerm, deptFilter, stageFilter]);

    if (!mounted || !isInitialized || !isHydrated) return (
        <div className="flex items-center justify-center h-[50vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );
    if (!currentUser) return null;

    const exportListToExcel = () => {
        if (filteredStudents.length === 0) {
            showAlert('Export Failed', 'No data available to export', 'error');
            return;
        }

        const data = filteredStudents.map(s => {
            const meta = s.assignments[listName];
            return {
                Name: s.name,
                Stage: s.stage,
                Department: s.department,
                'Study Type': s.studyType,
                'Assigned Date': meta ? new Date(meta.date).toLocaleDateString() : '-',
                'Assigned By': meta ? meta.assignedByUserName : '-'
            };
        });
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `List_${listName}`);
        XLSX.writeFile(workbook, `list_${listName}_students.xlsx`);
    };

    const canRemove = currentUser.role === 'Admin';

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">List {listName.replace('L', '')}</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Students currently assigned to this list ({filteredStudents.length} showing)
                    </p>
                </div>
                <button
                    onClick={exportListToExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title={`Export filtered students in ${listName} to Excel`}
                    disabled={filteredStudents.length === 0}
                >
                    <Download className="w-4 h-4" />
                    Export List
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search assigned students..."
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-border focus:ring-2 focus:ring-primary outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-muted-foreground" />
                        <select
                            className="px-4 py-2 rounded-lg border border-border outline-none bg-white min-w-[160px]"
                            value={deptFilter}
                            onChange={(e) => setDeptFilter(e.target.value as any)}
                        >
                            <option value="All">All Departments</option>
                            {departments.map(dept => {
                                if (currentUser?.role === 'Viewer' && !currentUser.allowedDepartments?.includes(dept)) {
                                    return null;
                                }
                                return <option key={dept} value={dept}>{dept}</option>;
                            })}
                        </select>
                    </div>

                    <select
                        className="px-4 py-2 rounded-lg border border-border outline-none bg-white min-w-[140px]"
                        value={stageFilter}
                        onChange={(e) => setStageFilter(e.target.value)}
                    >
                        <option value="All">All Stages</option>
                        {Array.from(new Set(students.map(s => s.stage))).filter(Boolean).map(stage => (
                            <option key={stage} value={stage}>{stage}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-muted text-muted-foreground text-sm border-b border-border">
                            <th className="p-4 font-medium leading-none">Student Name</th>
                            <th className="p-4 font-medium leading-none">Study Stage</th>
                            <th className="p-4 font-medium leading-none">Department</th>
                            <th className="p-4 font-medium leading-none">Study Type</th>
                            <th className="p-4 font-medium leading-none">Assignment Date</th>
                            <th className="p-4 font-medium leading-none">Assigned By</th>
                            {canRemove && <th className="p-4 font-medium leading-none w-16"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border text-sm">
                        {filteredStudents.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                    No students found matching your criteria in {listName}.
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
                                    <td className="p-4 text-muted-foreground">{student.stage}</td>
                                    <td className="p-4 text-muted-foreground">{student.department}</td>
                                    <td className="p-4">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${student.studyType === 'Morning' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                            }`}>
                                            {student.studyType}
                                        </span>
                                    </td>
                                    <td className="p-4 text-muted-foreground">
                                        {student.assignments[listName]
                                            ? new Date(student.assignments[listName]!.date).toLocaleDateString()
                                            : '-'}
                                    </td>
                                    <td className="p-4 text-muted-foreground">
                                        {student.assignments[listName]
                                            ? student.assignments[listName]!.assignedByUserName
                                            : '-'}
                                    </td>
                                    {canRemove && (
                                        <td className="p-4">
                                            <button
                                                onClick={() => {
                                                    showAlert(
                                                        'Remove Assignment?',
                                                        `Are you sure you want to remove ${student.name} from ${listName}?`,
                                                        'confirm',
                                                        () => removeAssignment(student.id, listName, currentUser)
                                                    );
                                                }}
                                                className="p-1.5 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-md transition-colors float-right"
                                                title="Remove student from list"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
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
