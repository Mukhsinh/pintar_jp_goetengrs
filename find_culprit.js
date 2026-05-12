
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

async function findTheRecord() {
    console.log('Finding the record with score 25000...');

    const { data, error } = await supabase
        .from('t_kpi_assessments')
        .select(`
      *,
      m_kpi_indicators (
        name,
        m_kpi_categories (
          category
        )
      )
    `)
        .eq('score', 25000);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Found:', JSON.stringify(data, null, 2));
    }
}

findTheRecord();
