'use client';

import React, { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/navigation';
import { Settings as SettingsIcon, ShieldAlert, Users, Plus, Trash2, X, AlertCircle, ChevronDown, ChevronUp, Database, Download, Upload, AlertTriangle, KeyRound } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Role, Department, normalizeArabic } from '../../lib/store';

export default function SettingsPage() {
    const router = useRouter();
    const {
        currentUser,
        l1Enabled, l2Enabled, l3Enabled, l4Enabled,
        setL1Enabled, setL2Enabled, setL3Enabled, setL4Enabled,
        users, addUser, removeUser, updateUserRole, updateUserDepartments,
        departments, addDepartment, removeDepartment,
        showAlert, isInitialized, isHydrated
    } = useStore();
    const [mounted, setMounted] = useState(false);

    // Department Management State
    const [newDepartmentName, setNewDepartmentName] = useState('');
    const [isDepartmentsOpen, setIsDepartmentsOpen] = useState(false);

    // New User Form State
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState<Role>('Viewer');
    const [newUserDepts, setNewUserDepts] = useState<Department[]>([]);
    const [isUsersOpen, setIsUsersOpen] = useState(false);

    // Search and Filter State
    const [userSearch, setUserSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<'All' | Role>('All');

    // Database Admin State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');
    const [passwordAction, setPasswordAction] = useState<(() => Promise<void>) | null>(null);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [isDatabaseLoading, setIsDatabaseLoading] = useState(false);
    const [modalError, setModalError] = useState('');
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [isDatabaseOpen, setIsDatabaseOpen] = useState(false);
    const [hasData, setHasData] = useState<boolean | null>(null);
    const [activeAction, setActiveAction] = useState<'export' | 'import' | 'delete' | null>(null);

    const checkDataStatus = async () => {
        try {
            const { data, error } = await supabase.from('students').select('id').limit(1);
            if (!error) {
                setHasData(data && data.length > 0);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (isDatabaseOpen && hasData === null) {
            checkDataStatus();
        }
    }, [isDatabaseOpen, hasData]);

    useEffect(() => {
        setMounted(true);
        if (!currentUser || currentUser.role !== 'Admin') {
            router.push('/');
        }
    }, [currentUser, router]);

    if (!mounted || !isInitialized || !isHydrated) return (
        <div className="flex items-center justify-center h-[50vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
    );
    if (!currentUser || currentUser.role !== 'Admin') return null;

    const handleAddUser = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) return;

        const depts = newUserRole === 'Viewer' ? newUserDepts : undefined;
        addUser(newUserName.trim(), newUserEmail.trim(), newUserPassword.trim(), newUserRole, depts);

        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserDepts([]);
    };

    const handleAddDepartment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newDepartmentName.trim()) return;

        if (departments.map(d => d.toLowerCase()).includes(newDepartmentName.trim().toLowerCase())) {
            showAlert('Wait!', 'Department already exists.', 'error');
            return;
        }

        await addDepartment(newDepartmentName.trim());
        setNewDepartmentName('');
    };

    const toggleNewUserDept = (dept: Department) => {
        setNewUserDepts(prev =>
            prev.includes(dept) ? prev.filter(d => d !== dept) : [...prev, dept]
        );
    };

    const toggleExistingUserDept = (userId: string, currentDepts: Department[] = [], dept: Department) => {
        const newDepts = currentDepts.includes(dept)
            ? currentDepts.filter(d => d !== dept)
            : [...currentDepts, dept];
        updateUserDepartments(userId, newDepts);
    };

    const filteredUsers = users.filter(u => {
        const cleanedUserSearch = normalizeArabic(userSearch);
        const matchesSearch = !cleanedUserSearch ||
            normalizeArabic(u.name || '').includes(cleanedUserSearch) ||
            u.email.toLowerCase().trim().includes(cleanedUserSearch);
        const matchesRole = roleFilter === 'All' || u.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    const triggerPasswordModal = (action: () => Promise<void>) => {
        setPasswordAction(() => action);
        setAdminPassword('');
        setModalError('');
        setShowPasswordModal(true);
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setModalError('');
        setIsDatabaseLoading(true);

        if (!currentUser?.email) {
            setModalError('لم يتم العثور على البريد الإلكتروني للمسؤول.');
            setIsDatabaseLoading(false);
            return;
        }

        try {
            const { error: authError } = await supabase.auth.signInWithPassword({
                email: currentUser.email,
                password: adminPassword
            });

            if (authError) {
                setModalError('كلمة المرور غير صحيحة.');
                setIsDatabaseLoading(false);
                return;
            }

            // Success, close modal and execute action
            setShowPasswordModal(false);
            if (passwordAction) {
                await passwordAction();
            }
        } catch (error) {
            setModalError('حدث خطأ أثناء التحقق من كلمة المرور.');
        } finally {
            setIsDatabaseLoading(false);
            setActiveAction(null);
        }
    };

    const handleExportAll = () => {
        triggerPasswordModal(async () => {
            setActiveAction('export');
            setIsDatabaseLoading(true);
            try {
                let allStudents: any[] = [];
            let page = 0;
            const PAGE_SIZE = 1000;
            let hasMore = true;

            while (hasMore) {
                const { data, error } = await supabase
                    .from('students')
                    .select('*')
                    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
                
                if (error) throw error;
                
                if (data && data.length > 0) {
                    allStudents = [...allStudents, ...data];
                    page++;
                } else {
                    hasMore = false;
                }
            }

            const wb = XLSX.utils.book_new();
            const wsStudents = XLSX.utils.json_to_sheet(allStudents);
            XLSX.utils.book_append_sheet(wb, wsStudents, "الطلاب (Students)");

                XLSX.writeFile(wb, `Students_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
                showAlert('نجاح', `تم تصدير ${allStudents.length} طالب بنجاح.`, 'success');
            } catch (error: any) {
                showAlert('خطأ في التصدير', error.message || 'فشل بناء ملف التصدير.', 'error');
            }
        });
    };

    const handleImportData = () => {
        if (!importFile) {
            showAlert('تنبيه', 'الرجاء اختيار ملف للاستيراد أولاً.', 'error');
            return;
        }

        triggerPasswordModal(async () => {
            setActiveAction('import');
            setIsDatabaseLoading(true);
            try {
                await new Promise<void>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = async (e) => {
                        try {
                            const data = new Uint8Array(e.target?.result as ArrayBuffer);
                            const workbook = XLSX.read(data, { type: 'array' });
                            let importedCount = 0;

                            const studentsSheetName = workbook.SheetNames.find(n => n.includes('Students') || n.includes('طلاب') || n === 'Sheet1');
                            if (studentsSheetName) {
                                const studentsData: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[studentsSheetName]);
                                if (studentsData.length > 0) {
                                    const BATCH_SIZE = 1000;
                                    for (let i = 0; i < studentsData.length; i += BATCH_SIZE) {
                                        const chunk = studentsData.slice(i, i + BATCH_SIZE).map((row: any) => {
                                            const { id, ...rest } = row;
                                            return rest;
                                        });
                                        const { error } = await supabase.from('students').insert(chunk);
                                        if (error) throw new Error(`خطأ في رفع الطلاب: ${error.message}`);
                                    }
                                    importedCount += studentsData.length;
                                    setHasData(true);
                                }
                            }

                            showAlert('نجاح', `تم استيراد ${importedCount} طالب بنجاح.`, 'success');
                            setImportFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                            resolve();
                        } catch (err: any) {
                            showAlert('خطأ أثناء الاستيراد', err.message || 'فشل استيراد البيانات.', 'error');
                            reject(err);
                        }
                    };
                    reader.onerror = (err) => {
                        showAlert('خطأ عام', 'فشل في قراءة الملف.', 'error');
                        reject(err);
                    };
                    reader.readAsArrayBuffer(importFile);
                });
            } catch (error: any) {
                // errors already handled inside callback
            }
        });
    };

    const handleDeleteAllData = () => {
        showAlert(
            'حذف بيانات الطلاب',
            'سيتم مسح جميع بيانات الطلاب بالكامل وبشكل لا يمكن استرجاعه. هل أنت متأكد تماماً؟',
            'confirm',
            () => {
                // Secondary prompt via password
                triggerPasswordModal(async () => {
                    setActiveAction('delete');
                    setIsDatabaseLoading(true);
                    try {
                        // Delete from assignments first due to FK constraints (if any)
                        const { error: asgnError } = await supabase.from('assignments').delete().neq('student_id', '00000000-0000-0000-0000-000000000000');
                        if (asgnError) throw asgnError;

                        // Delete all students
                        const { error: stdError } = await supabase.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000');
                        if (stdError) throw stdError;

                        setHasData(false);
                        showAlert('تم بنجاح', 'تم حذف جميع بيانات النظام الأساسية.', 'success');
                    } catch (error: any) {
                        showAlert('خطأ', error.message || 'لم نتمكن من مسح بعض البيانات.', 'error');
                    }
                });
            }
        );
    };

    return (
        <div className="space-y-6 max-w-[1200px] mx-auto pb-10">
            <div>
                <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-purple-700 tracking-tight">إعدادات المسؤول</h1>
                <p className="text-sm font-medium text-slate-500 mt-2">
                    إدارة تكوينات النظام
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {/* RIGHT COLUMN: User Management */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-xl font-bold flex items-center gap-2 text-[#1a2b4b]">
                            <Users className="w-5 h-5 text-purple-500" />
                            إدارة المستخدمين
                        </h2>
                        <p className="text-[13px] text-gray-500 mt-1">تتطلب إدارة المستخدمين تفعيل قاعدة البيانات. حاليا يستخدم حالة محلية للعرض التوضيحي.</p>
                    </div>

                    {/* Manage Departments */}
                    <div className="p-6 border-b border-gray-100 bg-white">
                        <div className="flex justify-between items-center cursor-pointer mb-4" onClick={() => setIsDepartmentsOpen(!isDepartmentsOpen)}>
                            <h3 className="text-[14px] font-bold text-[#1a2b4b] flex items-center gap-2">
                                <SettingsIcon className="w-4 h-4 text-blue-500" />
                                إدارة الأقسام
                            </h3>
                            {isDepartmentsOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                        {isDepartmentsOpen && (
                            <>
                                <form onSubmit={handleAddDepartment} className="flex gap-3 mb-4">
                                    <input
                                        type="text"
                                        required
                                        value={newDepartmentName}
                                        onChange={(e) => setNewDepartmentName(e.target.value)}
                                        placeholder="اسم القسم الجديد"
                                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-[13px]"
                                    />
                                    <button type="submit" className="px-5 h-[42px] bg-blue-500 text-white rounded-xl flex items-center gap-1.5 hover:bg-blue-600 transition-all font-bold text-[13px]">
                                        <Plus className="w-4 h-4 text-white" />
                                        إضافة
                                    </button>
                                </form>
                                {departments.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-4">
                                        {departments.map(dept => (
                                            <span key={dept} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 text-[12px] font-bold border border-gray-100">
                                                {dept}
                                                <button
                                                    type="button"
                                                    onClick={() => showAlert('تنبيه!', `حذف القسم "${dept}"؟`, 'confirm', () => removeDepartment(dept))}
                                                    className="hover:text-red-500 text-gray-400 transition-colors ml-1"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Add New Account */}
                    <div className="p-6 border-b border-gray-100 bg-white">
                        <h3 className="text-[14px] font-bold text-[#1a2b4b] mb-4 flex items-center gap-2">
                            <Plus className="w-4 h-4 text-blue-500" />
                            إضافة حساب جديد
                        </h3>
                        <form onSubmit={handleAddUser} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">الاسم الكامل</label>
                                    <div className="relative">
                                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            required
                                            value={newUserName}
                                            onChange={(e) => setNewUserName(e.target.value)}
                                            placeholder="مثال: أحمد علي"
                                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-[13px]"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">البريد الإلكتروني</label>
                                    <div className="relative">
                                        <SettingsIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="email"
                                            required
                                            value={newUserEmail}
                                            onChange={(e) => setNewUserEmail(e.target.value)}
                                            placeholder="ahmed@edu.com"
                                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-[13px]"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">كلمة المرور</label>
                                    <div className="relative">
                                        <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="password"
                                            required
                                            value={newUserPassword}
                                            onChange={(e) => setNewUserPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-[13px]"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">مستوى الصلاحية</label>
                                    <select
                                        value={newUserRole}
                                        onChange={(e) => {
                                            setNewUserRole(e.target.value as Role);
                                            if (e.target.value !== 'Viewer') setNewUserDepts([]);
                                        }}
                                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-[13px] bg-white appearance-none"
                                    >
                                        <option value="Operator">Operator</option>
                                        <option value="Viewer">Viewer</option>
                                        <option value="Admin">Administrator</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1">صلاحية الوصول للأقسام</label>
                                    {newUserRole === 'Viewer' ? (
                                        <select
                                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-[13px] text-gray-500 bg-white appearance-none"
                                            onChange={(e) => {
                                                const dept = e.target.value as Department;
                                                if (dept && !newUserDepts.includes(dept)) {
                                                    setNewUserDepts([...newUserDepts, dept]);
                                                }
                                                e.target.value = "";
                                            }}
                                        >
                                            <option value="">+ إضافة قسم...</option>
                                            {departments.filter(d => !newUserDepts.includes(d)).map(dept => (
                                                <option key={dept} value={dept}>{dept}</option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="w-full py-2.5 rounded-xl border border-transparent outline-none transition-all font-bold text-[13px] text-gray-300 pointer-events-none appearance-none">
                                            غير مطلوب
                                        </div>
                                    )}
                                </div>

                                <button type="submit" className="w-full h-[42px] bg-blue-500 text-white rounded-xl flex items-center justify-center gap-1.5 hover:bg-blue-600 transition-all font-bold text-[13px]">
                                    <Plus className="w-4 h-4 text-white" />
                                    إنشاء
                                </button>
                            </div>

                            {newUserRole === 'Viewer' && newUserDepts.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {newUserDepts.map(dept => (
                                        <span key={dept} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-50 text-gray-700 text-[12px] font-bold border border-gray-100">
                                            {dept}
                                            <button type="button" onClick={() => toggleNewUserDept(dept)} className="hover:text-red-500 ml-1 mt-0.5 text-gray-400">
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </form>
                    </div>

                    {/* List Section */}
                    <div className="p-6 bg-white flex-1">
                        <div className="flex justify-between items-center cursor-pointer mb-4" onClick={() => setIsUsersOpen(!isUsersOpen)}>
                            <h3 className="text-[14px] font-bold text-[#1a2b4b] flex items-center gap-2">
                                <Users className="w-4 h-4 text-blue-500" />
                                قائمة المستخدمين
                            </h3>
                            {isUsersOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                        </div>
                        {isUsersOpen && (
                            <>
                                <div className="flex flex-col sm:flex-row gap-4 mb-4" dir="rtl">
                                    <div className="flex-1 relative">
                                        <Users className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="البحث بالاسم أو البريد..."
                                            value={userSearch}
                                            onChange={(e) => setUserSearch(e.target.value)}
                                            className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium text-[13px]"
                                        />
                                    </div>
                                    <div className="w-full sm:w-40 relative">
                                        <select
                                            value={roleFilter}
                                            onChange={(e) => setRoleFilter(e.target.value as any)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-[13px] appearance-none"
                                        >
                                            <option value="All">كل الصلاحيات</option>
                                            <option value="Admin">المسؤولين</option>
                                            <option value="Operator">المشغلين</option>
                                            <option value="Viewer">المشاهدين</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {filteredUsers.length === 0 ? (
                                        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                            <p className="text-gray-400 font-medium">لا يوجد مستخدمين يطابقون بحثك</p>
                                        </div>
                                    ) : (
                                        filteredUsers.map(u => (
                                            <div key={u.id} className={`flex items-center justify-between p-4 border rounded-2xl bg-white transition-all hover:border-gray-300 ${u.id === currentUser.id ? 'border-gray-200' : 'border-gray-100'}`}>
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-11 h-11 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm ${u.role === 'Admin' ? 'bg-red-50 text-red-600' :
                                                        u.role === 'Operator' ? 'bg-blue-50 text-blue-600' :
                                                            'bg-gray-100 text-gray-500'
                                                        }`}>
                                                        {u.id === currentUser.id ? 'أنت' : (u.role === 'Operator' ? 'OP' : (u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'))}
                                                    </div>

                                                    <div>
                                                        <div className="flex items-center gap-2 mb-0.5">
                                                            <p className="font-bold text-[#1a2b4b] text-[14px] uppercase tracking-tight">{u.name}</p>
                                                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${u.role === 'Admin' ? 'bg-red-50 text-red-600' :
                                                                u.role === 'Operator' ? 'bg-blue-50 text-blue-600' :
                                                                    'bg-gray-100 text-gray-500'
                                                                }`}>
                                                                {u.role === 'Admin' ? 'مسؤول' : u.role === 'Operator' ? 'مشغل' : 'مشاهد'}
                                                            </span>
                                                            {u.id === currentUser.id && (
                                                                <span className="text-[9px] bg-blue-500 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-widest">أنت</span>
                                                            )}
                                                        </div>
                                                        <p className="text-[12px] text-gray-500 font-medium">{u.email}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-5 pr-2">
                                                    {u.role === 'Viewer' && (
                                                        <div className="block">
                                                            {/* Viewer logic */}
                                                            <div className="flex items-center bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 group relative">
                                                                <span className="text-[10px] font-black text-gray-400 mr-2 uppercase tracking-widest">الأقسام</span>
                                                                <div className="flex gap-1.5">
                                                                    {(u.allowedDepartments || []).length > 0 ? (
                                                                        (u.allowedDepartments || []).map((dept) => (
                                                                            <div key={dept} className="h-5 px-1.5 rounded bg-white border border-gray-200 flex items-center justify-center text-[10px] font-bold text-[#1a2b4b] shadow-sm uppercase">
                                                                                {dept.substring(0, 2)}
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <span className="text-[10px] font-bold text-red-400 uppercase">بدون</span>
                                                                    )}
                                                                </div>
                                                                <select
                                                                    disabled={u.id === currentUser.id}
                                                                    className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
                                                                    onChange={(e) => {
                                                                        const dept = e.target.value as Department;
                                                                        if (dept) toggleExistingUserDept(u.id, u.allowedDepartments || [], dept);
                                                                        e.target.value = "";
                                                                    }}
                                                                >
                                                                    <option value="">تبديل الأقسام</option>
                                                                    {departments.map(d => {
                                                                        const isSelected = (u.allowedDepartments || []).includes(d);
                                                                        return (
                                                                            <option
                                                                                key={d}
                                                                                value={d}
                                                                                style={isSelected ? { backgroundColor: '#fee2e2', color: '#ef4444' } : undefined}
                                                                            >
                                                                                {d}
                                                                            </option>
                                                                        );
                                                                    })}
                                                                </select>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-3">
                                                        <select
                                                            disabled={u.id === currentUser.id}
                                                            value={u.role}
                                                            onChange={(e) => {
                                                                const newRole = e.target.value as Role;
                                                                updateUserRole(u.id, newRole);
                                                                if (newRole !== 'Viewer') updateUserDepartments(u.id, []);
                                                            }}
                                                            className="appearance-none text-[12px] font-bold text-gray-400 bg-transparent outline-none cursor-pointer hover:text-gray-700 transition-colors uppercase disabled:opacity-50"
                                                        >
                                                            <option value="Operator">OP</option>
                                                            <option value="Viewer">VIEW</option>
                                                            <option value="Admin">AD</option>
                                                        </select>

                                                        <button
                                                            disabled={u.id === currentUser.id}
                                                            onClick={() => showAlert('تنبيه!', `حذف المستخدم ${u.name}؟`, 'confirm', () => removeUser(u.id))}
                                                            className="text-gray-300 hover:text-red-500 transition-colors disabled:opacity-20"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
                {/* LEFT COLUMN: Assignment Controls & Database Operations */}
                <div className="space-y-8 flex-1 min-w-0">
                    {/* LEFT COLUMN: Assignment Controls */}
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-[#1a2b4b]">
                            <SettingsIcon className="w-5 h-5 text-indigo-500" />
                            ضوابط المباشرة
                        </h2>
    
                        <p className="text-[13px] text-gray-500 mb-6 leading-relaxed">
                            تبديل توفر أزرار تعيين Course 1-4 عبر التطبيق. عند التعطيل، لن يتمكن المشغلون من تعيين الطلاب لهذه الدورات.
                        </p>
    
                        <div className="space-y-3">
                            {[
                                { name: 'Course 1 (L1)', desc: 'السماح بتعيينات Course 1', enabled: l1Enabled, setEnabled: setL1Enabled },
                                { name: 'Course 2 (L2)', desc: 'السماح بتعيينات Course 2', enabled: l2Enabled, setEnabled: setL2Enabled },
                                { name: 'Course 3 (L3)', desc: 'السماح بتعيينات Course 3', enabled: l3Enabled, setEnabled: setL3Enabled },
                                { name: 'Course 4 (L4)', desc: 'السماح بتعيينات Course 4', enabled: l4Enabled, setEnabled: setL4Enabled },
                            ].map(list => (
                                <div key={list.name} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                    <div>
                                        <p className="font-bold text-[#1a2b4b] text-[14px]">{list.name}</p>
                                        <p className="text-[13px] text-gray-500">{list.desc}</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={list.enabled}
                                            onChange={(e) => list.setEnabled(e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                                    </label>
                                </div>
                            ))}
                        </div>
    
                        <div className="mt-6 flex items-start gap-3 p-4 bg-blue-50/50 text-blue-700 rounded-xl border border-blue-100">
                            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                            <p className="text-[13px] leading-relaxed">
                                ملاحظة: تعطيل زر لا يزيل التعيينات الحالية. يمنع فقط التعيينات الجديدة. يمكن للمسؤولين فقط الوصول إلى هذه الإعدادات.
                            </p>
                        </div>
                    </div>
    
                    {/* LEFT COLUMN: Database Operations */}
                    <div className="bg-red-50/20 p-6 rounded-2xl border border-red-100 shadow-sm transition-all duration-200">
                        <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsDatabaseOpen(!isDatabaseOpen)}>
                            <h2 className="text-xl font-bold flex items-center gap-2 text-red-700 m-0">
                                <Database className="w-5 h-5" />
                                إدارة قاعدة البيانات
                            </h2>
                            {isDatabaseOpen ? <ChevronUp className="w-5 h-5 text-red-500" /> : <ChevronDown className="w-5 h-5 text-red-500" />}
                        </div>
                        
                        {isDatabaseOpen && (
                            <div className="mt-4 pt-4 border-t border-red-100/50 animate-in slide-in-from-top-2 fade-in duration-200">
                                <p className="text-[13px] text-gray-600 mb-6 leading-relaxed">
                                    أدوات متقدمة للتحكم الشامل ببيانات النظام. تتطلب جميع هذه العمليات إدخال كلمة المرور الخاصة بحساب المسؤول لتأكيد الإجراء.
                                </p>
    
                        <div className="space-y-4">
                            {/* Export Block */}
                            <div className="bg-white p-4 rounded-xl border border-gray-200">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-bold text-[#1a2b4b] text-[14px]">تصدير شامل</h3>
                                    <Download className="w-4 h-4 text-gray-400" />
                                </div>
                                <p className="text-[12px] text-gray-500 mb-4">تحميل جميع بيانات الطلاب الحالية بصيغة ملف Excel (.xlsx).</p>
                                <button
                                    onClick={handleExportAll}
                                    disabled={isDatabaseLoading || hasData === false}
                                    title={hasData === false ? 'لا توجد بيانات للتصدير' : ''}
                                    className="w-full h-[42px] bg-white text-gray-700 border border-gray-300 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-all font-bold text-[13px] disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                                >
                                    {isDatabaseLoading && showPasswordModal === false && activeAction === 'export' ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" />
                                            جاري التصدير...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4" />
                                            ابدأ التصدير
                                        </>
                                    )}
                                </button>
                            </div>
    
                            {/* Import Block */}
                            <div className="bg-white p-4 rounded-xl border border-gray-200">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-bold text-[#1a2b4b] text-[14px]">استيراد بيانات</h3>
                                    <Upload className="w-4 h-4 text-gray-400" />
                                </div>
                                <p className="text-[12px] text-gray-500 mb-4">استيراد أو تحديث البيانات من ملف Excel بصيغة تتوافق مع تصدير النظام.</p>
                                
                                <input
                                    type="file"
                                    accept=".xlsx, .xls, .csv"
                                    disabled={isDatabaseLoading || hasData === true}
                                    ref={fileInputRef as any}
                                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                                    className="block w-full text-[12px] text-gray-500 mb-3
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-full file:border-0
                                    file:text-sm file:font-semibold
                                    file:bg-blue-50 file:text-blue-700
                                    hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                />
    
                                <button
                                    onClick={handleImportData}
                                    disabled={isDatabaseLoading || !importFile || hasData === true}
                                    title={hasData === true ? 'يوجد بيانات بالفعل. الرجاء حذفها أولاً للاستيراد' : ''}
                                    className="w-full h-[42px] bg-blue-500 text-white rounded-xl flex items-center justify-center gap-2 hover:bg-blue-600 transition-all font-bold text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isDatabaseLoading && showPasswordModal === false && activeAction === 'import' ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            جاري الاستيراد...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4 text-white" />
                                            رفع البيانات وإدراجها
                                        </>
                                    )}
                                </button>
                            </div>
    
                            {/* Delete All Block */}
                            <div className="bg-white p-4 rounded-xl border border-red-200">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-bold text-red-600 text-[14px]">حذف بيانات الطلاب</h3>
                                    <AlertTriangle className="w-4 h-4 text-red-500" />
                                </div>
                                <p className="text-[12px] text-gray-500 mb-4">حذف كافة بيانات الطلاب والمهام المخزنة. <b>إحذر! هذا الإجراء لا يمكن التراجع عنه.</b></p>
                                <button
                                    onClick={handleDeleteAllData}
                                    disabled={isDatabaseLoading || hasData === false}
                                    title={hasData === false ? 'لا توجد بيانات للحذف' : ''}
                                    className="w-full h-[42px] bg-red-50 text-red-600 border border-red-200 rounded-xl flex items-center justify-center gap-2 hover:bg-red-100 transition-all font-bold text-[13px] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isDatabaseLoading && showPasswordModal === false && activeAction === 'delete' ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-red-400 border-t-red-600 rounded-full animate-spin" />
                                            جاري الحذف...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2 className="w-4 h-4" />
                                            حذف بيانات الطلاب
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                            </div>
                        )}
                    </div>
    
                </div>
            </div>

            {/* Password Verification Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 text-red-600 mb-4">
                            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                                <KeyRound className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">التحقق مطلوب</h3>
                                <p className="text-xs text-slate-500">يرجى إدخال كلمة مرور الحساب للتنفيذ</p>
                            </div>
                        </div>

                        <form onSubmit={handlePasswordSubmit}>
                            <div className="mb-4">
                                <input
                                    type="password"
                                    required
                                    autoFocus
                                    value={adminPassword}
                                    onChange={(e) => setAdminPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 font-sans tracking-widest text-center outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 focus:bg-white transition-all"
                                />
                                {modalError && (
                                    <p className="text-red-500 text-[11px] font-bold mt-2 text-center">{modalError}</p>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowPasswordModal(false)}
                                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 font-bold text-sm hover:bg-gray-50 transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={isDatabaseLoading || !adminPassword}
                                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center"
                                >
                                    {isDatabaseLoading ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        'تأكيد وتنفيذ'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
