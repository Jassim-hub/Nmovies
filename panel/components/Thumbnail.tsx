'use client'
import ResponsiveImage from "./ResponsiveImage";

interface ThumbnailProps {
  src: string;
  alt: string;
  aspectRatio?: 'square' | 'landscape';
  size?: number; // container size in pixels
  className?: string;
  priority?: boolean;
}

export default function Thumbnail({
  src,
  alt,
  aspectRatio = 'landscape',
  size = 112,
  className = '',
  priority = false,
}: ThumbnailProps) {
  const aspectClass = aspectRatio === 'square' ? 'aspect-square' : 'aspect-landscape';
  const containerStyle = { width: `${size}px` };
  const containerClasses = `${aspectClass} image-container ${className}`;
  
  return (
    <div className={containerClasses} style={containerStyle}>
      <ResponsiveImage
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={`${size}px`}
        className="rounded"
      />
    </div>
  );
}