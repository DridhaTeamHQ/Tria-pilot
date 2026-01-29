'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, X, Loader2, RefreshCw } from 'lucide-react'

// Types based on API response
interface PendingUser {
    id: string
    email: string
    role: string
    created_at: string
    onboarding_completed: boolean
}

export default function AdminDashboard() {
    const [users, setUsers] = useState<PendingUser[]>([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const router = useRouter()

    const fetchUsers = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/admin/pending-users')
            if (!res.ok) {
                if (res.status === 401 || res.status === 403) {
                    router.push('/dashboard') // Not admin
                    return
                }
                throw new Error('Failed to fetch')
            }
            const data = await res.json()
            setUsers(data.users || [])
        } catch (e) {
            toast.error('Failed to load pending users')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const handleAction = async (userId: string, action: 'approve' | 'reject') => {
        setProcessingId(userId)
        try {
            const res = await fetch('/api/admin/pending-users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, action })
            })

            if (!res.ok) throw new Error('Action failed')

            toast.success(`User ${action}ed successfully`)
            // Optimistic update
            setUsers(prev => prev.filter(u => u.id !== userId))
        } catch (e) {
            toast.error('Something went wrong')
        } finally {
            setProcessingId(null)
        }
    }

    return (
        <div className="min-h-screen bg-neutral-50 p-8 font-sans">
            <div className="mx-auto max-w-6xl">
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-black">Admin Dashboard</h1>
                        <p className="text-neutral-600">Review and manage pending applications.</p>
                    </div>
                    <button
                        onClick={fetchUsers}
                        className="flex items-center gap-2 rounded-lg border-2 border-black bg-white px-4 py-2 font-bold shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[4px] active:shadow-none transition-all"
                    >
                        <RefreshCw size={18} /> Refresh
                    </button>
                </header>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="animate-spin size-8" />
                    </div>
                ) : users.length === 0 ? (
                    <div className="rounded-xl border-2 border-dashed border-neutral-300 p-12 text-center">
                        <p className="text-lg text-neutral-500">No pending users found.</p>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-xl border-2 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                        <table className="w-full text-left">
                            <thead className="bg-neutral-100 border-b-2 border-black">
                                <tr>
                                    <th className="p-4 font-bold">Email</th>
                                    <th className="p-4 font-bold">Role</th>
                                    <th className="p-4 font-bold">Joined</th>
                                    <th className="p-4 font-bold">Onboarding</th>
                                    <th className="p-4 font-bold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-neutral-100">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-neutral-50">
                                        <td className="p-4 font-medium">{user.email}</td>
                                        <td className="p-4">
                                            <span className="inline-block rounded-full border border-black bg-purple-200 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-neutral-500">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="p-4">
                                            {user.onboarding_completed ? (
                                                <span className="text-green-600 font-bold flex items-center gap-1">
                                                    <Check size={14} /> Done
                                                </span>
                                            ) : (
                                                <span className="text-orange-500 font-bold flex items-center gap-1">
                                                    Incomplete
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-right space-x-2">
                                            <button
                                                onClick={() => handleAction(user.id, 'reject')}
                                                disabled={processingId === user.id}
                                                className="inline-flex items-center gap-1 rounded-lg border-2 border-black bg-red-400 px-3 py-1.5 text-sm font-bold text-black transition-all hover:bg-red-500 disabled:opacity-50"
                                            >
                                                <X size={14} /> Reject
                                            </button>
                                            <button
                                                onClick={() => handleAction(user.id, 'approve')}
                                                disabled={processingId === user.id}
                                                className="inline-flex items-center gap-1 rounded-lg border-2 border-black bg-[#B4F056] px-3 py-1.5 text-sm font-bold text-black transition-all hover:bg-[#a2d84d] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
                                            >
                                                {processingId === user.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                                Approve
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
