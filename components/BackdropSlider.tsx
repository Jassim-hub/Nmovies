"use client";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";

export function BackdropSlider({ items }: { items: any[] }) {
  if (!items || items.length === 0) return null;
  
  return (
    <section className="w-full my-12 md:my-16 relative h-[20vh] md:h-[35vh] overflow-hidden">
      <Swiper
        modules={[Autoplay]}
        autoplay={{ delay: 6000, disableOnInteraction: false }}
        loop={true}
        className="w-full h-full"
      >
        {items.map((item, i) => {
           // Fallback logic to grab the widest possible image
           const imageUrl = item.cover_image_url || item.thumbnail_url || `https://via.placeholder.com/1920x600/141414/e50914?text=${encodeURIComponent(item.title)}`;
           return (
             <SwiperSlide key={i}>
                <div className="relative w-full h-full">
                   <Image 
                     src={imageUrl} 
                     alt={item.title || "Featured Backdrop"} 
                     fill 
                     className="object-cover" 
                   />
                   {/* Fade edges into the black background */}
                   <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-transparent to-[#141414] w-full"></div>
                </div>
             </SwiperSlide>
           )
        })}
      </Swiper>
    </section>
  )
}
