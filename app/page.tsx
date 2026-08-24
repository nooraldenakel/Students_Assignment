'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useStore, Student, Department, StudyType, normalizeArabic } from '../lib/store';
import { useRouter } from 'next/navigation';
import { Search, Download, Trash2, Edit2, Check, X, UserPlus, CheckCircle2, ArrowUpDown, ArrowUp, ArrowDown, User, GraduationCap, Building2, SunMedium, UserCheck, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import Pagination from '../components/Pagination';
import Dropdown from '../components/Dropdown';
import ScrollToTop from '../components/ScrollToTop';

type SortField = 'name' | 'stage' | 'department' | 'studyType';
type SortDirection = 'asc' | 'desc';

export default function MainPage() {
    const router = useRouter();
    const {
        currentUser, students,
        l1Enabled, l2Enabled, l3Enabled, l4Enabled,
        toggleAssignment, updateStudent, addStudent, clearAssignmentsByList,
        showAlert, isInitialized, isHydrated, departments
    } = useStore();
    const [mounted, setMounted] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [deptFilter, setDeptFilter] = useState<Department | 'All'>('All');
    const [stageFilter, setStageFilter] = useState<string>('All');
    const [studyTypeFilter, setStudyTypeFilter] = useState<StudyType | 'All'>('All');

    const [sortField, setSortField] = useState<SortField | null>(null);
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editStage, setEditStage] = useState('');
    const [editDept, setEditDept] = useState<Department>('Art');
    const [savedEdits, setSavedEdits] = useState<Record<string, { stage: string; department: Department }>>({});

    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState<number | 'All'>(10);

    // FAB visibility on scroll
    const [fabVisible, setFabVisible] = useState(true);
    const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Add Student Modal
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDept, setNewDept] = useState('');
    const [newStage, setNewStage] = useState('');
    const [newType, setNewType] = useState<StudyType | ''>('');
    const [formSubmitted, setFormSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Success toast
    const [toast, setToast] = useState<{ show: boolean; name: string }>({ show: false, name: '' });
    const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- Scroll handler for FAB fade ---
    useEffect(() => {
        const mainEl = document.querySelector('main');
        if (!mainEl) return;

        const handleScroll = () => {
            setFabVisible(false);
            if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
            scrollTimerRef.current = setTimeout(() => setFabVisible(true), 400);
        };
        mainEl.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            mainEl.removeEventListener('scroll', handleScroll);
            if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
        };
    }, []);

    useEffect(() => {
        setMounted(true);
        if (!currentUser) {
            router.push('/login');
        } else if (currentUser.role === 'Viewer') {
            const firstEnabled = l1Enabled ? 'l1' : l2Enabled ? 'l2' : l3Enabled ? 'l3' : l4Enabled ? 'l4' : 'l1';
            router.push(`/list/${firstEnabled}`);
        }
    }, [currentUser, router, l1Enabled, l2Enabled, l3Enabled, l4Enabled]);

    // Reset add form when modal opens
    useEffect(() => {
        if (isAddModalOpen) {
            setNewName('');
            setNewDept('');
            setNewStage('');
            setNewType('');
            setFormSubmitted(false);
        }
    }, [isAddModalOpen]);

    const filteredStudents = useMemo(() => {
        const cleanedSearch = normalizeArabic(searchTerm);
        const baseList = students.filter((s: Student) => {
            const matchName = !cleanedSearch || normalizeArabic(s.name || '').includes(cleanedSearch);
            const matchDept = deptFilter === 'All' || s.department?.trim().toLowerCase() === deptFilter?.trim().toLowerCase();
            const matchStage = stageFilter === 'All' || s.stage === stageFilter;
            const matchStudyType = studyTypeFilter === 'All' || s.studyType === studyTypeFilter;
            return matchName && matchDept && matchStage && matchStudyType;
        });

        if (!sortField) {
            return baseList.slice().reverse();
        }

        return baseList.slice().sort((a, b) => {
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
            }
            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [students, searchTerm, deptFilter, stageFilter, studyTypeFilter, sortField, sortDirection]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, deptFilter, stageFilter, studyTypeFilter]);

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

    const exportStudentsToExcel = () => {
        const unassignedStudents = filteredStudents.filter(s => !s.assignments || Object.keys(s.assignments).length === 0);
        if (unassignedStudents.length === 0) {
            showAlert('فشل التصدير', 'لا يوجد طلاب غير مباشرين يطابقون معايير التصفية الحالية للتصدير.', 'error');
            return;
        }
        const data = unassignedStudents.map(s => {
            return {
                'الاسم': s.name,
                'المرحلة الدراسية': s.stage.startsWith('المرحلة') ? s.stage : s.stage.includes('Stage') ? s.stage.replace('Stage', 'المرحلة') : `المرحلة ${s.stage}`,
                'القسم': s.department,
                'نوع الدراسة': s.studyType,
                'حالة المباشرة': 'غير مباشر'
            };
        });
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "الطلاب غير المباشرين");
        XLSX.writeFile(workbook, "unassigned_students.xlsx");
    };

    const handleSaveEdit = (id: string) => {
        const newStage = editStage;
        const newDeptVal = editDept;
        setSavedEdits(prev => ({ ...prev, [id]: { stage: newStage, department: newDeptVal } }));
        updateStudent(id, { stage: newStage, department: newDeptVal });
        setEditingId(null);
    };

    const startEdit = (student: any) => {
        setEditStage(student.stage);
        setEditDept(student.department);
        setEditingId(student.id);
    };

    const showToast = (name: string) => {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToast({ show: true, name });
        toastTimerRef.current = setTimeout(() => {
            setToast({ show: false, name: '' });
        }, 3500);
    };

    const handleAddStudent = async (e: React.FormEvent, continueAdding: boolean) => {
        e.preventDefault();
        setFormSubmitted(true);

        const isNameValid = newName.trim().length > 0;
        const isDeptValid = newDept.trim().length > 0;
        const isStageValid = newStage.trim().length > 0;
        const isTypeValid = newType !== '';

        if (!isNameValid || !isDeptValid || !isStageValid || !isTypeValid) {
            return;
        }

        setIsSubmitting(true);
        const ok = await addStudent({
            name: newName.trim(),
            department: newDept as Department,
            stage: newStage,
            studyType: newType as StudyType,
        });
        setIsSubmitting(false);
        if (ok) {
            const savedName = newName.trim();
            setFormSubmitted(false);
            if (continueAdding) {
                setNewName('');
                setNewDept('');
                setNewStage('');
                setNewType('');
            } else {
                setIsAddModalOpen(false);
            }
            showToast(savedName);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-700 tracking-tight">القائمة الرئيسية للطلاب</h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-white px-4 py-2 flex items-center gap-4 rounded-lg border border-border shadow-sm text-sm">
                        <div>
                            <span className="text-muted-foreground mr-2">إجمالي المباشرين:</span>
                            <span className="font-bold text-foreground">{stats.totalAssigned}</span>
                        </div>
                        <div className="w-px h-4 bg-border"></div>
                        <div>
                            <span className="text-muted-foreground mr-2">المباشرين اليوم:</span>
                            <span className="font-bold text-green-600">{stats.assignedToday}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-border shadow-sm flex flex-col sm:flex-row gap-4" dir="rtl">
                <div className="relative flex-1">
                    <Search className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="البحث عن اسم..."
                        className="w-full pr-10 pl-9 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all duration-300 font-medium text-sm"
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
                    <div className="w-[140px] sm:w-[180px] md:w-[220px]">
                        <Dropdown
                            value={deptFilter}
                            searchable={true}
                            onChange={(val) => setDeptFilter(val as any)}
                            options={[
                                { label: 'جميع الأقسام', value: 'All' },
                                ...departments.map((dept: string) => ({ label: dept, value: dept }))
                            ]}
                        />
                    </div>

                    <div className="w-[140px] sm:w-[160px]">
                        <Dropdown
                            value={stageFilter}
                            onChange={(val) => setStageFilter(val)}
                            options={[
                                { label: 'جميع المراحل', value: 'All' },
                                ...Array.from(new Set(students.map(s => s.stage))).filter(Boolean).sort().map(stage => ({
                                    label: stage.startsWith('المرحلة') ? stage : stage.includes('Stage') ? stage.replace('Stage', 'المرحلة') : `المرحلة ${stage}`,
                                    value: stage
                                }))
                            ]}
                        />
                    </div>

                    <div className="w-[140px] sm:w-[150px]">
                        <Dropdown
                            value={studyTypeFilter}
                            onChange={(val) => setStudyTypeFilter(val as any)}
                            options={[
                                { label: 'جميع الدراسات', value: 'All' },
                                { label: 'صباحي', value: 'صباحي' },
                                { label: 'مسائي', value: 'مسائي' },
                            ]}
                        />
                    </div>

                    <button
                        onClick={exportStudentsToExcel}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all duration-300 transform active:scale-95 text-sm font-bold shadow-[0_5px_15px_-5px_rgba(79,70,229,0.5)] hover:shadow-[0_10px_20px_-5px_rgba(79,70,229,0.6)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        title="تصدير الطلاب غير المباشرين المفلترين إلى Excel"
                        disabled={filteredStudents.length === 0}
                    >
                        <Download className="w-4 h-4" />
                        تصدير
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 flex flex-col relative z-10 overflow-visible">
                <div className="overflow-x-auto rounded-t-2xl w-full">
                    <table className="w-full text-right border-separate border-spacing-0" dir="rtl">
                        <thead>
                            <tr className="bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 text-slate-800 border-b-2 border-slate-200 select-none">
                                <th
                                    onClick={() => handleSort('name')}
                                    className={`p-3.5 md:p-4 border-b-2 border-slate-200 cursor-pointer transition-all duration-200 group/th ${sortField === 'name' ? 'bg-indigo-50/80' : 'hover:bg-slate-200/50'}`}
                                    title="ترتيب حسب اسم الطالب (أ-ي / ي-أ)"
                                >
                                    <div className="flex items-center gap-2 justify-start">
                                        <div className={`p-1.5 rounded-lg transition-colors ${sortField === 'name' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-indigo-50 text-indigo-600 group-hover/th:bg-indigo-100'}`}>
                                            <User className="w-4 h-4" />
                                        </div>
                                        <span className={`text-sm md:text-[15px] font-extrabold ${sortField === 'name' ? 'text-indigo-900' : 'text-slate-800'}`}>اسم الطالب</span>
                                        <div className={`mr-auto flex items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-bold transition-all ${sortField === 'name' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 group-hover/th:text-indigo-600 group-hover/th:bg-white'}`}>
                                            {sortField === 'name' ? (
                                                sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                            ) : (
                                                <ArrowUpDown className="w-3.5 h-3.5" />
                                            )}
                                        </div>
                                    </div>
                                </th>

                                <th
                                    onClick={() => handleSort('stage')}
                                    className={`p-3.5 md:p-4 border-b-2 border-slate-200 text-center cursor-pointer transition-all duration-200 group/th ${sortField === 'stage' ? 'bg-indigo-50/80' : 'hover:bg-slate-200/50'}`}
                                    title="ترتيب حسب المرحلة الدراسية"
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <div className={`p-1.5 rounded-lg transition-colors ${sortField === 'stage' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-600 group-hover/th:bg-emerald-100'}`}>
                                            <GraduationCap className="w-4 h-4" />
                                        </div>
                                        <span className={`text-sm md:text-[15px] font-extrabold ${sortField === 'stage' ? 'text-indigo-900' : 'text-slate-800'}`}>المرحلة الدراسية</span>
                                        <div className={`flex items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-bold transition-all ${sortField === 'stage' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 group-hover/th:text-indigo-600 group-hover/th:bg-white'}`}>
                                            {sortField === 'stage' ? (
                                                sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                            ) : (
                                                <ArrowUpDown className="w-3.5 h-3.5" />
                                            )}
                                        </div>
                                    </div>
                                </th>

                                <th
                                    onClick={() => handleSort('department')}
                                    className={`p-3.5 md:p-4 border-b-2 border-slate-200 text-center cursor-pointer transition-all duration-200 group/th ${sortField === 'department' ? 'bg-indigo-50/80' : 'hover:bg-slate-200/50'}`}
                                    title="ترتيب حسب القسم"
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <div className={`p-1.5 rounded-lg transition-colors ${sortField === 'department' ? 'bg-blue-600 text-white shadow-sm' : 'bg-blue-50 text-blue-600 group-hover/th:bg-blue-100'}`}>
                                            <Building2 className="w-4 h-4" />
                                        </div>
                                        <span className={`text-sm md:text-[15px] font-extrabold ${sortField === 'department' ? 'text-indigo-900' : 'text-slate-800'}`}>القسم</span>
                                        <div className={`flex items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-bold transition-all ${sortField === 'department' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 group-hover/th:text-indigo-600 group-hover/th:bg-white'}`}>
                                            {sortField === 'department' ? (
                                                sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                            ) : (
                                                <ArrowUpDown className="w-3.5 h-3.5" />
                                            )}
                                        </div>
                                    </div>
                                </th>

                                <th
                                    onClick={() => handleSort('studyType')}
                                    className={`p-3.5 md:p-4 border-b-2 border-slate-200 text-center cursor-pointer transition-all duration-200 group/th ${sortField === 'studyType' ? 'bg-indigo-50/80' : 'hover:bg-slate-200/50'}`}
                                    title="ترتيب حسب نوع الدراسة"
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <div className={`p-1.5 rounded-lg transition-colors ${sortField === 'studyType' ? 'bg-amber-600 text-white shadow-sm' : 'bg-amber-50 text-amber-600 group-hover/th:bg-amber-100'}`}>
                                            <SunMedium className="w-4 h-4" />
                                        </div>
                                        <span className={`text-sm md:text-[15px] font-extrabold ${sortField === 'studyType' ? 'text-indigo-900' : 'text-slate-800'}`}>نوع الدراسة</span>
                                        <div className={`flex items-center justify-center rounded-md px-1.5 py-0.5 text-xs font-bold transition-all ${sortField === 'studyType' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 group-hover/th:text-indigo-600 group-hover/th:bg-white'}`}>
                                            {sortField === 'studyType' ? (
                                                sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />
                                            ) : (
                                                <ArrowUpDown className="w-3.5 h-3.5" />
                                            )}
                                        </div>
                                    </div>
                                </th>

                                <th className="p-3.5 md:p-4 border-b-2 border-slate-200 text-right w-[240px]">
                                    <div className="flex flex-col gap-1.5 items-end">
                                        {isAdmin && (
                                            <div className="flex items-center justify-between w-full pb-1">
                                                <span className="text-xs font-black text-rose-600 uppercase tracking-wider">ازالة المباشرة</span>
                                                <span className="text-[11px] font-bold text-slate-400">Course 1-4</span>
                                            </div>
                                        )}
                                        {isAdmin && (
                                            <div className="flex gap-1.5 justify-end w-full">
                                                {(['L1', 'L2', 'L3', 'L4'] as const).map(list => {
                                                    const hasAssignments = students.some(s => !!s.assignments[list]);
                                                    return (
                                                        <button
                                                            key={`clear-${list}`}
                                                            disabled={!hasAssignments}
                                                            onClick={() => {
                                                                showAlert(
                                                                    `مسح كل ${list}؟`,
                                                                    `سيؤدي هذا إلى مسح جميع مباشرات الطلاب في Course ${list}. لا يمكن التراجع عن هذا الإجراء.`,
                                                                    'confirm',
                                                                    () => clearAssignmentsByList(list)
                                                                );
                                                            }}
                                                            title={`مسح كل طلاب Course ${list.replace('L', '')}`}
                                                            className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center font-extrabold transition-all active:scale-95 border shadow-2xs
                                                            ${hasAssignments
                                                                    ? 'bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border-rose-200 hover:shadow-[0_4px_12px_-2px_rgba(225,29,72,0.5)] cursor-pointer'
                                                                    : 'bg-slate-50 text-slate-300 border-slate-200/60 cursor-not-allowed opacity-40 grayscale'}
                                                        `}
                                                        >
                                                            <span className="text-[10px] leading-none mb-0.5 uppercase font-black">{list}</span>
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {!isAdmin && (
                                            <span className="text-sm font-extrabold text-slate-700">المباشرات</span>
                                        )}
                                    </div>
                                </th>
                                {canEdit && <th className="p-3.5 md:p-4 border-b-2 border-slate-200 w-16 text-center text-xs font-bold text-slate-400">إجراءات</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-sm">
                            {paginatedStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={canEdit ? 6 : 5} className="p-12 text-center text-muted-foreground bg-white italic">
                                        لا يوجد طلاب يطابقون خيارات التصفية الحالية.
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
                                                <td className="p-4 text-center text-muted-foreground font-medium">{(savedEdits[student.id]?.stage ?? student.stage).replace('Stage', 'المرحلة')}</td>
                                                <td className="p-4 text-center text-muted-foreground font-medium">{savedEdits[student.id]?.department ?? student.department}</td>
                                            </>
                                        )}
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold shadow-xs
                                            ${student.studyType === 'صباحي' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-indigo-50 text-indigo-800 border border-indigo-200'}`}>
                                                {student.studyType}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex gap-1.5 justify-end">
                                                {(['L1', 'L2', 'L3', 'L4'] as const).map(list => {
                                                    const meta = student.assignments[list];
                                                    const isAssigned = !!meta;
                                                    const isDisabled = !canAssign ||
                                                        (list === 'L1' && !l1Enabled) ||
                                                        (list === 'L2' && !l2Enabled) ||
                                                        (list === 'L3' && !l3Enabled) ||
                                                        (list === 'L4' && !l4Enabled);

                                                    const dateStr = meta?.date
                                                        ? new Date(meta.date).toLocaleDateString('ar-IQ', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })
                                                        : '';

                                                    return (
                                                        <div key={list} className="relative group/btn">
                                                            <button
                                                                disabled={isDisabled && !isAssigned}
                                                                onClick={() => toggleAssignment(student.id, list, currentUser)}
                                                                title={
                                                                    isAssigned
                                                                        ? `Course ${list.replace('L', '')}\nمباشر بواسطة: ${meta?.assignedByUserName || '-'}\nالتاريخ: ${dateStr}`
                                                                        : `تحديد مباشر لـ Course ${list.replace('L', '')}`
                                                                }
                                                                className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xs transition-all border
                                                                ${isAssigned ? 'bg-indigo-600 text-white border-indigo-600 transform scale-105 shadow-[0_4px_10px_-2px_rgba(79,70,229,0.5)] active:scale-95' : 'bg-white text-slate-400 border-slate-200 hover:border-indigo-400 hover:text-indigo-600 active:scale-95 hover:bg-indigo-50'}
                                                                ${isDisabled && !isAssigned ? 'opacity-30 cursor-not-allowed grayscale' : ''}
                                                            `}
                                                            >
                                                                {list}
                                                            </button>

                                                            {/* Rich Hover Card */}
                                                            {isAssigned && (
                                                                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover/btn:flex flex-col items-center z-50 pointer-events-none whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
                                                                    <div className="bg-slate-900/95 text-white backdrop-blur-md px-3 py-2 rounded-xl shadow-xl border border-slate-700/70 text-right min-w-[140px]" dir="rtl">
                                                                        <div className="flex items-center justify-between gap-2 border-b border-slate-700/80 pb-1 mb-1.5">
                                                                            <span className="text-[11px] font-black text-indigo-400">Course {list.replace('L', '')}</span>
                                                                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">مباشر ✓</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5 text-xs text-slate-200">
                                                                            <UserCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                                            <span className="font-bold text-[11px] truncate max-w-[140px]">{meta?.assignedByUserName || 'غير محدد'}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                                                                            <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                                                            <span className="font-medium text-slate-300">{dateStr}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1 border-r border-b border-slate-700/70"></div>
                                                                </div>
                                                            )}
                                                        </div>
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
                                                        title="تعديل الطالب"
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

            {/* Scroll to Top Button — only shows when 30+ items and scrolled down */}
            <ScrollToTop
                itemsCount={paginatedStudents.length}
                hasBottomFab={isAdmin}
            />

            {/* FAB Button — Admin only */}
            {isAdmin && (
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    title="إضافة طالب جديد"
                    style={{
                        opacity: fabVisible ? 1 : 0,
                        pointerEvents: fabVisible ? 'auto' : 'none',
                        transition: 'opacity 0.45s ease, transform 0.2s ease, box-shadow 0.2s ease',
                    }}
                    className="fixed bottom-8 right-8 z-50 h-14 px-5 rounded-2xl bg-gradient-to-l from-indigo-600 to-purple-600 text-white shadow-[0_8px_24px_-4px_rgba(99,102,241,0.6)] hover:shadow-[0_12px_32px_-4px_rgba(99,102,241,0.75)] hover:scale-105 active:scale-95 flex items-center gap-3 group"
                    dir="rtl"
                >
                    <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <UserPlus className="w-4 h-4 transition-transform group-hover:rotate-12 duration-200" />
                    </div>
                    <span className="font-extrabold text-sm tracking-wide">إضافة طالب</span>
                </button>
            )}

            {/* Add Student Modal */}
            {isAddModalOpen && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4"
                    style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)' }}
                >
                    <div
                        className="bg-white rounded-3xl max-w-lg w-full shadow-2xl relative flex flex-col"
                        dir="rtl"
                        style={{ animation: 'modalIn 0.25s cubic-bezier(0.34,1.56,0.64,1) both' }}
                    >
                        {/* Gradient header bar */}
                        <div className="bg-gradient-to-l from-indigo-600 to-purple-600 px-6 py-5 flex items-center justify-between rounded-t-3xl">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                                    <UserPlus className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-lg font-black text-white tracking-tight">إضافة طالب جديد</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsAddModalOpen(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/30 text-white transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Form body */}
                        <form
                            onSubmit={(e) => handleAddStudent(e, false)}
                            noValidate
                            className="px-6 py-6 flex flex-col gap-5 relative pb-10"
                        >
                            {/* Full Name */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-bold text-slate-700">الاسم الكامل للطالب</label>
                                    {formSubmitted && !newName.trim() && (
                                        <span className="text-xs font-bold text-rose-500">حقل مطلوب *</span>
                                    )}
                                </div>
                                <input
                                    type="text"
                                    autoFocus
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    placeholder="أدخل الاسم الرباعي للطالب"
                                    className={`w-full px-4 py-3 border rounded-2xl outline-none focus:ring-2 transition-all font-medium text-slate-800 text-sm ${
                                        formSubmitted && !newName.trim()
                                            ? 'border-rose-500 bg-rose-50/20 ring-2 ring-rose-500/20'
                                            : 'bg-slate-50 border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white'
                                    }`}
                                />
                            </div>

                            {/* Department — searchable dropdown */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-bold text-slate-700">القسم (التخصص)</label>
                                    {formSubmitted && !newDept.trim() && (
                                        <span className="text-xs font-bold text-rose-500">يرجى اختيار القسم *</span>
                                    )}
                                </div>
                                <Dropdown
                                    value={newDept}
                                    placeholder="-- اختر القسم (التخصص) --"
                                    hasError={formSubmitted && !newDept.trim()}
                                    onChange={setNewDept}
                                    searchable={true}
                                    options={departments.map((d: string) => ({ label: d, value: d }))}
                                />
                            </div>

                            {/* Stage + Type — two columns */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-bold text-slate-700">المرحلة الدراسية</label>
                                        {formSubmitted && !newStage.trim() && (
                                            <span className="text-xs font-bold text-rose-500">مطلوب *</span>
                                        )}
                                    </div>
                                    <select
                                        value={newStage}
                                        onChange={(e) => setNewStage(e.target.value)}
                                        className={`w-full px-4 py-3 border rounded-2xl outline-none focus:ring-2 transition-all font-bold text-sm ${
                                            !newStage ? 'text-slate-400 font-normal' : 'text-slate-800'
                                        } ${
                                            formSubmitted && !newStage.trim()
                                                ? 'border-rose-500 bg-rose-50/20 ring-2 ring-rose-500/20'
                                                : 'bg-slate-50 border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white'
                                        }`}
                                    >
                                        <option value="" disabled>-- اختر المرحلة --</option>
                                        {[1,2,3,4,5,6].map(n => (
                                            <option key={n} value={String(n)} className="text-slate-800 font-bold">المرحلة {n}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-bold text-slate-700">نوع الدراسة</label>
                                        {formSubmitted && !newType && (
                                            <span className="text-xs font-bold text-rose-500">مطلوب *</span>
                                        )}
                                    </div>
                                    <select
                                        value={newType}
                                        onChange={(e) => setNewType(e.target.value as StudyType)}
                                        className={`w-full px-4 py-3 border rounded-2xl outline-none focus:ring-2 transition-all font-bold text-sm ${
                                            !newType ? 'text-slate-400 font-normal' : 'text-slate-800'
                                        } ${
                                            formSubmitted && !newType
                                                ? 'border-rose-500 bg-rose-50/20 ring-2 ring-rose-500/20'
                                                : 'bg-slate-50 border-slate-200 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white'
                                        }`}
                                    >
                                        <option value="" disabled>-- اختر نوع الدراسة --</option>
                                        <option value="صباحي" className="text-slate-800 font-bold">صباحي</option>
                                        <option value="مسائي" className="text-slate-800 font-bold">مسائي</option>
                                    </select>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2.5 mt-1">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 px-4 text-white font-extrabold text-sm rounded-2xl bg-gradient-to-l from-indigo-600 to-purple-600 hover:brightness-110 shadow-md shadow-indigo-500/25 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : 'حفظ وإغلاق'}
                                </button>
                                <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={(e) => handleAddStudent(e as any, true)}
                                    className="flex-1 py-3 px-4 text-indigo-700 font-extrabold text-sm rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                    ) : 'حفظ ومتابعة'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bottom-right success toast — sits above FAB */}
            <div
                className="fixed bottom-28 right-8 z-[200] pointer-events-none"
                style={{
                    transition: 'opacity 0.4s ease, transform 0.4s ease',
                    opacity: toast.show ? 1 : 0,
                    transform: toast.show ? 'translateY(0)' : 'translateY(16px)',
                }}
            >
                <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700" dir="rtl">
                    <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                    <div>
                        <p className="font-extrabold text-sm leading-tight">تمت الإضافة بنجاح</p>
                        <p className="text-slate-400 text-xs mt-0.5 font-medium truncate max-w-[180px]">{toast.name}</p>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.92) translateY(12px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
            `}</style>
        </div>
    );
}
