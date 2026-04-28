import Link from "next/link";
import Image from "next/image";
import { Movie, Series } from "@/lib/supabase";
import { Play } from "lucide-react";

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

  return (
    <div className="group relative block w-full bg-[#141414]">
      <Link href={getHref()} className="block relative h-full">
      <div className="cursor-pointer transition-all duration-300">
        <div className="aspect-[2/3] relative rounded-md overflow-hidden bg-[#141414] border-[2px] border-transparent transition-all duration-300 group-hover:border-[#E50914] mb-2 group-hover:shadow-[0_0_15px_rgba(229,9,20,0.4)]">
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

          {/* Content type badge - smaller */}
          <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-sm text-[10px] font-bold tracking-wider uppercase z-10 ${
            type === "movie" ? "bg-[#E50914] text-white" : "bg-[#1ABC9C] text-white"
          }`}>
            {type === "movie" ? "Movie" : "Series"}
          </div>

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
      <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
        {content.release_date && (
          <span>{new Date(content.release_date).getFullYear()}</span>
        )}
      </div>
    </div>
  </div>
  );
};
