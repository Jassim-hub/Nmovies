import { Film, Heart, Users, Star, Award, Shield } from "lucide-react";
import Image from "next/image";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#141414] text-white pt-24 pb-16">
      {/* Hero Section */}
      <section className="container mx-auto px-4 text-center mb-20">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 uppercase tracking-wider text-white">
          About <span className="text-[#E50914]">NicholoMoviesUg</span>
        </h1>
        <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
          We are passionate movie enthusiasts dedicated to bringing you thoughtful reviews,
          engaging discussions, and insights into the world of cinema. Your ultimate streaming destination.
        </p>
      </section>

      {/* Mission Section */}
      <section className="container mx-auto px-4 mb-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 uppercase tracking-wide">
              Our Mission
            </h2>
            <p className="text-gray-400 text-lg">
              To create a community where movie lovers can discover, discuss, and celebrate cinema
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 text-center bg-[#1a1c21] rounded-xl border border-gray-800 hover:border-[#E50914] transition-colors">
              <div className="h-16 w-16 bg-black rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Star className="w-8 h-8 text-[#E50914]" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-white uppercase tracking-wider">Quality Content</h3>
              <p className="text-gray-400">
                In-depth, honest reviews and a meticulously curated collection that helps you discover your next favorite film.
              </p>
            </div>
            <div className="p-8 text-center bg-[#1a1c21] rounded-xl border border-gray-800 hover:border-[#E50914] transition-colors">
              <div className="h-16 w-16 bg-black rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Heart className="w-8 h-8 text-[#E50914]" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-white uppercase tracking-wider">Passion Driven</h3>
              <p className="text-gray-400">
                Our love for cinema drives everything we do, from providing high-quality streaming to excellent recommendations.
              </p>
            </div>
            <div className="p-8 text-center bg-[#1a1c21] rounded-xl border border-gray-800 hover:border-[#E50914] transition-colors">
              <div className="h-16 w-16 bg-black rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Users className="w-8 h-8 text-[#E50914]" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-white uppercase tracking-wider">Community Focus</h3>
              <p className="text-gray-400">
                Building a premium community of entertainment lovers who share insights, reviews, and a passion for film.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 text-center mt-24 mb-10">
        <div className="bg-[#1a1c21] border border-gray-800 rounded-2xl p-12 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-6 uppercase tracking-wide">
            Join Our Community
          </h2>
          <p className="text-gray-400 mb-10 max-w-2xl mx-auto text-lg">
            Ready to explore the world of cinema with us? Subscribe to our premium plans and
            never miss the latest blockbuster releases and insights.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <a href="/subscribe" className="px-8 py-4 rounded-lg bg-[#E50914] hover:bg-[#b80710] text-white font-bold uppercase tracking-wider transition-colors shadow-[0_0_15px_rgba(229,9,20,0.2)]">
              Subscribe Now
            </a>
            <a href="/contact" className="px-8 py-4 rounded-lg border border-gray-600 text-white hover:border-[#E50914] hover:text-[#E50914] font-bold uppercase tracking-wider transition-colors bg-black">
              Get in Touch
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}