import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { isMedicalUnit } from '@/lib/utils/medical-unit'
import ExcelJS from 'exceljs'
import * as fs from 'fs'

const OMIT_KEYS = ['created_at', 'updated_at', 'created_by', 'updated_by']

import { getTERCategory, getTERRate } from '@/lib/formulas/ter-lookup'

/**
 * PPh 21 Tax Calculator (TER - PP 58/2023)
 * Calculates monthly tax based on TER categories and gross income.
 * ASN with Final tax type: 0% (exempt)
 */
function calculatePPh21(monthlyGross: number, employeeStatus?: string, taxType?: string, taxStatus: string = 'TK/0'): number {
  // ASN with Final tax → exempt
  if (employeeStatus === 'ASN' && taxType === 'Final') return 0
  if (monthlyGross <= 0) return 0

  // Get TER Category based on PTKP status
  const category = getTERCategory(taxStatus)

  // Get TER Rate based on Category and monthly gross income
  const ratePercentage = getTERRate(category, monthlyGross)

  // Calculate Tax
  const taxAmount = (monthlyGross * ratePercentage) / 100

  return Math.round(taxAmount)
}

/**
 * Save PIR history for audit trail.
 * Upserts record per period+unit combination.
 */
async function savePIRHistory(
  supabase: any,
  period: string,
  unitId: string,
  unitName: string,
  netPoolAmount: number,
  proportionPercentage: number,
  allocatedForUnit: number,
  totalSkorKolektif: number,
  pirValue: number,
  employeeCount: number
) {
  try {
    const { error } = await supabase
      .from('t_history_pir')
      .upsert(
        {
          period,
          unit_id: unitId,
          unit_name: unitName,
          net_pool_amount: netPoolAmount,
          proportion_percentage: proportionPercentage,
          allocated_for_unit: allocatedForUnit,
          total_skor_kolektif: totalSkorKolektif,
          pir_value: pirValue,
          employee_count: employeeCount,
        },
        { onConflict: 'period,unit_id' }
      )
    if (error) console.error('Failed to save PIR history:', error.message)
  } catch (err: any) {
    console.error('PIR history save error:', err.message)
  }
}

/**
 * Generate reports based on type and period
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.7, 12.8
 */
