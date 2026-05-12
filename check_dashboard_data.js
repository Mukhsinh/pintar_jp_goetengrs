
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

async function checkData() {
    console.log('Checking category distribution in t_kpi_assessments...');

    const { data, error } = await supabase
        .from('t_kpi_assessments')
        .select(`
      id,
      score,
      indicator_id,
      m_kpi_indicators (
        id,
        category_id,
        m_kpi_categories (
          id,
          category
        )
      )
    `)
        .limit(10);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Sample Data Structure:', JSON.stringify(data[0], null, 2));

        // Aggregation test
        const { data: allData, error: allErr } = await supabase
            .from('t_kpi_assessments')
            .select(`
        m_kpi_indicators (
          m_kpi_categories (
            category
          )
        )
      `);

        if (allErr) {
            console.error('All Error:', allErr);
        } else {
            const counts = {};
            allData.forEach(a => {
                const cat = a.m_kpi_indicators?.m_kpi_categories?.category;
                counts[cat] = (counts[cat] || 0) + 1;
            });
            console.log('Category Counts:', counts);
        }
    }
}

checkData();
