export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      t_user: {
        Row: {
          id: string
          email: string
          role: 'superadmin' | 'unit_manager' | 'employee'
          employee_id: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          role: 'superadmin' | 'unit_manager' | 'employee'
          employee_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'superadmin' | 'unit_manager' | 'employee'
          employee_id?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      m_pegawai: {
        Row: {
          id: string
          employee_code: string
          full_name: string
          unit_id: string
          position: string | null
          tax_status: string
          phone: string | null
          address: string | null
          nik: string | null
          bank_name: string | null
          bank_account_number: string | null
          bank_account_holder: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_code: string
          full_name: string
          unit_id: string
          position?: string | null
          tax_status?: string
          phone?: string | null
          address?: string | null
          nik?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_account_holder?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_code?: string
          full_name?: string
          unit_id?: string
          position?: string | null
          tax_status?: string
          phone?: string | null
          address?: string | null
          nik?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_account_holder?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      m_units: {
        Row: {
          id: string
          code: string
          name: string
          proportion_percentage: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          proportion_percentage?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          proportion_percentage?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      m_employees: {
        Row: {
          id: string
          user_id: string | null // References auth.users.id
          employee_code: string
          full_name: string
          unit_id: string
          position: string | null
          phone: string | null
          nik: string | null
          bank_name: string | null
          bank_account_number: string | null
          bank_account_name: string | null
          // Deprecated fields (will be removed after migration):
          role?: 'superadmin' | 'unit_manager' | 'employee'
          email?: string
          tax_status: string
          employment_status: "PNS" | "PPPK" | "BLUD" | null
          employee_status: string | null
          tax_type: string | null
          pns_grade: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          employee_code: string
          full_name: string
          unit_id: string
          position?: string | null
          phone?: string | null
          nik?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_account_name?: string | null
          // Deprecated fields (will be removed after migration):
          role?: 'superadmin' | 'unit_manager' | 'employee'
          email?: string
          tax_status?: string
          employee_status?: 'ASN' | 'BLUD'
          tax_type?: 'Final' | 'TER'
          pns_grade?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          employee_code?: string
          full_name?: string
          unit_id?: string
          position?: string | null
          phone?: string | null
          nik?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_account_name?: string | null
          // Deprecated fields (will be removed after migration):
          role?: 'superadmin' | 'unit_manager' | 'employee'
          email?: string
          tax_status?: string
          employee_status?: 'ASN' | 'BLUD'
          tax_type?: 'Final' | 'TER'
          pns_grade?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      m_kpi_categories: {
        Row: {
          id: string
          unit_id: string
          category: 'P1' | 'P2' | 'P3'
          category_name: string
          weight_percentage: number
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          unit_id: string
          category: 'P1' | 'P2' | 'P3'
          category_name: string
          weight_percentage: number
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          unit_id?: string
          category?: 'P1' | 'P2' | 'P3'
          category_name?: string
          weight_percentage?: number
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      m_kpi_indicators: {
        Row: {
          id: string
          category_id: string
          code: string
          name: string
          target_value: number
          weight_percentage: number
          measurement_unit: string | null
          description: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          code: string
          name: string
          target_value?: number
          weight_percentage: number
          measurement_unit?: string | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          code?: string
          name?: string
          target_value?: number
          weight_percentage?: number
          measurement_unit?: string | null
          description?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      t_pool: {
        Row: {
          id: string
          period: string
          revenue_total: number
          deduction_total: number
          net_pool: number
          global_allocation_percentage: number
          allocated_amount: number
          status: 'draft' | 'approved' | 'distributed'
          approved_by: string | null
          approved_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          period: string
          revenue_total?: number
          deduction_total?: number
          global_allocation_percentage?: number
          status?: 'draft' | 'approved' | 'distributed'
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          period?: string
          revenue_total?: number
          deduction_total?: number
          global_allocation_percentage?: number
          status?: 'draft' | 'approved' | 'distributed'
          approved_by?: string | null
          approved_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      t_realization: {
        Row: {
          id: string
          employee_id: string
          indicator_id: string
          period: string
          realization_value: number
          achievement_percentage: number | null
          score: number | null
          notes: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          indicator_id: string
          period: string
          realization_value?: number
          achievement_percentage?: number | null
          score?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          indicator_id?: string
          period?: string
          realization_value?: number
          achievement_percentage?: number | null
          score?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      t_individual_scores: {
        Row: {
          id: string
          employee_id: string
          period: string
          p1_score: number
          p2_score: number
          p3_score: number
          p1_weighted: number
          p2_weighted: number
          p3_weighted: number
          individual_total_score: number
          individual_weight_percentage: number
          weighted_individual_score: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          period: string
          p1_score?: number
          p2_score?: number
          p3_score?: number
          p1_weighted?: number
          p2_weighted?: number
          p3_weighted?: number
          individual_total_score?: number
          individual_weight_percentage?: number
          weighted_individual_score?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          period?: string
          p1_score?: number
          p2_score?: number
          p3_score?: number
          p1_weighted?: number
          p2_weighted?: number
          p3_weighted?: number
          individual_total_score?: number
          individual_weight_percentage?: number
          weighted_individual_score?: number
          created_at?: string
          updated_at?: string
        }
      }
      t_calculation_results: {
        Row: {
          id: string
          employee_id: string
          period: string
          pool_id: string
          unit_score: number
          individual_score: number
          final_score: number
          unit_allocated_amount: number
          score_proportion: number
          gross_incentive: number
          tax_amount: number
          net_incentive: number
          calculation_metadata: Json | null
          calculated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          employee_id: string
          period: string
          pool_id: string
          unit_score?: number
          individual_score?: number
          final_score?: number
          unit_allocated_amount?: number
          score_proportion?: number
          gross_incentive?: number
          tax_amount?: number
          net_incentive?: number
          calculation_metadata?: Json | null
          calculated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          employee_id?: string
          period?: string
          pool_id?: string
          unit_score?: number
          individual_score?: number
          final_score?: number
          unit_allocated_amount?: number
          score_proportion?: number
          gross_incentive?: number
          tax_amount?: number
          net_incentive?: number
          calculation_metadata?: Json | null
          calculated_at?: string
          created_at?: string
        }
      }
      t_history_pir: {
        Row: {
          id: string
          period: string
          unit_id: string
          unit_name: string | null
          net_pool_amount: number
          proportion_percentage: number
          allocated_for_unit: number
          total_skor_kolektif: number
          pir_value: number
          employee_count: number
          created_at: string
        }
        Insert: {
          id?: string
          period: string
          unit_id: string
          unit_name?: string | null
          net_pool_amount?: number
          proportion_percentage?: number
          allocated_for_unit?: number
          total_skor_kolektif?: number
          pir_value?: number
          employee_count?: number
          created_at?: string
        }
        Update: {
          id?: string
          period?: string
          unit_id?: string
          unit_name?: string | null
          net_pool_amount?: number
          proportion_percentage?: number
          allocated_for_unit?: number
          total_skor_kolektif?: number
          pir_value?: number
          employee_count?: number
          created_at?: string
        }
      }
    }
  }
}

// ============================================
// User-Employee Separation Types
// ============================================

/**
 * User metadata stored in auth.users.raw_user_meta_data
 */
export interface UserMetadata {
  role: 'superadmin' | 'unit_manager' | 'employee'
  full_name: string
  employee_id: string
  unit_id: string
}

/**
 * Combined user and employee data
 * Used when querying user information with employee details
 */
export interface UserWithEmployee {
  // From auth.users
  id: string
  email: string
  role: 'superadmin' | 'unit_manager' | 'employee'

  // From m_employees
  employeeId: string
  employeeCode: string
  fullName: string
  unitId: string
  taxStatus: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/**
 * Input for creating a new user with employee data
 */
export interface CreateUserInput {
  email: string
  password: string
  role: 'superadmin' | 'unit_manager' | 'employee'
  employeeCode: string
  fullName: string
  unitId: string
  taxStatus?: string
}

/**
 * Input for updating user/employee data
 */
export interface UpdateUserInput {
  // Auth fields
  email?: string
  password?: string
  role?: 'superadmin' | 'unit_manager' | 'employee'

  // Employee fields
  employeeCode?: string
  fullName?: string
  unitId?: string
  taxStatus?: string
  isActive?: boolean
}

// ============================================
// New User Management Types (t_user)
// ============================================

export interface User {
  id: string
  email: string
  role: 'superadmin' | 'unit_manager' | 'employee'
  employee_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined data
  pegawai?: Pegawai
}

export interface CreateUserData {
  email: string
  password: string
  role: 'superadmin' | 'unit_manager' | 'employee'
  employee_id?: string | null
}

export interface UpdateUserData {
  email?: string
  role?: 'superadmin' | 'unit_manager' | 'employee'
  employee_id?: string | null
  is_active?: boolean
}

// ============================================
// Master Pegawai Types (m_employees)
// ============================================

export interface Pegawai {
  id: string
  employee_code: string
  full_name: string
  unit_id: string
  position?: string | null
  tax_status: string
  employment_status: string | null
  employee_status?: string | null
  tax_type?: string | null
  pns_grade: string | null
  phone?: string | null
  nik?: string | null
  bank_name?: string | null
  bank_account_number?: string | null
  bank_account_name?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined data
  m_units?: {
    name: string
  }
}

export interface CreatePegawaiData {
  employee_code: string
  full_name: string
  unit_id: string
  position?: string | null
  tax_status?: string
  employment_status?: string | null
  employee_status?: string | null
  tax_type?: string | null
  pns_grade?: string | null
  phone?: string | null
  nik?: string | null
  bank_name?: string | null
  bank_account_number?: string | null
  bank_account_name?: string | null
  is_active?: boolean
}

export interface UpdatePegawaiData {
  employee_code?: string
  full_name?: string
  unit_id?: string
  position?: string | null
  tax_status?: string
  employment_status?: string | null
  employee_status?: string | null
  tax_type?: string | null
  pns_grade?: string | null
  phone?: string | null
  nik?: string | null
  bank_name?: string | null
  bank_account_number?: string | null
  bank_account_name?: string | null
  is_active?: boolean
}

