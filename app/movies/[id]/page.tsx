"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";
import { supabase, MovieWithVJ, SeriesWithVJ } from "@/lib/supabase";
import AuthRequiredModal, { useAuthCheck } from '@/components/AuthRequiredModal';

import { FullPageSpinner, InlineSpinner } from "@/components/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { NetflixCard } from "@/components/NetflixCard";
import { canUserDownload } from "@/lib/subscriptions";
import VideoPlayer from "@/components/VideoPlayer";
import { normalizeVideoUrl } from "@/lib/utils";
import { MovieCast } from "@/components/MovieCast";
import { StreamitHoverCard } from "@/components/StreamitHoverCard";
import { Calendar, Globe, Clock, Star, Heart, Plus, SkipForward, Play, Check } from "lucide-react";
import { useUserPreferences } from "@/lib/hooks/useUserPreferences";
import { ShareButton } from "@/components/ShareButton";

export default function MovieDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading, isPremium } = useAuth();
  const { checkAuth } = useAuthCheck();

  const [movie, setMovie] = useState<MovieWithVJ | null>(null);
  const [canDownload, setCanDownload] = useState<boolean>(false);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authAction, setAuthAction] = useState<'play' | 'download'>('play');
  
  const [related, setRelated] = useState<MovieWithVJ[]>([]);
  const [relatedSeries, setRelatedSeries] = useState<SeriesWithVJ[]>([]);
  const [genres, setGenres] = useState<{ id: string; name: string }[]>([]);
  const [vj, setVj] = useState<{ id: string; name: string } | null>(null);
  const [relatedLoaded, setRelatedLoaded] = useState(false);

  // Video Player states
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [isPlayingTrailer, setIsPlayingTrailer] = useState<boolean>(false);
  const [hasRights, setHasRights] = useState<boolean>(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState<boolean>(false);

  const { watchHistory, addToWatchlist, removeFromWatchlist, isInWatchlist, updateWatchProgress } = useUserPreferences();
  const progress = movie ? watchHistory[movie.id] : null;
  const initialTime = progress ? progress.progress : 0;
  const isWatchlisted = movie ? isInWatchlist(movie.id) : false;

  useEffect(() => {
    (async () => {
      if (!user) { setCanDownload(false); return; }
      const allowed = await canUserDownload(user.id);
      setCanDownload(allowed);
    })();
  }, [user]);

  useEffect(() => {
    async function fetchCriticalData() {
      setLoading(true);
      setError(null);
      if (!params?.id) {
        setError("No movie ID provided");
        setLoading(false);
        return;
      }

      // 1. Fetch movie display data from Reelplexi
      const api = await import('@/lib/api');
      const data = await api.getMovieById(params.id as string) as MovieWithVJ;

      if (!data) {
        setError("Movie not found");
        setLoading(false);
        return;
      }
      
      setMovie(data);

      // Track view (fire-and-forget)
      fetch('/api/track-view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentId: params.id,
          contentType: 'movie',
          userId: user?.id || null,
        }),
      }).catch(() => {}); // silently ignore errors

      // Fetch trailers from Reelplexi
      let trailerUrlStr = "";
      try {
        const trailers = await api.getMovieTrailers(params.id as string);
        if (trailers && trailers.length > 0 && trailers[0].key) {
           trailerUrlStr = `https://www.youtube.com/watch?v=${trailers[0].key}`;
        }
      } catch (e) {
        console.error('Failed to fetch trailers');
      }

      // 2. Determine Video Player State based on Auth
      const authResult = checkAuth(data.premium);
      setHasRights(authResult.allowed);

      if (!authResult.allowed) {
         // No rights: Play Trailer Only
         if (trailerUrlStr) {
            setStreamUrl(trailerUrlStr);
            setIsPlayingTrailer(true);
         }
      } else {
         // Has rights: Play Trailer first (if available), then fetch secure video URL
         if (trailerUrlStr) {
            setStreamUrl(trailerUrlStr);
            setIsPlayingTrailer(true);
         }
         // Fetch the actual video URL from Reelplexi
         try {
           const streamData = await api.getMovieStream(params.id as string);
           if (streamData && streamData.video_url && !trailerUrlStr) {
             setStreamUrl(streamData.video_url);
             setIsPlayingTrailer(false);
           }
         } catch (e) {
           console.error('Failed to fetch Reelplexi video URL');
         }
      }

      setLoading(false);

      // 3. Progressive background fetches
      const promises = [];
      if (data.genre_ids && data.genre_ids.length > 0) {
        // Mock genres if needed or fetch actual genre names. Reelplexi genres are usually already strings mapped.
        const genreObjs = data.genre_ids.map(g => ({ id: g, name: g.charAt(0).toUpperCase() + g.slice(1) }));
        setGenres(genreObjs);

        promises.push(
          api.getRelatedMoviesByGenre(params.id as string, data.genre_ids, 6)
            .then(relatedMovies => setRelated((relatedMovies || []) as unknown as MovieWithVJ[]))
        );
        promises.push(
          api.getRelatedSeriesByGenre(params.id as string, data.genre_ids, 6)
            .then(relatedSeriesData => setRelatedSeries((relatedSeriesData || []) as any[]))
        );
      }
      if (data.vj_id || data.vjs) {
         setVj(data.vjs ? { id: (data.vjs as any).id || '', name: data.vjs.name } : { id: data.vj_id || '', name: data.vj_id || 'Unknown VJ' });
      }
      await Promise.all(promises);
      setRelatedLoaded(true);
    }
    fetchCriticalData();
  }, [params.id, user, isPremium]);

  const handleSkipTrailer = useCallback(async () => {
     // Gate access the same way Watch Now does
     if (!hasRights) {
        const authResult = checkAuth(movie?.premium ?? false);
        if (authResult.reason === 'auth_required') {
           setAuthAction('play');
           setShowAuthModal(true);
        } else {
           // Logged in but missing premium
           router.push('/payment');
        }
        return;
     }
     if (movie) {
        // Fetch from secure API
        try {
          const api = await import('@/lib/api');
          const streamData = await api.getMovieStream(movie.id);
          if (streamData && streamData.video_url) {
            setIsPlayingTrailer(false);
            setStreamUrl(streamData.video_url);
          }
        } catch (e) {
          console.error('Failed to fetch video URL');
        }
     }
  }, [hasRights, movie, checkAuth, router]);

  const handleVideoEnded = useCallback(() => {
     if (isPlayingTrailer && hasRights) {
        handleSkipTrailer();
     }
  }, [isPlayingTrailer, hasRights, handleSkipTrailer]);

  const handleDownload = async () => {
    if (!user?.id) { setAuthAction('download'); setShowAuthModal(true); return; }
    if (movie?.premium && !isPremium) { router.push('/payment'); return; }
    if (!canDownload) { router.push('/payment'); return; }
    setShowDownloadModal(true);
  };

  const handleTimeUpdate = useCallback((currentTime: number, duration: number) => {
    if (movie && !isPlayingTrailer && hasRights) {
      updateWatchProgress({
        id: movie.id,
        type: 'movie',
        progress: currentTime,
        duration: duration,
        timestamp: Date.now(),
        title: movie.title,
        poster_url: movie.thumbnail_url || movie.cover_image_url
      });
    }
  }, [movie, isPlayingTrailer, hasRights, updateWatchProgress]);

  const handleWatchButtonClick = () => {
      if (!hasRights) {
         setAuthAction('play');
         setShowAuthModal(true);
         return;
      }
      
      if (isPlayingTrailer) {
         handleSkipTrailer();
      }
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading || authLoading) return <FullPageSpinner text="Loading movie details..." />;
  if (error || !movie) {
    return (
      <div className="min-h-screen bg-[#141414] text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{error || "Movie Not Found"}</h1>
          <Button className="bg-[#E50914] hover:bg-[#b80710]" onClick={() => router.push("/")}>Back to Home</Button>
        </div>
      </div>
    );
  }

  const coverImage = movie.cover_image_url || `https://via.placeholder.com/1920x1080/141414/e50914?text=${encodeURIComponent(movie.title)}`;

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      
      {/* Massive Hero Video Player */}
      <section className="relative w-full aspect-video bg-black max-h-[85vh]">
         {streamUrl ? (
            <div className="w-full h-full relative group">
               <VideoPlayer 
                  src={streamUrl} 
                  title={movie.title} 
                  onEnded={handleVideoEnded}
                  isPremiumContent={movie.premium}
                  poster={coverImage}
                  initialTime={!isPlayingTrailer ? initialTime : 0}
                  onTimeUpdate={handleTimeUpdate}
               />
               
               {/* Skip Trailer Overlay — visible to all; access is gated on click */}
               {isPlayingTrailer && (
                  <div className="absolute bottom-20 right-8 z-[100] transition-opacity duration-300">
                     <Button 
                        onClick={handleSkipTrailer} 
                        className="bg-[#E50914] hover:bg-[#b80710] text-white font-bold px-6 py-5 text-sm md:text-base rounded shadow-2xl flex items-center shadow-[#E50914]/50"
                     >
                        Skip Trailer <SkipForward className="ml-2 w-4 h-4 md:w-5 md:h-5 fill-current" />
                     </Button>
                  </div>
               )}
               {/* Unauthenticated / No Rights Trailer Badge */}
               {isPlayingTrailer && !hasRights && (
                  <div className="absolute top-8 right-8 z-[50] pointer-events-none">
                     <span className="bg-black/60 text-white border border-white/20 px-4 py-2 rounded font-bold tracking-wider text-xs uppercase shadow-lg backdrop-blur-sm">
                        Playing Trailer
                     </span>
                  </div>
               )}
            </div>
         ) : (
            <div className="w-full h-full relative">
               <Image src={coverImage} alt={movie.title} fill className="object-cover opacity-50" priority />
               <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                     <p className="text-xl font-bold mb-4">Video currently unavailable</p>
                     {!hasRights && (
                        <Button onClick={() => router.push('/payment')} className="bg-[#E50914]">Subscribe to Watch</Button>
                     )}
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
                  <span className="bg-white text-black px-2.5 py-1 rounded shadow-sm">U/A 18+</span>
                  <span className="text-gray-300 font-semibold">
                     {genres.length > 0 ? genres.map(g => g.name).join(" • ") : "Action • Thriller"}
                  </span>
               </div>
               <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded transition-colors text-sm font-bold shadow-sm">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  Rate this
               </button>
            </div>

            {/* Action Buttons - Moved above the Title */}
            <div className="flex items-center gap-2 md:gap-4 flex-wrap mb-8">
               <Button 
                  onClick={handleWatchButtonClick}
                  className="bg-[#E50914] hover:bg-[#b80710] text-white font-bold text-sm md:text-lg px-4 py-6 md:px-10 md:py-7 rounded-lg shadow-[0_8px_25px_rgba(229,9,20,0.4)] flex items-center transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_35px_rgba(229,9,20,0.5)]"
               >
                  <Play className="w-5 h-5 md:w-6 md:h-6 mr-1.5 md:mr-3 fill-current" /> 
                  Watch now
               </Button>
               <button 
                  onClick={() => isWatchlisted ? removeFromWatchlist(movie.id) : addToWatchlist(movie.id, 'movie')}
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-300 hover:scale-110 flex-shrink-0"
                  aria-label={isWatchlisted ? "Remove from Watchlist" : "Add to Watchlist"}
               >
                  {isWatchlisted ? <Check className="w-5 h-5 md:w-6 md:h-6 text-[#E50914]" /> : <Plus className="w-5 h-5 md:w-6 md:h-6 text-white" />}
               </button>
               
               {/* Download and Share buttons on same line */}
               <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Download Button */}
                  <Button 
                     variant="outline"
                     onClick={handleDownload}
                     className="border-gray-600 text-gray-300 hover:text-white hover:bg-gray-800 flex h-12 md:h-14 px-3 md:px-8 text-xs md:text-base font-bold rounded-lg transition-colors"
                  >
                     <svg className="w-4 h-4 md:w-5 md:h-5 mr-1.5 md:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                     </svg>
                     Download
                  </Button>
                  
                  {/* Share Button */}
                  <ShareButton title={movie.title} variant="icon" />
               </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-black mb-3 text-white leading-tight drop-shadow-2xl tracking-tight">
               {movie.title}
            </h1>
            <p className="text-[#1ABC9C] font-bold text-sm md:text-base mb-8 uppercase tracking-widest drop-shadow-sm">PG (Parental Guidance Suggested)</p>

            {/* Description */}
            <div className="mb-10 max-w-4xl">
               <p className={`text-gray-300 text-sm md:text-lg leading-relaxed font-medium ${isDescriptionExpanded ? '' : 'line-clamp-3 md:line-clamp-4'}`}>
                  {movie.description || "No description provided."}
               </p>
               {movie.description && movie.description.length > 150 && (
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
                  {movie.release_date ? new Date(movie.release_date).getFullYear() : "2024"}
               </div>
               <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-gray-400" />
                  English
               </div>
               <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  {movie.duration ? `${Math.floor(movie.duration / 60)}h ${movie.duration % 60}m` : "01h 44m"}
               </div>
               <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500 fill-current" />
                  {(Math.random() * 2 + 7).toFixed(1)} (IMDb)
               </div>
            </div>
         </div>
      </section>

      {/* Casts & Directors Section pulled from TMDB */}
      <MovieCast title={movie.title} />

      {/* Related Movies */}
      {(!relatedLoaded || related.length > 0) && (
        <div className="w-full px-4 md:px-8 lg:px-12 xl:px-16 mt-8 bg-[#141414]">
          <h2 className="text-xl md:text-2xl font-bold mb-6 border-b border-gray-800 pb-3 tracking-wide">Related Movies</h2>
          <div className="flex overflow-x-auto gap-4 md:gap-5 pb-6 scrollbar-hide">
            {related.length > 0 ? (
              related.map((r) => (
                <div key={r.id} className="flex-shrink-0 w-[120px] md:w-[150px] lg:w-[160px]">
                  <StreamitHoverCard content={{...r, type: 'movie'}}>
                    <NetflixCard content={r} type="movie" />
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

      {/* Related Series */}
      {(!relatedLoaded || relatedSeries.length > 0) && (
        <div className="w-full px-4 md:px-8 lg:px-12 xl:px-16 mt-12 mb-24 bg-[#141414]">
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

      {/* Modals */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black/80 z-[1000] flex items-center justify-center">
          <div className="bg-[#141414] p-8 rounded-xl border border-[#E50914]/50 shadow-2xl max-w-sm w-full text-center">
            <h2 className="text-2xl font-bold mb-3 text-white">Download Movie</h2>
            <Button
              className="w-full bg-[#E50914] hover:bg-[#b80710] text-white mb-3"
              onClick={() => {
                const cleanTitle = movie.title.replace(/[^a-zA-Z0-9\s\-_.]/g, '').trim();
                const filename = `${cleanTitle}.mp4`;
                // The API route redirects to the signed S3 URL which enforces the download
                const proxyUrl = `/api/download?id=${movie.id}&type=movie&filename=${encodeURIComponent(filename)}`;
                window.open(proxyUrl, '_blank');
                setShowDownloadModal(false);
              }}
            >
              Download Now
            </Button>
            <Button className="w-full" variant="outline" onClick={() => setShowDownloadModal(false)}>Close</Button>
          </div>
        </div>
      )}


      <AuthRequiredModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} action={authAction} requirePremium={false} />
    </div>
  );
}