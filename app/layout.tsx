import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { AuthProvider } from "@/components/AuthProvider";
import ConditionalLayout from "../components/ConditionalLayout";
import Script from "next/script";

const roboto = Roboto({
  weight: ['100', '300', '400', '500', '700', '900'],
  subsets: ["latin"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: {
    default: 'NicholMoviesUg - Watch Translated Movies & TV Shows Online in Uganda',
    template: '%s | NicholMoviesUg',
  },
  description: 'NicholMoviesUg is Uganda\'s #1 premium streaming platform. Watch blockbuster movies and TV shows translated by top VJs like VJ Junior, VJ Jjingo, ICE P, and more. Stream the best Ugandan translated movies online at nicholmoviesug.com.',
  keywords: 'nicholmoviesug, nicholmovies, NicholMoviesUg, NicholMovies, nichol movies, nichol movies ug, nicholmoviesug.com, watch movies online Uganda, translated movies Uganda, VJ Junior movies, VJ Jjingo movies, ICE P movies, Ugandan translated movies, premium streaming Uganda, movies in luganda, luganda movies online, stream movies Uganda, watch translated movies, Uganda movie streaming',
  applicationName: 'NicholMoviesUg',
  authors: [{ name: 'NicholMoviesUg' }],
  generator: 'Next.js',
  publisher: 'NicholMoviesUg',
  creator: 'NicholMoviesUg',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://nicholmoviesug.com'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: 'NicholMoviesUg - Watch Translated Movies & TV Shows Online',
    description: 'NicholMoviesUg is Uganda\'s #1 premium movie streaming platform. Watch blockbuster movies translated by VJ Junior, VJ Jjingo, ICE P and more.',
    url: 'https://nicholmoviesug.com',
    siteName: 'NicholMoviesUg',
    images: [
      {
        url: '/logo.jpeg',
        width: 800,
        height: 600,
        alt: 'NicholMoviesUg - Uganda Premium Movie Streaming',
      },
    ],
    locale: 'en_UG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NicholMoviesUg - Watch Translated Movies & TV Shows Online',
    description: 'Uganda\'s #1 premium streaming platform. Watch movies translated by VJ Junior, VJ Jjingo, ICE P and more.',
    images: ['/logo.jpeg'],
    site: '@nicholmoviesug',
  },
  icons: {
    icon: '/logo.jpeg',
    apple: '/logo.jpeg',
  },
  // PWA manifest
  manifest: '/manifest.json',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'ng4R7NM6MuDzTtbHaQRZL9I0J7yFZ-itKgF-12hIQWo',
  },
};

// JSON-LD Structured Data for rich Google results
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebSite',
      '@id': 'https://nicholmoviesug.com/#website',
      url: 'https://nicholmoviesug.com',
      name: 'NicholMoviesUg',
      alternateName: ['NicholMovies', 'Nichol Movies', 'NicholMoviesUg.com', 'nicholmoviesug'],
      description: 'Uganda\'s #1 premium movie streaming platform with translated movies by top VJs.',
      publisher: { '@id': 'https://nicholmoviesug.com/#organization' },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://nicholmoviesug.com/search?q={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
      inLanguage: 'en-UG',
    },
    {
      '@type': 'Organization',
      '@id': 'https://nicholmoviesug.com/#organization',
      name: 'NicholMoviesUg',
      alternateName: ['NicholMovies', 'Nichol Movies UG'],
      url: 'https://nicholmoviesug.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://nicholmoviesug.com/logo.jpeg',
        width: 800,
        height: 600,
      },
      sameAs: [],
    },
    {
      '@type': 'WebPage',
      '@id': 'https://nicholmoviesug.com/#webpage',
      url: 'https://nicholmoviesug.com',
      name: 'NicholMoviesUg - Watch Translated Movies & TV Shows Online in Uganda',
      isPartOf: { '@id': 'https://nicholmoviesug.com/#website' },
      about: { '@id': 'https://nicholmoviesug.com/#organization' },
      description: 'NicholMoviesUg is Uganda\'s #1 premium streaming platform. Watch blockbuster movies and TV shows translated by top VJs.',
      inLanguage: 'en-UG',
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={roboto.variable}>
      <head>
        {/* PWA meta tags */}
        <meta name="theme-color" content="#E50914" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="NicholMovies" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/logo.jpeg" />
        <link rel="apple-touch-startup-image" href="/logo.jpeg" />
      </head>
      {/* 
        Streamit uses #141414 for background natively or completely black, 
        but we'll define bg-streamit-bg for exact match 
      */}
      <body className="min-h-screen bg-[#141414] text-white flex flex-col font-roboto antialiased">
        <Script
          id="json-ld-structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          strategy="afterInteractive"
        />
        {/* Register PWA service worker */}
        <Script
          id="register-sw"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.warn('SW registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
        <AuthProvider>
          <ConditionalLayout>{children}</ConditionalLayout>
        </AuthProvider>
      </body>
    </html>
  );
}