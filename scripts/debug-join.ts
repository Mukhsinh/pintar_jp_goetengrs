import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vdyvkzynvzlwbbjzlwml.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeXZrenludnpsd2Jianpsd21sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDc0NjEyNSwiZXhwIjoyMDk2MzIyMTI1fQ.BW_f_bhudbsbigjWkslPigYKD2zYWsRWtQNg3PFRF1k'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugJoin() {
    console.log('Testing KPI join query...')
    const { data, error } = await supabase
        .from('t_kpi_assessments')
        .select(`
      id,
      m_kpi_indicators (
        id,
        m_kpi_categories (
          id, category
        )
      )
    `)
        .limit(1)

    if (error) {
        console.error('KPI Join Error:', error)
    } else {
        console.log('KPI Join Success:', JSON.stringify(data, null, 2))
    }
}

debugJoin()
