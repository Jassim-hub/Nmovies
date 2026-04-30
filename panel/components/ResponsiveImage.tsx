'use client'
import Image from "next/image";
import { useState } from "react";

interface ResponsiveImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  priority?: boolean;
  sizes?: string;
  fill?: boolean;
  width?: number;
  height?: number;
}

export default function ResponsiveImage({
  src,
  alt,
  className = "",
  fallbackSrc = "/assets/images/placeholder.png",
  priority = false,
  sizes,
  fill = false,
  width,
  height,
}: ResponsiveImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
      setHasError(false);
    } else {
      setHasError(true);
    }
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  if (hasError) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-gray-500 text-sm">Image not available</span>
      </div>
    );
  }

  const imageProps = {
    src: imgSrc,
    alt,
    onError: handleError,
    onLoad: handleLoad,
    priority,
    sizes,
    className: `${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`,
  };

  if (fill) {
    return (
      <Image
        {...imageProps}
        fill
        style={{ objectFit: 'cover' }}
      />
    );
  }

  if (width && height) {
    return (
      <Image
        {...imageProps}
        width={width}
        height={height}
        style={{ width: 'auto', height: 'auto' }}
      />
    );
  }

  // Default case - use fill with container sizing
  return (
    <Image
      {...imageProps}
      fill
      style={{ objectFit: 'cover' }}
    />
  );
}