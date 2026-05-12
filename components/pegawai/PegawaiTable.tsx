'use client'

import { useState, memo } from 'react'
import { deactivatePegawai, deletePegawai } from '@/lib/services/pegawai.service'
import { Button } from '@/components/ui/button'
import { Edit, Ban, CheckCircle, Trash2 } from 'lucide-react'
import type { Pegawai } from '@/lib/types/database.types'

interface PegawaiTableProps {
  pegawai: Pegawai[]
  loading: boolean
  onEdit: (pegawai: Pegawai) => void
  onRefresh: () => void
}

export const PegawaiTable = memo(function PegawaiTable({ pegawai, loading, onEdit, onRefresh }: PegawaiTableProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleDeactivate = async (pegawai: Pegawai) => {
    if (!confirm(`Apakah Anda yakin ingin menonaktifkan ${pegawai.full_name}?`)) {
      return
    }

    setActionLoading(pegawai.id)
    const result = await deactivatePegawai(pegawai.id)
    setActionLoading(null)

    if (result.success) {
      alert('Pegawai berhasil dinonaktifkan')
      onRefresh()
    } else {
      alert(`Gagal: ${result.error}`)
    }
  }

  const handleDelete = async (pegawai: Pegawai) => {
    if (!confirm(`PERINGATAN: Apakah Anda yakin ingin menghapus ${pegawai.full_name}?\n\nTindakan ini akan menghapus:\n- Data pegawai\n- Semua data KPI dan realisasi terkait\n\nTindakan ini TIDAK DAPAT DIBATALKAN!`)) {
      return
    }

    setActionLoading(pegawai.id)
    const result = await deletePegawai(pegawai.id)
    setActionLoading(null)

    if (result.success) {
      alert('Pegawai berhasil dihapus')
      onRefresh()
    } else {
      alert(`Gagal: ${result.error}`)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Memuat data...</p>
      </div>
    )
  }

  if (pegawai.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Tidak ada data pegawai</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b">
            <th className="text-left p-3">Kode Pegawai</th>
            <th className="text-left p-3">Nama Lengkap</th>
            <th className="text-left p-3">Unit</th>
            <th className="text-left p-3">Jabatan</th>
            <th className="text-left p-3">Status</th>
            <th className="text-left p-3">Golongan</th>
            <th className="text-left p-3">Status Pajak</th>
            <th className="text-left p-3">Telepon</th>
            <th className="text-left p-3">Aktif</th>
            <th className="text-right p-3">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {pegawai.map((p) => (
            <tr key={p.id} className="border-b hover:bg-gray-50 text-sm">
              <td className="p-3 font-medium">{p.employee_code}</td>
              <td className="p-3">{p.full_name}</td>
              <td className="p-3">{p.m_units?.name || '-'}</td>
              <td className="p-3">{p.position || '-'}</td>
              <td className="p-3">
                <span className={`px-2 py-1 text-xs rounded-full ${p.employment_status === 'PNS' ? 'bg-purple-100 text-purple-800' :
                  p.employment_status === 'PPPK' ? 'bg-green-100 text-green-800' :
                    'bg-orange-100 text-orange-800'
                  }`}>
                  {p.employment_status || '-'}
                </span>
              </td>
              <td className="p-3">
                {p.employment_status === 'PNS' && p.pns_grade && p.pns_grade !== 'null' ? `Golongan ${p.pns_grade}` : '-'}
              </td>
              <td className="p-3">
                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                  {p.tax_status}
                </span>
              </td>
              <td className="p-3">{p.phone || '-'}</td>
              <td className="p-3">
                {p.is_active ? (
                  <span className="flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Aktif
                  </span>
                ) : (
                  <span className="flex items-center text-red-600">
                    <Ban className="h-4 w-4 mr-1" />
                    Tidak Aktif
                  </span>
                )}
              </td>
              <td className="p-3 text-right space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(p)}
                  title="Edit"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                {p.is_active && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeactivate(p)}
                    disabled={actionLoading === p.id}
                    title="Nonaktifkan"
                  >
                    <Ban className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(p)}
                  disabled={actionLoading === p.id}
                  title="Hapus"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
})
