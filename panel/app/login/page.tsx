import { Suspense } from 'react';
import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#141414]">
      <Suspense fallback={<div className="text-[#E50914] text-lg font-bold uppercase tracking-wider">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
