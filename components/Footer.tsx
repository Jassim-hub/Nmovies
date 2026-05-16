"use client";

import Link from "next/link";
import Image from "next/image";
import { Mail, Phone, ChevronRight, ChevronUp, Facebook, Instagram, Youtube, Twitter } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [premiumShows, setPremiumShows] = useState<any[]>([]);
  const [latestShows, setLatestShows] = useState<any[]>([]);

  useEffect(() => {
    async function fetchFooterData() {
      // Fetch Premium Shows
      const { data: premium } = await supabase
        .from("movies")
        .select("id, title")
        .eq("published", true)
        .eq("premium", true)
        .limit(4);
      if (premium) setPremiumShows(premium);

      // Fetch Latest Released
      const { data: latest } = await supabase
        .from("movies")
        .select("id, title")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(4);
      if (latest) setLatestShows(latest);
    }
    fetchFooterData();
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#141414] text-white pt-16 pb-8 border-t border-gray-800">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Column 1: Brand Info */}
          <div>
            <Link href="/" className="flex items-center mb-6">
              <Image src="/logo.jpeg" alt="NicholMoviesUg Logo" width={40} height={40} className="w-10 h-10 object-contain mr-3" />
              <span className="text-2xl font-black text-[#E50914] tracking-wider uppercase">NicholMoviesUg</span>
            </Link>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              NicholMoviesUg: Your Ultimate Destination for Unlimited Movies and Shows!
            </p>
            <div className="space-y-3 text-sm text-gray-300">
              <a href="mailto:nicholmoviesug@gmail.com" className="flex items-center gap-3 hover:text-[#E50914] transition-colors">
                <Mail className="w-4 h-4" /> nicholmoviesug@gmail.com
              </a>
              <a href="tel:+256757588585" className="flex items-center gap-3 hover:text-[#E50914] transition-colors">
                <Phone className="w-4 h-4" /> +256757588585
              </a>
            </div>
            <div className="flex items-center gap-4 mt-6 text-gray-400">
              <a href="#" className="hover:text-white transition-colors"><Facebook className="w-5 h-5" /></a>
              <a href="#" className="hover:text-white transition-colors"><Instagram className="w-5 h-5" /></a>
              <a href="#" className="hover:text-white transition-colors"><Youtube className="w-5 h-5" /></a>
              <a href="#" className="hover:text-white transition-colors"><Twitter className="w-5 h-5" /></a>
            </div>
          </div>

          {/* Column 2: Premium Shows */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-white tracking-wide">Premium shows</h3>
            <ul className="space-y-4">
              {premiumShows.length > 0 ? premiumShows.map(show => (
                <li key={show.id}>
                  <Link href={`/movies/${show.id}`} className="text-gray-400 hover:text-[#E50914] transition-colors flex items-center gap-2 text-sm">
                    <ChevronRight className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{show.title}</span>
                  </Link>
                </li>
              )) : (
                [1, 2, 3, 4].map(i => (
                  <li key={i} className="h-5 bg-gray-800 rounded animate-pulse w-3/4"></li>
                ))
              )}
            </ul>
          </div>

          {/* Column 3: Latest Released */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-white tracking-wide">Latest Released</h3>
            <ul className="space-y-4">
              {latestShows.length > 0 ? latestShows.map(show => (
                <li key={show.id}>
                  <Link href={`/movies/${show.id}`} className="text-gray-400 hover:text-[#E50914] transition-colors flex items-center gap-2 text-sm">
                    <ChevronRight className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{show.title}</span>
                  </Link>
                </li>
              )) : (
                [1, 2, 3, 4].map(i => (
                  <li key={i} className="h-5 bg-gray-800 rounded animate-pulse w-3/4"></li>
                ))
              )}
            </ul>
          </div>

          {/* Column 4: Download App */}
          <div>
            <h3 className="text-lg font-bold mb-6 text-white tracking-wide">Download Our App</h3>
            <p className="text-gray-400 text-sm mb-6 leading-relaxed">
              Download our app for instant access to the best movies and shows!
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/download" className="bg-black border border-gray-700 hover:border-gray-500 rounded-lg px-4 py-2 flex items-center gap-3 transition-colors">
                <Image src="/google_play.svg" alt="Google Play" width={24} height={24} className="w-6 h-6" />
                <div className="text-left">
                  <div className="text-[10px] text-gray-400 leading-none mb-0.5">GET IT ON</div>
                  <div className="text-sm font-semibold leading-none">Google Play</div>
                </div>
              </Link>
              <Link href="/download" className="bg-black border border-gray-700 hover:border-gray-500 rounded-lg px-4 py-2 flex items-center gap-3 transition-colors">
                <svg className="w-6 h-6 text-white" viewBox="0 0 384 512" fill="currentColor">
                  <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                </svg>
                <div className="text-left">
                  <div className="text-[10px] text-gray-400 leading-none mb-0.5">Download on the</div>
                  <div className="text-sm font-semibold leading-none">App Store</div>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar Container */}
        <div className="relative">
          <div className="bg-[#1a1c21] border border-gray-800 rounded-lg py-4 px-6 flex flex-wrap justify-center md:justify-start gap-x-8 gap-y-3 mb-8 md:pr-16">
            <Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Terms & Conditions</Link>
            <Link href="/contact" className="text-sm text-gray-400 hover:text-white transition-colors">Help And Support</Link>
            <Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Refund And Cancellation Policy</Link>
            <Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Data Deletion Request</Link>
            <Link href="/about" className="text-sm text-gray-400 hover:text-white transition-colors">About Us</Link>
            <Link href="/contact" className="text-sm text-gray-400 hover:text-white transition-colors">FAQ</Link>
          </div>

          <button
            onClick={scrollToTop}
            className="absolute -right-2 md:right-0 top-1/2 -translate-y-1/2 bg-[#E50914] hover:bg-[#b80710] text-white w-12 h-12 flex items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110 z-10"
            aria-label="Back to top"
          >
            <ChevronUp className="w-6 h-6" />
          </button>
        </div>

        {/* Copyright */}
        <div className="text-center pt-8 border-t border-gray-800">
          <p className="text-gray-400 text-sm">
            © {currentYear} NicholMoviesUg: Revolutionize your Entertainment. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
