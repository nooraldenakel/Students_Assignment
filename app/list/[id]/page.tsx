'use client';

import { useState, useMemo, useEffect } from 'react';
import { useStore, Student, Department } from '../../../lib/store';
import { useRouter } from 'next/navigation';
import { Trash2, Download, Search, Filter, X, Lock, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import * as XLSX from 'xlsx';
import Pagination from '../../../components/Pagination';
import Dropdown from '../../../components/Dropdown';

type SortField = 'index' | 'name' | 'stage' | 'department' | 'studyType' | 'date' | 'assignedBy';
type SortDirection = 'asc' | 'desc';

export default function ListPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { id } = params;
    const listName = id.toUpperCase() as 'L1' | 'L2' | 'L3' | 'L4';

    const {
        currentUser,
        students,
        departments,
        l1Enabled,
        l2Enabled,
        l3Enabled,
        l4Enabled,
        removeAssignment,
        showAlert,
        isInitialized,
        isHydrated
    } = useStore();
    const [mounted, setMounted] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [deptFilter, setDeptFilter] = useState<Department | 'All'>('All');
    const [stageFilter, setStageFilter] = useState<string>('All');

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState<number | 'All'>(10);

    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const isCourseEnabled = useMemo(() => {
        if (listName === 'L1') return l1Enabled;
        if (listName === 'L2') return l2Enabled;
        if (listName === 'L3') return l3Enabled;
        if (listName === 'L4') return l4Enabled;
        return true;
    }, [listName, l1Enabled, l2Enabled, l3Enabled, l4Enabled]);

    const firstEnabledCourse = useMemo(() => {
        if (l1Enabled) return { id: 'l1', label: 'Course 1' };
        if (l2Enabled) return { id: 'l2', label: 'Course 2' };
        if (l3Enabled) return { id: 'l3', label: 'Course 3' };
        if (l4Enabled) return { id: 'l4', label: 'Course 4' };
        return null;
    }, [l1Enabled, l2Enabled, l3Enabled, l4Enabled]);

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

        return [...searched].sort((a, b) => {
            let comparison = 0;
            switch (sortField) {
                case 'name':
                    comparison = (a.name || '').localeCompare(b.name || '', 'ar', { sensitivity: 'base' });
                    break;
                case 'stage':
                    comparison = (a.stage || '').localeCompare(b.stage || '', 'ar', { numeric: true });
                    break;
                case 'department':
                    comparison = (a.department || '').localeCompare(b.department || '', 'ar');
                    break;
                case 'studyType':
                    comparison = (a.studyType || '').localeCompare(b.studyType || '', 'ar');
                    break;
                case 'date': {
                    const dateA = a.assignments[listName]?.date ? new Date(a.assignments[listName]!.date).getTime() : 0;
                    const dateB = b.assignments[listName]?.date ? new Date(b.assignments[listName]!.date).getTime() : 0;
                    comparison = dateA - dateB;
                    break;
                }
                case 'assignedBy': {
                    const byA = a.assignments[listName]?.assignedByUserName || '';
                    const byB = b.assignments[listName]?.assignedByUserName || '';
                    comparison = byA.localeCompare(byB, 'ar');
                    break;
                }
                case 'index': {
                    const origA = contextStudents.findIndex(s => s.id === a.id);
                    const origB = contextStudents.findIndex(s => s.id === b.id);
                    comparison = origA - origB;
                    break;
                }
                default:
                    comparison = 0;
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [contextStudents, searchTerm, listName, sortField, sortDirection]);

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

    // Block non-admins from viewing disabled courses
    if (!isCourseEnabled && currentUser.role !== 'Admin') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                <div className="bg-white p-8 md:p-12 rounded-3xl border border-slate-200 shadow-xl max-w-lg w-full flex flex-col items-center animate-in fade-in duration-300">
                    <div className="w-20 h-20 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-500 mb-6 shadow-inner">
                        <Lock className="w-10 h-10" />
                    </div>

                    <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-black rounded-full uppercase tracking-wider mb-3">
                        Course {listName.replace('L', '')} غير مفعّل
                    </span>

                    <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-2">
                        قائمة المباشرين هذه غير متاحة حالياً
                    </h2>

                    <p className="text-sm font-medium text-slate-600 leading-relaxed mb-6" dir="rtl">
                        يرجى التواصل مع مسؤول النظام لتفعيل هذا المسار.
                        <span className="text-xs text-slate-400 mt-2 block font-normal" dir="ltr">
                            This Course is not enabled yet, contact with admin to enable it.
                        </span>
                    </p>

                    {firstEnabledCourse && (
                        <button
                            onClick={() => router.push(`/list/${firstEnabledCourse.id}`)}
                            className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all duration-200 shadow-md shadow-indigo-600/30 hover:shadow-lg flex items-center justify-center gap-2"
                        >
                            الانتقال إلى {firstEnabledCourse.label} المتاح
                        </button>
                    )}
                </div>
            </div>
        );
    }

    const exportListToExcel = () => {
        if (filteredStudents.length === 0) {
            showAlert('Export Failed', 'No data available to export', 'error');
            return;
        }

        const data = filteredStudents.map(s => {
            const meta = s.assignments[listName];
            const row: Record<string, string> = {
                'الاسم': s.name,
                'المرحلة الدراسية': s.stage,
                'القسم': s.department,
                'نوع الدراسة': s.studyType,
                'تاريخ المباشرة': meta ? new Date(meta.date).toLocaleDateString() : '-',
            };
            if (currentUser.role !== 'Viewer') {
                row['مباشر بواسطة'] = meta ? meta.assignedByUserName : '-';
            }
            return row;
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
                            <tr className="bg-slate-50 text-muted-foreground text-sm font-medium border-b border-border select-none">
                                <th
                                    onClick={() => handleSort('index')}
                                    className={`p-4 font-extrabold leading-none text-center w-14 cursor-pointer hover:bg-slate-100/80 hover:text-indigo-600 transition-colors ${sortField === 'index' ? 'text-indigo-600 bg-indigo-50/60' : 'text-slate-400'}`}
                                    title="ترتيب حسب التسلسل"
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        <span>#</span>
                                        {sortField === 'index' ? (
                                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                                        ) : (
                                            <ArrowUpDown className="w-3 h-3 text-slate-300 opacity-60" />
                                        )}
                                    </div>
                                </th>

                                <th
                                    onClick={() => handleSort('name')}
                                    className={`p-4 font-medium leading-none cursor-pointer hover:bg-slate-100/80 hover:text-indigo-600 transition-colors ${sortField === 'name' ? 'text-indigo-600 font-bold bg-indigo-50/60' : ''}`}
                                    title="ترتيب حسب اسم الطالب (أ-ي / ي-أ)"
                                >
                                    <div className="flex items-center gap-1.5 justify-start">
                                        <span>اسم الطالب</span>
                                        {sortField === 'name' ? (
                                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                                        ) : (
                                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 opacity-60" />
                                        )}
                                    </div>
                                </th>

                                <th
                                    onClick={() => handleSort('stage')}
                                    className={`p-4 font-medium leading-none text-center cursor-pointer hover:bg-slate-100/80 hover:text-indigo-600 transition-colors ${sortField === 'stage' ? 'text-indigo-600 font-bold bg-indigo-50/60' : ''}`}
                                    title="ترتيب حسب المرحلة الدراسية"
                                >
                                    <div className="flex items-center justify-center gap-1.5">
                                        <span>المرحلة الدراسية</span>
                                        {sortField === 'stage' ? (
                                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                                        ) : (
                                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 opacity-60" />
                                        )}
                                    </div>
                                </th>

                                <th
                                    onClick={() => handleSort('department')}
                                    className={`p-4 font-medium leading-none text-center cursor-pointer hover:bg-slate-100/80 hover:text-indigo-600 transition-colors ${sortField === 'department' ? 'text-indigo-600 font-bold bg-indigo-50/60' : ''}`}
                                    title="ترتيب حسب القسم"
                                >
                                    <div className="flex items-center justify-center gap-1.5">
                                        <span>القسم</span>
                                        {sortField === 'department' ? (
                                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                                        ) : (
                                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 opacity-60" />
                                        )}
                                    </div>
                                </th>

                                <th
                                    onClick={() => handleSort('studyType')}
                                    className={`p-4 font-medium leading-none text-center cursor-pointer hover:bg-slate-100/80 hover:text-indigo-600 transition-colors ${sortField === 'studyType' ? 'text-indigo-600 font-bold bg-indigo-50/60' : ''}`}
                                    title="ترتيب حسب نوع الدراسة (صباحي / مسائي)"
                                >
                                    <div className="flex items-center justify-center gap-1.5">
                                        <span>نوع الدراسة</span>
                                        {sortField === 'studyType' ? (
                                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                                        ) : (
                                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 opacity-60" />
                                        )}
                                    </div>
                                </th>

                                <th
                                    onClick={() => handleSort('date')}
                                    className={`p-4 font-medium leading-none text-center cursor-pointer hover:bg-slate-100/80 hover:text-indigo-600 transition-colors ${sortField === 'date' ? 'text-indigo-600 font-bold bg-indigo-50/60' : ''}`}
                                    title="ترتيب حسب تاريخ المباشرة (الأحدث / الأقدم)"
                                >
                                    <div className="flex items-center justify-center gap-1.5">
                                        <span>تاريخ المباشرة</span>
                                        {sortField === 'date' ? (
                                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                                        ) : (
                                            <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 opacity-60" />
                                        )}
                                    </div>
                                </th>

                                {currentUser.role !== 'Viewer' && (
                                    <th
                                        onClick={() => handleSort('assignedBy')}
                                        className={`p-4 font-medium leading-none text-center cursor-pointer hover:bg-slate-100/80 hover:text-indigo-600 transition-colors ${sortField === 'assignedBy' ? 'text-indigo-600 font-bold bg-indigo-50/60' : ''}`}
                                        title="ترتيب حسب المباشر"
                                    >
                                        <div className="flex items-center justify-center gap-1.5">
                                            <span>مباشر بواسطة</span>
                                            {sortField === 'assignedBy' ? (
                                                sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-indigo-600" /> : <ArrowDown className="w-3.5 h-3.5 text-indigo-600" />
                                            ) : (
                                                <ArrowUpDown className="w-3.5 h-3.5 text-slate-300 opacity-60" />
                                            )}
                                        </div>
                                    </th>
                                )}

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
