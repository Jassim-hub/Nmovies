"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { signOut } from "@/lib/auth";
import { setRedirectCookie } from "@/lib/utils";
import { Search } from "lucide-react";
import PremiumUpgradeModal from "@/components/PremiumUpgradeModal";

const leftNavItems: { href: string; label: React.ReactNode }[] = [
  { href: "/", label: "Home" },
  { href: "/movies", label: "Movies" },
  { href: "/series", label: "Series" },
  { href: "/coming-soon", label: "Coming Soon" },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPremiumUpgradeModal, setShowPremiumUpgradeModal] = useState(false);

  const { user, loading, isPremium } = useAuth();

  const isActive = (href: string) => pathname === href;

  const handleSignOut = async () => {
    await signOut();
    setShowUserMenu(false);
  };



  // Handle scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
        setShowUserMenu(false);
      }
    };

    if (isMenuOpen || showUserMenu) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuOpen, showUserMenu]);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showUserMenu && !(e.target as Element).closest('.relative')) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showUserMenu]);

  return (
    <>
      <header
        className={`transition-all duration-300 border-b ${isScrolled
          ? "bg-black/95 backdrop-blur-md shadow-lg border-gray-700"
          : "bg-black border-gray-800"
          }`}
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          {/* Left section: Desktop Logo and nav, Mobile User */}
          <div className="flex items-center space-x-4 flex-shrink-0">
            {/* Desktop Logo */}
            <Link
              href="/"
              className="mr-2 flex items-center lg:flex hidden"
            >
              <Image
                src="/logo.png"
                alt="NicholMoviesUg Logo"
                width={40}
                height={40}
                className="w-8 h-8 sm:w-10 sm:h-10 object-contain rounded"
                priority
              />
            </Link>

            {/* Mobile User Section */}
            <div className="flex items-center lg:hidden">
              {loading ? (
                <div className="w-10 h-10 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin"></div>
              ) : user ? (
                <>
                  {/* Mobile User Avatar */}
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="relative flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-[#E50914] min-w-[40px] min-h-[40px]"
                    aria-label="User menu"
                  >
                    {user.user_metadata?.avatar_url ? (
                      <Image
                        src={user.user_metadata.avatar_url}
                        alt="Profile"
                        width={40}
                        height={40}
                        className={`w-10 h-10 rounded-full border-2 ${isPremium ? 'border-[#E50914]' : 'border-[#E50914]'}`}
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${isPremium ? 'bg-orange-400' : 'bg-[#E50914]'}`}>
                        {user.email?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {/* Premium indicator dot */}
                    {isPremium && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-400 rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    {/* Non-premium indicator */}
                    {!isPremium && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#E50914] rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>

                  {/* Mobile User Menu Dropdown */}
                  {showUserMenu && (
                    <div className="absolute left-4 top-16 mt-2 w-64 bg-[#23272f] rounded-lg shadow-xl border border-gray-700 py-2 z-50">
                      <div className="px-4 py-3 border-b border-gray-700">
                        <div className="flex items-center space-x-3">
                          {user.user_metadata?.avatar_url ? (
                            <Image
                              src={user.user_metadata.avatar_url}
                              alt="Profile"
                              width={48}
                              height={48}
                              className={`w-12 h-12 rounded-full border-2 ${isPremium ? 'border-[#E50914]' : 'border-[#E50914]'}`}
                            />
                          ) : (
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${isPremium ? 'bg-orange-400' : 'bg-[#E50914]'}`}>
                              {user.email?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {user.user_metadata?.full_name || 'User'}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                            {isPremium && (
                              <div className="flex items-center space-x-1 mt-1">
                                <svg className="w-3 h-3 text-[#E50914]" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732L14.146 12.8l-1.179 4.456a1 1 0 01-1.934 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732L9.854 7.2l1.179-4.456A1 1 0 0112 2z" clipRule="evenodd" />
                                </svg>
                                <span className="text-xs text-[#E50914] font-medium">Premium</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="py-1">
                        <Link
                          href="/profile"
                          className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-black hover:text-[#E50914] transition-colors duration-200 flex items-center space-x-3"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 15c2.21 0 4.305.534 6.121 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>Profile</span>
                        </Link>

                        <Link
                          href="/payment"
                          className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-black hover:text-[#E50914] transition-colors duration-200 flex items-center space-x-3"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" clipRule="evenodd" />
                          </svg>
                          <span>{isPremium ? 'Manage Subscription' : 'Get Premium'}</span>
                        </Link>

                        <button
                          onClick={() => {
                            handleSignOut();
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-black hover:text-red-400 transition-colors duration-200 flex items-center space-x-3"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href="/signin"
                  onClick={() => setRedirectCookie(pathname)}
                  className="flex items-center justify-center w-10 h-10 bg-[#E50914] hover:bg-[#b80710] text-white font-bold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#E50914]"
                  aria-label="Sign In"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </Link>
              )}
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-2">
              {leftNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 transition-colors duration-200 font-bold uppercase text-sm tracking-wider ${isActive(item.href)
                    ? "text-[#E50914]"
                    : "text-gray-300 hover:text-[#E50914]"
                    }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Desktop Right Navigation */}
          <nav className="hidden lg:flex items-center space-x-4">
            {/* Search Icon */}
            <Link
              href="/search"
              className="p-2 hover:text-[#E50914] text-gray-300 transition-colors focus:outline-none"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </Link>

            {/* Download Icon Button */}
            <Link
              href="/download"
              className="p-2.5 bg-gray-800 rounded hover:bg-gray-700 transition-colors focus:outline-none"
              aria-label="Download App"
            >
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </Link>

            {/* Language Selector (Placeholder) */}
            <button className="flex items-center space-x-2 bg-gray-800 px-3 py-2 rounded text-xs font-bold text-gray-300 hover:bg-gray-700 transition-colors">
              <span className="w-4 h-3 bg-red-600 inline-block border border-white/20"></span>
              <span>EN</span>
              <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {loading ? (
              <div className="w-8 h-8 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin"></div>
            ) : user ? (
              <>
                {/* Premium Badge - Show only if user is not premium */}
                {!isPremium && (
                  <Link
                    href="/payment"
                    className="flex items-center space-x-2 px-5 py-2 bg-[#d9a029] hover:bg-[#c28f23] rounded transition-all focus:outline-none shadow-lg"
                  >
                    <svg className="w-4 h-4 text-black fill-current" viewBox="0 0 24 24">
                      <path d="M3 17h18v2H3v-2zm18-9l-3.5 5.5L12 7l-5.5 6.5L3 8l3 11h12l3-11z" />
                    </svg>
                    <span className="text-black font-bold uppercase text-xs tracking-wider">Subscribe</span>
                  </Link>
                )}

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-black transition-colors duration-200 focus:outline-none"
                  >
                    {user.user_metadata?.avatar_url ? (
                      <Image
                        src={user.user_metadata.avatar_url}
                        alt="Profile"
                        width={32}
                        height={32}
                        className={`w-8 h-8 rounded-full border-2 ${isPremium ? 'border-[#d9a029]' : 'border-gray-600'}`}
                      />
                    ) : (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${isPremium ? 'bg-[#d9a029]' : 'bg-[#E50914]'}`}>
                        {user.email?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-[#23272f] rounded-lg shadow-xl border border-gray-700 py-1 z-50">
                      <div className="px-4 py-3 border-b border-gray-700">
                        <p className="text-sm text-gray-400">Signed in as</p>
                        <p className="text-sm font-medium text-white truncate">{user.email}</p>
                      </div>
                      <Link
                        href="/profile"
                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-black hover:text-[#E50914] transition-colors duration-200 flex items-center space-x-2"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 15c2.21 0 4.305.534 6.121 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <span>Profile</span>
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-black hover:text-[#E50914] transition-colors duration-200"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link
                href="/signin"
                onClick={() => setRedirectCookie(pathname)}
                className="px-6 py-2 bg-[#E50914] hover:bg-[#b80710] text-white font-bold rounded uppercase text-xs tracking-wider transition-colors"
              >
                Login
              </Link>
            )}
          </nav>

          {/* Mobile Right Section - Search and Menu */}
          <div className="flex items-center space-x-3 lg:hidden">
            {/* Mobile Search Button */}
            <Link
              href="/search"
              className="p-2 rounded-lg hover:bg-black transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#E50914] min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Search"
            >
              <Search className="w-5 h-5 text-gray-300 hover:text-[#E50914]" />
            </Link>

            {/* Mobile Menu Button */}
            <button
              type="button"
              className="p-2 rounded-lg hover:bg-black active:bg-gray-700 transition-colors duration-200 relative min-w-[44px] min-h-[44px] flex items-center justify-center"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
            >
              <div className="w-6 h-6 flex flex-col justify-center items-center">
                <span
                  className={`block w-5 h-0.5 bg-gray-300 transition-all duration-300 ${isMenuOpen ? "rotate-45 translate-y-0.5" : ""
                    }`}
                />
                <span
                  className={`block w-5 h-0.5 bg-gray-300 mt-1 transition-all duration-300 ${isMenuOpen ? "opacity-0" : ""
                    }`}
                />
                <span
                  className={`block w-5 h-0.5 bg-gray-300 mt-1 transition-all duration-300 ${isMenuOpen ? "-rotate-45 -translate-y-1.5" : ""
                    }`}
                />
              </div>
            </button>
          </div>
        </div>



        {/* Mobile Navigation */}
        <div
          className={`lg:hidden overflow-hidden transition-all duration-300 ${isMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
            }`}
        >
          <div className="border-t border-gray-800 bg-black shadow-lg">
            <nav className="container mx-auto px-4 sm:px-6 lg:px-8 py-2 sm:py-4">
              <div className="flex flex-col space-y-1">
                {/* Home Link with Logo */}
                <Link
                  href="/"
                  className={`px-4 py-3 sm:py-4 rounded-lg transition-all duration-200 hover:bg-black active:bg-gray-700 hover:translate-x-2 text-base sm:text-lg min-h-[44px] flex items-center font-semibold ${isActive("/")
                    ? "text-[#E50914] font-medium bg-black border-r-2 border-[#E50914]"
                    : "text-gray-300 hover:text-[#E50914]"
                    }`}
                  onClick={() => setIsMenuOpen(false)}
                  style={{
                    animationDelay: "0ms",
                    animation: isMenuOpen ? `slideIn 0.3s ease-out forwards` : ""
                  }}
                >
                  <Image
                    src="/logo.png"
                    alt="NichloMoviesUg Logo"
                    width={24}
                    height={24}
                    className="w-6 h-6 object-contain rounded mr-3"
                    priority
                  />
                  Home
                </Link>

                {leftNavItems.map((item, index) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-3 sm:py-4 rounded-lg transition-all duration-200 hover:bg-black active:bg-gray-700 hover:translate-x-2 text-base sm:text-lg min-h-[44px] flex items-center ${isActive(item.href)
                      ? "text-[#E50914] font-medium bg-black border-r-2 border-[#E50914]"
                      : "text-gray-300 hover:text-[#E50914]"
                      }`}
                    onClick={() => setIsMenuOpen(false)}
                    style={{
                      animationDelay: `${(index + 1) * 50}ms`,
                      animation: isMenuOpen ? `slideIn 0.3s ease-out forwards` : ""
                    }}
                  >
                    {item.label}
                  </Link>
                ))}
                <Link
                  href="/download"
                  className={`px-4 py-3 sm:py-4 rounded-lg transition-all duration-200 hover:bg-black active:bg-gray-700 hover:translate-x-2 text-base sm:text-lg min-h-[44px] flex items-center font-semibold ${isActive('/download') ? 'text-[#E50914]' : 'text-gray-300 hover:text-[#E50914]'}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Image src="/google_play.svg" alt="Download" width={20} height={20} className="w-5 h-5 mr-2 transition-colors duration-200" />
                  Download
                </Link>
                {/* Mobile Navigation Footer */}
                <div className="mt-4 pt-4 border-t border-gray-700">
                  {user ? (
                    <div className="px-4 py-2 flex flex-col gap-2">
                      <div className="flex items-center gap-3 mb-1">
                        {user.user_metadata?.avatar_url ? (
                          <Image
                            src={user.user_metadata.avatar_url}
                            alt="Profile"
                            width={36}
                            height={36}
                            className="w-9 h-9 rounded-full border-2 border-[#E50914]"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-[#E50914] flex items-center justify-center text-white font-bold text-sm">
                            {user.email?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{user.user_metadata?.full_name || 'Account'}</p>
                          <p className="text-xs text-gray-400 truncate">{user.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => { handleSignOut(); setIsMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium min-h-[44px]"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign Out
                      </button>
                    </div>
                  ) : (
                    <div className="px-4 py-2">
                      <p className="text-xs text-gray-500 text-center">
                        NicholMoviesUg - Your Entertainment Hub
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </nav>
          </div>
        </div>

        <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        /* Custom breakpoint for extra small screens */
        @media (max-width: 480px) {
          .xs\:hidden {
            display: none;
          }
        }
        
        @media (min-width: 481px) {
          .xs\:inline {
            display: inline;
          }
        }
        
        /* Ensure proper touch targets on mobile */
        @media (max-width: 1023px) {
          button, a {
            min-height: 44px;
            min-width: 44px;
          }
        }
      `}</style>
      </header>

      {/* Premium Upgrade Modal */}
      <PremiumUpgradeModal
        isOpen={showPremiumUpgradeModal}
        onClose={() => setShowPremiumUpgradeModal(false)}
      />
    </>
  );
}