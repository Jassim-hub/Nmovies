"use client";

import { useState, useRef, ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Play, Plus, Star, Crown, Clock, Globe } from "lucide-react";

interface HoverCardProps {
  children: ReactNode;
  content: any; // The movie/series content
}

function ExpandedCard({ content, rect, onMouseLeave, onMouseEnter }: { content: any, rect: DOMRect, onMouseLeave: () => void, onMouseEnter: () => void }) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const expandedWidth = 280;
  
  useEffect(() => {
    // trigger animation frame for scale-in effect
    requestAnimationFrame(() => setMounted(true));
  }, []);

  // Calculate position to center the larger card over the original card
  let left = rect.left + window.scrollX - (expandedWidth - rect.width) / 2;
  let top = rect.top + window.scrollY - 40; // slightly lift it up

  // clamp to viewport so it doesn't overflow screen edges
  if (left < 20) left = 20;
  if (left + expandedWidth > window.innerWidth - 20) left = window.innerWidth - expandedWidth - 20;

  // Media fallback
  // SECURITY: Only use trailer_url for previews — never raw video_url
  const videoUrl = content.trailer_url || null; 
  const coverUrl = content.cover_image_url || content.thumbnail_url || content.poster_url || `https://via.placeholder.com/640x360/1f2937/e50914?text=${encodeURIComponent(content.title || '')}`;

  const navUrl = `/${content.type === 'movie' || !content.type ? 'movies' : 'series'}/${content.id}`;

  return (
    <div 
      className={`absolute z-[9999] bg-[#1a1a1a] rounded-xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-gray-800 flex flex-col transition-all duration-300 origin-center ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${expandedWidth}px`,
      }}
      onMouseLeave={onMouseLeave}
      onMouseEnter={onMouseEnter}
    >
      {/* Top half: Media - INCREASED HEIGHT */}
      <div className="relative w-full aspect-[4/3] bg-black group cursor-pointer" onClick={() => router.push(navUrl)}>
        {videoUrl && !videoFailed ? (
          <video 
            src={videoUrl}
            autoPlay 
            muted 
            loop 
            playsInline
            className="w-full h-full object-cover"
            onError={() => setVideoFailed(true)}
          />
        ) : (
          <Image src={coverUrl} alt={content.title || "Cover"} fill className="object-cover" />
        )}
        
        {/* Unmute text (top right) - only when video is playing */}
        {videoUrl && !videoFailed && (
          <div className="absolute top-3 right-3 text-white/80 text-[10px] font-semibold tracking-widest uppercase hover:text-[#E50914] transition-colors bg-black/40 px-2 py-1 rounded z-10">
            Unmute
          </div>
        )}

        {/* Rating & Premium Badges (bottom) */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 w-[calc(100%-24px)] justify-between z-10">
          <div className="flex gap-2">
            <div className="bg-yellow-500 px-2 py-0.5 rounded text-[10px] font-bold text-black flex items-center gap-1 shadow-md">
               <Star className="w-3 h-3 fill-black" />
               {(Math.random() * 2 + 7).toFixed(1)}
            </div>
            {content.vjs?.name && (
              <div className="bg-[#E50914] px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-md uppercase tracking-wider">
                {content.vjs.name}
              </div>
            )}
          </div>
          {(content.premium || content.is_premium) && (
             <div className="bg-[#d4a017] px-1 py-0.5 rounded-full text-black shadow-md flex items-center gap-0.5">
                <Crown className="w-1.5 h-1.5 fill-current" />
                <span className="text-[5px] font-bold uppercase tracking-wider">Premium</span>
             </div>
          )}
        </div>
      </div>

      {/* Bottom half: Metadata - INCREASED PADDING */}
      <div className="p-3.5 flex flex-col gap-2.5">
        {/* Genres */}
        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-2 line-clamp-1">
           {content.vjs?.name ? (
              <>
                 <span className="text-[#E50914]">{content.vjs.name}</span>
                 <span className="w-1 h-1 rounded-full bg-gray-500"></span>
              </>
           ) : null}
           Action <span className="w-1 h-1 rounded-full bg-gray-500"></span> Drama
        </div>

        {/* Title */}
        <h3 className="text-white font-bold text-base leading-tight line-clamp-1" title={content.title}>
          {content.title}
        </h3>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-xs text-gray-300 font-medium">
          <div className="flex items-center gap-1.5">
             <Clock className="w-3 h-3 text-gray-400" />
             {content.duration ? `${Math.floor(content.duration / 60)}h ${content.duration % 60}m` : '02h 15m'}
          </div>
          <div className="flex items-center gap-1.5">
             <Globe className="w-3 h-3 text-gray-400" />
             English
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-1.5">
           <button className="w-9 h-9 flex-shrink-0 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shadow-inner border border-white/5">
              <Plus className="w-4 h-4 text-white" />
           </button>
           <button 
             onClick={() => router.push(navUrl)}
             className="flex-1 bg-[#E50914] hover:bg-[#b80710] text-white py-2.5 rounded-md font-bold text-sm transition-colors shadow-[0_4px_10px_rgba(229,9,20,0.4)]"
           >
              Watch now
           </button>
        </div>
      </div>
    </div>
  );
}

export function StreamitHoverCard({ children, content }: HoverCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      if (containerRef.current) {
        setRect(containerRef.current.getBoundingClientRect());
        setIsHovered(true);
      }
    }, 500); // 500ms delay mimics standard streaming platforms
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    // Add a tiny delay before closing so user can move mouse into the popup
    hoverTimeoutRef.current = setTimeout(() => {
       setIsHovered(false);
    }, 150);
  };

  // Close overlay on scroll to prevent detached rendering
  useEffect(() => {
    const handleScroll = () => {
      if (isHovered) {
        setIsHovered(false);
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHovered]);

  return (
    <div 
      className="relative w-full h-full group" 
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Base Card - Fade out slightly if overlay is active to avoid visual double-rendering behind it */}
      <div className={`transition-opacity duration-300 w-full h-full ${isHovered ? "opacity-0" : "opacity-100"}`}>
        {children}
      </div>

      {/* Portal ensures overlay breaks completely out of Swiper's overflow: hidden containers */}
      {isHovered && rect && createPortal(
        <ExpandedCard 
           content={content} 
           rect={rect} 
           onMouseEnter={() => {
              if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
           }}
           onMouseLeave={handleMouseLeave} 
        />,
        document.body
      )}
    </div>
  );
}
