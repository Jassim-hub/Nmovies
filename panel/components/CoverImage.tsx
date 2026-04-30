'use client'
import ResponsiveImage from "./ResponsiveImage";

interface CoverImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  width?: number; // optional fixed width
  height?: number; // optional fixed height
}

export default function CoverImage({
  src,
  alt,
  className = '',
  priority = false,
  width,
  height,
}: CoverImageProps) {
  // If specific dimensions are provided, use them
  if (width && height) {
    const containerStyle = { width: `${width}px`, height: `${height}px` };
    return (
      <div className={`image-container ${className}`} style={containerStyle}>
        <ResponsiveImage
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={`${width}px`}
          className="rounded"
        />
      </div>
    );
  }

  // Default responsive behavior with 16:9 aspect ratio
  return (
    <div className={`aspect-landscape image-container ${className}`}>
      <ResponsiveImage
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="rounded"
      />
    </div>
  );
}