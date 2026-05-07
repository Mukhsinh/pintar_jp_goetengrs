'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Search, RefreshCw, Banknote } from 'lucide-react'
import { TariffTable } from '@/components/tariff/TariffTable'
import { TariffFormDialog } from '@/components/tariff/TariffFormDialog'
import { createClient } from '@/lib/supabase/client'

// Debounce hook for search optimization
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)

        return () => {
            clearTimeout(handler)
        }
    }, [value, delay])

    return debouncedValue
}

export default function MasterTariffPage() {
    const [tariffs, setTariffs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isFormOpen, setIsFormOpen] = useState(false)

    // Debounce search term
    const debouncedSearchTerm = useDebounce(searchTerm, 500)

    const loadTariffs = useCallback(async () => {
        setLoading(true)
        try {
            const supabase = createClient()

            const { data, error } = await supabase
                .from('m_master_tariffs')
                .select('*')
                .order('type', { ascending: false })
                .order('name', { ascending: true })

            if (error) throw error
            setTariffs(data || [])
        } catch (error) {
            console.error('Error loading tariffs:', error)
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        loadTariffs()
    }, [loadTariffs])

    // Filter based on search term
    const filteredTariffs = tariffs.filter(item => {
        if (!debouncedSearchTerm) return true
        const searchLower = debouncedSearchTerm.toLowerCase()
        return (
            item.code?.toLowerCase().includes(searchLower) ||
            item.name?.toLowerCase().includes(searchLower)
        )
    })

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200">
                        <Banknote className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Master Tarif Insentif</h1>
                        <p className="text-sm text-gray-500 font-medium">Kelola nilai dasar indeks dan tarif aktivitas</p>
                    </div>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" onClick={loadTariffs} disabled={loading} className="flex-1 md:flex-none">
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Muat Ulang
                    </Button>
                </div>
            </div>

            <Card className="border-none shadow-xl shadow-gray-100 bg-white/50 backdrop-blur-sm">
                <CardHeader className="pb-3 border-b border-gray-100">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle className="text-lg">Daftar Tarif</CardTitle>
                            <CardDescription className="text-xs">
                                Total: <span className="font-bold text-blue-600">{filteredTariffs.length}</span> data ditemukan
                            </CardDescription>
                        </div>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Cari kode atau nama..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 h-10 border-gray-200 bg-gray-50 focus:bg-white transition-all text-sm"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="pt-6">
                    <TariffTable tariffs={filteredTariffs} />
                </CardContent>
            </Card>

            <TariffFormDialog
                tariff={null}
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
            />
        </div>
    )
}
