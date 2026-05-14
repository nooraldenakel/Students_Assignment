'use client';

import { useState, useMemo, useEffect } from 'react';
import { useStore, Student, Department } from '../../../lib/store';
import { useRouter } from 'next/navigation';
import { Trash2, Download, Search, Filter, X } from 'lucide-react';
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

    const contextStudents = useMemo(() => {
        const filtered = students.filter((s: Student) => {
            if (!s.assignments[listName]) return false;

            // Viewer restriction
            if (currentUser?.role === 'Viewer') {
                if (!currentUser.allowedDepartments?.includes(s.department)) return false;
            }

            const matchDept = deptFilter === 'All' || s.department?.trim().toLowerCase() === deptFilter?.trim().toLowerCase();
            const matchStage = stageFilter === 'All' || s.stage === stageFilter;

            return matchDept && matchStage;
        });

        // Sort by assignment date (oldest first: chronological insertion order)
        return filtered.sort((a, b) => {
            const dateA = new Date(a.assignments[listName]!.date).getTime();
            const dateB = new Date(b.assignments[listName]!.date).getTime();
            return dateA - dateB;
        });
    }, [students, listName, currentUser, deptFilter, stageFilter]);

    const filteredStudents = useMemo(() => {
        const searched = contextStudents.filter((s: Student) => {
            return s.name.toLowerCase().includes(searchTerm.toLowerCase());
        });

        // Re-sort searched array to show newest assignments at the top for display
        return searched.sort((a, b) => {
            const dateA = new Date(a.assignments[listName]!.date).getTime();
            const dateB = new Date(b.assignments[listName]!.date).getTime();
            return dateB - dateA;
        });
    }, [contextStudents, searchTerm, listName]);

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
                'الاسم': s.name,
                'المرحلة الدراسية': s.stage,
                'القسم': s.department,
                'نوع الدراسة': s.studyType,
                'تاريخ المباشرة': meta ? new Date(meta.date).toLocaleDateString() : '-',
                'مباشر بواسطة': meta ? meta.assignedByUserName : '-'
            };
        });
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `Course_${listName}`);
        XLSX.writeFile(workbook, `course_${listName}_students.xlsx`);
    };

    const canRemove = currentUser.role === 'Admin';

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-700 tracking-tight uppercase">Course {listName.replace('L', '')}</h1>
                    <p className="text-sm font-medium text-slate-500 mt-2">
                        مسجل الدخول كـ <strong className="text-indigo-600">{currentUser.name}</strong> ({currentUser.role})
                    </p>
                </div>
                <button
                    onClick={exportListToExcel}
                    className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all duration-300 transform active:scale-95 text-sm font-bold shadow-[0_5px_15px_-5px_rgba(79,70,229,0.5)] hover:shadow-[0_10px_20px_-5px_rgba(79,70,229,0.6)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    title={`تصدير الطلاب المفلترين في Course ${listName} إلى Excel`}
                    disabled={filteredStudents.length === 0}
                >
                    <Download className="w-4 h-4" />
                    تصدير
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex flex-col sm:flex-row gap-4 mb-6" dir="rtl">
                <div className="relative flex-1">
                    <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="البحث عن اسم أو بريد..."
                        className="w-full pr-10 pl-9 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 hover:text-slate-700 transition-all duration-200"
                            title="مسح البحث"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-muted-foreground" />
                        <div className="w-[140px] sm:w-[180px] md:w-[220px]">
                            <Dropdown
                                value={deptFilter}
                                searchable={true}
                                onChange={(val) => setDeptFilter(val as any)}
                                options={[
                                    { label: 'جميع الأقسام', value: 'All' },
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
                                { label: 'جميع المراحل', value: 'All' },
                                ...Array.from(new Set(students.map(s => s.stage))).filter(Boolean).map(stage => ({ label: stage.replace('Stage', 'المرحلة'), value: stage }))
                            ]}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-border flex flex-col relative z-10 w-full overflow-visible">
                <div className="overflow-x-auto w-full rounded-t-xl">
                    <table className="w-full text-right border-collapse" dir="rtl">
                        <thead>
                            <tr className="bg-slate-50 text-muted-foreground text-sm font-medium border-b border-border">
                                <th className="p-4 font-extrabold leading-none text-center w-12 text-slate-400">#</th>
                                <th className="p-4 font-medium leading-none">اسم الطالب</th>
                                <th className="p-4 font-medium leading-none text-center">المرحلة الدراسية</th>
                                <th className="p-4 font-medium leading-none text-center">القسم</th>
                                <th className="p-4 font-medium leading-none text-center">نوع الدراسة</th>
                                <th className="p-4 font-medium leading-none text-center">تاريخ المباشرة</th>
                                {currentUser.role !== 'Viewer' && <th className="p-4 font-medium leading-none text-center">مباشر بواسطة</th>}
                                {canRemove && <th className="p-4 font-medium leading-none w-16"></th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-sm">
                            {paginatedStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={canRemove ? 8 : currentUser.role === 'Viewer' ? 6 : 7} className="p-8 text-center text-muted-foreground">
                                        لا يوجد طلاب يطابقون معاييرك في Course {listName.replace('L', '')}.
                                    </td>
                                </tr>
                            ) : (
                                paginatedStudents.map((student: Student) => {
                                    const renderedIndex = contextStudents.findIndex(s => s.id === student.id) + 1;
                                    return (
                                    <tr key={student.id} className="hover:bg-blue-50/50 transition-all duration-200 group/row bg-white relative">
                                        <td className="p-4 text-center font-bold text-slate-500">{renderedIndex}</td>
                                        <td className="p-4 relative">
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 origin-top duration-300 transition-transform scale-y-0 group-hover/row:scale-y-100"></div>
                                            <div className="font-bold text-slate-800 group-hover/row:text-indigo-600 transition-colors duration-200">
                                                {student.name}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center text-muted-foreground">{student.stage.replace('Stage', 'المرحلة')}</td>
                                        <td className="p-4 text-center text-muted-foreground">{student.department}</td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${student.studyType === 'صباحي' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                                }`}>
                                                {student.studyType}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center text-muted-foreground">
                                            {student.assignments[listName]
                                                ? new Date(student.assignments[listName]!.date).toLocaleDateString()
                                                : '-'}
                                        </td>
                                        {currentUser.role !== 'Viewer' && (
                                            <td className="p-4 text-center text-muted-foreground">
                                                {student.assignments[listName]
                                                    ? student.assignments[listName]!.assignedByUserName
                                                    : '-'}
                                            </td>
                                        )}
                                        {canRemove && (
                                            <td className="p-4">
                                                <button
                                                    onClick={() => {
                                                        showAlert(
                                                            'إزالة المباشرة؟',
                                                            `هل أنت متأكد من رغبتك في إزالة ${student.name} من Course ${listName.replace('L', '')}؟`,
                                                            'confirm',
                                                            () => removeAssignment(student.id, listName, currentUser)
                                                        );
                                                    }}
                                                    className="w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xs transition-all border bg-red-600 text-white border-red-600 transform scale-105 shadow-[0_4px_10px_-2px_rgba(220,38,38,0.5)] active:scale-95"
                                                    title="إزالة الطالب من Course"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                    );
                                })
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
