import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

export const maxDuration = 300 // Allow up to 5 minutes for large imports

export async function POST(request: NextRequest) {
  try {
    const userClient = await createClient()
    const supabaseAdmin = await createAdminClient()

    // 1. Verify user is superadmin
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabaseAdmin
      .from('m_employees')
      .select('role')
      .eq('user_id', user.id)
      .single()

    const role = profile?.role || user.user_metadata?.role
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
    const workbook = XLSX.read(buffer, { type: 'array' })
    const worksheet = workbook.Sheets[workbook.SheetNames[0]]
    if (!worksheet) {
      return NextResponse.json({ error: 'Sheet kosong atau format tidak valid' }, { status: 400 })
    }

    const rawData = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Record<string, any>[]

    if (rawData.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data di dalam file Excel' }, { status: 400 })
    }

    // Flexible Header Mapping Utility
    const getVal = (row: Record<string, any>, possibleKeys: string[]) => {
      for (const key of possibleKeys) {
        if (row[key] !== undefined && row[key] !== '') return row[key]
        const foundKey = Object.keys(row).find(k => k.trim().toLowerCase() === key.toLowerCase())
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== '') return row[foundKey]
      }
      return undefined
    }

    // Truncate utility to prevent DB errors
    const trunc = (val: any, limit: number) => {
      if (val === undefined || val === null) return null
      const s = val.toString().trim()
      return s.length > limit ? s.substring(0, limit) : s
    }

    // Normalize employment_status to match DB CHECK constraint
    // Allowed values: 'ASN', 'BLUD', 'PNS', 'PPPK', 'PPPK PARUH WAKTU', 'NON ASN', 'HONORER', 'THL', 'TENAGA KONTRAK'
    const normalizeEmploymentStatus = (raw: any): string => {
      if (raw === undefined || raw === null || raw.toString().trim() === '') return 'BLUD'
      const val = raw.toString().trim().toUpperCase()

      // Exact match first
      const validStatuses = ['ASN', 'BLUD', 'PNS', 'PPPK', 'PPPK PARUH WAKTU', 'NON ASN', 'HONORER', 'THL', 'TENAGA KONTRAK']
      if (validStatuses.includes(val)) return val

      // Fuzzy matching for common variations
      const mapping: Record<string, string> = {
        // PNS variations
        'PEGAWAI NEGERI SIPIL': 'PNS',
        'PEGAWAI NEGERI': 'PNS',
        'P.N.S': 'PNS',
        'P.N.S.': 'PNS',
        // ASN variations
        'APARATUR SIPIL NEGARA': 'ASN',
        'A.S.N': 'ASN',
        'A.S.N.': 'ASN',
        // PPPK variations
        'P3K': 'PPPK',
        'PPPK PARUH': 'PPPK PARUH WAKTU',
        'PPPK PW': 'PPPK PARUH WAKTU',
        'P3K PARUH WAKTU': 'PPPK PARUH WAKTU',
        'PEGAWAI PEMERINTAH': 'PPPK',
        'PEGAWAI PEMERINTAH DENGAN PERJANJIAN KERJA': 'PPPK',
        // BLUD variations
        'B.L.U.D': 'BLUD',
        'B.L.U.D.': 'BLUD',
        'BADAN LAYANAN UMUM DAERAH': 'BLUD',
        'BADAN LAYANAN UMUM': 'BLUD',
        'BLU': 'BLUD',
        // NON ASN variations
        'NON-ASN': 'NON ASN',
        'NON_ASN': 'NON ASN',
        'NONASN': 'NON ASN',
        'NON PNS': 'NON ASN',
        'NON-PNS': 'NON ASN',
        'NON_PNS': 'NON ASN',
        'NONPNS': 'NON ASN',
        'NABAN': 'NON ASN',
        'NON APARATUR': 'NON ASN',
        // HONORER variations
        'HONOR': 'HONORER',
        'HONORER DAERAH': 'HONORER',
        'TENAGA HONORER': 'HONORER',
        'PTT': 'HONORER',
        // THL variations
        'TENAGA HARIAN LEPAS': 'THL',
        'HARIAN LEPAS': 'THL',
        'HARIAN': 'THL',
        // TENAGA KONTRAK variations
        'KONTRAK': 'TENAGA KONTRAK',
        'TK': 'TENAGA KONTRAK',
        'TENAGA KONTRAK DAERAH': 'TENAGA KONTRAK',
        'TKHL': 'TENAGA KONTRAK',
        'OUTSOURCING': 'TENAGA KONTRAK',
        'OS': 'TENAGA KONTRAK',
        'MAGANG': 'TENAGA KONTRAK',
        // Common hospital staff abbreviations
        'AMK': 'BLUD',
        'AMAK': 'BLUD',
        'SKM': 'BLUD',
        'S.KEP': 'BLUD',
        'NS': 'BLUD',
        'DR': 'BLUD',
        'DRG': 'BLUD',
        'APT': 'BLUD',
      }

      // Check exact mapping
      if (mapping[val]) return mapping[val]

      // Check if the value contains a valid status keyword
      for (const status of validStatuses) {
        if (val.includes(status)) return status
      }

      // Check partial mapping match
      for (const [key, mapped] of Object.entries(mapping)) {
        if (val.includes(key)) return mapped
      }

      // Default fallback - BLUD for unrecognized values
      return 'BLUD'
    }

    const normalizeTaxStatus = (status: any): string => {
      if (!status) return 'TK/0'
      let val = String(status).toUpperCase().replace(/\s+/g, '')

      // Remove common separators and re-add standard one
      val = val.replace(/[\/\-_]/g, '')

      let normalized = val
      if (val.startsWith('TK')) {
        normalized = 'TK/' + val.slice(2)
      } else if (val.startsWith('K')) {
        normalized = 'K/' + val.slice(1)
      }

      const validTaxStatuses = ['TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3']
      if (validTaxStatuses.includes(normalized)) return normalized

      // Final attempt: check if it contains any valid status
      for (const valid of validTaxStatuses) {
        if (normalized.includes(valid.replace('/', ''))) return valid
      }

      return 'TK/0' // Fallback
    }

    const results = {
      success: 0,
      failed: 0,
      failedRows: [] as any[],
      total: rawData.length,
    }

    // --- PRE-FETCH: Load units and auth users ---
    const { data: allUnits } = await supabaseAdmin.from('m_units').select('id, code, name')
    const { data: { users: allAuthUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })

    // Build lookup maps
    const unitByCode = new Map<string, any>()
    const unitByName = new Map<string, any>()
    allUnits?.forEach(u => {
      unitByCode.set(u.code.toLowerCase(), u)
      unitByName.set(u.name.toLowerCase(), u)
    })

    const authUserByEmail = new Map<string, any>()
    allAuthUsers?.forEach(u => {
      if (u.email) authUserByEmail.set(u.email.toLowerCase(), u)
    })

    const codesInFile = new Set<string>()

    // 3. Process records
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i]
      const rowNum = i + 2
      const nonEmpty = Object.values(row).filter(v => v !== '' && v !== null)
      if (nonEmpty.length === 0) continue

      const employeeCode = getVal(row, ['Kode Pegawai', 'Kode', 'NIP'])?.toString().trim()
      const fullName = getVal(row, ['Nama Lengkap', 'Nama'])?.toString().trim()
      const unitCode = getVal(row, ['Kode Unit', 'Unit'])?.toString().trim()
      const email = getVal(row, ['Email'])?.toString().trim().toLowerCase()

      try {
        if (!employeeCode || !fullName || !unitCode) {
          throw new Error(`Data wajib kosong (Kode: ${employeeCode || '-'}, Nama: ${fullName || '-'}, Unit: ${unitCode || '-'})`)
        }

        if (codesInFile.has(employeeCode)) {
          throw new Error(`Kode duplikat: ${employeeCode}`)
        }
        codesInFile.add(employeeCode)

        // Enums & Norms
        const roleStr = getVal(row, ['Role'])?.toString().trim().toLowerCase()
        const normalizedRole = ['superadmin', 'unit_manager', 'employee'].includes(roleStr) ? roleStr : 'employee'

        // Unit match
        const unitLc = unitCode.toLowerCase()
        const unit = unitByCode.get(unitLc) || unitByName.get(unitLc) ||
          [...unitByName.values()].find(u => u.name.toLowerCase().includes(unitLc))

        if (!unit) throw new Error(`Unit "${unitCode}" tidak ditemukan`)

        // Auth Sync
        let authUserId: string | null = null
        if (email) {
          if (!email.includes('@')) throw new Error(`Email tidak valid: ${email}`)

          const existingAuthUser = authUserByEmail.get(email)
          if (existingAuthUser) {
            authUserId = existingAuthUser.id
            // ONLY update if metadata changed to save time/rate-limits
            const meta = existingAuthUser.user_metadata || {}
            if (meta.role !== normalizedRole || meta.full_name !== fullName) {
              await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
                user_metadata: { ...meta, role: normalizedRole, full_name: fullName }
              })
            }
          } else {
            const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
              email,
              password: `JASPEL_${employeeCode}`,
              email_confirm: true,
              user_metadata: { role: normalizedRole, full_name: fullName }
            })
            if (createError) throw createError
            authUserId = newUser.user?.id || null
          }
        }

        // Final Employee Data
        const empData = {
          employee_code: trunc(employeeCode, 50),
          full_name: trunc(fullName, 255),
          unit_id: unit.id,
          user_id: authUserId,
          email: trunc(email, 255),
          role: normalizedRole,
          tax_status: normalizeTaxStatus(getVal(row, ['Status Pajak', 'PTKP'])),
          nik: trunc(getVal(row, ['NIK']), 100),
          position: trunc(getVal(row, ['Jabatan']), 500),
          phone: trunc(getVal(row, ['Telepon', 'No HP']), 100),
          bank_name: trunc(getVal(row, ['Nama Bank']), 255),
          bank_account_number: trunc(getVal(row, ['Nomor Rekening']), 100),
          bank_account_name: trunc(getVal(row, ['Nama Pemilik Rekening']), 500),
          employment_status: normalizeEmploymentStatus(getVal(row, ['Status Pegawai'])),
          pns_grade: trunc(getVal(row, ['Golongan'])?.toString().trim()?.replace(/[^0-9]/g, ''), 100) || null,
          tax_type: trunc(getVal(row, ['Jenis Pajak'])?.toString().trim() === 'TER' ? 'TER' : 'Final', 100),
          is_active: true,
          updated_at: new Date().toISOString()
        }

        const { error: upsertErr } = await supabaseAdmin
          .from('m_employees')
          .upsert(empData, { onConflict: 'employee_code' })

        if (upsertErr) throw upsertErr
        results.success++
      } catch (err: any) {
        results.failed++
        results.failedRows.push({
          rowNumber: rowNum,
          code: employeeCode || '-',
          name: fullName || '-',
          reason: err.message || 'Unknown error',
          data: row
        })
      }
    }

    return NextResponse.json(results)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
