'use server'

import { createClient, createAdminClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { Pegawai, CreatePegawaiData, UpdatePegawaiData } from '@/lib/types/database.types'

/**
 * Server action to get pegawai with unit data
 */
export async function getPegawaiWithUnits(
  page: number = 1,
  pageSize: number = 50,
  searchTerm: string = ''
): Promise<{ data: Pegawai[]; count: number; error?: string }> {
  try {
    const supabase = await createClient()

    // Verify user is superadmin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: [], count: 0, error: 'Tidak terautentikasi' }
    }

    // Check if user is superadmin from auth.users metadata
    const role = user.user_metadata?.role

    if (!role || role !== 'superadmin') {
      return { data: [], count: 0, error: 'Tidak memiliki akses' }
    }

    let query = supabase
      .from('m_employees')
      .select('*, m_units(name)', { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply search filter
    if (searchTerm) {
      query = query.or(`full_name.ilike.%${searchTerm}%,employee_code.ilike.%${searchTerm}%,position.ilike.%${searchTerm}%,employment_status.ilike.%${searchTerm}%`)
    }

    // Apply pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('Query error:', error)
      return { data: [], count: 0, error: error.message }
    }

    // Transform data to match Pegawai type
    const transformedData: Pegawai[] = (data || []).map((item: any) => ({
      ...item,
      m_units: Array.isArray(item.m_units) && item.m_units.length > 0
        ? item.m_units[0]
        : undefined
    }))

    return { data: transformedData, count: count || 0 }
  } catch (err: any) {
    console.error('getPegawaiWithUnits error:', err)
    return { data: [], count: 0, error: err.message || 'Terjadi kesalahan' }
  }
}

/**
 * Server action to create new pegawai
 */
export async function createPegawai(data: CreatePegawaiData): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Verify user is superadmin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.user_metadata?.role !== 'superadmin') {
      return { success: false, error: 'Tidak memiliki akses' }
    }

    // Use admin client to bypass RLS and ensure all columns are written
    const adminSupabase = await createAdminClient()

    const isPNS = (data as any).employment_status === 'PNS'

    const { data: insertedData, error } = await adminSupabase
      .from('m_employees')
      .insert([{
        employee_code: data.employee_code,
        full_name: data.full_name,
        unit_id: data.unit_id,
        position: data.position || null,
        phone: data.phone || null,
        nik: data.nik || null,
        bank_name: data.bank_name || null,
        bank_account_number: data.bank_account_number || null,
        bank_account_name: data.bank_account_name || null,
        tax_status: data.tax_status || 'TK/0',
        employment_status: (data as any).employment_status || 'ASN',
        pns_grade: String((data as any).pns_grade || '3'),
        is_active: data.is_active !== undefined ? data.is_active : true,
      }])
      .select()
      .single()

    if (error) {
      console.error('Insert error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/pegawai')
    return { success: true }
  } catch (err: any) {
    console.error('createPegawai error:', err)
    return { success: false, error: err.message || 'Terjadi kesalahan' }
  }
}

/**
 * Server action to update pegawai
 */
export async function updatePegawai(id: string, data: UpdatePegawaiData): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Verify user is superadmin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.user_metadata?.role !== 'superadmin') {
      return { success: false, error: 'Tidak memiliki akses' }
    }

    // Use admin client to bypass RLS and ensure all columns are written
    const adminSupabase = await createAdminClient()

    const { error } = await adminSupabase
      .from('m_employees')
      .update({
        employee_code: data.employee_code,
        full_name: data.full_name,
        unit_id: data.unit_id,
        position: data.position,
        phone: data.phone,
        nik: data.nik,
        bank_name: data.bank_name,
        bank_account_number: data.bank_account_number,
        bank_account_name: data.bank_account_name,
        tax_status: data.tax_status,
        employment_status: (data as any).employment_status,
        pns_grade: data.pns_grade !== undefined ? String(data.pns_grade) : undefined,
        is_active: data.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('Update error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/pegawai')
    return { success: true }
  } catch (err: any) {
    console.error('updatePegawai error:', err)
    return { success: false, error: err.message || 'Terjadi kesalahan' }
  }
}

/**
 * Server action to delete pegawai
 */
export async function deletePegawai(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Verify user is superadmin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.user_metadata?.role !== 'superadmin') {
      return { success: false, error: 'Tidak memiliki akses' }
    }

    const { error } = await supabase
      .from('m_employees')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete error:', error)
      return { success: false, error: error.message }
    }

    revalidatePath('/pegawai')
    return { success: true }
  } catch (err: any) {
    console.error('deletePegawai error:', err)
    return { success: false, error: err.message || 'Terjadi kesalahan' }
  }
}

/**
 * Server action to get all units for dropdown
 */
export async function getUnitsForDropdown(): Promise<{ data: Array<{ id: string; name: string }>; error?: string }> {
  try {
    const supabase = await createClient()

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { data: [], error: 'Tidak terautentikasi' }
    }

    const { data, error } = await supabase
      .from('m_units')
      .select('id, name')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error('Units query error:', error)
      return { data: [], error: error.message }
    }

    return { data: data || [] }
  } catch (err: any) {
    console.error('getUnitsForDropdown error:', err)
    return { data: [], error: err.message || 'Terjadi kesalahan' }
  }
}
