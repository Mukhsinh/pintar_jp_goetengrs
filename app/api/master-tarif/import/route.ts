import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient()

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const formData = await request.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 })
        }

        // Read Excel file
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer)
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const data = XLSX.utils.sheet_to_json(worksheet)

        const results = {
            success: 0,
            failed: 0,
            errors: [] as string[]
        }

        // Process each row
        for (const row of data as any[]) {
            try {
                const code = row['Kode']?.toString().trim()
                const name = row['Nama']?.toString().trim()
                const typeRaw = row['Tipe (Aktivitas/Indeks)']?.toString().trim().toLowerCase()
                const amount = parseFloat(row['Nilai/Tarif']?.toString() || '0')
                const status = row['Status (Aktif/Nonaktif)']?.toString().trim().toLowerCase()

                if (!code || !name || !typeRaw) {
                    results.failed++
                    results.errors.push(`Baris dengan kode "${code || 'kosong'}": Kode, Nama, dan Tipe wajib diisi`)
                    continue
                }

                // Map type
                const type = typeRaw.includes('aktivitas') ? 'activity' : 'index'
                const is_active = status !== 'nonaktif'

                // Check if exists
                const { data: existing } = await supabase
                    .from('m_master_tariffs')
                    .select('id')
                    .eq('code', code)
                    .single()

                if (existing) {
                    // Update existing
                    const { error } = await supabase
                        .from('m_master_tariffs')
                        .update({
                            name,
                            amount,
                            type,
                            is_active,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', existing.id)

                    if (error) throw error
                } else {
                    // Insert new
                    const { error } = await supabase
                        .from('m_master_tariffs')
                        .insert({
                            code,
                            name,
                            amount,
                            type,
                            is_active
                        })

                    if (error) throw error
                }

                results.success++
            } catch (error: any) {
                results.failed++
                results.errors.push(`Baris "${row['Kode']}": ${error.message}`)
            }
        }

        return NextResponse.json(results)
    } catch (error: any) {
        console.error('Error importing tariffs:', error)
        return NextResponse.json(
            { error: error.message || 'Failed to import tariffs' },
            { status: 500 }
        )
    }
}
