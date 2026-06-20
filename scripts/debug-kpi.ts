import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vdyvkzynvzlwbbjzlwml.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeXZrenludnpsd2Jianpsd21sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDc0NjEyNSwiZXhwIjoyMDk2MzIyMTI1fQ.BW_f_bhudbsbigjWkslPigYKD2zYWsRWtQNg3PFRF1k'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkKpiSchema() {
    console.log('--- Checking m_kpi_categories ---')
    const { data, error } = await supabase.from('m_kpi_categories').select('*').limit(1)
    if (error) console.error('Error fetching m_kpi_categories:', error)
    else console.log('Columns in m_kpi_categories:', Object.keys(data[0] || {}))

    console.log('--- Checking m_kpi_indicators ---')
    const { data: ind, error: indError } = await supabase.from('m_kpi_indicators').select('*').limit(1)
    if (indError) console.error('Error fetching m_kpi_indicators:', indError)
    else console.log('Columns in m_kpi_indicators:', Object.keys(ind[0] || {}))

    console.log('--- Checking t_kpi_assessments ---')
    const { data: ass, error: assError } = await supabase.from('t_kpi_assessments').select('*').limit(1)
    if (assError) console.error('Error fetching t_kpi_assessments:', assError)
    else console.log('Columns in t_kpi_assessments:', Object.keys(ass[0] || {}))
}

checkKpiSchema()
