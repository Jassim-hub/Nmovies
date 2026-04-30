'use client'
import ResponsiveImage from "./ResponsiveImage";

interface MoviePosterProps {
  src: string;
  alt: string;
  size?: 'small' | 'medium' | 'large';
  className?: string;
  priority?: boolean;
}

const sizeClasses = {
  small: 'w-24', // 96px
  medium: 'w-32', // 128px  
  large: 'w-48', // 192px
};

export default function MoviePoster({
  src,
  alt,
  size = 'medium',
  className = '',
  priority = false,
}: MoviePosterProps) {
  const containerClasses = `${sizeClasses[size]} aspect-poster image-container ${className}`;
  
  return (
    <div className={containerClasses}>
      <ResponsiveImage
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={`(max-width: 768px) ${size === 'small' ? '96px' : size === 'medium' ? '128px' : '192px'}, ${size === 'small' ? '96px' : size === 'medium' ? '128px' : '192px'}`}
        className="rounded"
      />
    </div>
  );
}