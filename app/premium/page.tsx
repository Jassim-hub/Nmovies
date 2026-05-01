import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import Link from "next/link";
import Image from "next/image";
import { Crown, Star } from "lucide-react";

export const revalidate = 3600;

export default async function PremiumPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  // Fetch some premium movies
  const { data: premiumMovies } = await supabase
    .from("movies")
    .select("id, title, cover_image_url")
    .eq("published", true)
    .eq("premium", true)
    .limit(12);

  // Fetch some premium series
  const { data: premiumSeries } = await supabase
    .from("series")
    .select("id, title, cover_image_url")
    .eq("published", true)
    .eq("premium", true)
    .limit(12);

  return (
    <div className="min-h-screen bg-[#141414] text-white pt-24 pb-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col items-center justify-center text-center mb-16">
          <div className="w-16 h-16 bg-gradient-to-r from-[#d9a029] to-[#c28f23] rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(217,160,41,0.5)]">
            <Crown className="w-8 h-8 text-black" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4">Premium Content</h1>
          <p className="text-gray-400 text-lg max-w-2xl">
            Unlock the ultimate entertainment experience with our exclusive collection of premium movies and series.
          </p>
          <Link
            href="/payment"
            className="mt-8 px-8 py-4 bg-[#d9a029] hover:bg-[#c28f23] text-black font-bold uppercase tracking-wider rounded-lg transition-transform hover:scale-105 shadow-xl"
          >
            Subscribe Now
          </Link>
        </div>

        {/* Premium Movies Section */}
        {premiumMovies && premiumMovies.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center gap-2 mb-8 border-b border-gray-800 pb-4">
              <Star className="w-6 h-6 text-[#d9a029] fill-current" />
              <h2 className="text-2xl font-bold uppercase tracking-wider">Premium Movies</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {premiumMovies.map((item) => (
                <Link key={item.id} href={`/movies/${item.id}`} className="group block">
                  <div className="aspect-[2/3] relative rounded-lg overflow-hidden bg-gray-900 border border-gray-800 group-hover:border-[#d9a029] transition-colors">
                    <Image
                      src={item.cover_image_url || `https://via.placeholder.com/400x600/141414/d9a029?text=${encodeURIComponent(item.title)}`}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-2 right-2 bg-[#d9a029] text-black p-1.5 rounded shadow-lg">
                      <Crown className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="mt-3 font-semibold text-sm text-gray-300 group-hover:text-white truncate">
                    {item.title}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Premium Series Section */}
        {premiumSeries && premiumSeries.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-8 border-b border-gray-800 pb-4">
              <Star className="w-6 h-6 text-[#d9a029] fill-current" />
              <h2 className="text-2xl font-bold uppercase tracking-wider">Premium Series</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
              {premiumSeries.map((item) => (
                <Link key={item.id} href={`/series/${item.id}`} className="group block">
                  <div className="aspect-[2/3] relative rounded-lg overflow-hidden bg-gray-900 border border-gray-800 group-hover:border-[#d9a029] transition-colors">
                    <Image
                      src={item.cover_image_url || `https://via.placeholder.com/400x600/141414/d9a029?text=${encodeURIComponent(item.title)}`}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-2 right-2 bg-[#d9a029] text-black p-1.5 rounded shadow-lg">
                      <Crown className="w-4 h-4" />
                    </div>
                  </div>
                  <h3 className="mt-3 font-semibold text-sm text-gray-300 group-hover:text-white truncate">
                    {item.title}
                  </h3>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
