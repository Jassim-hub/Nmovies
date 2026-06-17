"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Film, Tv, User, Plus } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import Image from "next/image";

export default function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  // Hide on admin panel or auth pages if desired, but for now we'll show it everywhere in the main app
  if (pathname.startsWith('/panel')) return null;

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const navItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/movies", label: "Movies", icon: Film },
    { href: "/series", label: "TV Shows", icon: Tv },
    { href: "/watchlist", label: "Watchlist", icon: Plus },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-md border-t border-gray-800 z-50 pb-safe">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const active = isActive(item.href);
          
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors duration-200 ${
                active ? "text-[#E50914]" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              {item.href === '/profile' && user?.user_metadata?.avatar_url ? (
                <div className={`w-6 h-6 rounded-full overflow-hidden border ${active ? 'border-[#E50914]' : 'border-transparent'}`}>
                  <Image src={user.user_metadata.avatar_url} alt="Profile" width={24} height={24} className="object-cover w-full h-full" />
                </div>
              ) : item.href === '/profile' && user ? (
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${active ? 'bg-[#E50914]' : 'bg-gray-600'}`}>
                  {user.email?.charAt(0).toUpperCase()}
                </div>
              ) : (
                <item.icon className={`w-6 h-6 ${active ? "stroke-[#E50914]" : "stroke-current"}`} strokeWidth={active ? 2.5 : 2} />
              )}
              <span className={`text-[10px] font-medium ${active ? "font-bold" : ""}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
