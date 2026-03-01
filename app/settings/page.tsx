'use client';

import { useState, useEffect } from 'react';
import { useStore } from '../../lib/store';
import { useRouter } from 'next/navigation';
import { Settings as SettingsIcon, ShieldAlert, Users, Plus, Trash2, X } from 'lucide-react';
import { Role, Department } from '../../lib/store';

const ALL_DEPARTMENTS: Department[] = ['Art', 'English', 'Chemical', 'Math', 'Computer Science'];

export default function SettingsPage() {
    const router = useRouter();
    const {
        currentUser,
        l1Enabled, l2Enabled, l3Enabled, l4Enabled,
        setL1Enabled, setL2Enabled, setL3Enabled, setL4Enabled,
        users, addUser, removeUser, updateUserRole, updateUserDepartments,
        showAlert
    } = useStore();
    const [mounted, setMounted] = useState(false);

    // New User Form State
    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserRole, setNewUserRole] = useState<Role>('Viewer');
    const [newUserDepts, setNewUserDepts] = useState<Department[]>([]);

    // Search and Filter State
    const [userSearch, setUserSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<'All' | Role>('All');

    useEffect(() => {
        setMounted(true);
        if (!currentUser || currentUser.role !== 'Admin') {
            router.push('/');
        }
    }, [currentUser, router]);

    if (!mounted || !currentUser || currentUser.role !== 'Admin') return null;

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
        const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
            u.email.toLowerCase().includes(userSearch.toLowerCase());
        const matchesRole = roleFilter === 'All' || u.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Admin Settings</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Configure application-wide settings and permissions
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-border shadow-sm">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <SettingsIcon className="w-5 h-5 text-primary" />
                        Assignment Controls
                    </h2>

                    <p className="text-sm text-muted-foreground mb-6">
                        Toggle the availability of L1-L4 assignment buttons across the application. When disabled, operators will not be able to assign students to these lists.
                    </p>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
                            <div>
                                <p className="font-medium text-foreground">List 1 (L1) Button</p>
                                <p className="text-sm text-muted-foreground">Allow assignments to L1</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={l1Enabled}
                                    onChange={(e) => setL1Enabled(e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
                            <div>
                                <p className="font-medium text-foreground">List 2 (L2) Button</p>
                                <p className="text-sm text-muted-foreground">Allow assignments to L2</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={l2Enabled}
                                    onChange={(e) => setL2Enabled(e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
                            <div>
                                <p className="font-medium text-foreground">List 3 (L3) Button</p>
                                <p className="text-sm text-muted-foreground">Allow assignments to L3</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={l3Enabled}
                                    onChange={(e) => setL3Enabled(e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-muted rounded-lg border border-border">
                            <div>
                                <p className="font-medium text-foreground">List 4 (L4) Button</p>
                                <p className="text-sm text-muted-foreground">Allow assignments to L4</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={l4Enabled}
                                    onChange={(e) => setL4Enabled(e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                            </label>
                        </div>
                    </div>

                    <div className="mt-6 flex items-start gap-3 p-4 bg-blue-50 text-blue-800 rounded-lg">
                        <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p className="text-sm">
                            Note: Disabling a button does not remove existing assignments. It only prevents new assignments. Only Admins can access these settings.
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden flex flex-col h-[800px]">
                    <div className="p-6 border-b border-border bg-gray-50/50">
                        <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                            <Users className="w-5 h-5 text-primary" />
                            User Management
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">Create and manage access for operators and viewers</p>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0">
                        {/* Creation Section */}
                        <div className="p-6 border-b border-border bg-white shrink-0">
                            <h3 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                                <Plus className="w-4 h-4 text-primary" />
                                Add New Account
                            </h3>
                            <form onSubmit={handleAddUser} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Full Name</label>
                                        <div className="relative">
                                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="text"
                                                required
                                                value={newUserName}
                                                onChange={(e) => setNewUserName(e.target.value)}
                                                placeholder="e.g. Ahmed Ali"
                                                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-xs"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Email Address</label>
                                        <div className="relative">
                                            <SettingsIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="email"
                                                required
                                                value={newUserEmail}
                                                onChange={(e) => setNewUserEmail(e.target.value)}
                                                placeholder="ahmed@edu.com"
                                                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-xs"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Secure Password</label>
                                        <div className="relative">
                                            <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                            <input
                                                type="password"
                                                required
                                                value={newUserPassword}
                                                onChange={(e) => setNewUserPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-xs"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="w-full md:w-1/3 space-y-1.5">
                                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Access Level</label>
                                        <select
                                            value={newUserRole}
                                            onChange={(e) => {
                                                setNewUserRole(e.target.value as Role);
                                                if (e.target.value !== 'Viewer') setNewUserDepts([]);
                                            }}
                                            className="w-full px-3 py-2.5 rounded-xl border border-border outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold text-xs bg-white"
                                        >
                                            <option value="Operator">Operator</option>
                                            <option value="Viewer">Viewer</option>
                                            <option value="Admin">Administrator</option>
                                        </select>
                                    </div>

                                    <div className="flex-1 w-full">
                                        {newUserRole === 'Viewer' && (
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1 text-primary">Departmental Access</label>
                                                <select
                                                    className="w-full px-3 py-2.5 rounded-xl border border-border outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-xs bg-white"
                                                    onChange={(e) => {
                                                        const dept = e.target.value as Department;
                                                        if (dept && !newUserDepts.includes(dept)) {
                                                            setNewUserDepts([...newUserDepts, dept]);
                                                        }
                                                        e.target.value = "";
                                                    }}
                                                >
                                                    <option value="">+ Add Department...</option>
                                                    {ALL_DEPARTMENTS.filter(d => !newUserDepts.includes(d)).map(dept => (
                                                        <option key={dept} value={dept}>{dept}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    <button type="submit" className="w-full md:w-auto px-6 h-[42px] bg-primary text-white rounded-xl flex items-center justify-center gap-2 hover:bg-blue-600 transition-all active:scale-95 shadow-lg shadow-blue-100 font-bold text-sm">
                                        <Plus className="w-4 h-4" />
                                        Create
                                    </button>
                                </div>

                                {newUserRole === 'Viewer' && newUserDepts.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {newUserDepts.map(dept => (
                                            <span key={dept} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-black border border-primary/20 uppercase tracking-tighter">
                                                {dept}
                                                <button type="button" onClick={() => toggleNewUserDept(dept)} className="hover:text-red-600">
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* List Section */}
                        <div className="p-6 bg-gray-50/30 flex flex-col min-h-0 flex-1">
                            <div className="flex flex-col md:flex-row gap-4 mb-6 sticky top-0 bg-gray-50/30 pb-2 z-10 shrink-0">
                                <div className="flex-1 relative">
                                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search by name or email..."
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-medium text-sm shadow-sm"
                                    />
                                </div>
                                <div className="w-full md:w-48">
                                    <select
                                        value={roleFilter}
                                        onChange={(e) => setRoleFilter(e.target.value as any)}
                                        className="w-full px-4 py-2.5 rounded-xl border border-border bg-white outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold text-sm shadow-sm"
                                    >
                                        <option value="All">All Roles</option>
                                        <option value="Admin">Administrators</option>
                                        <option value="Operator">Operators</option>
                                        <option value="Viewer">Viewers</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-0">
                                {filteredUsers.length === 0 ? (
                                    <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-border">
                                        <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-20" />
                                        <p className="text-muted-foreground font-medium">No users found matching your criteria</p>
                                    </div>
                                ) : (
                                    filteredUsers.map(u => (
                                        <div key={u.id} className={`flex items-center gap-4 p-3 border rounded-xl bg-white transition-all hover:bg-gray-50/50 group ${u.id === currentUser.id ? 'border-primary/20 bg-primary/5' : 'border-border'}`}>
                                            <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-black text-xs ${u.role === 'Admin' ? 'bg-red-50 text-red-600' :
                                                    u.role === 'Operator' ? 'bg-blue-50 text-primary' :
                                                        'bg-green-50 text-green-600'
                                                }`}>
                                                {u.name.split(' ').map(n => n[0]).join('')}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-foreground text-sm truncate uppercase tracking-tight">{u.name}</p>
                                                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter shrink-0 ${u.role === 'Admin' ? 'bg-red-100 text-red-700' :
                                                            u.role === 'Operator' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-green-100 text-green-700'
                                                        }`}>
                                                        {u.role}
                                                    </span>
                                                    {u.id === currentUser.id && (
                                                        <span className="text-[8px] bg-primary text-white px-1.5 py-0.5 rounded font-black uppercase tracking-tighter shrink-0">You</span>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-muted-foreground truncate font-medium">{u.email}</p>
                                            </div>

                                            <div className="flex items-center gap-2 pr-2">
                                                {u.role === 'Viewer' && (
                                                    <div className="flex -space-x-1 items-center bg-gray-100 px-2 py-1 rounded-lg border border-border group-hover:bg-white transition-colors">
                                                        <span className="text-[9px] font-black text-muted-foreground mr-1.5 uppercase tracking-tighter">Depts:</span>
                                                        {(u.allowedDepartments || []).length > 0 ? (
                                                            (u.allowedDepartments || []).map((dept, i) => (
                                                                <div key={dept} className="w-4 h-4 rounded-md bg-white border border-border flex items-center justify-center text-[8px] font-black text-primary shadow-sm" title={dept}>
                                                                    {dept[0]}
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <span className="text-[9px] font-black text-red-500 uppercase tracking-tighter">None Access</span>
                                                        )}
                                                        <select
                                                            disabled={u.id === currentUser.id}
                                                            className="opacity-0 w-3 h-3 absolute cursor-pointer"
                                                            onChange={(e) => {
                                                                const dept = e.target.value as Department;
                                                                if (dept) toggleExistingUserDept(u.id, u.allowedDepartments || [], dept);
                                                                e.target.value = "";
                                                            }}
                                                        >
                                                            <option value="">Add</option>
                                                            {ALL_DEPARTMENTS.map(d => (
                                                                <option key={d} value={d} disabled={(u.allowedDepartments || []).includes(d)}>{d}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                )}

                                                <select
                                                    disabled={u.id === currentUser.id}
                                                    value={u.role}
                                                    onChange={(e) => {
                                                        const newRole = e.target.value as Role;
                                                        updateUserRole(u.id, newRole);
                                                        if (newRole !== 'Viewer') updateUserDepartments(u.id, []);
                                                    }}
                                                    className="text-[10px] font-black px-2 py-1 rounded-lg bg-white border border-border outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-30 transition-all uppercase"
                                                >
                                                    <option value="Operator">OP</option>
                                                    <option value="Viewer">VW</option>
                                                    <option value="Admin">AD</option>
                                                </select>

                                                <button
                                                    onClick={() => showAlert('Delete User?', `Remove ${u.name}?`, 'confirm', () => removeUser(u.id))}
                                                    disabled={u.id === currentUser.id}
                                                    className="text-muted-foreground hover:text-red-600 p-2 disabled:opacity-20 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
