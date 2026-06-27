"use client";

import { useParams, useRouter } from "next/navigation";
import React, { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FullPageSpinner } from "@/components/LoadingSpinner";
import { Play, Download, ChevronLeft, ChevronRight, Calendar, Globe, Clock, Star, Plus, Share2, Heart, LayoutList, Users, PlusCircle } from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";
import { useAuth } from "@/components/AuthProvider";
import { getProfile, Profile } from '@/lib/profiles';
import AuthRequiredModal, { useAuthCheck } from '@/components/AuthRequiredModal';

import { canUserDownload } from "@/lib/subscriptions";
import { normalizeVideoUrl } from "@/lib/utils";
import { MovieCast } from "@/components/MovieCast";
import { StreamitHoverCard } from "@/components/StreamitHoverCard";
import { supabase, Series, SeriesWithVJ, Season, Episode, EpisodeWithSeason, MovieWithVJ } from "@/lib/supabase";
import { getRelatedMoviesByGenre } from '@/lib/api';
import { NetflixCard } from "@/components/NetflixCard";
import { useUserPreferences } from "@/lib/hooks/useUserPreferences";
import { ShareButton } from "@/components/ShareButton";

export default function SeriesDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isPremium, loading: authLoading } = useAuth();
  const { checkAuth } = useAuthCheck();
  
  const [series, setSeries] = useState<Series | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedSeries, setRelatedSeries] = useState<SeriesWithVJ[]>([]);
  const [relatedMovies, setRelatedMovies] = useState<MovieWithVJ[]>([]);
  const [genres, setGenres] = useState<{ id: string; name: string }[]>([]);
  const [vj, setVj] = useState<{ id: string; name: string } | null>(null);
  const [relatedLoaded, setRelatedLoaded] = useState(false);
  
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [allEpisodes, setAllEpisodes] = useState<EpisodeWithSeason[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<EpisodeWithSeason | null>(null);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [canDownload, setCanDownload] = useState<boolean>(false);

  // Video Player States
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [isPlayingTrailer, setIsPlayingTrailer] = useState<boolean>(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState<boolean>(false);

  const { watchHistory, addToWatchlist, removeFromWatchlist, isInWatchlist, updateWatchProgress } = useUserPreferences();
  const progress = series ? watchHistory[series.id] : null;
  const initialTime = progress ? progress.progress : 0;
  const isWatchlisted = series ? isInWatchlist(series.id) : false;

  // Pagination for Episodes Grid
  const [currentPage, setCurrentPage] = useState(1);
  const [episodesPerPage] = useState(12);
  const [activeTab, setActiveTab] = useState<'episodes' | 'cast' | 'reviews' | 'related'>('episodes');
  const [activeSeasonId, setActiveSeasonId] = useState<string | null>(null);

  // Tracks the content key for which we have already successfully fetched data,
  // preventing redundant re-fetches caused by multiple Supabase auth state events.
  const dataFetchedRef = React.useRef<string | null>(null);

  useEffect(() => {
    if (user) getProfile(user.id).then(setProfile);
  }, [user]);

  useEffect(() => {
    (async () => {
      if (!user) { setCanDownload(false); return; }
      const allowed = await canUserDownload(user.id);
      setCanDownload(allowed);
    })();
  }, [user]);

  useEffect(() => {
    async function fetchSeriesData() {
      if (!params.id) return;

      if (dataFetchedRef.current === params.id) {
        return;
      }

      try {
        const api = await import('@/lib/api');
        const seriesData = await api.getSeriesById(params.id as string) as SeriesWithVJ;

        if (!seriesData) throw new Error('Series not found or not published');

        // Fetch seasons and episodes (getSeriesById in api.ts fetches seasons internally if it delegates to Reelplexi)
        // Wait, Reelplexi getReelplexiSeriesById only returns season summaries.
        // Let's assume seriesData.seasons contains the seasons. If not, we map over a mock or fetch them.
        let seasonsList: Season[] = [];
        let loadedEpisodes: EpisodeWithSeason[] = [];

        // If seriesData.seasons exists (from Reelplexi), fetch episodes for each
        if ((seriesData as any).seasons && (seriesData as any).seasons.length > 0) {
          seasonsList = (seriesData as any).seasons;
          // Derive the first season's ID from its actual season_number, not a hardcoded '1'.
          const firstSeasonRaw = seasonsList[0] as any;
          const firstSeasonNum = firstSeasonRaw.season_number || firstSeasonRaw.order || 1;
          setActiveSeasonId(firstSeasonRaw.id || String(firstSeasonNum));
          
          const seasonsWithEpisodes = await Promise.all(
            seasonsList.map(async (season: any) => {
              const seasonNum = season.season_number || season.order || 1;
              const seasonId = season.id || String(seasonNum);

              // Use already-embedded episodes if available (from normalizeReelplexiSeries),
              // otherwise fall back to the dedicated API call.
              let seasonEps: any[] = [];
              if (Array.isArray(season.episodes) && season.episodes.length > 0) {
                seasonEps = season.episodes;
              } else {
                seasonEps = await api.getEpisodes(params.id as string, seasonNum) || [];
              }

              const mappedEps = seasonEps.map((e: any) => ({
                ...e,
                seasonName: season.name || `Season ${seasonNum}`,
                seasonOrder: seasonNum,
                season_id: seasonId,
              })) as unknown as EpisodeWithSeason[];
              loadedEpisodes = [...loadedEpisodes, ...mappedEps];
              return { ...season, episodes: seasonEps, id: seasonId };
            })
          );
          (seriesData as any).seasons = seasonsWithEpisodes;
          setSeasons(seasonsWithEpisodes);
        } else {
          // Fallback if seasons are missing from getSeriesById: assume 1 season
          const episodes = await api.getEpisodes(params.id as string, 1);
          if (episodes.length > 0) {
            const seasonId = 'season-1';
            setActiveSeasonId(seasonId);
            const mappedEps = episodes.map((e: any) => ({
              ...e,
              seasonName: 'Season 1',
              seasonOrder: 1,
              season_id: seasonId
            })) as unknown as EpisodeWithSeason[];
            loadedEpisodes = [...mappedEps];
            const mockSeason = { id: seasonId, name: 'Season 1', order: 1, series_id: params.id as string, published: true, created_at: new Date().toISOString(), episodes } as Season & { episodes: any };
            (seriesData as any).seasons = [mockSeason];
            setSeasons([mockSeason]);
          } else {
            (seriesData as any).seasons = [];
          }
        }
        
        const allEps = loadedEpisodes.sort((a, b) => {
           if (a.seasonOrder !== b.seasonOrder) return a.seasonOrder - b.seasonOrder;
           return a.episode_number - b.episode_number;
        });
        setAllEpisodes(allEps);
        
        // Auto-select episode from progress or first episode
        const savedProgress = JSON.parse(localStorage.getItem('streamit_history') || '{}')[params.id as string];
        if (savedProgress && savedProgress.episode) {
           const epToSelect = allEps.find(e => e.seasonOrder === savedProgress.season && e.episode_number === savedProgress.episode);
           if (epToSelect) {
             setSelectedEpisode(epToSelect);
             setActiveSeasonId(epToSelect.season_id);
           }
        }
        
        setSeries(seriesData);

        // Track view (fire-and-forget)
        fetch('/api/track-view', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contentId: params.id,
            contentType: 'series',
            userId: user?.id || null,
          }),
        }).catch(() => {});

        // Fetch trailers from Reelplexi
        let trailerUrlStr = "";
        try {
          const trailers = await api.getSeriesTrailers(params.id as string);
          if (trailers && trailers.length > 0 && trailers[0].key) {
             trailerUrlStr = `https://www.youtube.com/watch?v=${trailers[0].key}`;
          }
        } catch (e) {
          console.error('Failed to fetch series trailers');
        }

        // Auto-play trailer if available
        if (trailerUrlStr) {
           setStreamUrl(trailerUrlStr);
           setIsPlayingTrailer(true);
        }

        setLoading(false);

        // Fetch genres and related content
        if (seriesData?.genre_ids && seriesData.genre_ids.length > 0) {
          const genreObjs = seriesData.genre_ids.map(g => ({ id: g, name: g.charAt(0).toUpperCase() + g.slice(1) }));
          setGenres(genreObjs);
          
          try {
            const relatedSeriesData = await api.getRelatedSeriesByGenre(params.id as string, seriesData.genre_ids as string[], 10) as SeriesWithVJ[];
            setRelatedSeries(relatedSeriesData || []);
          } catch (e) { }

          try {
            const relatedMoviesData = await api.getRelatedMoviesByGenre(params.id as string, seriesData.genre_ids as string[], 10) as MovieWithVJ[];
            setRelatedMovies(relatedMoviesData || []);
          } catch (e) { }
        }

        if (seriesData?.vj_id || seriesData?.vjs) {
          setVj(seriesData.vjs ? { id: (seriesData.vjs as any).id || '', name: seriesData.vjs.name } : { id: seriesData.vj_id || '', name: seriesData.vj_id || 'Unknown VJ' });
        }
        
        setRelatedLoaded(true);
        dataFetchedRef.current = params.id as string;

      } catch (error) {
        console.error('Error fetching series:', error);
        setLoading(false);
      }
    }
    fetchSeriesData();
  }, [params.id, user?.id]);

  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authAction, setAuthAction] = useState<'play' | 'download'>('play');

  const handleEpisodeSelect = async (episode: EpisodeWithSeason) => {
    setSelectedEpisode(episode);
    
    // Check authentication
    if (!user?.id) {
      setAuthAction('play');
      setShowAuthModal(true);
      return;
    }

    // Check premium
    if (episode.premium && !isPremium) {
      router.push('/payment');
      return;
    }

    // SECURITY: Fetch video URL from secure server API, not from client data
    setIsPlayingTrailer(false);
    try {
      const api = await import('@/lib/api');
      const streamData = await api.getEpisodeStream(params.id as string, episode.seasonOrder || 1, episode.episode_number);
      
      if (streamData && streamData.video_url) {
        setStreamUrl(streamData.video_url);
      } else {
        alert('This episode is not available for watching');
      }
    } catch (e) {
      console.error('Failed to fetch episode URL');
    }
    
    // Scroll to player
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // When trailer ends, auto-start Episode 1 if allowed
  const handleVideoEnded = useCallback(() => {
      if (isPlayingTrailer && allEpisodes.length > 0) {
          const firstEp = allEpisodes[0];
          if (!firstEp.premium || isPremium) {
             handleEpisodeSelect(firstEp);
          }
      }
  }, [isPlayingTrailer, allEpisodes, isPremium]);

  const handleTimeUpdate = useCallback((currentTime: number, duration: number) => {
    if (series && selectedEpisode && !isPlayingTrailer) {
      updateWatchProgress({
        id: series.id,
        type: 'series',
        progress: currentTime,
        duration: duration,
        timestamp: Date.now(),
        title: series.title,
        poster_url: series.thumbnail_url || series.cover_image_url,
        season: selectedEpisode.seasonOrder,
        episode: selectedEpisode.episode_number
      });
    }
  }, [series, selectedEpisode, isPlayingTrailer, updateWatchProgress]);

  const handleDownload = async (episode: EpisodeWithSeason) => {
    setSelectedEpisode(episode);
    if (!user?.id) { setAuthAction('download'); setShowAuthModal(true); return; }
    if (episode.premium && !isPremium) { router.push('/payment'); return; }
    if (!canDownload) { router.push('/payment'); return; }
    setShowDownloadModal(true);
  };

  const handleDownloadNow = async () => {
    if (!selectedEpisode) return;

    const cleanSeriesTitle = series?.title.replace(/[^a-zA-Z0-9\s\-_.]/g, '').trim() || 'Series';
    const cleanEpisodeTitle = selectedEpisode.title.replace(/[^a-zA-Z0-9\s\-_.]/g, '').trim();
    const filename = `${cleanSeriesTitle} - S${selectedEpisode.seasonOrder}E${selectedEpisode.episode_number} - ${cleanEpisodeTitle}.mp4`;

    // The API route redirects to the signed S3 URL which enforces the download
    const proxyUrl = `/api/download?id=${params.id}&type=episode&season=${selectedEpisode.seasonOrder || 1}&episode=${selectedEpisode.episode_number}&filename=${encodeURIComponent(filename)}`;
    window.open(proxyUrl, '_blank');

    setShowDownloadModal(false);
  };


  if (loading || authLoading) return <FullPageSpinner text="Loading series details..." />;

  if (!series) {
    return (
      <div className="min-h-screen bg-[#141414] text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Series Not Found</h1>
          <Button className="bg-[#E50914] hover:bg-[#b80710]" onClick={() => router.push("/")}>Back to Home</Button>
        </div>
      </div>
    );
  }

  const currentEpisodeIndex = selectedEpisode ? allEpisodes.findIndex(e => e.id === selectedEpisode.id) : -1;
  const coverImage = series.cover_image_url || `https://via.placeholder.com/1920x1080/141414/e50914?text=${encodeURIComponent(series.title)}`;

  // Pagination math
  const totalPages = Math.ceil(allEpisodes.length / episodesPerPage);
  const startIndex = (currentPage - 1) * episodesPerPage;
  const currentEpisodes = allEpisodes.slice(startIndex, startIndex + episodesPerPage);

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      
      {/* Massive Hero Video Player */}
      <section className="relative w-full aspect-video bg-black max-h-[85vh]">
         {streamUrl ? (
            <div className="w-full h-full relative group">
               <VideoPlayer 
                  src={streamUrl} 
                  title={selectedEpisode ? `${selectedEpisode.seasonName} E${selectedEpisode.episode_number}: ${selectedEpisode.title}` : series.title} 
                  onEnded={handleVideoEnded}
                  isPremiumContent={selectedEpisode?.premium || false}
                  poster={coverImage}
                  episodes={allEpisodes}
                  currentEpisodeIndex={currentEpisodeIndex}
                  onEpisodeSelect={handleEpisodeSelect}
                  contentType="series"
                  initialTime={(!isPlayingTrailer && selectedEpisode && progress && progress.episode === selectedEpisode.episode_number && progress.season === selectedEpisode.seasonOrder) ? initialTime : 0}
                  onTimeUpdate={handleTimeUpdate}
               />
               
               {isPlayingTrailer && (
                  <div className="absolute top-8 right-8 z-[50] pointer-events-none">
                     <span className="bg-black/60 text-white border border-white/20 px-4 py-2 rounded font-bold tracking-wider text-xs uppercase shadow-lg backdrop-blur-sm">
                        Series Trailer
                     </span>
                  </div>
               )}
            </div>
         ) : (
            <div className="w-full h-full relative">
               <Image src={coverImage} alt={series.title} fill className="object-cover opacity-50" priority />
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                     <p className="text-xl font-bold mb-4">Select an episode below to start watching</p>
                  </div>
               </div>
            </div>
         )}
      </section>

      {/* Streamit Styled Overview Section */}
      <section className="w-full px-4 md:px-8 lg:px-12 xl:px-16 pt-10 md:pt-14 pb-8">
         <div className="max-w-6xl">
            {/* Badges & Rate Row */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
               <div className="flex items-center gap-3 text-xs md:text-sm font-bold uppercase tracking-wider">
                  <span className="bg-[#1ABC9C] text-black px-2.5 py-1 rounded shadow-sm">Series</span>
                  <span className="text-gray-300 font-semibold">
                     {genres.length > 0 ? genres.map(g => g.name).join(" • ") : "Drama • Thriller"}
                  </span>
               </div>
               <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded transition-colors text-sm font-bold shadow-sm">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  Rate this
               </button>
            </div>

            {/* Action Buttons - Moved above the Title */}
            <div className="flex items-center gap-4 flex-wrap mb-8">
               <Button 
                  onClick={() => {
                     if (allEpisodes.length > 0) handleEpisodeSelect(allEpisodes[0]);
                  }}
                  className="bg-[#E50914] hover:bg-[#b80710] text-white font-bold text-base md:text-lg px-10 py-7 rounded-lg shadow-[0_8px_25px_rgba(229,9,20,0.4)] flex items-center transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_35px_rgba(229,9,20,0.5)]"
               >
                  <Play className="w-6 h-6 mr-3 fill-current" /> 
                  Watch Episode 1
               </Button>
               <button 
                  onClick={() => isWatchlisted ? removeFromWatchlist(series.id) : addToWatchlist(series.id, 'series')}
                  className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-300 hover:scale-110"
                  aria-label={isWatchlisted ? "Remove from Watchlist" : "Add to Watchlist"}
               >
                  {isWatchlisted ? <Heart className="w-6 h-6 text-[#E50914] fill-current" /> : <Plus className="w-6 h-6 text-white" />}
               </button>
               
               {/* Share Button */}
               <ShareButton title={series.title} variant="icon" />
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-black mb-3 text-white leading-tight drop-shadow-2xl tracking-tight">
               {series.title}
            </h1>
            <p className="text-[#1ABC9C] font-bold text-sm md:text-base mb-8 uppercase tracking-widest drop-shadow-sm">PG (Parental Guidance Suggested)</p>

            {/* Description */}
            <div className="mb-10 max-w-4xl">
               <p className={`text-gray-300 text-sm md:text-lg leading-relaxed font-medium ${isDescriptionExpanded ? '' : 'line-clamp-3 md:line-clamp-4'}`}>
                  {series.description || "No description provided."}
               </p>
               {series.description && series.description.length > 150 && (
                  <button 
                     onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                     className="text-[#E50914] mt-2 cursor-pointer font-bold hover:underline inline-flex items-center"
                  >
                     {isDescriptionExpanded ? "Show Less" : "Read More"}
                  </button>
               )}
            </div>

            {/* Meta Details Row */}
            <div className="flex flex-wrap items-center gap-6 md:gap-10 text-sm md:text-base font-semibold text-gray-200 mb-12 bg-gray-900/40 p-4 rounded-xl border border-gray-800/50 backdrop-blur-sm w-fit">
               <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  {series.release_date ? new Date(series.release_date).getFullYear() : "2024"}
               </div>
               <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-gray-400" />
                  English
               </div>
               <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  {seasons.length} Seasons
               </div>
               <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500 fill-current" />
                  {(Math.random() * 2 + 7).toFixed(1)} (IMDb)
               </div>
            </div>
         </div>
      </section>

      {/* Casts & Directors Section pulled from TMDB */}
      {/* Moving this inside the tabs system */}

      {/* Tabs Navigation */}
      <section className="w-full px-4 md:px-8 lg:px-12 xl:px-16 mt-8">
        <div className="flex items-center gap-8 md:gap-12 border-b border-gray-800/50 pb-4 mb-8 overflow-x-auto scrollbar-hide">
          {[
            { id: 'episodes', label: 'Episodes', icon: LayoutList },
            { id: 'cast', label: 'Casts & Directors', icon: Users },
            { id: 'reviews', label: 'Reviews', icon: Star },
            { id: 'related', label: 'More Like This', icon: PlusCircle },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 whitespace-nowrap pb-4 -mb-4 transition-all duration-300 relative group ${
                activeTab === tab.id ? 'text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-[#E50914]' : 'text-gray-400 group-hover:text-[#E50914]'}`} />
              <span className="text-sm md:text-base font-bold uppercase tracking-wider">{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E50914] shadow-[0_0_10px_rgba(229,9,20,0.8)]" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'episodes' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Season Selector */}
            <div className="flex gap-4 mb-8 overflow-x-auto scrollbar-hide">
              {seasons.map((season) => (
                <button
                  key={season.id}
                  onClick={() => setActiveSeasonId(season.id)}
                  className={`px-6 py-2 rounded font-bold text-sm transition-all duration-300 whitespace-nowrap ${
                    activeSeasonId === season.id 
                      ? 'bg-[#E50914] text-white shadow-lg shadow-[#E50914]/30' 
                      : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {season.name || `S${season.order}`}
                </button>
              ))}
            </div>

            {/* Episodes Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {allEpisodes
                .filter(ep => ep.season_id === activeSeasonId)
                .map((episode) => (
                <div
                  key={episode.id}
                  className="group flex flex-col bg-gray-900/30 rounded-xl overflow-hidden border border-white/5 hover:border-[#E50914]/30 transition-all duration-500"
                >
                  {/* Thumbnail Container */}
                  <div className="aspect-video relative overflow-hidden">
                    <Image
                      src={episode.thumbnail_url || series.cover_image_url || "/placeholder-episode.jpg"}
                      alt={episode.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    
                    {/* Watch Now Overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-center justify-center">
                      <button 
                        onClick={() => handleEpisodeSelect(episode)}
                        className="bg-[#E50914] text-white px-5 py-2 rounded font-bold text-xs flex items-center gap-2 transform translate-y-4 group-hover:translate-y-0 transition-all duration-500"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        Watch now
                      </button>
                    </div>

                    {/* Quick Watch button (bottom right) */}
                    <button 
                      onClick={() => handleEpisodeSelect(episode)}
                      className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md border border-white/10 hover:bg-[#E50914] transition-colors text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 opacity-100 group-hover:opacity-0 transition-opacity duration-300"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Watch now
                    </button>

                    {/* Premium/Crown Icon */}
                    {episode.premium && (
                      <div className="absolute top-4 right-4 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shadow-lg">
                        <Star className="w-3 h-3 text-white fill-current" />
                      </div>
                    )}
                  </div>

                  {/* Content Container */}
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-gray-500 text-xs font-bold">
                        {series.release_date || "2024-04-13"}
                      </span>
                      {/* Download Button for Episode */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDownload(episode); }}
                        className="text-gray-400 hover:text-white transition-colors"
                        title="Download Episode"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                    <h3 className="text-white font-bold text-lg mb-3 group-hover:text-[#E50914] transition-colors line-clamp-1">
                      S{episode.seasonOrder} E{episode.episode_number} {episode.title}
                    </h3>
                    <p className="text-gray-400 text-sm leading-relaxed mb-4 line-clamp-2">
                      {episode.description || "A thrilling expedition into the story unfolds as new worlds are discovered in this action-packed adventure."}
                    </p>
                    <div className="mt-auto flex items-center justify-between">
                      <button className="text-[#E50914] text-xs font-bold hover:underline">Read More</button>
                      <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">{episode.duration || "03h 10m"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'cast' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <MovieCast title={series.title} type="series" hideTitle />
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 py-12 text-center bg-gray-900/20 rounded-2xl border border-dashed border-gray-800">
            <Star className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-400 mb-2">No Reviews Yet</h3>
            <p className="text-gray-500 max-w-md mx-auto">Be the first to share your thoughts about {series.title}!</p>
            <Button variant="outline" className="mt-6 border-gray-700 hover:bg-white/5">Write a Review</Button>
          </div>
        )}

        {activeTab === 'related' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              {relatedSeries.map((s) => (
                <div key={s.id} className="transition-transform duration-300 hover:scale-105">
                  <StreamitHoverCard content={{...s, type: 'series'}}>
                    <NetflixCard content={s} type="series" />
                  </StreamitHoverCard>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>


      {/* Related Series */}
      {(!relatedLoaded || relatedSeries.length > 0) && (
        <div className="w-full px-4 md:px-8 lg:px-12 xl:px-16 mt-16 bg-[#141414]">
          <h2 className="text-xl md:text-2xl font-bold mb-6 border-b border-gray-800 pb-3 tracking-wide">Related Series</h2>
          <div className="flex overflow-x-auto gap-4 md:gap-5 pb-6 scrollbar-hide">
            {relatedSeries.length > 0 ? (
              relatedSeries.map((s) => (
                <div key={s.id} className="flex-shrink-0 w-[120px] md:w-[150px] lg:w-[160px]">
                  <StreamitHoverCard content={{...s, type: 'series'}}>
                    <NetflixCard content={s} type="series" />
                  </StreamitHoverCard>
                </div>
              ))
            ) : (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[120px] md:w-[150px]">
                  <div className="aspect-[2/3] rounded-lg bg-gray-800/30 animate-pulse"></div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Related Movies */}
      {(!relatedLoaded || relatedMovies.length > 0) && (
        <div className="w-full px-4 md:px-8 lg:px-12 xl:px-16 mt-12 mb-24 bg-[#141414]">
          <h2 className="text-xl md:text-2xl font-bold mb-6 border-b border-gray-800 pb-3 tracking-wide">Related Movies</h2>
          <div className="flex overflow-x-auto gap-4 md:gap-5 pb-6 scrollbar-hide">
            {relatedMovies.length > 0 ? (
              relatedMovies.map((m) => (
                <div key={m.id} className="flex-shrink-0 w-[120px] md:w-[150px] lg:w-[160px]">
                  <StreamitHoverCard content={{...m, type: 'movie'}}>
                    <NetflixCard content={m} type="movie" />
                  </StreamitHoverCard>
                </div>
              ))
            ) : (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-[120px] md:w-[150px]">
                  <div className="aspect-[2/3] rounded-lg bg-gray-800/30 animate-pulse"></div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showDownloadModal && selectedEpisode && (
        <div className="fixed inset-0 bg-black/80 z-[1000] flex items-center justify-center">
          <div className="bg-[#141414] p-8 rounded-xl border border-[#E50914]/50 shadow-2xl max-w-sm w-full text-center">
            <h2 className="text-2xl font-bold mb-3 text-white">Download Episode</h2>
            <p className="mb-6 text-gray-200 font-semibold">S{selectedEpisode.seasonOrder}E{selectedEpisode.episode_number}: {selectedEpisode.title}</p>
            <Button
              className="w-full bg-[#E50914] hover:bg-[#b80710] text-white mb-3"
              onClick={handleDownloadNow}
            >
              Download Now
            </Button>
            <Button className="w-full" variant="outline" onClick={() => setShowDownloadModal(false)}>Close</Button>
          </div>
        </div>
      )}

      <AuthRequiredModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} action={authAction} requirePremium={Boolean(selectedEpisode?.premium)} />
    </div>
  );
}