
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

async function checkScores() {
    console.log('Checking scores per category...');

    const { data, error } = await supabase
        .from('t_kpi_assessments')
        .select(`
      score,
      m_kpi_indicators (
        m_kpi_categories (
          category
        )
      )
    `);

    if (error) {
        console.error('Error:', error);
    } else {
        const scores = { P1: [], P2: [], P3: [] };
        data.forEach(a => {
            const cat = a.m_kpi_indicators?.m_kpi_categories?.category;
            if (cat) scores[cat].push(a.score);
        });

        for (const cat in scores) {
            const vals = scores[cat];
            const sum = vals.reduce((s, v) => s + (parseFloat(v) || 0), 0);
            const avg = vals.length > 0 ? sum / vals.length : 0;
            console.log(`Category ${cat}: Count=${vals.length}, Sum=${sum.toFixed(2)}, Avg=${avg.toFixed(2)}`);
            if (vals.length > 0) console.log(`  First 5 scores: ${vals.slice(0, 5).join(', ')}`);
        }
    }
}

checkScores();
