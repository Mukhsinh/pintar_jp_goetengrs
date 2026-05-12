import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    const userClient = await createClient()
    const supabaseAdmin = await createAdminClient()

    // 1. Verify user is superadmin using the user's client
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = user.user_metadata?.role
    if (role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 2. Parse file
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer)
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    const rawData = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[]

    // Normalize data: Trim all headers and values
    const data = rawData.map(row => {
      const normalized: Record<string, any> = {}
      for (const key in row) {
        normalized[key.trim()] = typeof row[key] === 'string' ? row[key].trim() : row[key]
      }
      return normalized
    })

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    }

    // 3. Process records one by one using Admin Client
    for (const row of data) {
      const employeeCode = row['Kode Pegawai']?.toString()

      try {
        const nik = row['NIK']?.toString()
        const fullName = row['Nama Lengkap']?.toString()
        const unitCode = row['Kode Unit']?.toString()
        const position = row['Jabatan']?.toString()
        const email = row['Email']?.toString().toLowerCase()
        const phone = row['Telepon']?.toString()
        const taxStatus = row['Status Pajak']?.toString() || 'TK/0'
        const bankName = row['Nama Bank']?.toString()
        const bankAccountNumber = row['Nomor Rekening']?.toString()
        const bankAccountName = row['Nama Pemilik Rekening']?.toString()
        const roleStr = row['Role']?.toString().toLowerCase()
        const status = row['Status']?.toString().toLowerCase()
        const rawStatus = String(row['Status Pegawai'] || row['status_pegawai'] || row['Employment Status'] || '').toUpperCase()
        let employmentStatus: 'PNS' | 'PPPK' | 'BLUD' = 'BLUD'

        if (rawStatus.includes('PNS') || rawStatus.includes('ASN')) {
          employmentStatus = 'PNS'
        } else if (rawStatus.includes('PPPK')) {
          employmentStatus = 'PPPK'
        } else if (rawStatus.includes('BLUD')) {
          employmentStatus = 'BLUD'
        }

        const rawGrade = String(row['Golongan'] || row['golongan'] || row['PNS Grade'] || '').trim().replace(/[^0-9]/g, '')
        const pnsGrade = employmentStatus === 'PNS' ? (rawGrade || null) : null
        const taxTypeReq = row['Jenis Pajak']?.toString()

        if (!employeeCode || !fullName || !unitCode || !email || !roleStr) {
          throw new Error('Data wajib tidak lengkap (Kode Pegawai, Nama, Kode Unit, Email, Role)')
        }

        // Validate values
        const validRoles = ['superadmin', 'unit_manager', 'employee']
        const normalizedRole = validRoles.includes(roleStr) ? roleStr : 'employee'

        const validTaxStatus = ['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3']
        const normalizedTaxStatus = validTaxStatus.includes(taxStatus) ? taxStatus : 'TK/0'

        // --- Match unit ---
        const { data: units, error: unitFetchError } = await supabaseAdmin
          .from('m_units')
          .select('id, code, name')
          .or(`code.eq."${unitCode}",name.ilike."${unitCode}"`)

        if (unitFetchError) throw unitFetchError
        let unit = units && units.length > 0 ? units[0] : null

        if (!unit) {
          const parts = unitCode.split(/[\s,]+/).filter((p: string) => p.length > 2)
          for (const part of parts) {
            const { data: fuzzyUnits } = await supabaseAdmin
              .from('m_units')
              .select('id, code, name')
              .ilike('name', `%${part}%`)

            if (fuzzyUnits && fuzzyUnits.length > 0) {
              unit = fuzzyUnits[0]
              break
            }
          }
        }

        if (!unit) {
          throw new Error(`Unit "${unitCode}" tidak ditemukan di database m_units`)
        }

        // --- Check if employee exists ---
        const { data: existing, error: checkError } = await supabaseAdmin
          .from('m_employees')
          .select('id, user_id')
          .eq('employee_code', employeeCode)
          .maybeSingle()

        if (checkError) throw checkError

        // --- Prepare Auth User ---
        let authUserId: string | null = null
        const { data: { users: authUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
        if (listError) throw listError

        const existingAuthUser = authUsers?.find(u => u.email === email)

        if (existingAuthUser) {
          authUserId = existingAuthUser.id
          await supabaseAdmin.auth.admin.updateUserById(authUserId, {
            user_metadata: { role: normalizedRole, full_name: fullName }
          })
        } else {
          const tempPassword = `JASPEL_${employeeCode}_${Math.random().toString(36).slice(2, 8)}`
          const { data: newAuthUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { role: normalizedRole, full_name: fullName }
          })
          if (createAuthError) throw createAuthError
          authUserId = newAuthUser?.user?.id ?? null
        }

        // --- Save Employee Data ---
        const employeeData = {
          employee_code: employeeCode,
          full_name: fullName,
          unit_id: unit.id,
          user_id: authUserId,
          nik: nik || null,
          position: position || null,
          phone: phone || null,
          tax_status: normalizedTaxStatus,
          bank_name: bankName || null,
          bank_account_number: bankAccountNumber || null,
          bank_account_name: bankAccountName || null,
          role: normalizedRole,
          employment_status: employmentStatus,
          employee_status: employmentStatus, // Keep for legacy compatibility
          tax_type: taxTypeReq || 'Final',
          pns_grade: pnsGrade,
          is_active: status ? status === 'aktif' : true,
          updated_at: new Date().toISOString()
        }

        if (existing) {
          const { error: updateError } = await supabaseAdmin
            .from('m_employees')
            .update(employeeData)
            .eq('id', existing.id)
          if (updateError) throw updateError
        } else {
          const { error: insertError } = await supabaseAdmin
            .from('m_employees')
            .insert(employeeData)
          if (insertError) throw insertError
        }

        results.success++
      } catch (error: any) {
        console.error(`[IMPORT ERROR] Row ${employeeCode || 'Unknown'}:`, error)
        results.failed++
        // Extract meaningful message even from Supabase error objects
        const errorMsg = error.message || error.details || JSON.stringify(error)
        results.errors.push(`Baris "${employeeCode || 'Unknown'}": ${errorMsg}`)
      }
    }

    return NextResponse.json(results)
  } catch (error: any) {
    console.error('CRITICAL: Error importing pegawai:', error)
    return NextResponse.json(
      { error: error.message || 'Gagal memproses data import' },
      { status: 500 }
    )
  }
}
