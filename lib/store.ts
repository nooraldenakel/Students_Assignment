import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from './supabase';

// Baghdad operates on GMT+3 (UTC+3) with no DST
export function getNextBaghdadMidnight(nowMs: number = Date.now()): number {
    const BAGHDAD_OFFSET_MS = 3 * 60 * 60 * 1000; // GMT+3
    const baghdadTime = new Date(nowMs + BAGHDAD_OFFSET_MS);

    const year = baghdadTime.getUTCFullYear();
    const month = baghdadTime.getUTCMonth();
    const date = baghdadTime.getUTCDate();

    // 12:00 AM (00:00:00.000) of the next day in Baghdad
    const nextMidnightBaghdad = Date.UTC(year, month, date + 1, 0, 0, 0, 0);
    return nextMidnightBaghdad - BAGHDAD_OFFSET_MS;
}

export type Role = 'Admin' | 'Operator' | 'Viewer';

export interface User {
    id: string;
    name: string;
    email: string;
    role: Role;
    allowedDepartments?: Department[];
}

export const normalizeArabic = (text: string): string => {
    if (!text) return '';
    return text
        .trim()
        .toLowerCase()
        .replace(/[\u064B-\u065F\u0670]/g, '') // Remove tashkeel
        .replace(/[أإآٱ]/g, 'ا') // Normalize Alefs
        .replace(/ة/g, 'ه') // Normalize Taa Marbuta
        .replace(/ى/g, 'ي') // Normalize Alef Maksura
        .replace(/\s+/g, ' '); // Normalize multiple spaces
};

export function buildArabicRegexPattern(term: string): string {
    if (!term || !term.trim()) return '';
    const words = term.trim()
        .replace(/[\u064B-\u065F\u0670]/g, '')
        .split(/\s+/)
        .filter(Boolean);

    const wordPatterns = words.map(w => {
        const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return escaped
            .replace(/[أإآٱا]/g, '[أإآٱا]')
            .replace(/[ةه]/g, '[ةه]')
            .replace(/[ىي]/g, '[ىي]');
    });

    return '.*' + wordPatterns.join('.*') + '.*';
}

export type Department = string;
export type StudyType = 'صباحي' | 'مسائي';

export interface AssignmentMeta {
    date: string;
    assignedByUserId: string;
    assignedByUserName: string;
}

export interface Student {
    id: string;
    name: string;
    stage: string;
    department: Department;
    studyType: StudyType;
    assignments: {
        L1?: AssignmentMeta;
        L2?: AssignmentMeta;
        L3?: AssignmentMeta;
        L4?: AssignmentMeta;
    };
}

interface AppState {
    users: User[];
    currentUser: User | null;
    sessionExpiresAt: number | null;
    students: Student[];
    totalStudentsCount: number;
    stats: {
        totalAssigned: number;
        assignedToday: number;
        byList: { L1: number; L2: number; L3: number; L4: number };
    };
    courseStudents: Record<'L1' | 'L2' | 'L3' | 'L4', Student[]>;
    courseDataVersion: number;

    l1Enabled: boolean;
    l2Enabled: boolean;
    l3Enabled: boolean;
    l4Enabled: boolean;
    departments: string[];
    stages: string[];
    isInitialized: boolean;
    isHydrated: boolean;

    setHydrated: () => void;
    initRealtime: () => Promise<void>;
    refreshViewerData: () => Promise<void>;
    refreshStats: () => Promise<void>;

    fetchStudentsPage: (params: {
        page: number;
        pageSize: number;
        searchTerm?: string;
        deptFilter?: Department | 'All';
        stageFilter?: string;
        studyTypeFilter?: StudyType | 'All';
        sortField?: string | null;
        sortDirection?: 'asc' | 'desc';
    }) => Promise<{ count: number }>;

    fetchCourseStudentsPage: (params: {
        courseId: 'L1' | 'L2' | 'L3' | 'L4';
        page: number;
        pageSize: number;
        searchTerm?: string;
        deptFilter?: Department | 'All';
        stageFilter?: string;
        studyTypeFilter?: StudyType | 'All';
        sortField?: string | null;
        sortDirection?: 'asc' | 'desc';
    }) => Promise<{ students: Student[]; totalCount: number }>;

    fetchCourseAllStudentsForExport: (params: {
        courseId: 'L1' | 'L2' | 'L3' | 'L4';
        searchTerm?: string;
        deptFilter?: Department | 'All';
        stageFilter?: string;
        studyTypeFilter?: StudyType | 'All';
    }) => Promise<Student[]>;

    fetchCourseStudents: (courseId: 'L1' | 'L2' | 'L3' | 'L4') => Promise<Student[]>;

