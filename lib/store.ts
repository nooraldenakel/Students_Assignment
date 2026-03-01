import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'Admin' | 'Operator' | 'Viewer';

export interface User {
    id: string;
    name: string;
    email: string;
    password?: string; // Optional for security/demo, but required for login
    role: Role;
    allowedDepartments?: Department[];
}

export type Department = 'Art' | 'English' | 'Chemical' | 'Math' | 'Computer Science';
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

    // Actions
    login: (email: string, password: string) => boolean;
    logout: () => void;

    // User Management Actions
    addUser: (name: string, email: string, password: string, role: Role, allowedDepartments?: Department[]) => void;
    removeUser: (userId: string) => void;
    updateUserRole: (userId: string, newRole: Role) => void;
    updateUserDepartments: (userId: string, departments: Department[]) => void;

    updateStudent: (id: string, updates: Partial<Student>) => void;
    toggleAssignment: (studentId: string, list: 'L1' | 'L2' | 'L3' | 'L4', user: User) => void;
    removeAssignment: (studentId: string, list: 'L1' | 'L2' | 'L3' | 'L4', user: User) => void;
    clearAllAssignments: () => void;
    clearAssignmentsByList: (list: 'L1' | 'L2' | 'L3' | 'L4') => void;
    clearAssignmentsByDepartment: (dept: Department) => void;

    setL1Enabled: (enabled: boolean) => void;
    setL2Enabled: (enabled: boolean) => void;
    setL3Enabled: (enabled: boolean) => void;
    setL4Enabled: (enabled: boolean) => void;

    // Alert/Confirm System
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

const mockStudents: Student[] = [
    { id: '1', name: 'Alice Smith', stage: 'Stage 1', department: 'Art', studyType: 'Morning', assignments: {} },
    { id: '2', name: 'Bob Johnson', stage: 'Stage 2', department: 'Math', studyType: 'Evening', assignments: {} },
    { id: '3', name: 'Charlie Brown', stage: 'Stage 3', department: 'English', studyType: 'Morning', assignments: {} },
    { id: '4', name: 'Diana Prince', stage: 'Stage 1', department: 'Chemical', studyType: 'Evening', assignments: {} },
    { id: '5', name: 'Evan Wright', stage: 'Stage 4', department: 'Computer Science', studyType: 'Morning', assignments: {} },
    { id: '6', name: 'Fiona Gallagher', stage: 'Stage 2', department: 'Art', studyType: 'Morning', assignments: {} },
];

const mockUsers: User[] = [
    { id: 'u1', name: 'Super Admin', email: 'admin@edu.com', password: '123', role: 'Admin' },
    { id: 'u2', name: 'John Operator', email: 'op@edu.com', password: '123', role: 'Operator' },
    { id: 'u3', name: 'Jane Viewer', email: 'view@edu.com', password: '123', role: 'Viewer', allowedDepartments: ['Art', 'Math'] },
];

export const useStore = create<AppState>()(
    persist(
        (set) => ({
            users: mockUsers,
            currentUser: null,
            students: mockStudents,
            l1Enabled: true,
            l2Enabled: true,
            l3Enabled: true,
            l4Enabled: true,

            login: (email, password) => {
                let success = false;
                set((state) => {
                    const user = state.users.find(u => u.email === email && u.password === password);
                    if (user) {
                        success = true;
                        return { currentUser: user };
                    }
                    return state;
                });
                return success;
            },
            logout: () => set({ currentUser: null }),

            addUser: (name, email, password, role, allowedDepartments) => set((state) => ({
                users: [...state.users, { id: Math.random().toString(36).substr(2, 9), name, email, password, role, allowedDepartments }]
            })),

            removeUser: (userId) => set((state) => ({
                users: state.users.filter(u => u.id !== userId)
            })),

            updateUserRole: (userId, newRole) => set((state) => ({
                users: state.users.map(u => u.id === userId ? { ...u, role: newRole } : u)
            })),

            updateUserDepartments: (userId, departments) => set((state) => ({
                users: state.users.map(u => u.id === userId ? { ...u, allowedDepartments: departments } : u)
            })),

            updateStudent: (id, updates) => set((state) => ({
                students: state.students.map(s => s.id === id ? { ...s, ...updates } : s)
            })),

            alert: { isOpen: false, title: '', message: '', type: 'info' },
            showAlert: (title, message, type, onConfirm) => set({
                alert: { isOpen: true, title, message, type, onConfirm }
            }),
            hideAlert: () => set((state) => ({
                alert: { ...state.alert, isOpen: false }
            })),

            toggleAssignment: (studentId, list, user) => set((state) => {
                const student = state.students.find(s => s.id === studentId);
                if (!student) return state;

                const isAssigned = !!student.assignments[list];
                const newAssignments = { ...student.assignments };

                if (isAssigned) {
                    if (user.role !== 'Admin') {
                        state.showAlert('Access Denied', 'Only administrators can remove assignments.', 'error');
                        return state;
                    }
                    delete newAssignments[list];
                } else {
                    newAssignments[list] = {
                        date: new Date().toISOString(),
                        assignedByUserId: user.id,
                        assignedByUserName: user.name
                    };
                }

                return {
                    students: state.students.map(s => s.id === studentId ? { ...s, assignments: newAssignments } : s)
                };
            }),

            removeAssignment: (studentId, list, user) => set((state) => {
                if (user.role !== 'Admin') {
                    state.showAlert('Access Denied', 'Only administrators can remove assignments.', 'error');
                    return state;
                }
                const student = state.students.find(s => s.id === studentId);
                if (!student) return state;
                const newAssignments = { ...student.assignments };
                delete newAssignments[list];
                return {
                    students: state.students.map(s => s.id === studentId ? { ...s, assignments: newAssignments } : s)
                };
            }),

            clearAllAssignments: () => set((state) => ({
                students: state.students.map(s => ({ ...s, assignments: {} }))
            })),

            clearAssignmentsByList: (list) => set((state) => ({
                students: state.students.map(s => {
                    const newAssignments = { ...s.assignments };
                    delete newAssignments[list];
                    return { ...s, assignments: newAssignments };
                })
            })),

            clearAssignmentsByDepartment: (dept) => set((state) => ({
                students: state.students.map(s => {
                    if (s.department === dept) {
                        return { ...s, assignments: {} };
                    }
                    return s;
                })
            })),

            setL1Enabled: (enabled) => set({ l1Enabled: enabled }),
            setL2Enabled: (enabled) => set({ l2Enabled: enabled }),
            setL3Enabled: (enabled) => set({ l3Enabled: enabled }),
            setL4Enabled: (enabled) => set({ l4Enabled: enabled }),
        }),
        {
            name: 'student-list-storage-v5',
        }
    )
);
