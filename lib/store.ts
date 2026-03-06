import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from './supabase';

export type Role = 'Admin' | 'Operator' | 'Viewer';

export interface User {
    id: string;
    name: string;
    email: string;
    password?: string;
    role: Role;
    allowedDepartments?: Department[];
}

export type Department = string;
export type StudyType = 'Morning' | 'Evening';

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
    students: Student[];
    l1Enabled: boolean;
    l2Enabled: boolean;
    l3Enabled: boolean;
    l4Enabled: boolean;
    departments: string[];
    isInitialized: boolean;
    isHydrated: boolean;

    setHydrated: () => void;
    initRealtime: () => Promise<void>;

    login: (email: string, password: string) => boolean;
    logout: () => void;

    addUser: (name: string, email: string, password: string, role: Role, allowedDepartments?: Department[]) => Promise<void>;
    removeUser: (userId: string) => Promise<void>;
    updateUserRole: (userId: string, newRole: Role) => Promise<void>;
    updateUserDepartments: (userId: string, departments: Department[]) => Promise<void>;

    addDepartment: (name: string) => Promise<void>;
    removeDepartment: (name: string) => Promise<void>;

    updateStudent: (id: string, updates: Partial<Student>) => Promise<void>;
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

async function fetchAllRecords(table: string) {
    // 1. Get total count
    const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

    if (countError || count === null) {
        // Fallback to sequential if count fails
        let allData: any[] = [];
        let from = 0;
        const limit = 1000;
        while (true) {
            const { data, error } = await supabase.from(table).select('*').range(from, from + limit - 1);
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
        promises.push(supabase.from(table).select('*').range(from, to));
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
            students: [],
            l1Enabled: true,
            l2Enabled: true,
            l3Enabled: true,
            l4Enabled: true,
            departments: [],
            isInitialized: false,
            isHydrated: false,

            setHydrated: () => set({ isHydrated: true }),

            initRealtime: async () => {
                if (get().isInitialized || isInitializing) return;
                isInitializing = true;

                // 1. Initial Fetch
                const [usersRes, studentsRes, assignRes, settingsRes, deptRes] = await Promise.all([
                    fetchAllRecords('app_users'),
                    fetchAllRecords('students'),
                    fetchAllRecords('assignments'),
                    supabase.from('settings').select('*').eq('id', 1).single(),
                    supabase.from('departments').select('*').order('name')
                ]);

                if (deptRes.data) {
                    set({ departments: deptRes.data.map(d => d.name) });
                }

                if (usersRes.data) {
                    const parsedUsers = usersRes.data.map(u => ({
                        id: u.id, name: u.name, email: u.email, password: u.password, role: u.role as Role,
                        allowedDepartments: u.allowed_departments as Department[] | undefined
                    }));
                    set({ users: parsedUsers });
                }

                if (studentsRes.data && assignRes.data) {
                    const parsedStudents: Student[] = studentsRes.data.map(s => {
                        const sAssigns = assignRes.data.filter(a => a.student_id === s.id);
                        const assignmentsObj: any = {};
                        sAssigns.forEach(a => {
                            assignmentsObj[a.list_id] = {
                                date: a.assigned_date,
                                assignedByUserId: a.assigned_by_user_id,
                                assignedByUserName: a.assigned_by_user_name
                            };
                        });
                        return {
                            id: s.id, name: s.name, stage: s.stage, department: s.department as Department, studyType: s.study_type as StudyType, assignments: assignmentsObj
                        };
                    });
                    set({ students: parsedStudents });
                }

                if (settingsRes.data) {
                    set({
                        l1Enabled: settingsRes.data.l1_enabled,
                        l2Enabled: settingsRes.data.l2_enabled,
                        l3Enabled: settingsRes.data.l3_enabled,
                        l4Enabled: settingsRes.data.l4_enabled,
                    });
                }

                set({ isInitialized: true });

                // 2. Setup Realtime Subscriptions (Single Channel for better reliability)
                const channel = supabase.channel('schema-db-changes');

                channel.on('postgres_changes', { event: '*', schema: 'public', table: 'app_users' }, (payload) => {
                    const u = payload.new as any;
                    if (payload.eventType === 'INSERT') {
                        set(state => {
                            // Check if already exists to prevent duplicate optimistic updates
                            if (state.users.some(existing => existing.id === u.id)) return state;
                            return { users: [...state.users, { id: u.id, name: u.name, email: u.email, password: u.password, role: u.role as Role, allowedDepartments: u.allowed_departments as Department[] | undefined }] };
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        set(state => ({ users: state.users.map(user => user.id === u.id ? { id: u.id, name: u.name, email: u.email, password: u.password, role: u.role as Role, allowedDepartments: u.allowed_departments as Department[] | undefined } : user) }));
                    } else if (payload.eventType === 'DELETE') {
                        set(state => ({ users: state.users.filter(user => user.id !== payload.old.id) }));
                    }
                });

                channel.on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, (payload) => {
                    const s = payload.new as any;
                    if (payload.eventType === 'INSERT') {
                        set(state => ({ students: [...state.students, { id: s.id, name: s.name, stage: s.stage, department: s.department as Department, studyType: s.study_type as StudyType, assignments: {} }] }));
                    } else if (payload.eventType === 'UPDATE') {
                        set(state => ({ students: state.students.map(st => st.id === s.id ? { ...st, name: s.name, stage: s.stage, department: s.department as Department, studyType: s.study_type as StudyType } : st) }));
                    } else if (payload.eventType === 'DELETE') {
                        set(state => ({ students: state.students.filter(st => st.id !== payload.old.id) }));
                    }
                });

                channel.on('postgres_changes', { event: '*', schema: 'public', table: 'assignments' }, (payload) => {
                    if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                        const newA = payload.new as any;
                        set(state => {
                            return {
                                students: state.students.map(st => {
                                    if (st.id === newA.student_id) {
                                        return {
                                            ...st,
                                            assignments: {
                                                ...st.assignments,
                                                [newA.list_id]: {
                                                    date: newA.assigned_date,
                                                    assignedByUserId: newA.assigned_by_user_id,
                                                    assignedByUserName: newA.assigned_by_user_name
                                                }
                                            }
                                        };
                                    }
                                    return st;
                                })
                            };
                        });
                    } else if (payload.eventType === 'DELETE') {
                        const oldA = payload.old as any;
                        set(state => {
                            return {
                                students: state.students.map(st => {
                                    if (st.id === oldA.student_id) {
                                        const newAssignments = { ...st.assignments };
                                        delete (newAssignments as any)[oldA.list_id];
                                        return { ...st, assignments: newAssignments };
                                    }
                                    return st;
                                })
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

            login: (email, password) => {
                const user = get().users.find(u => u.email.trim().toLowerCase() === email.trim().toLowerCase() && u.password === password);
                if (user) {
                    set({ currentUser: user });
                    return true;
                }
                return false;
            },
            logout: () => set({ currentUser: null }),

            addUser: async (name, email, password, role, allowedDepartments) => {
                // Optimistic UUID generation
                const tempId = crypto.randomUUID();
                set(state => ({
                    users: [...state.users, { id: tempId, name, email, password, role, allowedDepartments }]
                }));
                const { data, error } = await supabase.from('app_users').insert({ name, email, password, role, allowed_departments: allowedDepartments }).select().single();
                if (data && !error) {
                    // Update temp ID to real ID silently
                    set(state => ({
                        users: state.users.map(u => u.id === tempId ? { ...u, id: data.id } : u)
                    }));
                }
            },
            removeUser: async (userId) => {
                set(state => ({ users: state.users.filter(u => u.id !== userId) }));
                await supabase.from('app_users').delete().eq('id', userId);
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

            toggleAssignment: async (studentId, list, user) => {
                const student = get().students.find(s => s.id === studentId);
                if (!student) return;

                const isAssigned = !!(student.assignments as any)[list];
                if (isAssigned) {
                    if (user.role !== 'Admin') {
                        get().showAlert('Access Denied', 'Only administrators can remove assignments.', 'error');
                        return;
                    }
                    // Optimistic update
                    set(state => {
                        const std = state.students.find(s => s.id === studentId);
                        if (!std) return state;
                        const newAssigns = { ...std.assignments };
                        delete (newAssigns as any)[list];
                        return { students: state.students.map(s => s.id === studentId ? { ...s, assignments: newAssigns } : s) };
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
                    // Optimistic update
                    set(state => {
                        const std = state.students.find(s => s.id === studentId);
                        if (!std) return state;
                        return {
                            students: state.students.map(s => s.id === studentId ? {
                                ...s, assignments: {
                                    ...s.assignments,
                                    [list]: { date: newAssignment.assigned_date, assignedByUserId: user.id, assignedByUserName: user.name }
                                }
                            } : s)
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
                // Optimistic
                set(state => {
                    const std = state.students.find(s => s.id === studentId);
                    if (!std) return state;
                    const newAssigns = { ...std.assignments };
                    delete (newAssigns as any)[list];
                    return { students: state.students.map(s => s.id === studentId ? { ...s, assignments: newAssigns } : s) };
                });
                await supabase.from('assignments').delete().eq('student_id', studentId).eq('list_id', list);
            },

            clearAllAssignments: async () => {
                set(state => ({
                    students: state.students.map(s => ({ ...s, assignments: {} }))
                }));
                await supabase.from('assignments').delete().neq('student_id', '00000000-0000-0000-0000-000000000000'); // Delete all
            },
            clearAssignmentsByList: async (list) => {
                set(state => ({
                    students: state.students.map(s => {
                        const newAssigns = { ...s.assignments };
                        delete (newAssigns as any)[list];
                        return { ...s, assignments: newAssigns };
                    })
                }));
                await supabase.from('assignments').delete().eq('list_id', list);
            },
            clearAssignmentsByDepartment: async (dept) => {
                set(state => ({
                    students: state.students.map(s => {
                        if (s.department !== dept) return s;
                        return { ...s, assignments: {} };
                    })
                }));
                const studentsInDept = get().students.filter(s => s.department === dept);
                if (studentsInDept.length === 0) return;
                const ids = studentsInDept.map(s => s.id);
                await supabase.from('assignments').delete().in('student_id', ids);
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
            partialize: (state) => ({ currentUser: state.currentUser }), // Only persist the logged in user
            onRehydrateStorage: () => (state) => {
                if (state) state.setHydrated();
            },
        }
    )
);
