'use client'
import AdminPanelLayout from "@/app/components/layout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Plus, Film, Tv, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function DashboardPage() {
  const router = useRouter();
  const [userCount, setUserCount] = useState(0);
  const [movieCount, setMovieCount] = useState(0);
  const [seriesCount, setSeriesCount] = useState(0);
  
  const [latestMovies, setLatestMovies] = useState<{ title: string; created_at: string }[]>([]);
  const [latestSeries, setLatestSeries] = useState<{ title: string; created_at: string }[]>([]);
  
  const [topMovies, setTopMovies] = useState<{ title: string; views: number }[]>([]);
  const [topSeries, setTopSeries] = useState<{ title: string; views: number }[]>([]);
  
  const [dailyTopMovies, setDailyTopMovies] = useState<{ title: string; daily_views: number }[]>([]);
  const [dailyTopSeries, setDailyTopSeries] = useState<{ title: string; daily_views: number }[]>([]);

  useEffect(() => {
    async function fetchDashboardData() {
      // Counts
      // Use API route for profiles to bypass RLS (profiles are restricted to own row)
      const profilesRes = await fetch('/api/profiles');
      const profilesJson = await profilesRes.json();
      const { count: movies } = await supabase.from("movies").select("id", { count: "exact", head: true });
      const { count: series } = await supabase.from("series").select("id", { count: "exact", head: true });
      setUserCount(profilesJson.count || 0);
      setMovieCount(movies || 0);
      setSeriesCount(series || 0);

      // Latest Content
      const { data: latestM } = await supabase.from("movies").select("title, created_at").eq("latest", true).order("created_at", { ascending: false }).limit(5);
      setLatestMovies(latestM || []);

      const { data: latestS } = await supabase.from("series").select("title, created_at").order("created_at", { ascending: false }).limit(5);
      setLatestSeries(latestS || []);

      // Top All-Time
      const { data: topM } = await supabase.from("movies").select("title, views").order("views", { ascending: false }).limit(10);
      setTopMovies(topM || []);

      const { data: topS } = await supabase.from("series").select("title, views").order("views", { ascending: false }).limit(10);
      setTopSeries(topS || []);

      // Top Today (using RPC)
      // Note: If RPC fails or doesn't exist yet, we will just use empty array.
      const today = new Date().toISOString().split('T')[0];
      const { data: dailyM } = await supabase.rpc('get_daily_top_movies', { target_date: today, max_limit: 10 });
      setDailyTopMovies(dailyM || []);

      const { data: dailyS } = await supabase.rpc('get_daily_top_series', { target_date: today, max_limit: 10 });
      setDailyTopSeries(dailyS || []);
    }
    fetchDashboardData();
  }, []);

  return (
    <AdminPanelLayout>
      <div className="space-y-8">
        {/* Welcome message */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-black text-white uppercase tracking-wide">Welcome back!</h1>
            <div className="text-sm text-gray-400">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="bg-[#E50914] hover:bg-[#b80710] text-white font-bold uppercase tracking-wider px-6 py-6 shadow-[0_0_15px_rgba(229,9,20,0.3)] border-none">
                <Plus className="w-5 h-5 mr-2" />
                Add New
                <ChevronDown className="w-5 h-5 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-[#1a1c21] border-gray-800 text-white">
              <DropdownMenuItem onClick={() => router.push('/movies')} className="focus:bg-[#E50914] focus:text-white cursor-pointer py-3">
                <Film className="w-4 h-4 mr-3" /> Movie
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/series')} className="focus:bg-[#E50914] focus:text-white cursor-pointer py-3">
                <Tv className="w-4 h-4 mr-3" /> TV Series
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/users')} className="focus:bg-[#E50914] focus:text-white cursor-pointer py-3">
                <Users className="w-4 h-4 mr-3" /> User
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/genres')} className="focus:bg-[#E50914] focus:text-white cursor-pointer py-3">
                Genre
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/vjs')} className="focus:bg-[#E50914] focus:text-white cursor-pointer py-3">
                VJ
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/subscriptions')} className="focus:bg-[#E50914] focus:text-white cursor-pointer py-3">
                Subscription
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div className="bg-[#1a1c21] rounded-2xl p-6 border border-gray-800 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#E50914] opacity-5 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Users</p>
                <p className="text-4xl font-black text-white mt-2">{userCount}</p>
                <p className="text-emerald-500 text-xs font-bold mt-3 bg-emerald-500/10 inline-block px-2 py-1 rounded">ACTIVE</p>
              </div>
              <div className="w-14 h-14 bg-black rounded-xl flex items-center justify-center border border-gray-800 shadow-inner">
                <Users className="w-7 h-7 text-[#E50914]" />
              </div>
            </div>
          </div>
          
          <div className="bg-[#1a1c21] rounded-2xl p-6 border border-gray-800 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#E50914] opacity-5 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Movies</p>
                <p className="text-4xl font-black text-white mt-2">{movieCount}</p>
                <p className="text-emerald-500 text-xs font-bold mt-3 bg-emerald-500/10 inline-block px-2 py-1 rounded">PUBLISHED</p>
              </div>
              <div className="w-14 h-14 bg-black rounded-xl flex items-center justify-center border border-gray-800 shadow-inner">
                <Film className="w-7 h-7 text-[#E50914]" />
              </div>
            </div>
          </div>
          
          <div className="bg-[#1a1c21] rounded-2xl p-6 border border-gray-800 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#E50914] opacity-5 rounded-bl-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Series</p>
                <p className="text-4xl font-black text-white mt-2">{seriesCount}</p>
                <p className="text-emerald-500 text-xs font-bold mt-3 bg-emerald-500/10 inline-block px-2 py-1 rounded">PUBLISHED</p>
              </div>
              <div className="w-14 h-14 bg-black rounded-xl flex items-center justify-center border border-gray-800 shadow-inner">
                <Tv className="w-7 h-7 text-[#E50914]" />
              </div>
            </div>
          </div>
        </div>

        {/* Most Watched Today */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="bg-[#1a1c21] rounded-2xl border border-gray-800 shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-800 bg-[#141414]/50">
              <h2 className="text-xl font-bold text-white uppercase tracking-wide flex items-center gap-2">
                <Film className="w-5 h-5 text-emerald-500" /> Top 10 Movies Today
              </h2>
            </div>
            <div className="p-6 flex-1 max-h-80 overflow-y-auto">
              <div className="space-y-3">
                {dailyTopMovies.length === 0 ? (
                  <div className="text-gray-500 italic p-4 text-center">No views tracked today.</div>
                ) : (
                  dailyTopMovies.map((movie, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-black border border-gray-800 hover:border-emerald-500/50 transition-colors duration-200 group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#1a1c21] rounded-lg flex items-center justify-center text-gray-500 font-bold text-sm group-hover:text-emerald-500 transition-colors border border-gray-800">
                          {index + 1}
                        </div>
                        <span className="font-bold text-gray-200 tracking-wide">{movie.title}</span>
                      </div>
                      <span className="text-emerald-500 text-xs font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        {movie.daily_views} Views
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-[#1a1c21] rounded-2xl border border-gray-800 shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-800 bg-[#141414]/50">
              <h2 className="text-xl font-bold text-white uppercase tracking-wide flex items-center gap-2">
                <Tv className="w-5 h-5 text-emerald-500" /> Top 10 Series Today
              </h2>
            </div>
            <div className="p-6 flex-1 max-h-80 overflow-y-auto">
              <div className="space-y-3">
                {dailyTopSeries.length === 0 ? (
                  <div className="text-gray-500 italic p-4 text-center">No views tracked today.</div>
                ) : (
                  dailyTopSeries.map((series, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-black border border-gray-800 hover:border-emerald-500/50 transition-colors duration-200 group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#1a1c21] rounded-lg flex items-center justify-center text-gray-500 font-bold text-sm group-hover:text-emerald-500 transition-colors border border-gray-800">
                          {index + 1}
                        </div>
                        <span className="font-bold text-gray-200 tracking-wide">{series.title}</span>
                      </div>
                      <span className="text-emerald-500 text-xs font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                        {series.daily_views} Views
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Most Watched All Time */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="bg-[#1a1c21] rounded-2xl border border-gray-800 shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-800 bg-[#141414]/50">
              <h2 className="text-xl font-bold text-white uppercase tracking-wide flex items-center gap-2">
                <Film className="w-5 h-5 text-[#E50914]" /> Top 10 Movies All-Time
              </h2>
            </div>
            <div className="p-6 flex-1 max-h-80 overflow-y-auto">
              <div className="space-y-3">
                {topMovies.length === 0 ? (
                  <div className="text-gray-500 italic p-4 text-center">No movies found.</div>
                ) : (
                  topMovies.map((movie, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-black border border-gray-800 hover:border-[#E50914]/50 transition-colors duration-200 group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#1a1c21] rounded-lg flex items-center justify-center text-gray-500 font-bold text-sm group-hover:text-[#E50914] transition-colors border border-gray-800">
                          {index + 1}
                        </div>
                        <span className="font-bold text-gray-200 tracking-wide">{movie.title}</span>
                      </div>
                      <span className="text-gray-400 text-xs font-bold bg-[#141414] px-3 py-1 rounded-full border border-gray-800">
                        {movie.views || 0} Views
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-[#1a1c21] rounded-2xl border border-gray-800 shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-800 bg-[#141414]/50">
              <h2 className="text-xl font-bold text-white uppercase tracking-wide flex items-center gap-2">
                <Tv className="w-5 h-5 text-[#E50914]" /> Top 10 Series All-Time
              </h2>
            </div>
            <div className="p-6 flex-1 max-h-80 overflow-y-auto">
              <div className="space-y-3">
                {topSeries.length === 0 ? (
                  <div className="text-gray-500 italic p-4 text-center">No series found.</div>
                ) : (
                  topSeries.map((series, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-black border border-gray-800 hover:border-[#E50914]/50 transition-colors duration-200 group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#1a1c21] rounded-lg flex items-center justify-center text-gray-500 font-bold text-sm group-hover:text-[#E50914] transition-colors border border-gray-800">
                          {index + 1}
                        </div>
                        <span className="font-bold text-gray-200 tracking-wide">{series.title}</span>
                      </div>
                      <span className="text-gray-400 text-xs font-bold bg-[#141414] px-3 py-1 rounded-full border border-gray-800">
                        {series.views || 0} Views
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminPanelLayout>
  );
}