    login: (email: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;

    addUser: (name: string, email: string, password: string, role: Role, allowedDepartments?: Department[]) => Promise<void>;
    removeUser: (userId: string) => Promise<void>;
    updateUserRole: (userId: string, newRole: Role) => Promise<void>;
    updateUserDepartments: (userId: string, departments: Department[]) => Promise<void>;

    addDepartment: (name: string) => Promise<void>;
    removeDepartment: (name: string) => Promise<void>;

    updateStudent: (id: string, updates: Partial<Student>) => Promise<void>;
    addStudent: (data: Omit<Student, 'id' | 'assignments'>) => Promise<boolean>;
    toggleAssignment: (studentId: string, list: 'L1' | 'L2' | 'L3' | 'L4', user: User) => Promise<void>;
    removeAssignment: (studentId: string, list: 'L1' | 'L2' | 'L3' | 'L4', user: User) => Promise<void>;
    clearAllAssignments: () => Promise<void>;
    clearAssignmentsByList: (list: 'L1' | 'L2' | 'L3' | 'L4') => Promise<void>;
    clearAssignmentsByDepartment: (dept: Department) => Promise<void>;

    setL1Enabled: (enabled: boolean) => Promise<void>;
    setL2Enabled: (enabled: boolean) => Promise<void>;
    setL3Enabled: (enabled: boolean) => Promise<void>;
    setL4Enabled: (enabled: boolean) => Promise<void>;

    alert: {
        isOpen: boolean;
        title: string;
        message: string;
        type: 'info' | 'error' | 'success' | 'confirm';
        onConfirm?: () => void;
    };
    showAlert: (title: string, message: string, type: 'info' | 'error' | 'success' | 'confirm', onConfirm?: () => void) => void;
    hideAlert: () => void;
}

let isInitializing = false;
let activeRealtimeChannel: any = null;
let refreshStatsTimeout: NodeJS.Timeout | null = null;

export async function fetchAllRecords(table: string, filterConfig?: { column: string, inValues: string[] }) {
    // 1. Get total count
    let countQuery = supabase.from(table).select('*', { count: 'exact', head: true });
    if (filterConfig && filterConfig.inValues.length > 0) {
        countQuery = countQuery.in(filterConfig.column, filterConfig.inValues);
    }
    const { count, error: countError } = await countQuery;

    if (countError || count === null) {
        // Fallback to sequential if count fails
        let allData: any[] = [];
        let from = 0;
        const limit = 1000;
        while (true) {
            let query = supabase.from(table).select('*').range(from, from + limit - 1);
            if (filterConfig && filterConfig.inValues.length > 0) {
                query = query.in(filterConfig.column, filterConfig.inValues);
            }
            const { data, error } = await query;
            if (error || !data) break;
            allData.push(...data);
            if (data.length < limit) break;
            from += limit;
        }
        return { data: allData };
    }

    if (count === 0) return { data: [] };

    // 2. Fetch all pages in parallel
    const limit = 1000;
    const totalPages = Math.ceil(count / limit);
    const promises = [];

    for (let i = 0; i < totalPages; i++) {
        const from = i * limit;
        const to = from + limit - 1;
        let query = supabase.from(table).select('*').range(from, to);
        if (filterConfig && filterConfig.inValues.length > 0) {
            query = query.in(filterConfig.column, filterConfig.inValues);
        }
        promises.push(query);
    }

    const results = await Promise.all(promises);

    // 3. Combine results
    const allData = results.flatMap(res => res.data || []);
    return { data: allData };
}

export const useStore = create<AppState>()(
    persist(
        (set, get) => ({
            users: [],
            currentUser: null,
            sessionExpiresAt: null,
            students: [],
            totalStudentsCount: 0,
            stats: { totalAssigned: 0, assignedToday: 0, byList: { L1: 0, L2: 0, L3: 0, L4: 0 } },
            courseStudents: { L1: [], L2: [], L3: [], L4: [] },
            courseDataVersion: 0,
            l1Enabled: true,
            l2Enabled: true,
            l3Enabled: true,
            l4Enabled: true,
            departments: [],
            stages: ['1', '2', '3', '4', '5', '6'],
            isInitialized: false,
            isHydrated: false,

            setHydrated: () => set({ isHydrated: true }),

            refreshStats: async () => {
                const run = async () => {
                    try {
                        const currentUser = get().currentUser;
                        if (!currentUser || currentUser.role === 'Viewer') return;
                        const isAdmin = currentUser.role === 'Admin';
                        const todayStart = new Date();
                        todayStart.setHours(0, 0, 0, 0);
                        const todayIso = todayStart.toISOString();

                        // 1. ByList head counts (zero rows transferred over wire)
                        const [l1Res, l2Res, l3Res, l4Res] = await Promise.all([
                            supabase.from('assignments').select('*', { count: 'exact', head: true }).eq('list_id', 'L1'),
                            supabase.from('assignments').select('*', { count: 'exact', head: true }).eq('list_id', 'L2'),
                            supabase.from('assignments').select('*', { count: 'exact', head: true }).eq('list_id', 'L3'),
                            supabase.from('assignments').select('*', { count: 'exact', head: true }).eq('list_id', 'L4')
                        ]);

                        // 2. Total & today counts
                        let totalQ = supabase.from('assignments').select('*', { count: 'exact', head: true });
                        let todayQ = supabase.from('assignments').select('*', { count: 'exact', head: true }).gte('assigned_date', todayIso);

                        if (!isAdmin) {
                            totalQ = totalQ.eq('assigned_by_user_id', currentUser.id);
                            todayQ = todayQ.eq('assigned_by_user_id', currentUser.id);
                        }

                        const [totRes, todRes] = await Promise.all([totalQ, todayQ]);

                        set({
                            stats: {
                                totalAssigned: totRes.count ?? 0,
                                assignedToday: todRes.count ?? 0,
                                byList: {
                                    L1: l1Res.count ?? 0,
                                    L2: l2Res.count ?? 0,
                                    L3: l3Res.count ?? 0,
                                    L4: l4Res.count ?? 0
                                }
                            }
                        });
                    } catch (e) {
                        console.error('refreshStats error:', e);
                    }
                };

                if (refreshStatsTimeout) clearTimeout(refreshStatsTimeout);
                refreshStatsTimeout = setTimeout(run, 300);
            },

            fetchStudentsPage: async ({
                page,
                pageSize,
                searchTerm,
                deptFilter,
                stageFilter,
                studyTypeFilter,
                sortField,
                sortDirection
            }) => {
                try {
                    let query = supabase.from('students').select('*', { count: 'exact' });

                    if (deptFilter && deptFilter !== 'All') {
                        query = query.eq('department', deptFilter);
                    }
                    if (stageFilter && stageFilter !== 'All') {
                        query = query.eq('stage', stageFilter);
                    }
                    if (studyTypeFilter && studyTypeFilter !== 'All') {
                        query = query.eq('study_type', studyTypeFilter);
                    }
                    if (searchTerm && searchTerm.trim()) {
                        const pattern = buildArabicRegexPattern(searchTerm);
                        query = query.filter('name', 'imatch', pattern);
                    }

                    if (sortField) {
                        const colMap: Record<string, string> = {
                            name: 'name',
                            stage: 'stage',
                            department: 'department',
                            studyType: 'study_type'
                        };
                        const col = colMap[sortField] || 'name';
                        query = query.order(col, { ascending: sortDirection === 'asc' });
                    } else {
                        query = query.order('name', { ascending: true });
                    }

                    const from = (page - 1) * pageSize;
                    const to = from + pageSize - 1;
                    query = query.range(from, to);

                    const { data: studentsData, count, error } = await query;
                    if (error || !studentsData) {
                        console.error('Error fetching students page:', error);
                        return { count: 0 };
                    }

                    const studentIds = studentsData.map(s => s.id);
                    let assignData: any[] = [];
                    if (studentIds.length > 0) {
                        const { data: aData } = await supabase.from('assignments').select('*').in('student_id', studentIds);
                        assignData = aData || [];
                    }

                    const parsedStudents: Student[] = studentsData.map(s => {
                        const sAssigns = assignData.filter(a => a.student_id === s.id);
                        const assignmentsObj: any = {};
                        sAssigns.forEach(a => {
                            assignmentsObj[a.list_id] = {
                                date: a.assigned_date,
                                assignedByUserId: a.assigned_by_user_id,
                                assignedByUserName: a.assigned_by_user_name
                            };
                        });
                        return {
                            id: s.id,
                            name: s.name,
                            stage: s.stage,
                            department: s.department as Department,
                            studyType: s.study_type as StudyType,
                            assignments: assignmentsObj
                        };
                    });

                    set({
                        students: parsedStudents,
                        totalStudentsCount: count ?? 0
                    });

                    return { count: count ?? 0 };
                } catch (e) {
                    console.error('fetchStudentsPage exception:', e);
                    return { count: 0 };
                }
            },

            fetchCourseStudentsPage: async ({
                courseId,
                page,
                pageSize,
                searchTerm,
                deptFilter,
                stageFilter,
                studyTypeFilter,
                sortField,
                sortDirection = 'asc'
            }) => {
                try {
                    const currentUser = get().currentUser;
                    const isViewer = currentUser?.role === 'Viewer';
                    const allowedDepartments = currentUser?.allowedDepartments || [];

                    if (isViewer && allowedDepartments.length === 0) {
                        return { students: [], totalCount: 0 };
                    }

                    let query = supabase
                        .from('assignments')
                        .select(`
                            student_id,
                            list_id,
                            assigned_date,
                            assigned_by_user_id,
                            assigned_by_user_name,
                            students!inner (
                                id,
                                name,
                                stage,
                                department,
                                study_type
                            )
                        `, { count: 'exact' })
                        .eq('list_id', courseId);

                    // 1. Viewer restriction: enforce at database query level
                    if (isViewer) {
                        query = query.in('students.department', allowedDepartments);
                    }

                    // 2. Department filter
                    if (deptFilter && deptFilter !== 'All') {
                        query = query.eq('students.department', deptFilter);
                    }

                    // 3. Stage filter
                    if (stageFilter && stageFilter !== 'All') {
                        query = query.eq('students.stage', stageFilter);
                    }

                    // 4. Study Type filter
                    if (studyTypeFilter && studyTypeFilter !== 'All') {
                        query = query.eq('students.study_type', studyTypeFilter);
                    }

                    // 5. Search term (Arabic regex)
                    if (searchTerm && searchTerm.trim()) {
                        const pattern = buildArabicRegexPattern(searchTerm);
                        query = query.filter('students.name', 'imatch', pattern);
                    }

                    // 6. Sorting
                    if (sortField === 'name') {
                        query = query.order('students(name)', { ascending: sortDirection === 'asc' });
                    } else if (sortField === 'stage') {
                        query = query.order('students(stage)', { ascending: sortDirection === 'asc' });
                    } else if (sortField === 'department') {
                        query = query.order('students(department)', { ascending: sortDirection === 'asc' });
                    } else if (sortField === 'studyType') {
                        query = query.order('students(study_type)', { ascending: sortDirection === 'asc' });
                    } else if (sortField === 'assignedBy') {
                        query = query.order('assigned_by_user_name', { ascending: sortDirection === 'asc' });
                    } else {
                        // Default or 'date'
                        query = query.order('assigned_date', { ascending: sortDirection === 'asc' });
                    }

                    // 7. Pagination Range
                    const from = (page - 1) * pageSize;
                    const to = from + pageSize - 1;
                    query = query.range(from, to);

                    const { data, count, error } = await query;
                    if (error || !data) {
                        console.error('fetchCourseStudentsPage error:', error);
                        return { students: [], totalCount: 0 };
                    }

                    const parsedStudents: Student[] = data.map((item: any) => {
                        const s = item.students;
                        return {
                            id: s.id,
                            name: s.name,
                            stage: s.stage,
                            department: s.department as Department,
                            studyType: s.study_type as StudyType,
                            assignments: {
                                [courseId]: {
                                    date: item.assigned_date,
                                    assignedByUserId: item.assigned_by_user_id,
                                    assignedByUserName: item.assigned_by_user_name
                                }
                            }
                        };
                    });

                    return { students: parsedStudents, totalCount: count ?? 0 };
                } catch (err) {
                    console.error('fetchCourseStudentsPage exception:', err);
                    return { students: [], totalCount: 0 };
                }
            },

            fetchCourseAllStudentsForExport: async ({
                courseId,
                searchTerm,
                deptFilter,
                stageFilter,
                studyTypeFilter
            }) => {
                try {
                    const currentUser = get().currentUser;
                    const isViewer = currentUser?.role === 'Viewer';
                    const allowedDepartments = currentUser?.allowedDepartments || [];

                    if (isViewer && allowedDepartments.length === 0) {
                        return [];
                    }

                    let allStudents: Student[] = [];
                    let from = 0;
                    const batchSize = 1000;

                    while (true) {
                        let query = supabase
                            .from('assignments')
                            .select(`
                                student_id,
                                list_id,
                                assigned_date,
                                assigned_by_user_id,
                                assigned_by_user_name,
                                students!inner (
                                    id,
                                    name,
                                    stage,
                                    department,
                                    study_type
                                )
                            `)
                            .eq('list_id', courseId)
                            .order('assigned_date', { ascending: true })
                            .range(from, from + batchSize - 1);

                        if (isViewer) {
                            query = query.in('students.department', allowedDepartments);
                        }
                        if (deptFilter && deptFilter !== 'All') {
                            query = query.eq('students.department', deptFilter);
                        }
                        if (stageFilter && stageFilter !== 'All') {
                            query = query.eq('students.stage', stageFilter);
                        }
                        if (studyTypeFilter && studyTypeFilter !== 'All') {
                            query = query.eq('students.study_type', studyTypeFilter);
                        }
                        if (searchTerm && searchTerm.trim()) {
                            const pattern = buildArabicRegexPattern(searchTerm);
                            query = query.filter('students.name', 'imatch', pattern);
                        }

                        const { data, error } = await query;
                        if (error || !data || data.length === 0) break;

                        const parsed: Student[] = data.map((item: any) => {
                            const s = item.students;
                            return {
                                id: s.id,
                                name: s.name,
                                stage: s.stage,
                                department: s.department as Department,
                                studyType: s.study_type as StudyType,
                                assignments: {
                                    [courseId]: {
                                        date: item.assigned_date,
                                        assignedByUserId: item.assigned_by_user_id,
                                        assignedByUserName: item.assigned_by_user_name
                                    }
                                }
                            };
                        });

                        allStudents.push(...parsed);
                        if (data.length < batchSize) break;
                        from += batchSize;
                    }

                    return allStudents;
                } catch (err) {
                    console.error('fetchCourseAllStudentsForExport exception:', err);
                    return [];
                }
            },

            fetchCourseStudents: async (courseId) => {
                // Kept for backward compatibility, uses secure join
                const { students } = await get().fetchCourseStudentsPage({
                    courseId,
                    page: 1,
                    pageSize: 1000
                });
                set(state => ({
                    courseStudents: { ...state.courseStudents, [courseId]: students }
                }));
                return students;
            },

            initRealtime: async () => {
                const currentUser = get().currentUser;
                if (!currentUser) return;
                if (get().isInitialized || isInitializing) return;
                isInitializing = true;

                const isViewer = currentUser?.role === 'Viewer';
                const isAdmin = currentUser?.role === 'Admin';

                // ONLY Admins need to fetch app_users for settings/user management.
                // Operators and Viewers MUST NOT fetch or see other users, admin emails, or account assignments.
                const usersPromise = isAdmin
                    ? fetchAllRecords('app_users')
                    : Promise.resolve({ data: [] });

                // For Viewers, restrict departments to their allowed departments directly.
                // Do NOT query all departments across the system.
                const deptPromise = (isViewer && currentUser.allowedDepartments && currentUser.allowedDepartments.length > 0)
                    ? Promise.resolve({ data: currentUser.allowedDepartments.map(d => ({ name: d })) })
                    : supabase.from('departments').select('*').order('name');

                // 1. Initial lightweight configuration fetch (NO app_users for Operators/Viewers, NO unnecessary stage queries)
                const [usersRes, settingsRes, deptRes] = await Promise.all([
                    usersPromise,
                    supabase.from('settings').select('*').eq('id', 1).single(),
                    deptPromise
                ]);

                if (deptRes.data) {
                    set({ departments: deptRes.data.map((d: any) => d.name) });
                }

                // Standardized stages: always 1 to 6 without querying students table
                set({ stages: ['1', '2', '3', '4', '5', '6'] });

                if (usersRes.data) {
                    const parsedUsers = usersRes.data.map((u: any) => ({
                        id: u.id, name: u.name, email: u.email, role: u.role as Role,
                        allowedDepartments: u.allowed_departments as Department[] | undefined
                    }));
                    set({ users: parsedUsers });
                }

                if (settingsRes.data) {
                    set({
                        l1Enabled: settingsRes.data.l1_enabled,
                        l2Enabled: settingsRes.data.l2_enabled,
                        l3Enabled: settingsRes.data.l3_enabled,
                        l4Enabled: settingsRes.data.l4_enabled,
                    });
                }

                // Admins and Operators calculate stats with zero-payload head counts
                if (!isViewer) {
                    await get().refreshStats();
                    // Fetch initial page 1 of students
                    await get().fetchStudentsPage({
                        page: 1,
                        pageSize: 10,
                        sortField: null,
                        sortDirection: 'asc'
                    });
                }

                set({ isInitialized: true });

                // Unsubscribe and clean up any previous channel
                if (activeRealtimeChannel) {
                    try {
                        await supabase.removeChannel(activeRealtimeChannel);
                    } catch (e) {
                        console.error('Error removing previous channel:', e);
                    }
                    activeRealtimeChannel = null;
                }

                // 2. Setup Realtime Subscriptions (Single Channel for reliability)
                const channel = supabase.channel('schema-db-changes');
                activeRealtimeChannel = channel;

                channel.on('postgres_changes', { event: '*', schema: 'public', table: 'app_users' }, (payload) => {
                    const u = payload.new as any;
                    const current = get().currentUser;

                    // Non-admins only care if their own profile was updated
                    if (current && current.role !== 'Admin') {
                        if (payload.eventType === 'UPDATE' && current.id === u.id) {
                            const updatedUser = {
                                id: u.id,
                                name: u.name,
                                email: u.email,
                                role: u.role as Role,
                                allowedDepartments: u.allowed_departments as Department[] | undefined
                            };
                            set({ currentUser: updatedUser });
                            if (current.role === 'Viewer' && updatedUser.role === 'Viewer') {
                                get().refreshViewerData();
                            } else if (current.role !== updatedUser.role) {
                                get().initRealtime();
                            }
                        }
                        return;
                    }

                    // Admin user management state updates
                    if (payload.eventType === 'INSERT') {
                        set(state => {
                            if (state.users.some(existing => existing.id === u.id)) return state;
                            return { users: [...state.users, { id: u.id, name: u.name, email: u.email, role: u.role as Role, allowedDepartments: u.allowed_departments as Department[] | undefined }] };
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        const updatedUser = { id: u.id, name: u.name, email: u.email, role: u.role as Role, allowedDepartments: u.allowed_departments as Department[] | undefined };
                        set(state => ({ users: state.users.map(user => user.id === u.id ? updatedUser : user) }));

                        if (current && current.id === u.id) {
                            set({ currentUser: updatedUser });
                            if (current.role === 'Viewer' && updatedUser.role === 'Viewer') {
                                get().refreshViewerData();
                            } else if (current.role !== updatedUser.role) {
                                get().initRealtime();
                            }
                        }
                    } else if (payload.eventType === 'DELETE') {
                        set(state => ({ users: state.users.filter(user => user.id !== payload.old.id) }));
                    }
                });

                channel.on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, async (payload) => {
                    if (payload.eventType === 'UPDATE') {
                        const s = payload.new as any;
                        set(state => ({
                            students: state.students.map(st => st.id === s.id ? {
                                ...st,
                                name: s.name,
                                stage: s.stage,
                                department: s.department as Department,
                                studyType: s.study_type as StudyType
                            } : st),
                            courseStudents: {
                                L1: (state.courseStudents.L1 || []).map(st => st.id === s.id ? { ...st, name: s.name, stage: s.stage, department: s.department as Department, studyType: s.study_type as StudyType } : st),
                                L2: (state.courseStudents.L2 || []).map(st => st.id === s.id ? { ...st, name: s.name, stage: s.stage, department: s.department as Department, studyType: s.study_type as StudyType } : st),
                                L3: (state.courseStudents.L3 || []).map(st => st.id === s.id ? { ...st, name: s.name, stage: s.stage, department: s.department as Department, studyType: s.study_type as StudyType } : st),
                                L4: (state.courseStudents.L4 || []).map(st => st.id === s.id ? { ...st, name: s.name, stage: s.stage, department: s.department as Department, studyType: s.study_type as StudyType } : st),
                            }
                        }));
                    } else if (payload.eventType === 'INSERT') {
                        set(state => ({ totalStudentsCount: state.totalStudentsCount + 1 }));
                    } else if (payload.eventType === 'DELETE') {
                        const oldId = payload.old.id;
                        set(state => ({
                            totalStudentsCount: Math.max(0, state.totalStudentsCount - 1),
                            students: state.students.filter(st => st.id !== oldId),
                            courseStudents: {
                                L1: (state.courseStudents.L1 || []).filter(s => s.id !== oldId),
                                L2: (state.courseStudents.L2 || []).filter(s => s.id !== oldId),
                                L3: (state.courseStudents.L3 || []).filter(s => s.id !== oldId),
                                L4: (state.courseStudents.L4 || []).filter(s => s.id !== oldId),
                            }
                        }));
                    }
                });

                channel.on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, async (payload) => {
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const newA = payload.new as any;
                        const listId = newA.list_id as 'L1' | 'L2' | 'L3' | 'L4';

                        set(state => {
                            const hasStudent = state.students.some(st => st.id === newA.student_id);
                            const alreadyAssignedInList = hasStudent && !!(state.students.find(st => st.id === newA.student_id)?.assignments as any)?.[listId];

                            const updatedStudents = hasStudent ? state.students.map(st => {
                                if (st.id === newA.student_id) {
                                    return {
                                        ...st,
                                        assignments: {
                                            ...st.assignments,
                                            [listId]: {
                                                date: newA.assigned_date,
                                                assignedByUserId: newA.assigned_by_user_id,
                                                assignedByUserName: newA.assigned_by_user_name
                                            }
                                        }
                                    };
                                }
                                return st;
                            }) : state.students;

                            const currentList = state.courseStudents[listId] || [];
                            const updatedCourseStudents = currentList.some(s => s.id === newA.student_id) ? {
                                ...state.courseStudents,
                                [listId]: currentList.map(s => s.id === newA.student_id ? {
                                    ...s,
                                    assignments: {
                                        ...s.assignments,
                                        [listId]: {
                                            date: newA.assigned_date,
                                            assignedByUserId: newA.assigned_by_user_id,
                                            assignedByUserName: newA.assigned_by_user_name
                                        }
                                    }
                                } : s)
                            } : state.courseStudents;

                            const updatedStats = alreadyAssignedInList ? state.stats : {
                                ...state.stats,
                                totalAssigned: state.stats.totalAssigned + 1,
                                assignedToday: state.stats.assignedToday + 1,
                                byList: {
                                    ...state.stats.byList,
                                    [listId]: (state.stats.byList[listId] || 0) + 1
                                }
                            };

                            return {
                                students: updatedStudents,
                                courseStudents: updatedCourseStudents,
                                stats: updatedStats,
                                courseDataVersion: state.courseDataVersion + 1
                            };
                        });
                    } else if (payload.eventType === 'DELETE') {
                        const oldA = payload.old as any;
                        const listId = oldA.list_id as 'L1' | 'L2' | 'L3' | 'L4';

                        set(state => {
                            const hasStudent = state.students.some(st => st.id === oldA.student_id);
                            const wasAssignedInList = hasStudent && !!(state.students.find(st => st.id === oldA.student_id)?.assignments as any)?.[listId];

                            const updatedStudents = hasStudent ? state.students.map(st => {
                                if (st.id === oldA.student_id) {
                                    const newAssignments = { ...st.assignments };
                                    delete (newAssignments as any)[oldA.list_id];
                                    return { ...st, assignments: newAssignments };
                                }
                                return st;
                            }) : state.students;

                            const updatedCourseStudents = listId ? {
                                ...state.courseStudents,
                                [listId]: (state.courseStudents[listId] || []).filter(s => s.id !== oldA.student_id)
                            } : state.courseStudents;

                            const updatedStats = wasAssignedInList ? {
                                ...state.stats,
                                totalAssigned: Math.max(0, state.stats.totalAssigned - 1),
                                assignedToday: Math.max(0, state.stats.assignedToday - 1),
                                byList: {
                                    ...state.stats.byList,
                                    [listId]: Math.max(0, (state.stats.byList[listId] || 0) - 1)
                                }
                            } : state.stats;

                            return {
                                students: updatedStudents,
                                courseStudents: updatedCourseStudents,
                                stats: updatedStats,
                                courseDataVersion: state.courseDataVersion + 1
                            };
                        });
                    }
                });

                channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'settings' }, (payload) => {
                    const newS = payload.new as any;
                    set({
                        l1Enabled: newS.l1_enabled,
                        l2Enabled: newS.l2_enabled,
                        l3Enabled: newS.l3_enabled,
                        l4Enabled: newS.l4_enabled,
                    });
                });

                channel.subscribe();
            },

            refreshViewerData: async () => {
                // Course lists are lazy loaded on demand with strict department filtering at database level
                set(state => ({ courseDataVersion: state.courseDataVersion + 1 }));
            },

            login: async (email, password) => {
                const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password: password
                });

