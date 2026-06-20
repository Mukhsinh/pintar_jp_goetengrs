'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { generatePoolOverviewPDF } from '@/lib/export/pdf-export'

export async function exportPoolReportToPDF(poolId: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            throw new Error('Unauthorized')
        }

        const adminClient = await createAdminClient()

        // 1. Get pool metadata
        const { data: pool, error: poolError } = await adminClient
            .from('t_pool')
            .select('*')
            .eq('id', poolId)
            .single()

        if (poolError || !pool) {
            throw new Error(`Pool not found: ${poolError?.message}`)
        }

        // 2. Get revenue items
        const { data: revenueItems, error: revError } = await adminClient
            .from('t_pool_revenue')
            .select('*')
            .eq('pool_id', poolId)
            .order('created_at')

        if (revError) throw revError

        // 3. Get deduction items
        const { data: deductionItems, error: dedError } = await adminClient
            .from('t_pool_deduction')
            .select('*')
            .eq('pool_id', poolId)
            .order('created_at')

        if (dedError) throw dedError

        // 4. Generate PDF
        const pdfBytes = await generatePoolOverviewPDF({
            pool,
            revenueItems: revenueItems || [],
            deductionItems: deductionItems || []
        })

        // 5. Convert to base64 for transport
        return {
            success: true,
            data: Buffer.from(pdfBytes).toString('base64'),
            filename: `Laporan_Pool_${pool.period.replace(/\//g, '-')}.pdf`
        }

    } catch (error: any) {
        console.error('exportPoolReportToPDF error:', error)
        return {
            success: false,
            error: error.message || 'Gagal menghasilkan PDF'
        }
    }
}
