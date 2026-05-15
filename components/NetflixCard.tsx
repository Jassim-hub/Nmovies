import Link from "next/link";
import Image from "next/image";
import { Movie, Series } from "@/lib/supabase";
import { Play, Star, Crown } from "lucide-react";
import React from "react";

// Streamit-style card component for both movies and series
type TMDBGenreMovie = {
  id: number | string;
  title?: string;
  poster_url?: string;
  cover_url?: string;
  description?: string;
  release_date?: string;
  thumbnail_url?: string;
  cover_image_url?: string;
};

type NetflixCardProps = {
  content: Movie | Series | TMDBGenreMovie;
  type: "movie" | "series";
  isNonTranslated?: boolean;
};

export const NetflixCard = ({ content, type, isNonTranslated = false }: NetflixCardProps) => {
  const getHref = () => {
    if (isNonTranslated) {
      return `/non-translated/${type === "movie" ? "movies" : "series"}/${content.id}`;
    }
    return `/${type === "movie" ? "movies" : "series"}/${content.id}`;
  };

  const getRating = () => {
    if ('rating' in content && typeof content.rating === 'number') {
      return content.rating.toFixed(1);
    }
    return (Math.random() * 2 + 7).toFixed(1);
  };

  const isPremium: boolean = Boolean(('premium' in content && content.premium) || ('is_premium' in content && content.is_premium));
  const vjName: string | null = ('vjs' in content && (content.vjs as any)?.name) ? (content.vjs as any).name : null;

  return (
    <div className="group relative block w-full bg-[#141414]">
      <Link href={getHref()} className="block relative h-full">
        <div className="cursor-pointer transition-all duration-300">
          <div className="aspect-[2/3] relative rounded-md overflow-hidden bg-[#141414] border-[2px] border-transparent transition-all duration-300 group-hover:border-[#E50914] mb-2">
            <Image
              src={
                content.thumbnail_url ||
                content.cover_image_url ||
                (('poster_url' in content && content.poster_url) ? content.poster_url : undefined) ||
                `https://via.placeholder.com/240x360/1f2937/e50914?text=${encodeURIComponent(content.title || '')}`
              }
              alt={content.title || `Poster for ${type}`}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-110"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://via.placeholder.com/240x360/1f2937/e50914?text=${encodeURIComponent(content.title || '')}`;
              }}
            />

            {/* Badges container - LEFT SIDE */}
            <div className="absolute top-1 left-1 sm:top-2 sm:left-2 flex flex-col gap-0.5 sm:gap-1 z-10">
              <div className="bg-yellow-500 px-1 sm:px-2 py-0.5 rounded text-[7px] sm:text-[10px] font-bold text-black flex items-center gap-0.5 shadow-md w-fit">
                <Star className="w-2 h-2 sm:w-3 sm:h-3 fill-black" />
                <span>{getRating()}</span>
              </div>
              {isPremium && (
                <div className="bg-[#d4a017] px-0.5 sm:px-1 py-[1px] sm:py-[2px] rounded text-[3px] sm:text-[5px] font-bold text-black shadow-md flex items-center gap-px sm:gap-0.5 w-fit uppercase tracking-wider">
                  <Crown className="w-1 h-1 sm:w-1.5 sm:h-1.5 fill-current" />
                  <span>Premium</span>
                </div>
              )}
            </div>

            {/* VJ Tag - TOP RIGHT CORNER */}
            {vjName && (
              <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 z-10">
                <div className="bg-[#E50914] px-1 sm:px-1.5 py-0.5 rounded text-[6px] sm:text-[8px] font-bold text-white shadow-lg uppercase tracking-wide max-w-[60px] sm:max-w-none truncate">
                  {vjName}
                </div>
              </div>
            )}

            {/* Icon overlay on hover - center play icon */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
              <div className="bg-[#E50914] rounded-full w-10 h-10 flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform duration-300 delay-100">
                <Play fill="white" className="w-4 h-4 ml-0.5 text-white" />
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Content info outside the card - more compact */}
      <div className="mt-1">
        <h3 className="font-medium text-white text-xs truncate leading-tight">{content.title}</h3>
        <div className="flex items-center justify-between text-[10px] mt-0.5">
          <div className="flex items-center gap-1 text-gray-400">
            {content.release_date && (
              <span>{new Date(content.release_date).getFullYear()}</span>
            )}
          </div>
          {vjName && (
            <span className="text-[#E50914] font-bold truncate max-w-[60%] text-right">
              {vjName}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