export async function POST(request: NextRequest) {
  try {
    const { reportType, period, unitId, employeeId, detailLevel } = await request.json()

    if (!reportType || !period) {
      return NextResponse.json(
        { error: 'Report type and period are required' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    let data: any[] = []

    switch (reportType) {
      case 'incentive':
        data = await generateIncentiveReport(supabase, period, unitId, employeeId)
        break
      case 'kpi-achievement':
        data = await generateKPIAchievementReport(supabase, period, unitId, employeeId, detailLevel)
        break
      case 'unit-comparison':
        data = await generateUnitComparisonReport(supabase, period, unitId)
        break
      case 'employee-slip':
        data = await generateEmployeeSlipReport(supabase, period, unitId, employeeId)
        break
      default:
        return NextResponse.json(
          { error: 'Invalid report type' },
          { status: 400 }
        )
    }

    // Check if data is empty (Requirement 12.7)
    if (data.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: `No data available for the selected period`,
      })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Report generation error:', error)
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * Generate Incentive Report
 * Uses PIR (Poin Indeks Rupiah) formula:
 * PIR = (net_pool × proportion_unit%) / Total_Skor_Kolektif_Unit
 * Bruto = Skor_Individu × PIR
 * Netto = Bruto - PPh21
 */
async function generateIncentiveReport(supabase: any, period: string, unitId?: string, employeeId?: string) {
  // 1. Get Pool
  const { data: poolData, error: poolError } = await supabase
    .from('t_pool')
    .select('net_pool')
    .eq('period', period)
    .maybeSingle()

  if (!poolData) {
    throw new Error(`Data pool tidak ditemukan untuk periode ${period}. Silakan buat data pool terlebih dahulu di menu Pengaturan Pool.`);
  }

  const netPool = Number(poolData.net_pool || 0);

  const { data: allEmployees, error: allEmpError } = await supabase
    .from('m_employees')
    .select(`
      *,
      m_units (
        id,
        name,
        proportion_percentage
      )
    `)
    .eq('is_active', true)

  if (allEmpError) {
    console.error('Error fetching employees:', allEmpError)
    throw new Error('Failed to fetch employee data: ' + JSON.stringify(allEmpError))
  }

  // 3. Get ALL assessments for the period (needed for total score per unit)
  const { data: allAssessments, error: assError } = await supabase
    .from('t_kpi_assessments')
    .select(`
      employee_id,
      score,
      weight_percentage,
      achievement_percentage,
      realization_value,
      target_value,
      m_kpi_indicators!inner (
        name,
        weight_percentage,
        basic_index_value,
        target_value,
        m_kpi_categories!inner (
          category,
          weight_percentage,
          configuration_style
        )
      )
    `)
    .eq('period', period)

  if (assError) {
    console.error('Error fetching assessments:', assError)
    throw new Error('Failed to fetch assessment data')
  }

  if (!allEmployees) return []

  // --- Helper: Calculate total score/activity for an employee ---
  const calcEmployeeTotalScore = (empId: string, isMedicalUnit: boolean) => {
    const empAssessments = allAssessments?.filter((a: any) => a.employee_id === empId) || []
    let totalActivityRupiah = 0
    const assessmentDetails: any[] = []

    const calcCategoryScore = (categoryName: string) => {
      const catAssessments = empAssessments.filter((a: any) => a.m_kpi_indicators?.m_kpi_categories?.category === categoryName)
      if (catAssessments.length === 0) return 0

      // Weights and styles are category-specific. We use the first one found for this category.
      const catMeta = catAssessments[0].m_kpi_indicators.m_kpi_categories
      const categoryWeight = parseFloat(catMeta.weight_percentage) || 0
      const isActivityStyle = catMeta.configuration_style === 'activity'

      let totalRealisasi = 0
      let totalTarget = 0

      for (const a of catAssessments) {
        const indRealization = parseFloat(a.realization_value) || 0
        const basicVal = parseFloat(a.m_kpi_indicators?.basic_index_value) || 0
        const indicatorScore = parseFloat(a.score) || 0
        const indName = a.m_kpi_indicators?.name || '-'
        const indWeight = parseFloat(a.weight_percentage) || 0
        const indTarget = parseFloat(a.target_value) || 100

        // Track detail for slip
        assessmentDetails.push({
          name: indName,
          category: categoryName,
          weight: indWeight,
          target: indTarget,
          realization: indRealization,
          score: indicatorScore,
          basic_value: basicVal,
          is_activity: isActivityStyle || basicVal > 0
        })

        // Hybrid detection: if category is 'activity' OR indicator has a basic_index_value (Tarif)
        if (isActivityStyle || basicVal > 0) {
          // The `score` field in t_kpi_assessments already stores the correct 
          // calculated value (Volume × Tariff) from the assessment form.
          // We use it directly to avoid double-multiplication errors.
          totalActivityRupiah += indicatorScore
        } else if (isMedicalUnit) {
          totalRealisasi += indRealization
        } else {
          const indWeight = parseFloat(a.weight_percentage) || 0
          const indTarget = parseFloat(a.target_value) || 100
          totalRealisasi += indRealization * (indWeight / 100)
          totalTarget += indTarget * (indWeight / 100)
        }
      }

      if (isActivityStyle) {
        return 0 // Activity style categories don't contribute to index scores
      }

      if (isMedicalUnit) {
        return totalRealisasi
      } else if (totalTarget > 0) {
        return (totalRealisasi / totalTarget) * categoryWeight
      }
      return 0
    }

    const p1 = Number(calcCategoryScore('P1').toFixed(2))
    const p2 = Number(calcCategoryScore('P2').toFixed(2))
    const p3 = Number(calcCategoryScore('P3').toFixed(2))

    return {
      p1, p2, p3,
      totalScore: Number((p1 + p2 + p3).toFixed(2)),
      totalActivityRupiah,
      assessmentDetails
    }
  }

  // --- First pass: calculate ALL employee scores and unit totals ---
  const employeeScoresMap = new Map<string, { emp: any; p1: number; p2: number; p3: number; totalScore: number; totalActivityRupiah: number; assessmentDetails: any[] }>()
  const unitTotalScoresMap = new Map<string, number>()
  const unitTotalActivityMap = new Map<string, number>()
  const unitEmployeeCountMap = new Map<string, number>()

  for (const emp of allEmployees) {
    if (!emp.m_units) continue
    const unitData = Array.isArray(emp.m_units) ? emp.m_units[0] : emp.m_units
    const uId = unitData?.id
    const isMedical = isMedicalUnit(uId, unitData?.name)

    const scores = calcEmployeeTotalScore(emp.id, isMedical)

    employeeScoresMap.set(emp.id, { emp, ...scores })

    unitTotalScoresMap.set(uId, (unitTotalScoresMap.get(uId) || 0) + scores.totalScore)
    unitTotalActivityMap.set(uId, (unitTotalActivityMap.get(uId) || 0) + scores.totalActivityRupiah)
    unitEmployeeCountMap.set(uId, (unitEmployeeCountMap.get(uId) || 0) + 1)
  }

  // --- Calculate PIR per unit and save audit trail ---
  const unitPIRMap = new Map<string, number>()

  for (const emp of allEmployees) {
    if (!emp.m_units) continue
    const unitData = Array.isArray(emp.m_units) ? emp.m_units[0] : emp.m_units
    const uId = unitData?.id
    if (!uId || unitPIRMap.has(uId)) continue

    // Determine Style
    const unitName = unitData?.name || '-'
    const isMedical = isMedicalUnit(uId, unitName)
    const unitProp = parseFloat(unitData?.proportion_percentage || '0')
    const totalSkorUnit = unitTotalScoresMap.get(uId) || 0
    const empCount = unitEmployeeCountMap.get(uId) || 0
    const allocatedForUnit = netPool * (unitProp / 100)

    let pir = 0
    const totalActivityValueUnit = unitTotalActivityMap.get(uId) || 0

    if (isMedical) {
      // MEDIS Style PIR Calculation: (Allocated - Aggregate Guarantee Fees - Total Activity Value) / Total Index Points
      const { data: masterDocs } = await supabase
        .from('remunerasi_master_dokter')
        .select('pagu_guarantee_fee')
      // Ideally we filter by employees in this unit

      const totalGuaranteeFee = masterDocs?.reduce((acc: number, d: any) => acc + Number(d.pagu_guarantee_fee), 0) || 0
      const sisaPaguMedis = allocatedForUnit - totalGuaranteeFee - totalActivityValueUnit

      // If sum of deductions exceeds allocated pool, standard handling
      if (sisaPaguMedis <= 0) {
        pir = 0
      } else {
        pir = totalSkorUnit > 0 ? sisaPaguMedis / totalSkorUnit : 0
      }
    } else {
      // STANDARD Style (Non-Medical) with Activity deduction:
      // PIR = (AllocatedForUnit - TotalActivityValueUnit) / TotalSkorUnit
      const remainingPool = allocatedForUnit - totalActivityValueUnit;
      pir = (totalSkorUnit > 0) ? (remainingPool / totalSkorUnit) : 0;
      // Allow slightly negative PIR if activities exceed allocation? Business logic check:
      if (pir < 0) pir = 0;
    }

    unitPIRMap.set(uId, pir)

    // Save audit trail (using original field names)
    // Note: pir_value reflects the merit indices value, 
    // allocated_for_unit is the RAW fund before deduction (to follow history pattern)
    await savePIRHistory(
      supabase, period, uId, unitName,
      netPool, unitProp, allocatedForUnit,
      totalSkorUnit, pir, empCount
    )
  }

  // --- Second pass: Calculate Gross/Net incentive per employee ---
  const report = []

  // Determine which employees to include in the report
  const reportEmployeeIds = new Set<string>()
  for (const emp of allEmployees) {
    const matchUnit = !unitId || unitId === 'all' || emp.unit_id === unitId
    const matchEmp = !employeeId || employeeId === 'all' || emp.id === employeeId
    if (matchUnit && matchEmp) {
      reportEmployeeIds.add(emp.id)
    }
  }

  for (const [empId, data] of employeeScoresMap.entries()) {
    if (!reportEmployeeIds.has(empId)) continue

    const { emp, p1, p2, p3, totalScore, totalActivityRupiah, assessmentDetails } = data

    if (totalScore === 0 && totalActivityRupiah === 0 && assessmentDetails.length === 0) continue

    const unitData = Array.isArray(emp.m_units) ? emp.m_units[0] : emp.m_units
    const uId = unitData?.id
    const unitName = unitData?.name || '-'
    const unitProp = parseFloat(unitData?.proportion_percentage || '0')
    const pir = uId ? (unitPIRMap.get(uId) || 0) : 0
    const totalSkorUnit = uId ? (unitTotalScoresMap.get(uId) || 0) : 0

    const isMedical = isMedicalUnit(uId, unitName)

    // Formula: (Total Skor x PIR) + Total Activity Rupiah
    let grossIncentive = (totalScore * pir) + totalActivityRupiah

    if (isMedical) {
      // For doctors, also add Guarantee Fee
      const { data: doctorMaster } = await supabase
        .from('remunerasi_master_dokter')
        .select('pagu_guarantee_fee')
        .eq('employee_id', empId)
        .eq('periode_id', period)
        .maybeSingle()

      const guaranteeFee = Number(doctorMaster?.pagu_guarantee_fee || 0)
      grossIncentive += guaranteeFee
    }

    // PPh 21
    const taxAmount = calculatePPh21(grossIncentive, emp.employee_status, emp.tax_type, emp.tax_status)

    // Insentif Netto = Bruto - Pajak
    const netIncentive = grossIncentive - taxAmount

    const mappedNik = emp.nik || emp.NIK || '-'
    const mappedBankName = emp.bank_name || emp.BANK_NAME || emp.nama_bank || '-'
    const mappedBankAccount = emp.bank_account_number || emp.BANK_ACCOUNT_NUMBER || emp.nomor_rekening || '-'
    const mappedBankHolder = emp.bank_account_name || emp.BANK_ACCOUNT_NAME || emp.bank_account_holder || emp.full_name || '-'

    // Extract category weights from assessmentDetails
    const getCatWeight = (cat: string) => {
      const detail = assessmentDetails.find((d: any) => d.category === cat)
      if (!detail) return 0
      // Get from the category metadata in allAssessments
      const catAss = allAssessments?.find((a: any) => a.employee_id === empId && a.m_kpi_indicators?.m_kpi_categories?.category === cat)
      return parseFloat(catAss?.m_kpi_indicators?.m_kpi_categories?.weight_percentage) || 0
    }

    report.push({
      employee_code: emp.employee_code || '-',
      nik: mappedNik,
      employee_name: emp.full_name,
      unit: unitName,
      bank_name: mappedBankName,
      bank_account_number: mappedBankAccount,
      bank_account_holder: mappedBankHolder,
      tax_status: emp.tax_status || 'Non-PKP',
      employee_status: emp.employee_status || '-',
      tax_type: emp.tax_type || '-',
      p1_score: p1,
      p2_score: p2,
      p3_score: p3,
      p1_weight: getCatWeight('P1'),
      p2_weight: getCatWeight('P2'),
      p3_weight: getCatWeight('P3'),
      total_score: totalScore,
      pir_value: pir,
      total_activity: totalActivityRupiah,
      total_activity_rupiah: totalActivityRupiah,
      total_skor_unit: totalSkorUnit,
      unit_proportion: unitProp,
      unit_allocation: uId ? (netPool * (unitProp / 100)) : 0,
      unit_total_activity: uId ? (unitTotalActivityMap.get(uId) || 0) : 0,
      gross_incentive: grossIncentive,
      tax_amount: taxAmount,
      net_incentive: netIncentive,
      assessment_details: assessmentDetails,
    })
  }

  return report
}

/**
 * Generate KPI Achievement Report
 * Averages out achievement per indicator across all employees in the period.
 */
async function generateKPIAchievementReport(supabase: any, period: string, unitId?: string, employeeId?: string, detailLevel?: string) {
  // Fetch Assessment Data
  let query = supabase
    .from('t_kpi_assessments')
    .select(`
      realization_value,
      target_value,
      achievement_percentage,
      employee_id,
      m_employees!t_kpi_assessments_employee_id_fkey (
        id,
        full_name,
        nik,
        m_units (
          name
        )
      ),
      m_kpi_indicators!inner (
        id,
        name,
        target_value,
        weight_percentage,
        m_kpi_categories (
          category
        )
      )
    `)
    .eq('period', period)

  if (unitId || employeeId) {
    const { data: emps } = await supabase
      .from('m_employees')
      .select('id')
      .match({
        ...(unitId && unitId !== 'all' && { unit_id: unitId }),
        ...(employeeId && employeeId !== 'all' && { id: employeeId })
      })

    const empIds = emps?.map((e: any) => e.id) || []
    if (empIds.length > 0) {
      query = query.in('employee_id', empIds)
    } else {
      // no matching employees, return empty array
      return []
    }
  }

  const { data: assessments, error: assError } = await query

  if (assError) throw assError

  // Merge Data
  const mergedData = new Map()

  assessments?.forEach((row: any) => {
    const indicatorId = row.m_kpi_indicators.id
    const empId = row.employee_id

    // Group by employee if detailed or employee elected
    const key = (detailLevel === 'detail' || (employeeId && employeeId !== 'all'))
      ? `${indicatorId}_${empId}`
      : indicatorId;

    const existing = mergedData.get(key)
    const empRecord = Array.isArray(row.m_employees) ? row.m_employees[0] : row.m_employees
    const empName = empRecord?.full_name || '-'
    const unitData = Array.isArray(empRecord?.m_units) ? empRecord?.m_units[0] : empRecord?.m_units
    const unitName = unitData?.name || '-'

    if (existing) {
      existing.count++
      existing.sum_realization += Number(row.realization_value || 0)
      existing.sum_target_value += Number(row.target_value || row.m_kpi_indicators.target_value || 0)
    } else {
      mergedData.set(key, {
        category: row.m_kpi_indicators.m_kpi_categories?.category || '-',
        indicator_name: row.m_kpi_indicators.name,
        weight: row.m_kpi_indicators.weight_percentage,
        employee_name: empName,
        unit_name: unitName,
        count: 1,
        sum_realization: Number(row.realization_value || 0),
        sum_target_value: Number(row.target_value || row.m_kpi_indicators.target_value || 0),
      })
    }
  })

  // Format array for report
  const reportArray = Array.from(mergedData.values()).map(item => {
    const realization = Number((item.sum_realization / item.count).toFixed(2));
    const target = Number((item.sum_target_value / item.count).toFixed(2));
    const achievement_percentage = target > 0 ? (realization / target) * 100 : 0;

    let score = (achievement_percentage / 100) * item.weight;

    const gap = realization - target;

    return {
      category: item.category,
      indicator_name: item.indicator_name,
      target_value: target.toFixed(2),
      weight: item.weight,
      employee_name: item.employee_name,
      unit_name: item.unit_name,
      realization_value: realization.toFixed(2),
      gap: gap.toFixed(2),
      achievement_percentage: achievement_percentage.toFixed(2),
      score: score.toFixed(2)
    };
  })

  // Sort by Category (P1, P2, P3) then by Indicator
  reportArray.sort((a, b) => {
    if (a.category === b.category) {
      return a.indicator_name.localeCompare(b.indicator_name);
    }
    return (a.category || '').localeCompare(b.category || '');
  });

  return reportArray
}

/**
 * Generate Unit Comparison Report
 * Uses the dynamically calculated incentive report data to aggregate by unit.
 */
async function generateUnitComparisonReport(supabase: any, period: string, unitId?: string) {
  // Reuse the dynamic incentive generation logic
  const topLevelData = await generateIncentiveReport(supabase, period, unitId)

  // Aggregate by unit
  const unitMap = new Map()

  topLevelData.forEach(row => {
    const uName = row.unit
    if (!unitMap.has(uName)) {
      unitMap.set(uName, {
        unit_name: uName,
        total_score_sum: 0,
        total_incentive_sum: 0,
        employee_count: 0
      })
    }

    const u = unitMap.get(uName)
    u.total_score_sum += Number(row.total_score || 0)
    u.total_incentive_sum += Number(row.net_incentive || 0)
    u.employee_count++
  })

  // Format Array
  return Array.from(unitMap.values()).map(u => ({
    unit_name: u.unit_name,
    average_score: u.employee_count > 0 ? (u.total_score_sum / u.employee_count).toFixed(2) : '0.00',
    total_incentive: u.total_incentive_sum.toFixed(2),
    employee_count: u.employee_count
  }))
}

/**
 * Generate Employee Slip Report
 * Uses enriched data from generateIncentiveReport including assessment_details and category weights.
 */
async function generateEmployeeSlipReport(supabase: any, period: string, unitId?: string, employeeId?: string) {
  // Reuse the dynamic total calculations (now includes assessment_details & weights)
  const topLevelData = await generateIncentiveReport(supabase, period, unitId, employeeId)

  const results = []

  for (const row of topLevelData) {
    const details: any[] = row.assessment_details || []

    // Use actual category weights from the data
    const p1Weight = row.p1_weight || 0
    const p2Weight = row.p2_weight || 0
    const p3Weight = row.p3_weight || 0

    // Build breakdown from assessment_details
    const buildBreakdown = (category: string) => {
      return details
        .filter((d: any) => d.category === category)
        .map((d: any) => {
          if (d.is_activity) {
            const actRupiah = d.basic_value > 0 ? (d.realization * d.basic_value) : d.score
            return {
              indicator: d.name,
              target: '-',
              weight: d.weight + '%',
              achievement: d.realization.toString(),
              score: actRupiah.toFixed(2),
              is_activity: true,
              tarif: d.basic_value,
            }
          }
          return {
            indicator: d.name,
            target: d.target.toFixed(2),
            weight: d.weight + '%',
            achievement: (d.target > 0 ? ((d.realization / d.target) * 100) : 0).toFixed(2) + '%',
            score: d.score.toFixed(2),
            is_activity: false,
          }
        })
    }

    results.push({
      employee_code: row.employee_code,
      nik: row.nik,
      employee_name: row.employee_name,
      unit: row.unit || '-',
      bank_name: row.bank_name,
      bank_account_number: row.bank_account_number,
      bank_account_holder: row.bank_account_holder,
      tax_status: row.tax_status || 'Non-PKP',
      employee_status: row.employee_status || '-',
      tax_type: row.tax_type || '-',
      p1_score: row.p1_score,
      p1_weighted: row.p1_score,
      p1_weight: p1Weight,
      p1_breakdown: buildBreakdown('P1'),
      p2_score: row.p2_score,
      p2_weighted: row.p2_score,
      p2_weight: p2Weight,
      p2_breakdown: buildBreakdown('P2'),
      p3_score: row.p3_score,
      p3_weighted: row.p3_score,
      p3_weight: p3Weight,
      p3_breakdown: buildBreakdown('P3'),
      total_score: row.total_score,
      pir_value: row.pir_value,
      total_activity: row.total_activity,
      total_activity_rupiah: row.total_activity_rupiah,
      total_skor_unit: row.total_skor_unit,
      unit_proportion: row.unit_proportion,
      unit_allocation: row.unit_allocation,
      unit_total_activity: row.unit_total_activity,
      gross_incentive: row.gross_incentive,
      tax_amount: row.tax_amount,
      net_incentive: row.net_incentive,
    })
  }

  return results
}
