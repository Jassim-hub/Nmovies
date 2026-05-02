import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fstymrqvgkopqpqirezi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzdHltcnF2Z2tvcHFwcWlyZXppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIxOTYxOCwiZXhwIjoyMDkwNzk1NjE4fQ.YgJHvufgWamRQDWvq7vAkbviD9b5RhWdSBAkBGZEjUk'
);

async function checkSchema() {
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  console.log("Profiles data:", data);
  console.log("Profiles error:", error);
}

checkSchema();
