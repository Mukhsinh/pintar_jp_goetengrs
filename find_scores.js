
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

async function findScores() {
    console.log('Finding assessments with non-null scores...');

    const { data, error } = await supabase
        .from('t_kpi_assessments')
        .select(`
      id,
      score,
      m_kpi_indicators (
        m_kpi_categories (
          category
        )
      )
    `)
        .not('score', 'is', null);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log(`Found ${data.length} assessments with scores.`);
        const counts = {};
        data.forEach(a => {
            const cat = a.m_kpi_indicators?.m_kpi_categories?.category;
            counts[cat] = (counts[cat] || 0) + 1;
        });
        console.log('Category Distribution of non-null scores:', counts);
        if (data.length > 0) {
            console.log('Sample score:', data[0].score, 'for category', data[0].m_kpi_indicators?.m_kpi_categories?.category);
        }
    }
}

findScores();
