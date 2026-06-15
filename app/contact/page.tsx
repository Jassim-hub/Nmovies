import { Mail, MessageSquare, Clock, Send, Facebook, Twitter, Instagram, Phone } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Contact NicholMoviesUg - Get Support & Help',
  description: 'Contact NicholMoviesUg for movie recommendations, subscription support, or feedback. Reach Uganda\'s #1 streaming platform for translated movies.',
  alternates: {
    canonical: '/contact',
  },
  openGraph: {
    title: 'Contact NicholMoviesUg - Get Support & Help',
    description: 'Contact NicholMoviesUg for movie recommendations, subscription support, or feedback.',
    url: 'https://nicholmoviesug.com/contact',
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#141414] text-white pt-24 pb-16">
      {/* Header Section */}
      <section className="container mx-auto px-4 text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-black mb-6 uppercase tracking-wider text-white">
          Get in Touch
        </h1>
        <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
          Have a movie recommendation, feedback, or need support with your subscription?
          We&apos;d love to hear from you!
        </p>
      </section>

      {/* Contact Content */}
      <section className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Contact Form */}
          <div className="p-8 bg-[#1a1c21] rounded-2xl border border-gray-800 shadow-xl">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-3 uppercase tracking-wide">Send us a Message</h2>
              <p className="text-gray-400">
                Fill out the form below and we&apos;ll get back to you as soon as possible.
              </p>
            </div>

            <form className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-semibold uppercase tracking-wider text-gray-300">Name</label>
                  <input
                    id="name"
                    name="name"
                    className="block w-full rounded-lg bg-black border border-gray-700 px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#E50914] focus:border-transparent transition-all"
                    placeholder="Your full name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-semibold uppercase tracking-wider text-gray-300">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="block w-full rounded-lg bg-black border border-gray-700 px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#E50914] focus:border-transparent transition-all"
                    placeholder="your.email@example.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="subject" className="block text-sm font-semibold uppercase tracking-wider text-gray-300">Subject</label>
                <input
                  id="subject"
                  name="subject"
                  className="block w-full rounded-lg bg-black border border-gray-700 px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#E50914] focus:border-transparent transition-all"
                  placeholder="What would you like to discuss?"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="message" className="block text-sm font-semibold uppercase tracking-wider text-gray-300">Message</label>
                <textarea
                  id="message"
                  name="message"
                  className="block w-full rounded-lg bg-black border border-gray-700 px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#E50914] focus:border-transparent transition-all"
                  placeholder="Tell us more about your thoughts, suggestions, or issues..."
                  rows={6}
                  required
                />
              </div>

              <button type="submit" className="w-full px-6 py-4 rounded-lg bg-[#E50914] hover:bg-[#b80710] text-white font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-3 transition-colors shadow-[0_0_15px_rgba(229,9,20,0.2)]">
                <Send className="w-5 h-5" /> Send Message
              </button>
            </form>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-8 uppercase tracking-wide">Other Ways to Reach Us</h2>
              <div className="space-y-6">
                {/* Email Block */}
                <div className="p-6 bg-[#1a1c21] rounded-xl border border-gray-800 hover:border-[#E50914] transition-colors group">
                  <div className="flex items-start gap-5">
                    <div className="p-3 bg-black rounded-lg group-hover:bg-[#E50914] transition-colors">
                      <Mail className="w-6 h-6 text-[#E50914] group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-bold mb-1 uppercase tracking-wider">Email</h3>
                      <p className="text-gray-400 mb-2 text-sm">
                        Send us an email anytime for support or inquiries.
                      </p>
                      <a
                        href="mailto:nicholmoviesug@gmail.com"
                        className="text-[#E50914] hover:text-white transition-colors font-medium"
                      >
                        nicholmoviesug@gmail.com
                      </a>
                    </div>
                  </div>
                </div>

                {/* Phone Block */}
                <div className="p-6 bg-[#1a1c21] rounded-xl border border-gray-800 hover:border-[#E50914] transition-colors group">
                  <div className="flex items-start gap-5">
                    <div className="p-3 bg-black rounded-lg group-hover:bg-[#E50914] transition-colors">
                      <Phone className="w-6 h-6 text-[#E50914] group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-bold mb-1 uppercase tracking-wider">Phone & WhatsApp</h3>
                      <p className="text-gray-400 mb-2 text-sm">
                        Call or text us on WhatsApp for fast support.
                      </p>
                      <div className="flex flex-col gap-1">
                        <a
                          href="tel:+256757588585"
                          className="text-[#E50914] hover:text-white transition-colors font-medium flex items-center gap-2"
                        >
                          +256 757 588 585
                        </a>
                        <a
                          href="tel:+256768908155"
                          className="text-[#E50914] hover:text-white transition-colors font-medium flex items-center gap-2"
                        >
                          +256 768 908 155
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Social Media Block */}
                <div className="p-6 bg-[#1a1c21] rounded-xl border border-gray-800 hover:border-[#E50914] transition-colors group">
                  <div className="flex items-start gap-5">
                    <div className="p-3 bg-black rounded-lg group-hover:bg-[#E50914] transition-colors">
                      <MessageSquare className="w-6 h-6 text-[#E50914] group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-bold mb-1 uppercase tracking-wider">Social Media</h3>
                      <p className="text-gray-400 mb-3 text-sm">
                        Follow us for daily movie updates and new releases.
                      </p>
                      <div className="flex gap-4">
                        <a href="#" className="text-gray-400 hover:text-white transition-colors"><Twitter className="w-5 h-5" /></a>
                        <a href="#" className="text-gray-400 hover:text-white transition-colors"><Instagram className="w-5 h-5" /></a>
                        <a href="#" className="text-gray-400 hover:text-white transition-colors"><Facebook className="w-5 h-5" /></a>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Response Time Block */}
                <div className="p-6 bg-[#1a1c21] rounded-xl border border-gray-800 hover:border-[#E50914] transition-colors group">
                  <div className="flex items-start gap-5">
                    <div className="p-3 bg-black rounded-lg group-hover:bg-[#E50914] transition-colors">
                      <Clock className="w-6 h-6 text-[#E50914] group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-bold mb-1 uppercase tracking-wider">Response Time</h3>
                      <p className="text-gray-400 text-sm">
                        We typically respond within 24-48 hours. Premium members get priority support.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="p-8 bg-[#1a1c21] rounded-2xl border border-gray-800 mt-8">
              <h3 className="text-xl font-bold mb-6 uppercase tracking-wide">Frequently Asked Questions</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="font-bold mb-2 text-[#E50914]">How do I upgrade to Premium?</h4>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Simply log into your account, click on your profile menu, and select "Get Premium" to view our subscription options.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold mb-2 text-[#E50914]">Are the movies available in HD?</h4>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Yes, all our premium content is available in 1080p HD or 4K, depending on your subscription tier and device capabilities.
                  </p>
                </div>
                <div>
                  <h4 className="font-bold mb-2 text-[#E50914]">Can I download movies to watch offline?</h4>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Yes! Download our mobile app from the Google Play Store or Apple App Store to download content for offline viewing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}