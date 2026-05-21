const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://fstymrqvgkopqpqirezi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzdHltcnF2Z2tvcHFwcWlyZXppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyMTk2MTgsImV4cCI6MjA5MDc5NTYxOH0.FR5tpGcDy7SRH_dNfFJfJuR6lvNgwJhb9hpq9QlFGm4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSeasons() {
  const { data, error } = await supabase.from('seasons').select('*').limit(1);
  if (error) {
    console.error(error);
  } else {
    console.log(data.length ? Object.keys(data[0]) : "No data, but table exists.");
  }
}
checkSeasons();
