"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { InlineSpinner } from "./LoadingSpinner";

export function MovieCast({ title, type = 'movie', hideTitle = false }: { title: string, type?: 'movie' | 'series', hideTitle?: boolean }) {
  const [cast, setCast] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCast() {
      if (!title) {
         setLoading(false);
         return;
      }
      try {
        const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
        if (!apiKey) {
           console.warn("No TMDB API Key provided");
           setLoading(false);
           return;
        }
        
        // 1. Search for movie or tv
        const searchEndpoint = type === 'movie' ? 'search/movie' : 'search/tv';
        const searchRes = await fetch(`https://api.themoviedb.org/3/${searchEndpoint}?api_key=${apiKey}&query=${encodeURIComponent(title)}&language=en-US&page=1`);
        if (!searchRes.ok) return;
        const searchData = await searchRes.json();
        
        if (searchData.results && searchData.results.length > 0) {
           const mediaId = searchData.results[0].id;
           
           // 2. Get credits
           const credEndpoint = type === 'movie' ? `movie/${mediaId}/credits` : `tv/${mediaId}/credits`;
           const credRes = await fetch(`https://api.themoviedb.org/3/${credEndpoint}?api_key=${apiKey}&language=en-US`);
           if (!credRes.ok) return;
           const credData = await credRes.json();
           
           if (credData.cast) {
              setCast(credData.cast.filter((c: any) => c.profile_path).slice(0, 20));
           }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchCast();
  }, [title]);

  if (loading) return <div className="py-8"><InlineSpinner text="Loading cast..." /></div>;
  if (cast.length === 0) return null;

  return (
    <section className={`mb-12 mt-10 ${hideTitle ? 'bg-transparent' : 'bg-[#141414]'}`}>
      <div className={`w-full ${hideTitle ? '' : 'px-4 md:px-8 lg:px-12 xl:px-16'}`}>
        {!hideTitle && (
          <div className="flex items-center justify-start mb-8 border-b border-gray-800 pb-0">
            <div className="flex gap-8">
               <h2 className="text-base md:text-lg font-bold text-white tracking-widest border-b-[3px] border-[#E50914] pb-4 mb-[-2px] uppercase">Casts & Directors</h2>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-8">
           <h3 className="text-xl md:text-2xl font-bold text-white tracking-wide">Top Cast</h3>
           <a href="#" className="text-[#E50914] hover:text-[#b80710] text-sm md:text-base font-bold transition-colors uppercase tracking-widest">View All {'>'}</a>
        </div>

        <Swiper
          modules={[Navigation]}
          navigation
          spaceBetween={10}
          slidesPerView={4.5}
          breakpoints={{
            480: { slidesPerView: 5.5 },
            768: { slidesPerView: 7.5 },
            1024: { slidesPerView: 9.5 },
            1280: { slidesPerView: 10.5 },
          }}
          className="streamit-row-swiper py-2"
        >
          {cast.map((person) => (
            <SwiperSlide key={person.id}>
              <div className="flex flex-col items-center gap-3 group cursor-pointer">
                <div className="w-[70px] h-[70px] md:w-[90px] md:h-[90px] rounded-full overflow-hidden border-[2px] border-transparent group-hover:border-[#E50914] transition-all duration-300 shadow-lg relative bg-gray-800">
                  <Image 
                    src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                    alt={person.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <h4 className="text-[9px] md:text-xs font-bold text-center text-white group-hover:text-[#E50914] transition-colors leading-tight px-1">
                  {person.name}
                </h4>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </section>
  );
}
