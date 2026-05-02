"use client";

import React, { useCallback } from 'react';
import { ArtPlayer } from './ArtPlayer';
import { EpisodeWithSeason } from '@/lib/supabase';

// Helper to extract YouTube video ID
const getYouTubeId = (url: string) => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]+)/);
  return match ? match[1] : null;
};

interface VideoPlayerProps {
  src: string;
  title?: string;
  poster?: string;
  onError?: (error: any) => void;
  onLoad?: () => void;
  onEnded?: () => void;
  subscriptionPlan?: string | null;
  isPremiumContent?: boolean;
  // Episodes overlay props
  episodes?: EpisodeWithSeason[];
  currentEpisodeIndex?: number;
  onEpisodeSelect?: (episode: EpisodeWithSeason) => void;
  contentType?: string;
  initialTime?: number;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  title,
  poster,
  onError,
  onLoad,
  onEnded,
  subscriptionPlan,
  isPremiumContent = false,
  episodes = [],
  currentEpisodeIndex = -1,
  onEpisodeSelect,
  contentType,
  initialTime,
  onTimeUpdate
}) => {
  // Stabilize the onEnded callback to prevent unnecessary re-renders
  const stableOnEnded = useCallback(() => {
    if (onEnded) {
      onEnded();
    }
  }, [onEnded]);

  const youtubeId = src ? getYouTubeId(src) : null;

  if (youtubeId) {
    return (
      <div className="w-full h-full relative">
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=0&rel=0`}
          title={title || "YouTube video player"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full border-0 rounded-lg"
        />
      </div>
    );
  }

  return (
    <ArtPlayer
      key={`artplayer-${src}`}
      url={src}
      title={title}
      poster={poster}
      onEnded={stableOnEnded}
      className="w-full h-full"
      episodes={episodes}
      currentEpisodeIndex={currentEpisodeIndex}
      onEpisodeSelect={onEpisodeSelect}
      contentType={contentType}
      initialTime={initialTime}
      onTimeUpdate={onTimeUpdate}
    />
  );
};

export default VideoPlayer;
