"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Play, Info, Plus, Star, Calendar, Globe, Clock, Share2, Heart } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

import { NetflixCard } from "@/components/NetflixCard";
import { StreamitHoverCard } from "@/components/StreamitHoverCard";
import { Top10Card } from "@/components/Top10Card";

import { InlineSpinner, FullPageSpinner } from "@/components/LoadingSpinner";
import { ShareButton } from "@/components/ShareButton";

import { useEffect, useState } from "react";
import { getVJContent } from "@/lib/api";
import { Movie, Series } from "@/lib/supabase";

import { useAuthCheck } from "@/components/AuthRequiredModal";
import AuthRequiredModal from "@/components/AuthRequiredModal";
import { useUserPreferences } from "@/lib/hooks/useUserPreferences";
import { supabase } from "@/lib/supabase";

export const dynamic = 'force-dynamic'

type VJContent = (Movie | Series) & {
  type: 'movie' | 'series';
  vjs: { id: string; name: string } | null;
  is_premium?: boolean;
};

// VJ Content card - Streamit design
const VJCard = ({ content }: { content: VJContent }) => (
  <div className="group relative block w-full bg-[#141414]">
    <Link href={`/${content.type === 'movie' ? 'movies' : 'series'}/${content.id}`} className="block relative h-full">
      <div className="cursor-pointer transition-all duration-300">
        <div className="aspect-[2/3] relative rounded-md overflow-hidden bg-[#141414] border-[2px] border-transparent transition-all duration-300 group-hover:border-[#E50914] mb-2 group-hover:shadow-[0_0_15px_rgba(229,9,20,0.4)]">
          <Image
            src={content.thumbnail_url || content.cover_image_url || `https://via.placeholder.com/240x360/1f2937/e50914?text=${encodeURIComponent(content.title)}`}
            alt={content.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-110"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `https://via.placeholder.com/240x360/1f2937/e50914?text=${encodeURIComponent(content.title)}`;
            }}
          />

          <div className="absolute top-2 left-2 bg-yellow-500 px-2 py-0.5 rounded text-[10px] font-bold text-black flex items-center gap-1 shadow-md z-10">
             <Star className="w-3 h-3 fill-black" />
             {('rating' in content && typeof content.rating === 'number') ? content.rating.toFixed(1) : (Math.random() * 2 + 7).toFixed(1)}
          </div>

          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
            <div className="bg-[#E50914] rounded-full w-10 h-10 flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform duration-300 delay-100">
               <Play fill="white" className="w-4 h-4 ml-0.5 text-white" />
            </div>
          </div>
        </div>
      </div>
    </Link>

    <div className="mt-2 px-1">
      <h3 className="font-semibold text-white text-sm truncate leading-tight hover:text-[#E50914] transition-colors">{content.title}</h3>
      <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-1 uppercase font-medium">
        {content.vjs && (
          <span className="text-[#E50914]">{content.vjs.name}</span>
        )}
        {content.vjs && content.release_date && (
          <span>•</span>
        )}
        {content.release_date && (
          <span>{new Date(content.release_date).getFullYear()}</span>
        )}
      </div>
    </div>
  </div>
);

