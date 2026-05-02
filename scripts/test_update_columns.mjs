import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://fstymrqvgkopqpqirezi.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzdHltcnF2Z2tvcHFwcWlyZXppIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTIxOTYxOCwiZXhwIjoyMDkwNzk1NjE4fQ.YgJHvufgWamRQDWvq7vAkbviD9b5RhWdSBAkBGZEjUk'
);

async function testUpdate() {
  const { data: profile } = await supabase.from('profiles').select('id').limit(1).single();
  if (!profile) {
    console.log("No profile found.");
    return;
  }
  
  console.log("Testing update on profile:", profile.id);
  const { data, error } = await supabase
    .from('profiles')
    .update({ 
      watchlist: [],
      watch_history: {} 
    })
    .eq('id', profile.id)
    .select();
    
  if (error) {
    console.error("Update failed:", error.message);
  } else {
    console.log("Update succeeded:", data);
  }
}

testUpdate();
