import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vdyvkzynvzlwbbjzlwml.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeXZrenludnpsd2Jianpsd21sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDc0NjEyNSwiZXhwIjoyMDk2MzIyMTI1fQ.BW_f_bhudbsbigjWkslPigYKD2zYWsRWtQNg3PFRF1k'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testNestedJoin() {
    const { error } = await supabase
        .from('t_kpi_assessments')
        .select(`
      m_kpi_indicators (
        m_kpi_categories (
          id
        )
      )
    `)
        .limit(1)

    if (error) console.log('Nested join error:', error.message)
    else console.log('Nested join OK')
}

testNestedJoin()
