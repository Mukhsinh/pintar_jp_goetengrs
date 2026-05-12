
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Basic env loader
const envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value.length) {
        env[key.trim()] = value.join('=').trim();
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectP3() {
    console.log('Inspecting P3 assessments...');

    const { data, error } = await supabase
        .from('t_kpi_assessments')
        .select(`
      *,
      m_kpi_indicators (
        m_kpi_categories (
          category
        )
      )
    `);

    if (error) {
        console.error('Error:', error);
    } else {
        const p3s = data.filter(a => a.m_kpi_indicators?.m_kpi_categories?.category === 'P3');
        console.log(`Total P3 records: ${p3s.length}`);
        p3s.slice(0, 10).forEach((a, i) => {
            console.log(`[${i}] Score=${a.score}, Real=${a.realization_value}, Targ=${a.target_value}, W=${a.weight_percentage}`);
        });

        const sum = p3s.reduce((s, a) => s + (parseFloat(a.score) || 0), 0);
        console.log(`Sum of scores for P3: ${sum}`);
    }
}

inspectP3();
