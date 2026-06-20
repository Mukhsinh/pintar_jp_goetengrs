'use client'

import { useState } from 'react'
import { type UserWithPegawai } from '@/app/(authenticated)/users/actions'
import { deactivateUser } from '@/lib/services/user-management.service'
import { Button } from '@/components/ui/button'
import { Edit, Ban, CheckCircle, Trash2, User, ShieldCheck, Mail, Briefcase, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface UserTableProps {
  users: UserWithPegawai[]
  loading: boolean
  onEdit: (user: UserWithPegawai) => void
  onDelete: (user: UserWithPegawai) => void
  onRefresh: () => void
}

const roleStyles: Record<string, { label: string; bg: string; text: string; icon: any }> = {
  superadmin: {
    label: 'Superadmin',
    bg: 'bg-indigo-50 border-indigo-100/50',
    text: 'text-indigo-600',
    icon: ShieldCheck
  },
  unit_manager: {
    label: 'Manajer Unit',
    bg: 'bg-blue-50 border-blue-100/50',
    text: 'text-blue-600',
    icon: Briefcase
  },
  employee: {
    label: 'Pegawai',
    bg: 'bg-slate-50 border-slate-100/50',
    text: 'text-slate-600',
    icon: User
  }
}

export function UserTable({ users, loading, onEdit, onDelete, onRefresh }: UserTableProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleDeactivate = async (user: UserWithPegawai) => {
    const userName = user.pegawai?.full_name || user.email
    if (!confirm(`Apakah Anda yakin ingin menonaktifkan ${userName}?`)) {
      return
    }

    setActionLoading(user.id)
    const result = await deactivateUser(user.id)
    setActionLoading(null)

    if (result.success) {
      onRefresh()
    } else {
      alert(`Error: ${result.error}`)
    }
  }

  if (loading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Sinkronisasi Data...</p>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-20 bg-slate-50/50 rounded-[2rem] border-2 border-dashed border-slate-100">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4 border border-slate-100">
          <User className="h-8 w-8 text-slate-200" />
        </div>
        <h3 className="text-lg font-black text-slate-800">Tidak Ada Pengguna</h3>
        <p className="text-sm font-medium text-slate-400 mt-1 max-w-xs mx-auto">
          Coba sesuaikan filter atau gunakan tombol "Tambah Pengguna" untuk memulai.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden bg-white/50 backdrop-blur-sm rounded-[2rem] border border-slate-100 shadow-sm relative">
      {loading && (
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-shimmer" />
      )}
      <div className="overflow-x-auto scrollbar-thin">
        <Table className="w-full border-collapse">
          <TableHeader>
            <TableRow className="bg-slate-50/80 border-b border-slate-100">
              <TableHead className="font-normal text-xs uppercase tracking-wider py-4">Identitas Pegawai</TableHead>
              <TableHead className="font-normal text-xs uppercase tracking-wider">Unit Kerja</TableHead>
              <TableHead className="font-normal text-xs uppercase tracking-wider">Kode Unit</TableHead>
              <TableHead className="font-normal text-xs uppercase tracking-wider">Akses & Kontak</TableHead>
              <TableHead className="font-normal text-xs uppercase tracking-wider">Peran</TableHead>
              <TableHead className="font-normal text-xs uppercase tracking-wider">Status</TableHead>
              <TableHead className="font-normal text-xs uppercase tracking-wider text-right pr-6">Opsi Management</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-slate-50">
            {users.map((user) => {
              const style = roleStyles[user.role] || roleStyles.employee
              const RoleIcon = style.icon

              return (
                <TableRow
                  key={user.id}
                  className="group hover:bg-blue-50/30 transition-all duration-300"
                >
                  <TableCell className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-transform group-hover:scale-110 duration-500",
                        style.bg
                      )}>
                        <RoleIcon className={cn("h-5 w-5", style.text)} />
                      </div>
                      <p className="text-sm font-normal text-slate-800 tracking-tight">
                        {user.pegawai?.full_name || 'Tidak Terhubung'}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-normal text-sm text-gray-900">
                      {user.unit?.name || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-normal text-xs text-gray-500 font-mono">
                      {user.unit?.code || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm text-gray-900 group-hover:text-blue-600 transition-colors">
                        {user.email || '-'}
                      </span>
                      <span className="font-normal text-[10px] text-gray-500 mt-0.5">
                        NIK: {user.pegawai?.employee_code || '-'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={cn(
                      "inline-flex items-center px-2.5 py-1 rounded-lg border text-[10px] font-medium uppercase tracking-wider gap-1.5 shadow-sm w-fit",
                      style.bg, style.text
                    )}>
                      <RoleIcon size={12} />
                      {style.label}
                    </div>
                  </TableCell>
                  <TableCell>
                    {user.is_active ? (
                      <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-100/50 text-emerald-600 font-medium text-[10px] uppercase tracking-wider shadow-sm w-fit">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Aktif
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-rose-50 border border-rose-100/50 text-rose-500 font-medium text-[10px] uppercase tracking-wider shadow-sm w-fit">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        Nonaktif
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onEdit(user)}
                        className="h-8 w-8 rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-400 hover:text-blue-600"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {user.is_active && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeactivate(user)}
                          disabled={actionLoading === user.id}
                          className="h-8 w-8 rounded-lg hover:bg-white hover:shadow-sm transition-all text-slate-400 hover:text-amber-600"
                        >
                          <Ban className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onDelete(user)}
                        disabled={actionLoading === user.id}
                        className="h-8 w-8 rounded-lg hover:bg-rose-50 hover:shadow-sm transition-all text-slate-300 hover:text-rose-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
