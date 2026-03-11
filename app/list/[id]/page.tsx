'use client';

import { useState, useMemo, useEffect } from 'react';
import { useStore, Student, Department } from '../../../lib/store';
import { useRouter } from 'next/navigation';
import { Trash2, Download, Search, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import Pagination from '../../../components/Pagination';
import Dropdown from '../../../components/Dropdown';

export default function ListPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { id } = params;
    const listName = id.toUpperCase() as 'L1' | 'L2' | 'L3' | 'L4';

    const { currentUser, students, departments, removeAssignment, showAlert, isInitialized, isHydrated } = useStore();
    const [mounted, setMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [deptFilter, setDeptFilter] = useState<Department | 'All'>('All');
    const [stageFilter, setStageFilter] = useState<string>('All');

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState<number | 'All'>(10);

    useEffect(() => {
        setMounted(true);
        if (!currentUser) router.push('/login');
    }, [currentUser, router]);

    const filteredStudents = useMemo(() => {
        const filtered = students.filter((s: Student) => {
            if (!s.assignments[listName]) return false;

            // Viewer restriction
            if (currentUser?.role === 'Viewer') {
                if (!currentUser.allowedDepartments?.includes(s.department)) return false;
            }

            const matchName = s.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchDept = deptFilter === 'All' || s.department?.trim().toLowerCase() === deptFilter?.trim().toLowerCase();
            const matchStage = stageFilter === 'All' || s.stage === stageFilter;

            return matchName && matchDept && matchStage;
        });

        // Sort by assignment date (newest first)
        return filtered.sort((a, b) => {
            const dateA = new Date(a.assignments[listName]!.date).getTime();
            const dateB = new Date(b.assignments[listName]!.date).getTime();
            return dateB - dateA;
        });
    }, [students, listName, currentUser, searchTerm, deptFilter, stageFilter]);

    // Reset pagination when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, deptFilter, stageFilter]);

    const paginatedStudents = useMemo(() => {
        if (pageSize === 'All') return filteredStudents;
        const startIndex = (currentPage - 1) * pageSize;
        return filteredStudents.slice(startIndex, startIndex + pageSize);
    }, [filteredStudents, currentPage, pageSize]);

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
                    <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-700 tracking-tight uppercase">List {listName.replace('L', '')}</h1>
                    <p className="text-sm font-medium text-slate-500 mt-2">
                        Logged in as <strong className="text-indigo-600">{currentUser.name}</strong> ({currentUser.role})
                    </p>
                </div>
                <button
                    onClick={exportListToExcel}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all duration-300 transform active:scale-95 text-sm font-bold shadow-[0_5px_15px_-5px_rgba(79,70,229,0.5)] hover:shadow-[0_10px_20px_-5px_rgba(79,70,229,0.6)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    title={`Export filtered students in ${listName} to Excel`}
                    disabled={filteredStudents.length === 0}
                >
                    <Download className="w-4 h-4" />
                    Export List
                </button>
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
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-muted-foreground" />
                        <div className="w-[180px] sm:w-[220px]">
                            <Dropdown
                                value={deptFilter}
                                searchable={true}
                                onChange={(val) => setDeptFilter(val as any)}
                                options={[
                                    { label: 'All Departments', value: 'All' },
                                    ...departments
                                        .filter((dept: string) => {
                                            if (currentUser?.role === 'Viewer' && !currentUser.allowedDepartments?.includes(dept)) {
                                                return false;
                                            }
                                            return true;
                                        })
                                        .map((dept: string) => ({ label: dept, value: dept }))
                                ]}
                            />
                        </div>
                    </div>

                    <div className="w-[140px]">
                        <Dropdown
                            value={stageFilter}
                            onChange={(val) => setStageFilter(val)}
                            options={[
                                { label: 'All Stages', value: 'All' },
                                ...Array.from(new Set(students.map(s => s.stage))).filter(Boolean).map(stage => ({ label: stage, value: stage }))
                            ]}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-border flex flex-col relative z-10 w-full overflow-visible">
                <div className="overflow-x-auto w-full rounded-t-xl">
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
                            {paginatedStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                                        No students found matching your criteria in {listName}.
                                    </td>
                                </tr>
                            ) : (
                                paginatedStudents.map((student: Student) => (
                                    <tr key={student.id} className="hover:bg-blue-50/50 transition-all duration-200 group/row bg-white relative">
                                        <td className="p-4 relative">
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 origin-top duration-300 transition-transform scale-y-0 group-hover/row:scale-y-100"></div>
                                            <div className="font-bold text-slate-800 group-hover/row:text-indigo-600 transition-colors duration-200">
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
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xs transition-all border bg-red-600 text-white border-red-600 transform scale-105 shadow-[0_4px_10px_-2px_rgba(220,38,38,0.5)] active:scale-95"
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
