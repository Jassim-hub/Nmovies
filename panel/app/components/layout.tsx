"use client";
import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import {
  Home,
  Film,
  Tv,
  Users,
  Tags,
  UserCheck,
  CreditCard,
  Bell,
  LogOut,
  Menu as MenuIcon,
  LayoutList,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const navSections = [
  {
    label: null,
    items: [
      { label: "Dashboard", href: "/", icon: Home },
    ],
  },
  {
    label: "CONTENTS",
    items: [
      { label: "Movies", href: "/movies", icon: Film },
      { label: "TV Series", href: "/series", icon: Tv },
    ],
  },
  {
    label: "USER MANAGEMENT",
    items: [
      { label: "Users", href: "/users", icon: Users },
    ],
  },
  {
    label: "MORE",
    items: [
      { label: "Genres", href: "/genres", icon: Tags },
      { label: "VJs", href: "/vjs", icon: UserCheck },
      { label: "Plans", href: "/plans", icon: LayoutList },
      { label: "Subscriptions", href: "/subscriptions", icon: CreditCard },
      { label: "Notifications", href: "/notifications", icon: Bell },
    ],
  },
];

interface AdminPanelLayoutProps {
  children: React.ReactNode;
}

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-2">
      {navSections.map((section, idx) => (
        <div key={idx} className="mb-2">
          {section.label && (
            <div className="px-4 py-1 text-xs font-bold text-gray-500 tracking-widest mb-1 uppercase">
              {section.label}
            </div>
          )}
          <div className="flex flex-col gap-1">
            {section.items.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${pathname === href || (href === "/" && pathname === "/")
                    ? "bg-[#E50914] text-white shadow-lg shadow-[#E50914]/20"
                    : "text-gray-400 hover:bg-black hover:text-[#E50914]"
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span className="tracking-wide">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function AdminPanelLayoutInner({ children }: AdminPanelLayoutProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#141414] text-white">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col border-r border-gray-800 bg-[#1a1c21] w-64 h-screen">
        {/* Fixed Header */}
        <div className="p-6 font-black text-xl text-[#E50914] border-b border-gray-800 flex items-center tracking-wider uppercase">
          <img src="/logo.png" alt="Logo" className="w-8 h-8 mr-3 object-contain" />
          NicholMovies
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto py-6 px-2">
          <SidebarNav />
        </div>

        {/* Fixed Logout Button */}
        <div className="border-t border-gray-800 p-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors text-gray-400 hover:bg-[#b80710]/10 hover:text-[#E50914] w-full uppercase tracking-wide"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar (Sheet/Drawer) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64 h-full flex flex-col bg-[#1a1c21] border-r-gray-800 text-white">
          <SheetHeader>
            <SheetTitle className="p-6 font-black text-xl text-[#E50914] mb-0 border-b border-gray-800 flex items-center uppercase tracking-wider text-left">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 mr-3 object-contain" />
              NicholMovies
            </SheetTitle>
            <SheetDescription className="sr-only">
              Navigation menu for the admin panel with access to all sections
            </SheetDescription>
          </SheetHeader>

          {/* Navigation area that takes available space */}
          <div className="flex-1 overflow-y-auto p-4">
            <SidebarNav onNavigate={() => setSidebarOpen(false)} />
          </div>

          {/* Logout button fixed at bottom */}
          <div className="border-t border-gray-800 p-4 mt-auto">
            <button
              onClick={() => {
                handleLogout();
                setSidebarOpen(false);
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors text-gray-400 hover:bg-[#b80710]/10 hover:text-[#E50914] w-full uppercase tracking-wide"
            >
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top App Bar */}
        <header className="flex items-center justify-between px-4 sm:px-8 py-4 border-b border-gray-800 bg-[#1a1c21] sticky top-0 z-30">
          {/* Hamburger for mobile */}
          <button
            className="md:hidden mr-2 p-2 rounded hover:bg-black focus:outline-none"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <MenuIcon className="w-6 h-6 text-[#E50914]" />
          </button>
          <div className="font-black text-xl text-[#E50914] md:hidden tracking-wider uppercase flex items-center">
            <img src="/logo.png" alt="Logo" className="w-6 h-6 mr-2 object-contain" />
            NicholMovies
          </div>
          <div className="hidden md:block text-gray-400 font-medium">
            Admin Dashboard
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400 hidden sm:inline">
                {user?.email || 'Admin'}
              </span>
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-[#E50914] to-red-800 flex items-center justify-center text-white font-bold shadow-lg shadow-red-900/50">
                {user?.email?.charAt(0).toUpperCase() || 'A'}
              </div>
            </div>
          </div>
        </header>
        <main className="flex-1 bg-[#141414] p-4 sm:p-6 md:p-8 w-full max-w-full overflow-y-auto custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AdminPanelLayout({ children }: AdminPanelLayoutProps) {
  return (
    <ProtectedLayout>
      <AdminPanelLayoutInner>
        {children}
      </AdminPanelLayoutInner>
    </ProtectedLayout>
  );
}