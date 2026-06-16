import { ImageLoaderProps } from 'next/image';

export function customImageLoader({ src, width, quality }: ImageLoaderProps): string {
  // For local PNG images that have Sharp compatibility issues, return the original src
  if (src.startsWith('./icon/') || src.includes('icon/')) {
    return src;
  }
  
  // For remote images, use the default loader
  return `${process.env.NEXT_PUBLIC_API_URL}${src}?w=${width}&q=${quality || 75}`;
}

export function getImageProps(src: string | { src: string }, alt: string, width: number, height: number, className?: string) {
  const srcString = typeof src === 'string' ? src : src.src;
  
  return {
    src: srcString,
    alt,
    width,
    height,
    className,
    unoptimized: srcString.startsWith('./icon/') || srcString.includes('icon/'), // Disable optimization for local icons
  };
}
