const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const { data, error } = await supabase.from('tasks').select('*').limit(1);
  if(error) console.log('Error:', error);
  if(data) console.log('Columns:', Object.keys(data[0] || {}));
}
run();
