import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import LoginForm from './LoginForm';

export default async function LoginPage() {
  const cookie = (await headers()).get('cookie') || '';


  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Cookie: cookie,
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // Verify if the user is actually an admin before redirecting to the dashboard.
    // If a normal user's session cookie is still present on the server, we don't want to
    // redirect them back to the panel, which would cause an infinite redirect loop.
    const { data: adminData } = await supabase
      .from('admins')
      .select('user_id')
      .eq('user_id', user.id)
      .single();

    if (adminData) {
      redirect('/');
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <LoginForm />
    </div>
  );
}
