import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vdyvkzynvzlwbbjzlwml.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeXZrenludnpsd2Jianpsd21sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDc0NjEyNSwiZXhwIjoyMDk2MzIyMTI1fQ.BW_f_bhudbsbigjWkslPigYKD2zYWsRWtQNg3PFRF1k'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testStatsQuery() {
    console.log('Testing stats query...')
    const { data, error } = await supabase
        .from('t_kpi_assessments')
        .select(`
      employee_id,
      weight_percentage,
      realization_value,
      target_value,
      m_kpi_indicators (
        m_kpi_categories (
          category,
          weight_percentage
        )
      )
    `)
        .limit(1)

    if (error) {
        console.error('Stats Query Error:', error.message)
        console.error('Full error:', error)
    } else {
        console.log('Stats Query Success:', data.length)
    }
}

testStatsQuery()
