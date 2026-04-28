"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import { InlineSpinner } from "./LoadingSpinner";

export function PopularPersonalities() {
  const [people, setPeople] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPeople() {
      try {
        const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
        if (!apiKey) {
           console.warn("No TMDB API Key provided");
           setLoading(false);
           return;
        }
        
        const res = await fetch(`https://api.themoviedb.org/3/person/popular?api_key=${apiKey}&language=en-US&page=1`);
        if (res.ok) {
           const data = await res.json();
           // Filter out people without profile pictures
           setPeople(data.results.filter((p: any) => p.profile_path).slice(0, 15));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchPeople();
  }, []);

  if (loading) return <div className="py-8"><InlineSpinner text="Loading personalities..." /></div>;
  if (people.length === 0) return null;

  return (
    <section className="mb-12 mt-8">
      <div className="container mx-auto px-4 md:px-12">
        <div className="flex items-center justify-between mb-8 border-b border-gray-800 pb-2">
          <h2 className="text-xl md:text-2xl font-bold text-white uppercase tracking-wide">Popular Personalities</h2>
          <a href="#" className="text-[#E50914] hover:text-[#b80710] text-sm font-semibold transition-colors uppercase tracking-wider">View All</a>
        </div>
        
        <Swiper
          modules={[Navigation]}
          navigation
          spaceBetween={20}
          slidesPerView={3.5}
          breakpoints={{
            480: { slidesPerView: 4.5 },
            768: { slidesPerView: 6.5 },
            1024: { slidesPerView: 8.5 },
            1280: { slidesPerView: 10.5 },
          }}
          className="streamit-row-swiper py-4"
        >
          {people.map((person) => (
            <SwiperSlide key={person.id}>
              <div className="flex flex-col items-center gap-4 group cursor-pointer">
                <div className="w-[80px] h-[80px] md:w-[110px] md:h-[110px] rounded-full overflow-hidden border-[3px] border-transparent group-hover:border-[#E50914] transition-all duration-300 shadow-xl relative bg-gray-800">
                  <Image 
                    src={`https://image.tmdb.org/t/p/w185${person.profile_path}`}
                    alt={person.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <h4 className="text-[10px] md:text-xs font-bold text-center text-white group-hover:text-[#E50914] transition-colors leading-tight px-1 uppercase tracking-wider">
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
