"use client";

import { usePathname } from 'next/navigation';
import Header from '../app/components/Header';
import Footer from '@/components/Footer';
import MobileNav from '@/components/MobileNav';
import InstallAppBanner from '@/components/InstallAppBanner';
import NotificationPrompt from '@/components/NotificationPrompt';

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export default function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  
  // Hide header and footer on player page
  const isPlayerPage = pathname === '/player';
  
  if (isPlayerPage) {
    return <>{children}</>;
  }
  
  return (
    <>
      <Header />
      <main className="flex-1 w-full pb-16 lg:pb-0">{children}</main>
      <Footer />
      <MobileNav />
      {/* PWA install prompt — shown on Android (native) and iOS (step guide) */}
      <InstallAppBanner />
      {/* Push notification opt-in — shown after 8s if not yet subscribed */}
      <NotificationPrompt />
    </>
  );
}
