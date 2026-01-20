"use client";
import React, { useState, useEffect } from 'react';
import { db } from '../../../lib/db';
import { collection, addDoc, getDocs, query, where, updateDoc, doc, arrayUnion, arrayRemove, deleteDoc, writeBatch, serverTimestamp, orderBy, onSnapshot } from 'firebase/firestore';
import { Users, Plus, UserPlus, Shield, ArrowLeft, X, Trash2, UserMinus } from 'lucide-react';
import Link from 'next/link';

export default function AdminTeamsPage() {
    const [teams, setTeams] = useState([]);
    const [rescueUsers, setRescueUsers] = useState([]);
    const [newTeamName, setNewTeamName] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState('');
    const [selectedTeamForAdd, setSelectedTeamForAdd] = useState(null);

    // Fetch Data
    useEffect(() => {
        // 1. Listen to Teams
        const qTeams = query(collection(db, 'teams'), orderBy('createdAt', 'desc'));
        const unsubscribeTeams = onSnapshot(qTeams, (snapshot) => {
            const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTeams(teamsData);
            setLoading(false);
        });

        // 2. Listen to Users (for dropdown)
        const qUsers = query(collection(db, 'users'), where('role', '==', 'rescue'));
        const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRescueUsers(usersData);
        });

        return () => {
            unsubscribeTeams();
            unsubscribeUsers();
        };
    }, []);

    // Create Team
    const handleCreateTeam = async (e) => {
        e.preventDefault();
        if (!newTeamName.trim()) return;

        try {
            await addDoc(collection(db, 'teams'), {
                name: newTeamName,
                members: [],
                createdAt: serverTimestamp()
            });
            setNewTeamName('');
        } catch (error) {
            console.error("Error creating team:", error);
            alert("เกิดข้อผิดพลาดในการสร้างทีม");
        }
    };

    // Remove Member
    const handleRemoveMember = async (userId, teamId) => {
        if (!confirm('ต้องการลบสมาชิกออกจากทีมใช่หรือไม่?')) return;

        try {
            // 1. Update User doc (Set team to null)
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, {
                teamId: null,
                teamName: null
            });

            // 2. Update Team doc (Remove from array)
            const teamRef = doc(db, 'teams', teamId);
            await updateDoc(teamRef, {
                members: arrayRemove(userId)
            });
        } catch (error) {
            console.error("Error removing member:", error);
            alert("เกิดข้อผิดพลาดในการลบสมาชิก");
        }
    };

    // Delete Team
    const handleDeleteTeam = async (team) => {
        const confirmMsg = `ยืนยันการลบทีม "${team.name}"?\n\nสมาชิกทั้งหมดในทีมจะถูกปลดออกจากการสังกัดทีมนี้`;
        if (!confirm(confirmMsg)) return;

        try {
            const batch = writeBatch(db);

            // 1. Update all members of this team to have no team
            if (team.members && team.members.length > 0) {
                team.members.forEach(memberId => {
                    const userRef = doc(db, 'users', memberId);
                    batch.update(userRef, { teamId: null, teamName: null });
                });
            }

            // 2. Delete the team document
            const teamRef = doc(db, 'teams', team.id);
            batch.delete(teamRef);

            await batch.commit();

        } catch (error) {
            console.error("Error deleting team:", error);
            alert("เกิดข้อผิดพลาดในการลบทีม");
        }
    };

    // Add Member
    const handleAddMember = async () => {
        if (!selectedUser || !selectedTeamForAdd) return;

        try {
            // 1. Update User doc
            const userRef = doc(db, 'users', selectedUser);
            await updateDoc(userRef, {
                teamId: selectedTeamForAdd.id,
                teamName: selectedTeamForAdd.name
            });

            // 2. Update Team doc
            const teamRef = doc(db, 'teams', selectedTeamForAdd.id);
            await updateDoc(teamRef, {
                members: arrayUnion(selectedUser)
            });

            alert(`เพิ่มสมาชิกเข้าสู่ทีม ${selectedTeamForAdd.name} เรียบร้อยแล้ว`);
            setSelectedTeamForAdd(null);
            setSelectedUser('');

        } catch (error) {
            console.error("Error adding member:", error);
            alert("เกิดข้อผิดพลาดในการเพิ่มสมาชิก");
        }
    };

    // Helper to get user name by ID
    const getUserName = (uid) => {
        const u = rescueUsers.find(user => user.id === uid);
        return u ? u.name || u.email : 'Unknown User';
    };

    if (loading) return <div className="p-10 text-center">กำลังโหลดข้อมูล...</div>;

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-10">

            {/* Navbar / Header */}
            <nav className="bg-white shadow px-6 py-4 flex justify-between items-center sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="p-2 hover:bg-gray-100 rounded-full transition text-gray-600">
                        <ArrowLeft size={24} />
                    </Link>
                    <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Users className="text-blue-600" /> จัดการทีมกู้ภัย
                    </h1>
                </div>
            </nav>

            <main className="container mx-auto px-4 py-8 max-w-5xl">

                {/* 1. Create Team Section */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-700">
                        <Plus className="bg-blue-100 text-blue-600 rounded p-1" size={24} />
                        สร้างทีมใหม่
                    </h2>
                    <form onSubmit={handleCreateTeam} className="flex gap-4">
                        <input
                            type="text"
                            value={newTeamName}
                            onChange={(e) => setNewTeamName(e.target.value)}
                            placeholder="ระบุชื่อทีม (เช่น ทีม Alpha, หน่วยกู้ภัย 1)"
                            className="flex-grow p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                        <button
                            type="submit"
                            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-sm whitespace-nowrap"
                        >
                            สร้างทีม
                        </button>
                    </form>
                </div>

                {/* 2. Team List */}
                <div className="grid gap-6">
                    {teams.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed">
                            <Users size={48} className="mx-auto mb-3 opacity-30" />
                            <p>ยังไม่มีทีมกู้ภัยในระบบ</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                            {teams.map(team => (
                                <div key={team.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition">
                                    <div className="flex justify-between items-start mb-4 border-b border-gray-100 pb-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-800">{team.name}</h3>
                                            <p className="text-gray-500 text-sm mt-1">สมาชิก {team.members?.length || 0} คน</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setSelectedTeamForAdd(team)}
                                                className="flex items-center gap-2 text-xs bg-green-50 text-green-700 px-3 py-2 rounded-lg hover:bg-green-100 transition border border-green-200 font-bold"
                                                title="เพิ่มสมาชิก"
                                            >
                                                <UserPlus size={16} />
                                                เพิ่ม
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTeam(team)}
                                                className="flex items-center gap-2 text-xs bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 transition border border-red-200 font-bold"
                                                title="ลบทีม"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Member List */}
                                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                                        {team.members && team.members.length > 0 ? (
                                            <div className="space-y-2">
                                                {team.members.map((memberId, index) => (
                                                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100 group">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                                                <UserPlus size={14} />
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-700">{getUserName(memberId)}</span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveMember(memberId, team.id)}
                                                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1"
                                                            title="เอาออกจากทีม"
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-6 text-gray-400 gap-2">
                                                <Shield size={24} className="opacity-20" />
                                                <span className="text-sm">ยังไม่มีสมาชิกในทีมนี้</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Modal for Adding Member */}
                {selectedTeamForAdd && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-in fade-in zoom-in duration-200">
                            <div className="flex justify-between items-center mb-6 border-b pb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">เพิ่มสมาชิกใหม่</h3>
                                    <p className="text-sm text-gray-500">เข้าสู่ทีม: <span className="text-blue-600 font-bold">{selectedTeamForAdd.name}</span></p>
                                </div>
                                <button onClick={() => { setSelectedTeamForAdd(null); setSelectedUser(''); }} className="text-gray-400 hover:text-gray-600 bg-gray-100 p-2 rounded-full transition">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="mb-8">
                                <label className="block text-sm font-bold text-gray-700 mb-2">เลือกอาสาสมัครกู้ภัย</label>
                                <select
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                                >
                                    <option value="">-- เลือกรายชื่อจากระบบ --</option>
                                    {rescueUsers
                                        .map(u => (
                                            <option key={u.id} value={u.id}>
                                                {u.name} {u.teamName ? `(ย้ายจาก ${u.teamName})` : '(ว่าง - ยังไม่มีทีม)'}
                                            </option>
                                        ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                                    <Shield size={12} /> แสดงเฉพาะผู้ใช้ที่มีสิทธิ์ Rescue
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={() => { setSelectedTeamForAdd(null); setSelectedUser(''); }}
                                    className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={handleAddMember}
                                    disabled={!selectedUser}
                                    className={`px-5 py-2.5 rounded-lg text-white font-bold shadow-sm transition ${!selectedUser ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                                >
                                    ยืนยันการเพิ่ม
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
}