export default function HomePage() {
  const [featuredContent, setFeaturedContent] = useState<VJContent[]>([]);
  const [latestMovies, setLatestMovies] = useState<any[]>([]);
  const [latestSeries, setLatestSeries] = useState<any[]>([]);
  const [genreRows, setGenreRows] = useState<{ name: string; movies: any[] }[]>([]);
  const [vjContent, setVJContent] = useState<VJContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [authModal, setAuthModal] = useState<{
    isOpen: boolean;
    action: 'play' | 'download';
    requirePremium?: boolean;
  }>({ isOpen: false, action: 'play' });

  const [genresLoaded, setGenresLoaded] = useState(false);

  // Auth hook
  const { checkAuth } = useAuthCheck();

  // User Preferences (Continue Watching & Watchlist)
  const { getAllContinueWatching, watchlist, isInWatchlist, addToWatchlist, removeFromWatchlist } = useUserPreferences();
  const continueWatching = getAllContinueWatching();
  const [watchlistItems, setWatchlistItems] = useState<any[]>([]);

  useEffect(() => {
    async function fetchWatchlistDetails() {
      if (!watchlist || watchlist.length === 0) {
        setWatchlistItems([]);
        return;
      }
      try {
        // Fetch all items from Reelplexi instead of Supabase
        const itemPromises = watchlist.map(async (id) => {
          let item = await (await import('@/lib/api')).getMovieById(id);
          if (item) return { ...item, type: 'movie' as const };
          
          item = await (await import('@/lib/api')).getSeriesById(id) as any;
          if (item) return { ...item, type: 'series' as const };
          
          return null;
        });
        
        const results = await Promise.all(itemPromises);
        const validItems = results.filter(Boolean);
        
        // Items are already in the order of the promises (which matches the watchlist array order).
        // Since we want the most recently added last (or first, depending on design), we'll just reverse the validItems
        setWatchlistItems(validItems.reverse());
      } catch (e) {
        console.error("Failed to fetch watchlist details", e);
      }
    }
    fetchWatchlistDetails();
  }, [watchlist]);

  useEffect(() => {
    async function fetchCriticalData() {
      try {
        const vjData = await getVJContent(8);
        setFeaturedContent(vjData.slice(0, 5) as any);
        setVJContent(vjData as any);
        setLoading(false); 

        const [latestMoviesData, latestSeriesData, genreRowsData] = await Promise.all([
          (await import('@/lib/api')).getMovies(12),
          (await import('@/lib/api')).getSeries(12),
          (await import('@/lib/api')).getGenreRowsForHome(12)
        ]);

        setLatestMovies(latestMoviesData);
        setLatestSeries(latestSeriesData);
        setGenreRows(genreRowsData);
        setGenresLoaded(true);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
        setGenresLoaded(true);
      }
    }
    fetchCriticalData();
  }, []);

  if (loading) {
    return <FullPageSpinner text="Loading home..." />;
  }

  // Interleave the latest movies and series to create a Top 10 list
  const top10Content = [];
  const maxLength = Math.max(latestMovies.slice(0, 5).length, latestSeries.slice(0, 5).length);
  for (let i = 0; i < maxLength; i++) {
     if (latestMovies[i]) top10Content.push(latestMovies[i]);
     if (latestSeries[i]) top10Content.push(latestSeries[i]);
  }
  const finalTop10 = top10Content.slice(0, 10);

  // Common swiper settings for rows
  const rowSwiperSettings = {
    modules: [Navigation],
    navigation: true,
    spaceBetween: 10,
    slidesPerView: 2.2,
    breakpoints: {
      480: { slidesPerView: 3.2 },
      768: { slidesPerView: 4.2 },
      1024: { slidesPerView: 5.2 },
      1280: { slidesPerView: 6.2 },
    },
    className: "streamit-row-swiper"
  };

  return (
    <>
      <div className="min-h-screen bg-[#141414] text-white pb-16">
        {/* SEO: Primary heading for search engines - visually hidden but crawlable */}
        <h1 className="sr-only">NicholMoviesUg - Watch Translated Movies and TV Shows Online in Uganda | nicholmoviesug.com</h1>
        {/* Streamit-style Hero Banner */}
        <section className="relative h-[60vh] md:h-[80vh] w-full overflow-hidden">
          {featuredContent.length > 0 && (
            <Swiper
              modules={[Navigation, Pagination, Autoplay, EffectFade]}
              effect="fade"
              navigation
              pagination={{ clickable: true }}
              autoplay={{ delay: 5000, disableOnInteraction: false }}
              className="w-full h-full streamit-hero-swiper"
            >
              {featuredContent.map((content) => (
                <SwiperSlide key={content.id}>
                  <div className="absolute inset-0">
                    <Image
                      src={content.cover_image_url || `https://via.placeholder.com/1920x1080/141414/e50914?text=${encodeURIComponent(content.title)}`}
                      alt={content.title}
                      fill
                      className="object-cover"
                      priority
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://via.placeholder.com/1920x1080/141414/e50914?text=${encodeURIComponent(content.title)}`;
                      }}
                    />
                    {/* Exact Streamit gradients */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/40 to-transparent z-0"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#141414]/80 via-transparent to-transparent z-0"></div>
                  </div>

                  {/* Hero Content - Positioned Bottom Left */}
                  <div className="relative z-10 flex items-end h-full pb-16 md:pb-24">
                    <div className="container mx-auto px-4 md:px-12">
                      <div className="max-w-3xl">
                        <h1 className="text-4xl md:text-5xl lg:text-7xl font-black mb-2 text-white leading-tight tracking-tight drop-shadow-2xl">
                          {content.title}
                        </h1>

                        <p className="text-sm md:text-base mb-6 text-gray-200 leading-relaxed max-w-2xl font-medium drop-shadow-xl line-clamp-3 md:line-clamp-2">
                          {content.description || "Experience the best in entertainment with stunning visuals and captivating storytelling."}
                        </p>

                        <div className="flex flex-wrap items-center gap-6 mb-8 text-xs md:text-sm font-bold text-gray-300">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-[#E50914]" />
                            {content.release_date ? new Date(content.release_date).getFullYear() : "2024"}
                          </div>
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-[#E50914]" />
                            English
                          </div>
                          {'duration' in content && (content as any).duration && (
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-[#E50914]" />
                              {(content as any).duration}m
                            </div>
                          )}
                        </div>

                        <div 
                          className="flex items-center gap-4 relative z-50 swiper-no-swiping"
                          onClick={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              isInWatchlist(content.id) ? removeFromWatchlist(content.id) : addToWatchlist(content.id);
                            }}
                            className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all duration-300 backdrop-blur-md cursor-pointer"
                            aria-label={isInWatchlist(content.id) ? "Remove from Watchlist" : "Add to Watchlist"}
                          >
                            {isInWatchlist(content.id) ? (
                              <Heart className="w-5 h-5 md:w-6 md:h-6 text-[#E50914] fill-current" />
                            ) : (
                              <Plus className="w-5 h-5 md:w-6 md:h-6 text-white" />
                            )}
                          </button>
                          
                          <Button
                            size="lg"
                            className="font-bold px-8 md:px-10 py-6 md:py-7 rounded bg-[#E50914] text-white hover:bg-[#b80710] transition-all duration-300 flex items-center shadow-[0_8px_25px_rgba(229,9,20,0.4)] hover:scale-105 active:scale-95 cursor-pointer"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const authCheck = checkAuth(content.is_premium || false);
                              if (!authCheck.allowed) {
                                setAuthModal({
                                  isOpen: true,
                                  action: 'play',
                                  requirePremium: authCheck.reason === 'premium_required'
                                });
                              } else {
                                window.location.href = `/${content.type === 'movie' ? 'movies' : 'series'}/${content.id}`;
                              }
                            }}
                          >
                            <Play className="w-4 h-4 md:w-5 md:h-5 mr-3 fill-current" />
                            PLAY NOW
                          </Button>

                          <div onClick={(e) => e.stopPropagation()} className="cursor-pointer">
                            <ShareButton 
                              title={content.title} 
                              url={`${typeof window !== 'undefined' ? window.location.origin : ''}/${content.type === 'movie' ? 'movies' : 'series'}/${content.id}`}
                              variant="icon" 
                              className="!w-10 !h-10 md:!w-12 md:!h-12 backdrop-blur-md"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          )}
        </section>

        {/* Dynamic Content Layers */}
        <div className="relative z-20 mt-4 md:mt-8 pb-8 space-y-4 md:space-y-6">
          
          {/* Top 10 Row */}
          {finalTop10.length > 0 && (
            <section className="mb-4">
              <div className="container mx-auto px-4 md:px-12">
                <div className="flex items-center justify-between mb-2 md:mb-4 border-b border-gray-800 pb-2">
                  <h2 className="text-xl md:text-2xl font-bold text-white uppercase tracking-wide">Top 10</h2>
                </div>
                
                <Swiper 
                  {...rowSwiperSettings} 
                  spaceBetween={5}
                  breakpoints={{
                    480: { slidesPerView: 2.5 },
                    768: { slidesPerView: 3.5 },
                    1024: { slidesPerView: 4.5 },
                    1280: { slidesPerView: 5.5 },
                  }}
                  className="streamit-row-swiper"
                >
                  {finalTop10.map((item, i) => (
                    <SwiperSlide key={`top10-${item.id}`}>
                      <Top10Card content={item} index={i + 1} />
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            </section>
          )}

          {/* Continue Watching Row */}
          {continueWatching.length > 0 && (
            <section className="mb-8">
              <div className="container mx-auto px-4 md:px-12">
                <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-2">
                  <h2 className="text-xl md:text-2xl font-bold text-white uppercase tracking-wide">Continue Watching</h2>
                </div>
                
                <Swiper 
                  {...rowSwiperSettings} 
                  className="streamit-row-swiper"
                >
                  {continueWatching.map((item) => {
                    const percentComplete = Math.round((item.progress / item.duration) * 100) || 0;
                    return (
                      <SwiperSlide key={`continue-${item.id}`}>
                        <div className="group relative block w-full bg-[#141414]">
                          <Link href={`/${item.type === 'movie' ? 'movies' : 'series'}/${item.id}`} className="block relative h-full">
                            <div className="cursor-pointer transition-all duration-300">
                              <div className="aspect-[2/3] relative rounded-md overflow-hidden bg-[#141414] border-[2px] border-transparent transition-all duration-300 group-hover:border-[#E50914] mb-2">
                                <Image
                                  src={item.poster_url || `https://via.placeholder.com/240x360/1f2937/e50914?text=${encodeURIComponent(item.title || '')}`}
                                  alt={item.title}
                                  fill
                                  className="object-cover transition-transform duration-500 group-hover:scale-110"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = `https://via.placeholder.com/240x360/1f2937/e50914?text=${encodeURIComponent(item.title || '')}`;
                                  }}
                                />
                                {/* Play overlay */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
                                  <div className="bg-[#E50914] rounded-full w-10 h-10 flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform duration-300 delay-100">
                                    <Play fill="white" className="w-4 h-4 ml-0.5 text-white" />
                                  </div>
                                </div>
                                {/* Progress bar */}
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-600/80 z-20">
                                  <div className="h-full bg-[#E50914]" style={{ width: `${percentComplete}%` }}></div>
                                </div>
                              </div>
                            </div>
                          </Link>
                          <div className="mt-1">
                            <h3 className="font-medium text-white text-xs truncate leading-tight group-hover:text-[#E50914] transition-colors">{item.title}</h3>
                            {item.season && item.episode && (
                              <p className="text-[10px] text-gray-400 mt-0.5 font-medium">S{item.season} E{item.episode}</p>
                            )}
                          </div>
                        </div>
                      </SwiperSlide>
                    );
                  })}
                </Swiper>
              </div>
            </section>
          )}

          {/* My Watchlist Row */}
          {watchlistItems.length > 0 && (
            <section className="mb-8">
              <div className="container mx-auto px-4 md:px-12">
                <div className="flex items-center justify-between mb-4 border-b border-gray-800 pb-2">
                  <h2 className="text-xl md:text-2xl font-bold text-white uppercase tracking-wide">My Watchlist</h2>
                  <Link href="/profile" className="text-[#E50914] hover:text-[#b80710] text-sm font-semibold transition-colors uppercase tracking-wider">Manage</Link>
                </div>
                
                <Swiper 
                  {...rowSwiperSettings} 
                  className="streamit-row-swiper"
                >
                  {watchlistItems.map((item) => (
                    <SwiperSlide key={`watchlist-${item.id}`}>
                      <StreamitHoverCard content={item}>
                        <NetflixCard content={item} type={item.type} />
                      </StreamitHoverCard>
                    </SwiperSlide>
                  ))}
                </Swiper>
              </div>
            </section>
          )}

          {/* VJ Movies & Series */}
          <section className="mb-12">
            <div className="container mx-auto px-4 md:px-12">
              <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-2">
                <h2 className="text-xl md:text-2xl font-bold text-white uppercase tracking-wide">VJ Movies & Series</h2>
              </div>

              {vjContent.length > 0 ? (
                <Swiper {...rowSwiperSettings}>
                  {vjContent.map((content) => (
                    <SwiperSlide key={content.id}>
                      <StreamitHoverCard content={content}>
                        <VJCard content={content} />
                      </StreamitHoverCard>
                    </SwiperSlide>
                  ))}
                </Swiper>
              ) : (
                <div className="py-8"><InlineSpinner text="Loading VJ Content..." /></div>
              )}
            </div>
          </section>

          {/* Latest Movies */}
          <section className="mb-12">
            <div className="container mx-auto px-4 md:px-12">
              <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-2">
                <h2 className="text-xl md:text-2xl font-bold text-white uppercase tracking-wide">Latest Movies</h2>
                <Link href="/movies" className="text-[#E50914] hover:text-[#b80710] text-sm font-semibold transition-colors uppercase tracking-wider">View All</Link>
              </div>
              
              {latestMovies.length > 0 ? (
                <Swiper {...rowSwiperSettings}>
                  {latestMovies.map((movie) => (
                    <SwiperSlide key={movie.id}>
                      <StreamitHoverCard content={movie}>
                        <NetflixCard content={movie} type="movie" />
                      </StreamitHoverCard>
                    </SwiperSlide>
                  ))}
                </Swiper>
              ) : (
                <div className="py-8"><InlineSpinner text="Loading latest movies..." /></div>
              )}
            </div>
          </section>

          {/* Latest Series */}
          <section className="mb-12">
            <div className="container mx-auto px-4 md:px-12">
              <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-2">
                <h2 className="text-xl md:text-2xl font-bold text-white uppercase tracking-wide">Latest Series</h2>
                <Link href="/series" className="text-[#E50914] hover:text-[#b80710] text-sm font-semibold transition-colors uppercase tracking-wider">View All</Link>
              </div>
              
              {latestSeries.length > 0 ? (
                <Swiper {...rowSwiperSettings}>
                  {latestSeries.map((show) => (
                    <SwiperSlide key={show.id}>
                      <StreamitHoverCard content={show}>
                        <NetflixCard content={show} type="series" />
                      </StreamitHoverCard>
                    </SwiperSlide>
                  ))}
                </Swiper>
              ) : (
                <div className="py-8"><InlineSpinner text="Loading latest series..." /></div>
              )}
            </div>
          </section>

          {/* Genre Rows & Dynamic Injection */}
          {genreRows.length > 0 ? (
            genreRows.map((genre) => (
              <React.Fragment key={genre.name}>
                <section className="mb-12">
                  <div className="container mx-auto px-4 md:px-12">
                    <div className="flex items-center justify-between mb-6 border-b border-gray-800 pb-2">
                      <h2 className="text-xl md:text-2xl font-bold text-white uppercase tracking-wide">{genre.name} Movies</h2>
                      <Link href="/movies" className="text-[#E50914] hover:text-[#b80710] text-sm font-semibold transition-colors uppercase tracking-wider">View All</Link>
                    </div>
                    
                    <Swiper {...rowSwiperSettings}>
                      {genre.movies.map((item) => (
                        <SwiperSlide key={item.id}>
                          <StreamitHoverCard content={item}>
                            <NetflixCard content={item} type={item.type} />
                          </StreamitHoverCard>
                        </SwiperSlide>
                      ))}
                    </Swiper>
                  </div>
                </section>


              </React.Fragment>
            ))
          ) : !genresLoaded ? (
            <div className="flex justify-center w-full py-12">
              <InlineSpinner text="Loading genre collections..." />
            </div>
          ) : null}
        </div>
      </div>

      {/* Auth Required Modal */}
      <AuthRequiredModal
        isOpen={authModal.isOpen}
        onClose={() => setAuthModal({ ...authModal, isOpen: false })}
        action={authModal.action}
        requirePremium={authModal.requirePremium}
      />
    </>
  );
}