import { createAdminClient } from '@/lib/supabase/server'
import { Role } from './rbac.service'
import { SupabaseClient } from '@supabase/supabase-js'

export interface DashboardStats {
  totalEmployees: number
  totalUnits: number
  avgScore: number
  completionRate: number
  trends: {
    employees: number
    score: number
    completion: number
  }
}

export interface TopPerformer {
  id: string
  name: string
  unit: string
  score: number
  rank: number
  avatar?: string
}

export interface UnitPerformance {
  id: string
  name: string
  avgScore: number
  completionRate: number
  employeeCount: number
}

export interface PerformanceTrend {
  period: string
  score: number
}

export interface KPIDistribution {
  name: string
  value: number
  color: string
}

export class DashboardService {
  /**
   * Helper to get resolved periods (current and previous)
   */
  private static async getResolvedPeriods(supabase: SupabaseClient, period?: string, year?: string): Promise<string[]> {
    if (period) {
      return [period];
    }
    const current = new Date();
    const currentPeriod = `${year || current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
    return [currentPeriod];
  }

  /**
   * Shared helper to calculate performance score using the standard formula
   * Standard Formula: Sum of ((Sum of Ind_Realisasi * Ind_Weight/100) / (Sum of Ind_Target * Ind_Weight/100)) * Cat_Weight
   */
  private static calculateScoreFromGroupedData(cats: { [key: string]: any[] }): number {
    let totalScore = 0;
    const catNames = ['P1', 'P2', 'P3'];

    for (const catName of catNames) {
      const catAssessments = cats[catName];
      if (!catAssessments || catAssessments.length === 0) continue;

      const firstAss = catAssessments[0];
      const indicator = (Array.isArray(firstAss.m_kpi_indicators) ? firstAss.m_kpi_indicators[0] : firstAss.m_kpi_indicators) as any;
      const categoryObj = indicator?.m_kpi_categories as any;
      const categoryWeight = parseFloat(Array.isArray(categoryObj) ? categoryObj[0]?.weight_percentage : categoryObj?.weight_percentage) || 0;

      let totalRealisasi = 0;
      let totalTarget = 0;

      for (const a of catAssessments) {
        const indWeight = parseFloat(a.weight_percentage) || 0;
        totalRealisasi += (parseFloat(a.realization_value) || 0) * (indWeight / 100);
        totalTarget += (parseFloat(a.target_value) || 100) * (indWeight / 100);
      }

      if (totalTarget > 0) {
        totalScore += (totalRealisasi / totalTarget) * categoryWeight;
      }
    }
    return totalScore;
  }

  /**
   * Shared helper to group assessments by employee ID
   */
  private static groupAssessmentsByEmployee(assessments: any[]): Map<string, { [key: string]: any[] }> {
    const empDataMap = new Map<string, { [key: string]: any[] }>();
    for (const a of assessments) {
      const empId = a.employee_id;
      if (!empDataMap.has(empId)) {
        empDataMap.set(empId, { P1: [], P2: [], P3: [] });
      }

      const indicator = (Array.isArray(a.m_kpi_indicators) ? a.m_kpi_indicators[0] : a.m_kpi_indicators) as any;
      const categoryObj = indicator?.m_kpi_categories;
      const catName = (Array.isArray(categoryObj) ? categoryObj[0]?.category : categoryObj?.category) as string;

      const group = empDataMap.get(empId)!;
      if (catName && group[catName]) {
        group[catName].push(a);
      }
    }
    return empDataMap;
  }

  /**
   * Get dashboard statistics for superadmin - using direct queries
   */
  static async getSuperadminStats(unitId?: string, period?: string, year?: string): Promise<DashboardStats> {
    const supabase = await createAdminClient()

    try {
      const resolvedPeriods = await this.getResolvedPeriods(supabase, period, year)

      // Use inner join to filter active non-admin employees directly in the database
      let assQuery = supabase
        .from('t_kpi_assessments')
        .select(`
          employee_id,
          weight_percentage,
          realization_value,
          target_value,
          employee:m_employees!t_kpi_assessments_employee_id_fkey!inner(id, is_active, role, unit_id),
          m_kpi_indicators (
            m_kpi_categories (
              category,
              weight_percentage
            )
          )
        `)
        .in('period', resolvedPeriods)
        .eq('employee.is_active', true)
        .neq('employee.role', 'superadmin')

      if (unitId && unitId !== 'all') {
        assQuery = assQuery.eq('employee.unit_id', unitId)
      }

      // Get count of employees being displayed and total units
      const [empDisplayRes, totalUnitsRes] = await Promise.all([
        (async () => {
          let q = supabase
            .from('m_employees')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true)
            .neq('role', 'superadmin');
          if (unitId && unitId !== 'all') q = q.eq('unit_id', unitId);
          return q;
        })(),
        supabase
          .from('m_units')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true)
          .neq('code', 'superadmin')
      ]);

      const totalDisplayEmployees = empDisplayRes.count || 0;
      const totalUnits = totalUnitsRes.count || 0;

      const { data: assessments, error: assError } = await assQuery
      if (assError) throw assError

      const empDataMap = this.groupAssessmentsByEmployee(assessments || []);
      const assessedEmployeeIds = Array.from(empDataMap.keys());
      const totalAssessed = assessedEmployeeIds.length;

      // Calculate average score across assessed employees
      const assessedScores = assessedEmployeeIds.map(empId => this.calculateScoreFromGroupedData(empDataMap.get(empId)!));
      const avgScore = totalAssessed > 0
        ? assessedScores.reduce((sum, score) => sum + score, 0) / totalAssessed
        : 0;

      const completionRate = totalDisplayEmployees > 0
        ? (totalAssessed / totalDisplayEmployees) * 100
        : 0;

      return {
        totalEmployees: totalDisplayEmployees,
        totalUnits: totalUnits,
        avgScore: Math.round(avgScore * 100) / 100,
        completionRate: Math.round(completionRate * 10) / 10,
        trends: { employees: 0, score: 0, completion: 0 }
      }
    } catch (error: any) {
      console.error('Error in getSuperadminStats:', error?.message || error)
      return this.getFallbackStats()
    }
  }

  private static getFallbackStats(): DashboardStats {
    return {
      totalEmployees: 0,
      totalUnits: 0,
      avgScore: 0,
      completionRate: 0,
      trends: { employees: 0, score: 0, completion: 0 }
    }
  }

  static async getTopPerformers(limit: number = 5, unitId?: string, period?: string, year?: string): Promise<TopPerformer[]> {
    const supabase = await createAdminClient()

    try {
      const resolvedPeriods = await this.getResolvedPeriods(supabase, period, year)

      let query = supabase
        .from('t_kpi_assessments')
        .select(`
          employee_id,
          weight_percentage,
          realization_value,
          target_value,
          employee:m_employees!t_kpi_assessments_employee_id_fkey!inner (
            id, full_name, is_active, role,
            unit_id,
            m_units!m_employees_unit_id_fkey ( name )
          ),
          m_kpi_indicators!inner (
            m_kpi_categories!inner (
              category,
              weight_percentage
            )
          )
        `)
        .eq('employee.is_active', true)
        .neq('employee.role', 'superadmin')
        .in('period', resolvedPeriods)

      if (unitId && unitId !== 'all') {
        query = query.eq('employee.unit_id', unitId)
      }

      const { data: assessments, error } = await query
      if (error) throw error

      const empDataMap = new Map<string, { info: any, cats: { [key: string]: any[] } }>()
      for (const a of (assessments || [])) {
        const employeeData = Array.isArray(a.employee) ? a.employee[0] : a.employee
        const emp = employeeData as any
        if (!emp || !emp.is_active) continue

        const empId = emp.id
        if (!empDataMap.has(empId)) {
          empDataMap.set(empId, {
            info: {
              name: emp.full_name || 'Unknown',
              unit: emp.m_units?.name || 'Unknown'
            },
            cats: { P1: [], P2: [], P3: [] }
          })
        }

        const indicator = (Array.isArray(a.m_kpi_indicators) ? a.m_kpi_indicators[0] : a.m_kpi_indicators) as any;
        const categoryObj = indicator?.m_kpi_categories;
        const catName = (Array.isArray(categoryObj) ? categoryObj[0]?.category : categoryObj?.category) as string;

        if (catName && empDataMap.get(empId)!.cats[catName]) {
          empDataMap.get(empId)!.cats[catName].push(a)
        }
      }

      const performers: TopPerformer[] = Array.from(empDataMap.entries()).map(([id, data]) => ({
        id,
        name: data.info.name,
        unit: data.info.unit,
        score: this.calculateScoreFromGroupedData(data.cats),
        rank: 0
      }))

      return performers
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .map((p, i) => ({ ...p, rank: i + 1 }))
    } catch (error: any) {
      console.error('Error in getTopPerformers:', error?.message || error)
      return []
    }
  }

  static async getWorstPerformers(limit: number = 5, unitId?: string, period?: string, year?: string): Promise<TopPerformer[]> {
    const supabase = await createAdminClient()

    try {
      const resolvedPeriods = await this.getResolvedPeriods(supabase, period, year)

      let query = supabase
        .from('t_kpi_assessments')
        .select(`
          employee_id,
          weight_percentage,
          realization_value,
          target_value,
          employee:m_employees!t_kpi_assessments_employee_id_fkey!inner (
            id, full_name, is_active, role,
            unit_id,
            m_units!m_employees_unit_id_fkey ( name )
          ),
          m_kpi_indicators!inner (
            m_kpi_categories!inner (
              category,
              weight_percentage
            )
          )
        `)
        .eq('employee.is_active', true)
        .neq('employee.role', 'superadmin')
        .in('period', resolvedPeriods)

      if (unitId && unitId !== 'all') {
        query = query.eq('employee.unit_id', unitId)
      }

      const { data: assessments, error } = await query
      if (error) throw error

      const empDataMap = new Map<string, { info: any, cats: { [key: string]: any[] } }>()
      for (const a of (assessments || [])) {
        const employeeData = Array.isArray(a.employee) ? a.employee[0] : a.employee
        const emp = employeeData as any
        if (!emp || !emp.is_active) continue

        const empId = emp.id
        if (!empDataMap.has(empId)) {
          empDataMap.set(empId, {
            info: {
              name: emp.full_name || 'Unknown',
              unit: emp.m_units?.name || 'Unknown'
            },
            cats: { P1: [], P2: [], P3: [] }
          })
        }

        const indicator = (Array.isArray(a.m_kpi_indicators) ? a.m_kpi_indicators[0] : a.m_kpi_indicators) as any;
        const categoryObj = indicator?.m_kpi_categories;
        const catName = (Array.isArray(categoryObj) ? categoryObj[0]?.category : categoryObj?.category) as string;

        if (catName && empDataMap.get(empId)!.cats[catName]) {
          empDataMap.get(empId)!.cats[catName].push(a)
        }
      }

      const performers: TopPerformer[] = Array.from(empDataMap.entries()).map(([id, data]) => ({
        id,
        name: data.info.name,
        unit: data.info.unit,
        score: this.calculateScoreFromGroupedData(data.cats),
        rank: 0
      }))

      return performers
        .sort((a, b) => a.score - b.score)
        .slice(0, limit)
        .map((p, i) => ({ ...p, rank: i + 1 }))
    } catch (error: any) {
      console.error('Error in getWorstPerformers:', error?.message || error)
      return []
    }
  }

  static async getUnitPerformance(period?: string, year?: string): Promise<UnitPerformance[]> {
    const supabase = await createAdminClient()

    try {
      const resolvedPeriods = await this.getResolvedPeriods(supabase, period, year)

      const { data: assessments, error } = await supabase
        .from('t_kpi_assessments')
        .select(`
          employee_id,
          realization_value,
          target_value,
          weight_percentage,
          employee:m_employees!t_kpi_assessments_employee_id_fkey!inner(
            id, is_active, role, unit_id,
            m_units!m_employees_unit_id_fkey(id, name)
          ),
          m_kpi_indicators (
            m_kpi_categories (
              category,
              weight_percentage
            )
          )
        `)
        .in('period', resolvedPeriods)
        .eq('employee.is_active', true)
        .neq('employee.role', 'superadmin')

      if (error) throw error

      // Group by Unit
      const unitDataMap = new Map<string, { name: string, employeeScores: Map<string, { [key: string]: any[] }>, totalDisplayEmps: number }>()

      // 1. Get total display employees per unit
      const { data: unitEmpsCount } = await supabase
        .from('m_employees')
        .select('unit_id, m_units(name)')
        .eq('is_active', true)
        .neq('role', 'superadmin')

      for (const e of (unitEmpsCount || []) as any[]) {
        if (!e.unit_id) continue
        if (!unitDataMap.has(e.unit_id)) {
          unitDataMap.set(e.unit_id, {
            name: (e.m_units as any)?.name || 'Unknown',
            employeeScores: new Map(),
            totalDisplayEmps: 0
          })
        }
        unitDataMap.get(e.unit_id)!.totalDisplayEmps++
      }

      // 2. Map assessments to units and employees
      for (const a of (assessments || []) as any[]) {
        const unitId = (Array.isArray(a.employee) ? a.employee[0]?.unit_id : a.employee?.unit_id)
        if (!unitId || !unitDataMap.has(unitId)) continue

        const empId = a.employee_id
        const unitGroup = unitDataMap.get(unitId)!
        if (!unitGroup.employeeScores.has(empId)) {
          unitGroup.employeeScores.set(empId, { P1: [], P2: [], P3: [] })
        }

        const indicator = (Array.isArray(a.m_kpi_indicators) ? a.m_kpi_indicators[0] : a.m_kpi_indicators) as any;
        const categoryObj = indicator?.m_kpi_categories;
        const catName = (Array.isArray(categoryObj) ? categoryObj[0]?.category : categoryObj?.category) as string;

        if (catName && unitGroup.employeeScores.get(empId)![catName]) {
          unitGroup.employeeScores.get(empId)![catName].push(a)
        }
      }

      return Array.from(unitDataMap.entries()).map(([id, data]) => {
        const assessedScores = Array.from(data.employeeScores.values()).map(cats => this.calculateScoreFromGroupedData(cats));
        const avgScore = assessedScores.length > 0
          ? assessedScores.reduce((s, score) => s + score, 0) / assessedScores.length
          : 0;

        const completionRate = data.totalDisplayEmps > 0
          ? (data.employeeScores.size / data.totalDisplayEmps) * 100
          : 0;

        return {
          id,
          name: data.name,
          avgScore: Math.round(avgScore * 100) / 100,
          completionRate: Math.round(completionRate * 10) / 10,
          employeeCount: data.totalDisplayEmps
        }
      }).sort((a, b) => b.avgScore - a.avgScore)

    } catch (error: any) {
      console.error('Error in getUnitPerformance:', error?.message || error)
      return []
    }
  }

  static async getPerformanceTrend(months: number = 6, unitId?: string, period?: string, year?: string): Promise<PerformanceTrend[]> {
    const supabase = await createAdminClient()

    try {
      const periods: string[] = []
      const current = new Date()
      for (let i = 0; i < months; i++) {
        const d = new Date(current.getFullYear(), current.getMonth() - i, 1)
        periods.unshift(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
      }

      let q = supabase
        .from('t_kpi_assessments')
        .select(`
          period,
          employee_id,
          realization_value,
          target_value,
          weight_percentage,
          employee:m_employees!t_kpi_assessments_employee_id_fkey!inner(id, is_active, role, unit_id),
          m_kpi_indicators (
            m_kpi_categories (
              category,
              weight_percentage
            )
          )
        `)
        .in('period', periods)
        .eq('employee.is_active', true)
        .neq('employee.role', 'superadmin')

      if (unitId && unitId !== 'all') {
        q = q.eq('employee.unit_id', unitId)
      }

      const { data: assessments, error } = await q
      if (error) throw error

      // Group by period then employee
      return periods.map(p => {
        const pAss = (assessments || []).filter(a => a.period === p)
        const empMap = this.groupAssessmentsByEmployee(pAss)

        const scores = Array.from(empMap.values()).map(cats => this.calculateScoreFromGroupedData(cats))
        const avg = scores.length > 0 ? scores.reduce((s, score) => s + score, 0) / scores.length : 0

        return {
          period: p,
          score: Math.round(avg * 100) / 100
        }
      })
    } catch (error: any) {
      console.error('Error in getPerformanceTrend:', error?.message || error)
      return []
    }
  }

  static async getKPIDistribution(unitId?: string, period?: string, year?: string): Promise<KPIDistribution[]> {
    const supabase = await createAdminClient()

    try {
      const resolvedPeriods = await this.getResolvedPeriods(supabase, period, year)

      let query = supabase
        .from('t_kpi_assessments')
        .select(`
          employee_id,
          realization_value,
          target_value,
          weight_percentage,
          employee:m_employees!t_kpi_assessments_employee_id_fkey!inner(id, is_active, role, unit_id),
          m_kpi_indicators (
            m_kpi_categories (
              category,
              weight_percentage
            )
          )
        `)
        .in('period', resolvedPeriods)
        .eq('employee.is_active', true)
        .neq('employee.role', 'superadmin')

      if (unitId && unitId !== 'all') {
        query = query.eq('employee.unit_id', unitId)
      }

      const { data: assessments, error } = await query
      if (error) throw error

      const empMap = this.groupAssessmentsByEmployee(assessments || [])
      let p1Sum = 0, p2Sum = 0, p3Sum = 0
      let empCount = 0

      for (const cats of empMap.values()) {
        const calcCat = (catName: string) => {
          const catAss = cats[catName]
          if (!catAss || catAss.length === 0) return 0

          const first = catAss[0]
          const indicator = (Array.isArray(first.m_kpi_indicators) ? first.m_kpi_indicators[0] : first.m_kpi_indicators) as any;
          const categoryObj = indicator?.m_kpi_categories as any;
          const catWeight = parseFloat(Array.isArray(categoryObj) ? categoryObj[0]?.weight_percentage : categoryObj?.weight_percentage) || 0;

          let totalR = 0, totalT = 0
          for (const a of catAss) {
            const w = parseFloat(a.weight_percentage) || 0
            totalR += (parseFloat(a.realization_value) || 0) * (w / 100)
            totalT += (parseFloat(a.target_value) || 100) * (w / 100)
          }
          return totalT > 0 ? (totalR / totalT) * catWeight : 0
        }

        p1Sum += calcCat('P1')
        p2Sum += calcCat('P2')
        p3Sum += calcCat('P3')
        empCount++
      }

      return [
        { name: 'P1 (Posisi)', value: empCount > 0 ? Math.round(p1Sum / empCount) : 0, color: '#3b82f6' },
        { name: 'P2 (Kinerja)', value: empCount > 0 ? Math.round(p2Sum / empCount) : 0, color: '#10b981' },
        { name: 'P3 (Potensi)', value: empCount > 0 ? Math.round(p3Sum / empCount) : 0, color: '#f59e0b' }
      ]
    } catch (error: any) {
      console.error('Error in getKPIDistribution:', error?.message || error)
      return [
        { name: 'P1 (Posisi)', value: 0, color: '#3b82f6' },
        { name: 'P2 (Kinerja)', value: 0, color: '#10b981' },
        { name: 'P3 (Potensi)', value: 0, color: '#f59e0b' }
      ]
    }
  }

  static async getRecentActivities() {
    const supabase = await createAdminClient()
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(10)

      if (error) throw error
      return (data || []).map(audit => {
        const action = audit.action.toLowerCase()
        let type: 'create' | 'update' | 'delete' = 'update'
        if (action.includes('create') || action.includes('insert')) type = 'create'
        if (action.includes('delete') || action.includes('remove')) type = 'delete'

        const actionParts = audit.action.split(' ')
        const actionText = actionParts.length > 1 ? actionParts.slice(0, 2).join(' ') : audit.action

        return {
          id: audit.id,
          type,
          title: actionText,
          description: audit.details || 'No details',
          timestamp: new Date(audit.timestamp).toLocaleString('id-ID')
        }
      })
    } catch (error) {
      console.error('Exception in getRecentActivities:', error)
      return []
    }
  }
}
