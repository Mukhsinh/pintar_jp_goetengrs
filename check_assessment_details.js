
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

async function checkDetails() {
    console.log('Checking realization and target details...');

    const { data, error } = await supabase
        .from('t_kpi_assessments')
        .select(`
      realization_value,
      target_value,
      weight_percentage,
      achievement_percentage,
      score,
      m_kpi_indicators (
        m_kpi_categories (
          category,
          weight_percentage
        )
      )
    `)
        .limit(20);

    if (error) {
        console.error('Error:', error);
    } else {
        data.forEach((a, i) => {
            const cat = a.m_kpi_indicators?.m_kpi_categories?.category;
            console.log(`[${i}] ${cat}: R=${a.realization_value}, T=${a.target_value}, W=${a.weight_percentage}, Ach=${a.achievement_percentage}, Score=${a.score}`);
        });
    }
}

checkDetails();
