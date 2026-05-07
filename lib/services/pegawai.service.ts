import { createClient } from '@/lib/supabase/client'
import type { Pegawai, CreatePegawaiData, UpdatePegawaiData } from '@/lib/types/database.types'

/**
 * Get all pegawai with pagination and search
 */
export async function getPegawai(
  page: number = 1,
  pageSize: number = 50,
  searchTerm: string = ''
): Promise<{ data: Pegawai[]; count: number; error?: string }> {
  try {
    const supabase = createClient()

    let query = supabase
      .from('m_employees')
      .select(`
        id, employee_code, full_name, unit_id, position, phone, 
        nik, bank_name, bank_account_number, bank_account_name,
        tax_status, employee_status, tax_type, pns_grade,
        is_active, created_at, updated_at, 
        m_units(name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    // Apply search filter
    if (searchTerm) {
      query = query.or(`full_name.ilike.%${searchTerm}%,employee_code.ilike.%${searchTerm}%,position.ilike.%${searchTerm}%`)
    }

    // Apply pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
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
    return { data: [], count: 0, error: err.message }
  }
}

/**
 * Get pegawai by ID
 */
export async function getPegawaiById(
  id: string
): Promise<{ pegawai: Pegawai | null; error?: string }> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('m_employees')
      .select(`
        id, employee_code, full_name, unit_id, position, phone,
        nik, bank_name, bank_account_number, bank_account_name,
        tax_status, employee_status, tax_type, pns_grade,
        is_active, created_at, updated_at,
        m_units(name)
      `)
      .eq('id', id)
      .single()

    if (error) {
      return { pegawai: null, error: error.message }
    }

    // Transform data to match Pegawai type
    const transformedData: Pegawai = {
      ...data,
      m_units: Array.isArray(data.m_units) && data.m_units.length > 0
        ? data.m_units[0]
        : undefined
    }

    return { pegawai: transformedData }
  } catch (err: any) {
    return { pegawai: null, error: err.message }
  }
}

/**
 * Create a new pegawai
 */
export async function createPegawai(
  input: CreatePegawaiData
): Promise<{ success: boolean; pegawai?: Pegawai; error?: string }> {
  try {
    const supabase = createClient()

    // Check if employee code already exists
    const { data: existingCode } = await supabase
      .from('m_employees')
      .select('id')
      .eq('employee_code', input.employee_code)
      .single()

    if (existingCode) {
      return { success: false, error: 'Kode pegawai sudah digunakan' }
    }

    // Check if NIK already exists (if provided)
    if (input.nik) {
      const { data: existingNik } = await supabase
        .from('m_employees')
        .select('id')
        .eq('nik', input.nik)
        .single()

      if (existingNik) {
        return { success: false, error: 'NIK sudah terdaftar' }
      }
    }

    // Create pegawai record
    const { data, error } = await supabase
      .from('m_employees')
      .insert({
        employee_code: input.employee_code,
        full_name: input.full_name,
        unit_id: input.unit_id,
        position: input.position || null,
        phone: input.phone || null,
        nik: input.nik || null,
        bank_name: input.bank_name || null,
        bank_account_number: input.bank_account_number || null,
        bank_account_name: input.bank_account_name || null,
        tax_status: input.tax_status || 'TK/0',
        employee_status: (input as any).employee_status || 'ASN',
        tax_type: (input as any).tax_type || 'TER',
        pns_grade: (input as any).pns_grade || 3,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, pegawai: data as Pegawai }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Update pegawai data
 */
export async function updatePegawai(
  id: string,
  updates: UpdatePegawaiData
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    // Check if employee code already exists (if being updated)
    if (updates.employee_code) {
      const { data: existingCode } = await supabase
        .from('m_employees')
        .select('id')
        .eq('employee_code', updates.employee_code)
        .neq('id', id)
        .single()

      if (existingCode) {
        return { success: false, error: 'Kode pegawai sudah digunakan' }
      }
    }

    // Check if NIK already exists (if being updated)
    if (updates.nik) {
      const { data: existingNik } = await supabase
        .from('m_employees')
        .select('id')
        .eq('nik', updates.nik)
        .neq('id', id)
        .single()

      if (existingNik) {
        return { success: false, error: 'NIK sudah terdaftar' }
      }
    }

    // Update pegawai record
    const { error } = await supabase
      .from('m_employees')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Deactivate a pegawai
 */
export async function deactivatePegawai(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    // Update pegawai record
    const { error } = await supabase
      .from('m_employees')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Delete a pegawai (hard delete)
 */
export async function deletePegawai(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    // Delete pegawai record (will cascade to related data via RLS)
    const { error } = await supabase
      .from('m_employees')
      .delete()
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

/**
 * Get pegawai by unit
 */
export async function getPegawaiByUnit(
  unitId: string
): Promise<{ data: Pegawai[]; error?: string }> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('m_employees')
      .select(`
        id, employee_code, full_name, unit_id, position, phone,
        nik, bank_name, bank_account_number, bank_account_name,
        tax_status, employee_status, tax_type, pns_grade,
        is_active, created_at, updated_at,
        m_units(name)
      `)
      .eq('unit_id', unitId)
      .eq('is_active', true)
      .order('full_name', { ascending: true })

    if (error) {
      return { data: [], error: error.message }
    }

    // Transform data to match Pegawai type
    const transformedData: Pegawai[] = (data || []).map((item: any) => ({
      ...item,
      m_units: Array.isArray(item.m_units) && item.m_units.length > 0
        ? item.m_units[0]
        : undefined
    }))

    return { data: transformedData }
  } catch (err: any) {
    return { data: [], error: err.message }
  }
}

/**
 * Hard delete a pegawai (only if no realization data exists)
 */
export async function hardDeletePegawai(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient()

    // Check if pegawai has realization data
    const { data: realizationData, error: realizationError } = await supabase
      .from('t_realization')
      .select('id')
      .eq('employee_id', id)
      .limit(1)

    if (realizationError) {
      return { success: false, error: realizationError.message }
    }

    if (realizationData && realizationData.length > 0) {
      return {
        success: false,
        error: 'Tidak dapat menghapus pegawai yang memiliki data realisasi. Gunakan nonaktifkan sebagai gantinya.'
      }
    }

    // Delete pegawai record
    const { error } = await supabase
      .from('m_employees')
      .delete()
      .eq('id', id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}
