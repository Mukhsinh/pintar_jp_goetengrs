import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vdyvkzynvzlwbbjzlwml.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeXZrenludnpsd2Jianpsd21sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDc0NjEyNSwiZXhwIjoyMDk2MzIyMTI1fQ.BW_f_bhudbsbigjWkslPigYKD2zYWsRWtQNg3PFRF1k'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testColumns() {
    const columns = ['employee_id', 'weight_percentage', 'realization_value', 'target_value', 'indicator_id']
    for (const col of columns) {
        const { error } = await supabase.from('t_kpi_assessments').select(col).limit(1)
        if (error) console.log(`Column ${col} error:`, error.message)
        else console.log(`Column ${col} OK`)
    }

    const { error: joinError } = await supabase.from('t_kpi_assessments').select('m_kpi_indicators(id)').limit(1)
    if (joinError) console.log('Join m_kpi_indicators error:', joinError.message)
    else console.log('Join m_kpi_indicators OK')
}

testColumns()
