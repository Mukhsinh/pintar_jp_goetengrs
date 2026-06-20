import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vdyvkzynvzlwbbjzlwml.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeXZrenludnpsd2Jianpsd21sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDc0NjEyNSwiZXhwIjoyMDk2MzIyMTI1fQ.BW_f_bhudbsbigjWkslPigYKD2zYWsRWtQNg3PFRF1k'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkSchema() {
    console.log('--- Checking t_pool_revenue ---')
    const { data, error } = await supabase.from('t_pool_revenue').select('*').limit(1)
    if (error) console.error('Error fetching t_pool_revenue:', error)
    else console.log('Schema for t_pool_revenue seems to have columns:', Object.keys(data[0] || {}))

    console.log('\n--- Checking getKPIDistribution Query ---')
    const { data: ass, error: assError } = await supabase
        .from('t_kpi_assessments')
        .select(`
      employee_id,
      m_kpi_indicators (
        m_kpi_categories (
          category
        )
      )
    `)
        .limit(1)

    if (assError) console.error('Error in KPI query:', assError)
    else console.log('KPI Query successful, record:', JSON.stringify(ass[0], null, 2))
}

checkSchema()
