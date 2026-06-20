import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vdyvkzynvzlwbbjzlwml.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkeXZrenludnpsd2Jianpsd21sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDc0NjEyNSwiZXhwIjoyMDk2MzIyMTI1fQ.BW_f_bhudbsbigjWkslPigYKD2zYWsRWtQNg3PFRF1k'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkEmps() {
    const { data, count, error } = await supabase
        .from('m_employees')
        .select('id', { count: 'exact' })
        .eq('is_active', true)
        .neq('role', 'superadmin')

    if (error) console.log('Emps error:', error.message)
    else console.log('Active non-admin emps:', count, 'IDs:', data.map(d => d.id))
}

checkEmps()
