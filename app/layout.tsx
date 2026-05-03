import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { AuthProvider } from "@/components/AuthProvider";
import ConditionalLayout from "../components/ConditionalLayout";

const roboto = Roboto({
  weight: ['100', '300', '400', '500', '700', '900'],
  subsets: ["latin"],
  variable: "--font-roboto",
});

export const metadata: Metadata = {
  title: 'NicholMoviesUg - The Home of Entertainment | Translated Movies',
  description: 'A world of block Buster movies, Tv Shows, translated movies by Uganda\'s top VJs like VJ Junior, VJ Jjingo, ICE P, and more. Watch the latest premium streaming entertainment in Uganda.',
  keywords: 'nicholmovies, Nicholmovies, NicholMovies, nicholmoviesug, translated movies, VJs, VJ junior, VJ jjingo, ICE P, Uganda Movies, Ugandan translated movies, premium streaming, movies in luganda',
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
    title: 'NicholMoviesUg - The Home of Entertainment',
    description: 'A world of block Buster movies, Tv Shows, translated movies by Uganda\'s top VJs like VJ Junior, VJ Jjingo, ICE P, and more.',
    url: 'https://nicholmoviesug.com',
    siteName: 'NicholMoviesUg',
    images: [
      {
        url: '/logo.png',
        width: 800,
        height: 600,
        alt: 'NicholMoviesUg Logo',
      },
    ],
    locale: 'en_UG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NicholMoviesUg - The Home of Entertainment',
    description: 'A world of block Buster movies, Tv Shows, translated movies by Uganda\'s top VJs.',
    images: ['/logo.png'],
  },
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={roboto.variable}>
      {/* 
        Streamit uses #141414 for background natively or completely black, 
        but we'll define bg-streamit-bg for exact match 
      */}
      <body className="min-h-screen bg-[#141414] text-white flex flex-col font-roboto antialiased">
        <AuthProvider>
          <ConditionalLayout>{children}</ConditionalLayout>
        </AuthProvider>
      </body>
    </html>
  );
}