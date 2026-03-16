const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://qmvwylljvyrbtxlrpjkp.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFtdnd5bGxqdnlyYnR4bHJwamtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDYxMTcsImV4cCI6MjA4NzYyMjExN30.kdHo4f9FDHKNPBgnkwLSBpJUbP4J4NnIUzvrCicXqqY';
const supabase = createClient(supabaseUrl, supabaseKey);
async function run() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if(error) console.log('Error:', error);
  if(data && data.length > 0) {
    console.log('Columns in public.users:', Object.keys(data[0]));
    console.log('Sample record:', data[0]);
  } else {
    console.log('No users found to inspect columns.');
  }
}
run();
