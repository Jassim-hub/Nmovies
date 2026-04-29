"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FullPageSpinner } from "@/components/LoadingSpinner";
import { Play, Download, ChevronLeft, ChevronRight, Calendar, Globe, Clock, Star, Plus, Share2, Heart } from "lucide-react";
import VideoPlayer from "@/components/VideoPlayer";
import { useAuth } from "@/components/AuthProvider";
import { getProfile, Profile } from '@/lib/profiles';
import AuthRequiredModal, { useAuthCheck } from '@/components/AuthRequiredModal';
import PremiumUpgradeModal from '@/components/PremiumUpgradeModal';
import { isStandardPremium } from "@/lib/isStandardPremium";
import { normalizeVideoUrl } from "@/lib/utils";
import { MovieCast } from "@/components/MovieCast";
import { StreamitHoverCard } from "@/components/StreamitHoverCard";
import { supabase, Series, SeriesWithVJ, Season, Episode, EpisodeWithSeason, MovieWithVJ } from "@/lib/supabase";
import { getRelatedMoviesByGenre } from '@/lib/api';
import { NetflixCard } from "@/components/NetflixCard";

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
  
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [allEpisodes, setAllEpisodes] = useState<EpisodeWithSeason[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<EpisodeWithSeason | null>(null);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isStandardPremiumUser, setIsStandardPremiumUser] = useState<boolean>(false);

  // Video Player States
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [isPlayingTrailer, setIsPlayingTrailer] = useState<boolean>(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState<boolean>(false);

  // Pagination for Episodes Grid
  const [currentPage, setCurrentPage] = useState(1);
  const [episodesPerPage] = useState(12);

  useEffect(() => {
    if (user) getProfile(user.id).then(setProfile);
  }, [user]);

  useEffect(() => {
    (async () => {
      if (!user) { setIsStandardPremiumUser(false); return; }
      const subscription = await (await import("@/lib/subscriptions")).getUserSubscription(user.id);
      setIsStandardPremiumUser(isStandardPremium(subscription));
    })();
  }, [user]);

  useEffect(() => {
    async function fetchSeries() {
      if (!params.id) return;

      try {
        const { data: seriesData, error } = await supabase
          .from('series')
          .select(`*, vjs:vj_id(id, name)`)
          .eq('id', params.id)
          .eq('published', true)
          .single();

        if (error || !seriesData) throw new Error('Series not found or not published');

        // Fetch seasons
        const { data: seasonsOnly, error: seasonsOnlyError } = await supabase
          .from('seasons')
          .select('*')
          .eq('series_id', params.id)
          .eq('published', true)
          .order('order', { ascending: true });

        let loadedEpisodes: EpisodeWithSeason[] = [];
        if (!seasonsOnlyError && seasonsOnly && seasonsOnly.length > 0) {
          const seasonsWithEpisodes = await Promise.all(
            seasonsOnly.map(async (season) => {
              const { data: episodes } = await supabase
                .from('episodes')
                .select('*')
                .eq('season_id', season.id)
                .eq('published', true)
                .order('episode_number', { ascending: true });
                
              const seasonEps = episodes || [];
              const mappedEps = seasonEps.map(e => ({
                  ...e,
                  seasonName: season.name || `Season ${season.order}`,
                  seasonOrder: season.order
              }));
              loadedEpisodes = [...loadedEpisodes, ...mappedEps];
              return { ...season, episodes: seasonEps };
            })
          );
          seriesData.seasons = seasonsWithEpisodes;
          setSeasons(seasonsWithEpisodes);
          setAllEpisodes(loadedEpisodes.sort((a, b) => {
             if (a.seasonOrder !== b.seasonOrder) return a.seasonOrder - b.seasonOrder;
             return a.episode_number - b.episode_number;
          }));
        } else {
          seriesData.seasons = [];
        }
        
        setSeries(seriesData);
        
        // Auto-play trailer if available
        if (seriesData.trailer_url) {
           setStreamUrl(normalizeVideoUrl(seriesData.trailer_url));
           setIsPlayingTrailer(true);
        }

        setLoading(false);

        // Fetch genres
        if (seriesData?.genre_ids && seriesData.genre_ids.length > 0) {
          const { data: genreData } = await supabase.from('genres').select('*').in('id', seriesData.genre_ids);
          setGenres(genreData || []);
          
          // Related Content
          const { data: related } = await supabase
            .from('series').select('*, vjs(name)').eq('published', true).neq('id', params.id)
            .overlaps('genre_ids', seriesData.genre_ids).order('created_at', { ascending: false }).limit(10);
          setRelatedSeries(related || []);

          try {
            const relatedMoviesData = await getRelatedMoviesByGenre(params.id as string, seriesData.genre_ids as string[], 10) as MovieWithVJ[];
            setRelatedMovies(relatedMoviesData || []);
          } catch (e) { }
        }

        if (seriesData?.vj_id) {
          const { data: vjData } = await supabase.from('vjs').select('*').eq('id', seriesData.vj_id).single();
          setVj(vjData);
        }

      } catch (error) {
        console.error('Error fetching series:', error);
        setLoading(false);
      }
    }
    fetchSeries();
  }, [params.id]);

  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showPremiumUpgradeModal, setShowPremiumUpgradeModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authAction, setAuthAction] = useState<'play' | 'download'>('play');

  const handleEpisodeSelect = (episode: EpisodeWithSeason) => {
    setSelectedEpisode(episode);
    
    // Check authentication
    if (!user?.id) {
      setAuthAction('play');
      setShowAuthModal(true);
      return;
    }

    // Check premium
    if (episode.premium && !isPremium) {
      setShowPremiumUpgradeModal(true);
      return;
    }

    if (!episode.video_url && !episode.videolink_url) {
      alert('This episode is not available for watching');
      return;
    }

    // Play the episode directly in the hero player
    setIsPlayingTrailer(false);
    const url = episode.video_url || episode.videolink_url;
    if (url) {
      setStreamUrl(normalizeVideoUrl(url));
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

  const handleDownload = async (episode: EpisodeWithSeason) => {
    setSelectedEpisode(episode);
    if (!user?.id) { setAuthAction('download'); setShowAuthModal(true); return; }
    if (episode.premium && !isPremium) { setShowPremiumUpgradeModal(true); return; }
    if (!isStandardPremiumUser) { setShowPremiumUpgradeModal(true); return; }
    setShowDownloadModal(true);
  };

  const handleDownloadNow = async () => {
    if (!selectedEpisode) return;
    const downloadUrl = selectedEpisode.videolink_url || selectedEpisode.video_url;
    if (!downloadUrl) return;
    let processedUrl = downloadUrl;
    if (processedUrl.startsWith('encrypted://') || processedUrl.startsWith('auth://')) {
      const urlPath = processedUrl.split('://')[1];
      const username = process.env.NEXT_PUBLIC_CADDY_USERNAME || "mat";
      const password = process.env.NEXT_PUBLIC_CADDY_PASSWORD || "MatTh3pAR";
      processedUrl = `https://${username}:${password}@${urlPath}`;
    }
    if (processedUrl.startsWith('http://') || processedUrl.startsWith('https://')) {
      const cleanSeriesTitle = series?.title.replace(/[^a-zA-Z0-9\s\-_.]/g, '').trim() || 'Series';
      const cleanEpisodeTitle = selectedEpisode.title.replace(/[^a-zA-Z0-9\s\-_.]/g, '').trim();
      const filename = `${cleanSeriesTitle} - S${selectedEpisode.seasonOrder}E${selectedEpisode.episode_number} - ${cleanEpisodeTitle}.mp4`;
      processedUrl = `/api/stream?url=${encodeURIComponent(processedUrl)}&filename=${encodeURIComponent(filename)}`;
    }
    const a = document.createElement('a');
    a.href = processedUrl;
    a.download = `${series?.title || 'Series'} - S${selectedEpisode.seasonOrder}E${selectedEpisode.episode_number} - ${selectedEpisode.title}.mp4`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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

            {/* Action Buttons */}
            <div className="flex items-center gap-4 flex-wrap">
               <Button 
                  onClick={() => {
                     if (allEpisodes.length > 0) handleEpisodeSelect(allEpisodes[0]);
                  }}
                  className="bg-[#E50914] hover:bg-[#b80710] text-white font-bold text-base md:text-lg px-10 py-7 rounded-lg shadow-[0_8px_25px_rgba(229,9,20,0.4)] flex items-center transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_35px_rgba(229,9,20,0.5)]"
               >
                  <Play className="w-6 h-6 mr-3 fill-current" /> 
                  Watch Episode 1
               </Button>
               <button className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-300 hover:scale-110">
                  <Plus className="w-6 h-6 text-white" />
               </button>
               <button className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-300 hover:scale-110">
                  <Share2 className="w-6 h-6 text-white" />
               </button>
               <button className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-300 hover:scale-110">
                  <Heart className="w-6 h-6 text-white" />
               </button>
            </div>
         </div>
      </section>

      {/* Casts & Directors Section pulled from TMDB */}
      <MovieCast title={series.title} type="series" />

      {/* Episodes Grid */}
      {allEpisodes.length > 0 && (
        <section className="w-full px-4 md:px-8 lg:px-12 xl:px-16 mt-8 mb-16">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl md:text-2xl font-bold border-b border-gray-800 pb-3 tracking-wide">Episodes ({allEpisodes.length})</h2>
            {selectedEpisode && (
              <div className="text-sm font-semibold text-gray-400 bg-gray-900/50 px-4 py-2 rounded-full">
                Watching: <span className="text-white">{selectedEpisode.seasonName} - E{selectedEpisode.episode_number}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 md:gap-5 mb-10">
            {currentEpisodes.map((episode) => (
              <div
                key={episode.id}
                className={`group relative bg-gray-800 rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:scale-105 ${
                  selectedEpisode?.id === episode.id ? 'ring-2 ring-[#E50914] bg-gray-700' : 'hover:bg-gray-700'
                }`}
                onClick={() => handleEpisodeSelect(episode)}
              >
                <div className="aspect-video bg-gray-900 relative">
                  <Image
                    src={episode.thumbnail_url || series.cover_image_url || `https://via.placeholder.com/300x169/141414/e50914?text=E${episode.episode_number}`}
                    alt={episode.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <div className="flex gap-2">
                      <button className="bg-[#E50914] hover:bg-[#b80710] text-white p-3 rounded-full transition-colors shadow-lg">
                        <Play size={16} fill="currentColor" />
                      </button>
                      <button 
                         onClick={(e) => { e.stopPropagation(); handleDownload(episode); }}
                         className="bg-gray-600 hover:bg-gray-500 text-white p-3 rounded-full transition-colors shadow-lg"
                      >
                         <Download size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-bold">
                    E{episode.episode_number}
                  </div>
                  {episode.premium && (
                    <div className="absolute top-2 right-2 bg-[#E50914] text-white px-2 py-1 rounded text-xs font-bold shadow-md">
                      PREMIUM
                    </div>
                  )}
                  {episode.duration && (
                    <div className="absolute bottom-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                      {episode.duration}m
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h4 className="font-semibold text-white text-sm mb-1 truncate">{episode.title}</h4>
                  <p className="text-gray-400 text-xs mb-2">{episode.seasonName}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                .map((page, i, arr) => (
                  <div key={page} className="flex items-center">
                    {i > 0 && arr[i - 1] !== page - 1 && <span className="px-2 text-gray-500">...</span>}
                    <button
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 rounded-lg transition-colors ${
                        currentPage === page ? 'bg-[#E50914] text-white' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                      }`}
                    >
                      {page}
                    </button>
                  </div>
                ))}
              <button
                onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </section>
      )}

      {/* Related Series */}
      <div className="w-full px-4 md:px-8 lg:px-12 xl:px-16 mt-16 bg-[#141414]">
        <h2 className="text-xl md:text-2xl font-bold mb-6 border-b border-gray-800 pb-3 tracking-wide">Related Series</h2>
        <div className="flex overflow-x-auto gap-4 md:gap-5 pb-6 scrollbar-hide">
          {relatedSeries.map((s) => (
            <div key={s.id} className="flex-shrink-0 w-[120px] md:w-[150px] lg:w-[160px]">
              <StreamitHoverCard content={{...s, type: 'series'}}>
                <NetflixCard content={s} type="series" />
              </StreamitHoverCard>
            </div>
          ))}
        </div>
      </div>

      {/* Related Movies */}
      <div className="w-full px-4 md:px-8 lg:px-12 xl:px-16 mt-12 mb-24 bg-[#141414]">
        <h2 className="text-xl md:text-2xl font-bold mb-6 border-b border-gray-800 pb-3 tracking-wide">Related Movies</h2>
        <div className="flex overflow-x-auto gap-4 md:gap-5 pb-6 scrollbar-hide">
          {relatedMovies.map((m) => (
            <div key={m.id} className="flex-shrink-0 w-[120px] md:w-[150px] lg:w-[160px]">
              <StreamitHoverCard content={{...m, type: 'movie'}}>
                <NetflixCard content={m} type="movie" />
              </StreamitHoverCard>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      {showDownloadModal && selectedEpisode && (
        <div className="fixed inset-0 bg-black/80 z-[1000] flex items-center justify-center">
          <div className="bg-[#141414] p-8 rounded-xl border border-[#E50914]/50 shadow-2xl max-w-sm w-full text-center">
            <h2 className="text-2xl font-bold mb-3 text-white">Download Episode</h2>
            <p className="mb-6 text-gray-200 font-semibold">S{selectedEpisode.seasonOrder}E{selectedEpisode.episode_number}: {selectedEpisode.title}</p>
            <Button
              className="w-full bg-[#E50914] hover:bg-[#b80710] text-white mb-3"
              onClick={handleDownloadNow}
              disabled={!selectedEpisode.video_url && !selectedEpisode.videolink_url}
            >
              {selectedEpisode.video_url || selectedEpisode.videolink_url ? "Download Now" : "No download available"}
            </Button>
            <Button className="w-full" variant="outline" onClick={() => setShowDownloadModal(false)}>Close</Button>
          </div>
        </div>
      )}
      <PremiumUpgradeModal isOpen={showPremiumUpgradeModal} onClose={() => setShowPremiumUpgradeModal(false)} />
      <AuthRequiredModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} action={authAction} requirePremium={Boolean(selectedEpisode?.premium)} />
    </div>
  );
}