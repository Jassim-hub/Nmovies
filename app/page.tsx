"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Play, Info, Plus, Star } from "lucide-react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import "swiper/css/effect-fade";

import { NetflixCard } from "@/components/NetflixCard";
import { StreamitHoverCard } from "@/components/StreamitHoverCard";
import { Top10Card } from "@/components/Top10Card";
import { BackdropSlider } from "@/components/BackdropSlider";
import { PopularPersonalities } from "@/components/PopularPersonalities";
import { InlineSpinner, FullPageSpinner } from "@/components/LoadingSpinner";

import { useEffect, useState } from "react";
import { getVJContent } from "@/lib/api";
import { Movie, Series } from "@/lib/supabase";

import { useAuthCheck } from "@/components/AuthRequiredModal";
import AuthRequiredModal from "@/components/AuthRequiredModal";

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

  // Auth hook
  const { checkAuth } = useAuthCheck();

  useEffect(() => {
    async function fetchCriticalData() {
      try {
        const vjData = await getVJContent(8);
        setFeaturedContent(vjData.slice(0, 5));
        setVJContent(vjData);
        setLoading(false); 

        const [latestMoviesData, latestSeriesData, genreRowsData] = await Promise.all([
          (await import('@/lib/api')).getMovies(12),
          (await import('@/lib/api')).getSeries(12),
          (await import('@/lib/genre-home-supabase')).getGenreRowsForHomeSupabase(12)
        ]);

        setLatestMovies(latestMoviesData);
        setLatestSeries(latestSeriesData);
        setGenreRows(genreRowsData);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
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
    spaceBetween: 20,
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
                    <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/90 md:via-[#141414]/60 to-transparent w-full md:w-[70%] z-0"></div>
                    <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#141414] to-transparent z-0"></div>
                  </div>

                  {/* Hero Content */}
                  <div className="relative z-10 flex items-center h-full">
                    <div className="container mx-auto px-4 md:px-12">
                      <div className="max-w-3xl pt-16 md:pt-0">
                        <h1 className="text-4xl md:text-5xl lg:text-7xl font-black mb-4 text-white leading-tight uppercase tracking-wide drop-shadow-2xl">
                          {content.title}
                        </h1>

                        <div className="flex items-center gap-3 md:gap-4 mb-4 md:mb-6 text-sm font-medium">
                          {content.vjs && (
                            <span className="bg-[#E50914] text-white px-2 py-0.5 rounded-sm uppercase tracking-wider text-[10px] md:text-xs font-bold shadow-lg">
                              {content.vjs.name}
                            </span>
                          )}
                          <span className="text-[#1ABC9C] font-semibold uppercase">{content.type === 'movie' ? 'Movie' : 'Series'}</span>
                          {content.release_date && (
                            <span className="text-gray-300 font-semibold">{new Date(content.release_date).getFullYear()}</span>
                          )}
                          {'duration' in content && (content as any).duration && (
                            <span className="text-gray-300 font-semibold">{(content as any).duration}m</span>
                          )}
                        </div>

                        <p className="text-sm md:text-base mb-6 md:mb-8 text-gray-200 leading-relaxed max-w-xl font-normal drop-shadow-xl line-clamp-3 md:line-clamp-none">
                          {content.description || "Experience the best in entertainment with stunning visuals and captivating storytelling."}
                        </p>

                        <div className="flex flex-wrap gap-3 md:gap-4">
                          <Button
                            size="lg"
                            className="font-bold px-6 md:px-8 py-3 md:py-4 rounded bg-[#E50914] text-white hover:bg-[#b80710] transition-colors duration-300 flex items-center"
                            onClick={() => {
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
                            <Play className="w-4 h-4 md:w-5 md:h-5 mr-2 fill-current" />
                            PLAY NOW
                          </Button>
                          <Link href={`/${content.type === 'movie' ? 'movies' : 'series'}/${content.id}`}>
                            <Button size="lg" className="font-bold px-6 md:px-8 py-3 md:py-4 rounded bg-white/10 backdrop-blur-sm border border-white/30 text-white hover:bg-white hover:text-black transition-colors duration-300 flex items-center">
                              <Plus className="w-4 h-4 md:w-5 md:h-5 mr-2" />
                              MORE INFO
                            </Button>
                          </Link>
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

          {/* Random Backdrop Slider - uses featuredContent or latest items for images */}
          <BackdropSlider items={featuredContent.length > 0 ? featuredContent : latestMovies} />

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

                {/* Inject Popular Personalities immediately after the Action row */}
                {genre.name.toLowerCase() === 'action' && (
                  <PopularPersonalities />
                )}
              </React.Fragment>
            ))
          ) : (
            <div className="flex justify-center w-full py-12">
              <InlineSpinner text="Loading genre collections..." />
            </div>
          )}
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