                if (authError || !authData.user) return false;

                const { data, error } = await supabase.from('app_users').select('*').eq('id', authData.user.id).single();
                if (data && !error) {
                    const parsedUser = {
                        id: data.id,
                        name: data.name,
                        email: data.email,
                        role: data.role as Role,
                        allowedDepartments: data.allowed_departments as Department[] | undefined
                    };
                    const sessionExpiresAt = getNextBaghdadMidnight();
                    set({ 
                        currentUser: parsedUser,
                        sessionExpiresAt 
                    });
                    get().initRealtime();
                    return true;
                }
                return false;
            },
            logout: async () => {
                isInitializing = false;
                if (refreshStatsTimeout) {
                    clearTimeout(refreshStatsTimeout);
                    refreshStatsTimeout = null;
                }
                if (activeRealtimeChannel) {
                    try {
                        await supabase.removeChannel(activeRealtimeChannel);
                    } catch (e) {
                        console.error('Error removing active channel:', e);
                    }
                    activeRealtimeChannel = null;
                }
                try {
                    await supabase.removeAllChannels();
                } catch (err) {
                    console.error('Error removing Supabase channels:', err);
                }
                try {
                    await supabase.auth.signOut();
                } catch (err) {
                    console.error('Error signing out of Supabase:', err);
                }
                set({
                    currentUser: null,
                    sessionExpiresAt: null,
                    isInitialized: false,
                    students: [],
                    totalStudentsCount: 0,
                    stats: { totalAssigned: 0, assignedToday: 0, byList: { L1: 0, L2: 0, L3: 0, L4: 0 } },
                    courseStudents: { L1: [], L2: [], L3: [], L4: [] },
                    courseDataVersion: 0,
                    users: [],
                    departments: [],
                    stages: ['1', '2', '3', '4', '5', '6']
                });
                if (typeof window !== 'undefined') {
                    try {
                        localStorage.removeItem('student-list-auth-v2');
                        // Clean any supabase auth session keys
                        for (let i = localStorage.length - 1; i >= 0; i--) {
                            const key = localStorage.key(i);
                            if (key && (key.startsWith('sb-') || key.includes('auth') || key.includes('student'))) {
                                localStorage.removeItem(key);
                            }
                        }
                        sessionStorage.clear();
                    } catch (e) {
                        console.error('Error clearing local storage on logout:', e);
                    }
                }
            },

            addUser: async (name, email, password, role, allowedDepartments) => {
                const normalizedEmail = email.trim().toLowerCase();
                if (get().users.some(u => u.email.toLowerCase() === normalizedEmail)) {
                    get().showAlert('تنبيه', 'هذا البريد الإلكتروني مسجل بالفعل لمستخدم آخر في النظام.', 'error');
                    return;
                }

                const { data: newUserId, error } = await supabase.rpc('create_app_user', {
                    p_email: email.trim(),
                    p_password: password,
                    p_name: name.trim(),
                    p_role: role,
                    p_allowed_departments: allowedDepartments || []
                });

                if (error) {
                    get().showAlert('خطأ', error.message || 'فشل إنشاء المستخدم', 'error');
                } else if (!get().users.some((u) => u.id === newUserId)) {
                    // In case realtime is slow, pessimistically add it 
                    set(state => ({
                        users: [...state.users, { id: newUserId, name: name.trim(), email: email.trim(), role, allowedDepartments }]
                    }));
                }
            },
            removeUser: async (userId) => {
                const { error } = await supabase.rpc('delete_app_user', { p_user_id: userId });
                if (error) {
                    get().showAlert('Error', error.message || 'Failed to delete user', 'error');
                } else {
                    set(state => ({ users: state.users.filter(u => u.id !== userId) }));
                }
            },
            updateUserRole: async (userId, newRole) => {
                set(state => ({ users: state.users.map(u => u.id === userId ? { ...u, role: newRole } : u) }));
                await supabase.from('app_users').update({ role: newRole }).eq('id', userId);
            },
            updateUserDepartments: async (userId, departments) => {
                set(state => ({ users: state.users.map(u => u.id === userId ? { ...u, allowedDepartments: departments } : u) }));
                await supabase.from('app_users').update({ allowed_departments: departments }).eq('id', userId);
            },

            addDepartment: async (name) => {
                set(state => ({ departments: [...state.departments, name].sort() }));
                await supabase.from('departments').insert({ name });
            },
            removeDepartment: async (name) => {
                set(state => ({ departments: state.departments.filter(d => d !== name) }));
                await supabase.from('departments').delete().eq('name', name);
            },

            updateStudent: async (id, updates) => {
                set(state => ({
                    students: state.students.map(s => s.id === id ? { ...s, ...updates } : s)
                }));
                const dbUpdates: any = {};
                if (updates.name) dbUpdates.name = updates.name;
                if (updates.stage) dbUpdates.stage = updates.stage;
                if (updates.department) dbUpdates.department = updates.department;
                if (updates.studyType) dbUpdates.study_type = updates.studyType;
                await supabase.from('students').update(dbUpdates).eq('id', id);
            },

            addStudent: async (data) => {
                const currentUser = get().currentUser;
                if (!currentUser || currentUser.role !== 'Admin') return false;

                const trimmedName = data.name.trim();

                // Generate a proper random UUID
                const newId: string = typeof crypto !== 'undefined' && crypto.randomUUID
                    ? crypto.randomUUID()
                    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
                        const r = (Math.random() * 16) | 0;
                        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
                    });

                const newStudent: Student = {
                    id: newId,
                    name: trimmedName,
                    stage: data.stage,
                    department: data.department,
                    studyType: data.studyType,
                    assignments: {}
                };

                // Optimistically add to local state
                set(state => ({ students: [...state.students, newStudent] }));

                const { error } = await supabase.from('students').insert({
                    id: newId,
                    name: trimmedName,
                    stage: data.stage,
                    department: data.department,
                    study_type: data.studyType
                });

                if (error) {
                    // Rollback on failure
                    set(state => ({ students: state.students.filter(s => s.id !== newId) }));
                    get().showAlert('خطأ في الإضافة', error.message || 'فشل إضافة الطالب.', 'error');
                    return false;
                }

                return true;
            },

            toggleAssignment: async (studentId, list, user) => {
                const student = get().students.find(s => s.id === studentId);
                if (!student) return;

                const isAssigned = !!(student.assignments as any)[list];
                if (isAssigned) {
                    if (user.role !== 'Admin') {
                        get().showAlert('Access Denied', 'Only administrators can remove assignments.', 'error');
                        return;
                    }
                    // Optimistic in-memory update (including stats)
                    set(state => {
                        const std = state.students.find(s => s.id === studentId);
                        if (!std) return state;
                        const newAssigns = { ...std.assignments };
                        delete (newAssigns as any)[list];
                        return {
                            students: state.students.map(s => s.id === studentId ? { ...s, assignments: newAssigns } : s),
                            courseStudents: {
                                ...state.courseStudents,
                                [list]: (state.courseStudents[list] || []).filter(s => s.id !== studentId)
                            },
                            stats: {
                                ...state.stats,
                                totalAssigned: Math.max(0, state.stats.totalAssigned - 1),
                                assignedToday: Math.max(0, state.stats.assignedToday - 1),
                                byList: {
                                    ...state.stats.byList,
                                    [list]: Math.max(0, (state.stats.byList[list] || 0) - 1)
                                }
                            }
                        };
                    });
                    await supabase.from('assignments').delete().eq('student_id', studentId).eq('list_id', list);
                } else {
                    const newAssignment = {
                        student_id: studentId,
                        list_id: list,
                        assigned_by_user_id: user.id,
                        assigned_by_user_name: user.name,
                        assigned_date: new Date().toISOString()
                    };
                    // Optimistic in-memory update (including stats)
                    set(state => {
                        const std = state.students.find(s => s.id === studentId);
                        if (!std) return state;
                        return {
                            students: state.students.map(s => s.id === studentId ? {
                                ...s, assignments: {
                                    ...s.assignments,
                                    [list]: { date: newAssignment.assigned_date, assignedByUserId: user.id, assignedByUserName: user.name }
                                }
                            } : s),
                            stats: {
                                ...state.stats,
                                totalAssigned: state.stats.totalAssigned + 1,
                                assignedToday: state.stats.assignedToday + 1,
                                byList: {
                                    ...state.stats.byList,
                                    [list]: (state.stats.byList[list] || 0) + 1
                                }
                            }
                        };
                    });
                    await supabase.from('assignments').insert(newAssignment);
                }
            },

            removeAssignment: async (studentId, list, user) => {
                if (user.role !== 'Admin') {
                    get().showAlert('Access Denied', 'Only administrators can remove assignments.', 'error');
                    return;
                }
                // Optimistic in-memory update (including stats)
                set(state => {
                    const std = state.students.find(s => s.id === studentId);
                    if (!std) return state;
                    const newAssigns = { ...std.assignments };
                    delete (newAssigns as any)[list];
                    return {
                        students: state.students.map(s => s.id === studentId ? { ...s, assignments: newAssigns } : s),
                        courseStudents: {
                            ...state.courseStudents,
                            [list]: (state.courseStudents[list] || []).filter(s => s.id !== studentId)
                        },
                        stats: {
                            ...state.stats,
                            totalAssigned: Math.max(0, state.stats.totalAssigned - 1),
                            assignedToday: Math.max(0, state.stats.assignedToday - 1),
                            byList: {
                                ...state.stats.byList,
                                [list]: Math.max(0, (state.stats.byList[list] || 0) - 1)
                            }
                        }
                    };
                });
                await supabase.from('assignments').delete().eq('student_id', studentId).eq('list_id', list);
            },

            clearAllAssignments: async () => {
                set(state => ({
                    students: state.students.map(s => ({ ...s, assignments: {} })),
                    courseStudents: { L1: [], L2: [], L3: [], L4: [] },
                    stats: {
                        totalAssigned: 0,
                        assignedToday: 0,
                        byList: { L1: 0, L2: 0, L3: 0, L4: 0 }
                    },
                    courseDataVersion: state.courseDataVersion + 1
                }));
                await supabase.from('assignments').delete().neq('student_id', '00000000-0000-0000-0000-000000000000'); // Delete all
            },
            clearAssignmentsByList: async (list) => {
                set(state => {
                    const listCount = state.stats.byList[list] || 0;
                    return {
                        students: state.students.map(s => {
                            const newAssigns = { ...s.assignments };
                            delete (newAssigns as any)[list];
                            return { ...s, assignments: newAssigns };
                        }),
                        courseStudents: {
                            ...state.courseStudents,
                            [list]: []
                        },
                        stats: {
                            ...state.stats,
                            totalAssigned: Math.max(0, state.stats.totalAssigned - listCount),
                            byList: {
                                ...state.stats.byList,
                                [list]: 0
                            }
                        },
                        courseDataVersion: state.courseDataVersion + 1
                    };
                });
                await supabase.from('assignments').delete().eq('list_id', list);
            },
            clearAssignmentsByDepartment: async (dept) => {
                set(state => ({
                    students: state.students.map(s => {
                        if (s.department !== dept) return s;
                        return { ...s, assignments: {} };
                    }),
                    courseStudents: {
                        L1: (state.courseStudents.L1 || []).filter(s => s.department !== dept),
                        L2: (state.courseStudents.L2 || []).filter(s => s.department !== dept),
                        L3: (state.courseStudents.L3 || []).filter(s => s.department !== dept),
                        L4: (state.courseStudents.L4 || []).filter(s => s.department !== dept),
                    }
                }));
                const studentsInDept = get().students.filter(s => s.department === dept);
                if (studentsInDept.length === 0) return;
                const ids = studentsInDept.map(s => s.id);
                await supabase.from('assignments').delete().in('student_id', ids);
                get().refreshStats();
            },

            setL1Enabled: async (enabled) => {
                set({ l1Enabled: enabled });
                await supabase.from('settings').update({ l1_enabled: enabled }).eq('id', 1);
            },
            setL2Enabled: async (enabled) => {
                set({ l2Enabled: enabled });
                await supabase.from('settings').update({ l2_enabled: enabled }).eq('id', 1);
            },
            setL3Enabled: async (enabled) => {
                set({ l3Enabled: enabled });
                await supabase.from('settings').update({ l3_enabled: enabled }).eq('id', 1);
            },
            setL4Enabled: async (enabled) => {
                set({ l4Enabled: enabled });
                await supabase.from('settings').update({ l4_enabled: enabled }).eq('id', 1);
            },

            alert: { isOpen: false, title: '', message: '', type: 'info' },
            showAlert: (title, message, type, onConfirm) => set({ alert: { isOpen: true, title, message, type, onConfirm } }),
            hideAlert: () => set((state) => ({ alert: { ...state.alert, isOpen: false } })),
        }),
        {
            name: 'student-list-auth-v2',
            storage: createJSONStorage(() => ({
                getItem: (key: string) => {
                    if (typeof window === 'undefined') return null;
                    const raw = localStorage.getItem(key);
                    if (!raw) return null;
                    try {
                        const parsed = JSON.parse(raw);
                        const state = parsed?.state;
                        // If user session exists, ensure it has not passed 12:00 AM Baghdad time
                        if (state?.currentUser) {
                            if (!state.sessionExpiresAt || Date.now() >= state.sessionExpiresAt) {
                                localStorage.removeItem(key);
                                for (let i = localStorage.length - 1; i >= 0; i--) {
                                    const k = localStorage.key(i);
                                    if (k && (k.startsWith('sb-') || k.includes('auth') || k.includes('student'))) {
                                        localStorage.removeItem(k);
                                    }
                                }
                                return null;
                            }
                        }
                    } catch {
                        return null;
                    }
                    return raw;
                },
                setItem: (key: string, value: string) => {
                    if (typeof window !== 'undefined') {
                        localStorage.setItem(key, value);
                    }
                },
                removeItem: (key: string) => {
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem(key);
                    }
                }
            })),
            partialize: (state) => ({ 
                currentUser: state.currentUser,
                sessionExpiresAt: state.sessionExpiresAt
            }),
            onRehydrateStorage: () => (state) => {
                if (state) {
                    if (state.currentUser && (!state.sessionExpiresAt || Date.now() >= state.sessionExpiresAt)) {
                        state.logout();
                    }
                    state.setHydrated();
                }
            },
        }
    )
);
