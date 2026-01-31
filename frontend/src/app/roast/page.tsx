"use client";
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar, Footer } from "@/components/layout";

// Types for Spotify data
interface UserData {
  topArtists: string[];
  topTracks: string[];
  topGenres: string[];
  audioProfile?: { danceability: number; energy: number; valence: number };
}

interface SpotifyArtist {
  name: string;
}

interface SpotifyTrack {
  name: string;
}

interface GenreData {
  genre: string;
}

// Flame particle component
const FlameParticle = ({ delay }: { delay: number }) => (
  <motion.div
    className="absolute w-3 h-3 rounded-full"
    style={{
      background: 'linear-gradient(to top, #ff6b00, #ffcc00)',
      filter: 'blur(1px)',
    }}
    initial={{ opacity: 0, y: 0, scale: 0 }}
    animate={{
      opacity: [0, 1, 0],
      y: [-20, -100],
      scale: [0, 1, 0.5],
      x: [0, Math.random() * 40 - 20],
    }}
    transition={{
      duration: 1.5,
      delay,
      repeat: Infinity,
      repeatDelay: Math.random() * 2,
    }}
  />
);

// Typewriter effect component
const TypewriterText = ({ text, className }: { text: string; className?: string }) => {
  const [displayText, setDisplayText] = useState('');
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index < text.length) {
      const timer = setTimeout(() => {
        setDisplayText(prev => prev + text[index]);
        setIndex(prev => prev + 1);
      }, 20);
      return () => clearTimeout(timer);
    }
  }, [index, text]);

  return (
    <motion.p className={className}>
      {displayText}
      {index < text.length && (
        <motion.span
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity }}
        >
          |
        </motion.span>
      )}
    </motion.p>
  );
};

export default function RoastPage() {
  const [roast, setRoast] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);

  // Check for access token on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("access_token");
    if (token) {
      setIsAuthenticated(true);
      // Fetch user data
      fetchUserData(token);
    }
  }, []);

  const fetchUserData = async (token: string) => {
    try {
      const [artistsRes, tracksRes, genresRes] = await Promise.all([
        fetch(`https://sonicmirror-backend.onrender.com/spotify/top-artists?time_range=medium_term`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`https://sonicmirror-backend.onrender.com/spotify/top-tracks?time_range=medium_term`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`https://sonicmirror-backend.onrender.com/spotify/top-genres?time_range=medium_term`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
      ]);

      const [artists, tracks, genres] = await Promise.all([
        artistsRes.json(),
        tracksRes.json(),
        genresRes.json(),
      ]);

      setUserData({
        topArtists: artists.items?.slice(0, 5).map((a: SpotifyArtist) => a.name) || [],
        topTracks: tracks.items?.slice(0, 5).map((t: SpotifyTrack) => t.name) || [],
        topGenres: genres.topGenres?.slice(0, 5).map((g: GenreData) => g.genre) || [],
      });
    } catch (err) {
      console.error('Failed to fetch user data:', err);
    }
  };

  // Mock data for demo
  const mockData = {
    topArtists: ["Taylor Swift", "Drake", "Ed Sheeran", "Ariana Grande", "The Weeknd"],
    topTracks: ["Shape of You", "God's Plan", "Blinding Lights", "Thank U Next", "Bad Guy"],
    topGenres: ["Pop", "Hip Hop", "R&B", "Dance", "Indie"],
    audioProfile: { danceability: 0.82, energy: 0.91, valence: 0.40 }
  };

  const getRoast = async () => {
    setLoading(true);
    setError("");
    setRoast("");
    
    const dataToUse = userData || mockData;
    
    try {
      const res = await fetch('https://sonicmirror-backend.onrender.com/llm/roast', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToUse)
      });
      const data = await res.json();
      if (data.roast) setRoast(data.roast);
      else setError(data.error || "No roast returned.");
    } catch {
      setError("Failed to fetch roast. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 text-white overflow-hidden">
      <Navbar variant="dark" />
      
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <main className="relative z-10 container mx-auto px-4 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl mx-auto text-center"
        >
          {/* Header */}
          <motion.div
            className="relative inline-block mb-8"
            whileHover={{ scale: 1.02 }}
          >
            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-orange-400 via-red-500 to-pink-500 bg-clip-text text-transparent">
              🔥 Roast My Taste 🔥
            </h1>
            
            {/* Flame particles */}
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 flex gap-4">
              {[...Array(5)].map((_, i) => (
                <FlameParticle key={i} delay={i * 0.3} />
              ))}
            </div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto"
          >
            Ready to have your music taste absolutely destroyed by AI? 
            Get a brutally honest (and hilarious) roast of your listening habits.
          </motion.p>

          {/* Data preview */}
          <AnimatePresence mode="wait">
            {!roast && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="mb-12"
              >
                <div className="grid md:grid-cols-3 gap-6 mb-8">
                  {[
                    { title: "Your Artists", items: (userData?.topArtists || mockData.topArtists).slice(0, 3), icon: "🎤" },
                    { title: "Your Tracks", items: (userData?.topTracks || mockData.topTracks).slice(0, 3), icon: "🎵" },
                    { title: "Your Genres", items: (userData?.topGenres || mockData.topGenres).slice(0, 3), icon: "🎸" },
                  ].map((section, i) => (
                    <motion.div
                      key={section.title}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                      className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
                    >
                      <h3 className="text-lg font-semibold mb-4 flex items-center justify-center gap-2">
                        <span>{section.icon}</span>
                        {section.title}
                      </h3>
                      <ul className="space-y-2">
                        {section.items.map((item: string, j: number) => (
                          <li key={j} className="text-gray-400 text-sm truncate">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  ))}
                </div>

                {!isAuthenticated && (
                  <p className="text-sm text-gray-500 mb-4">
                    💡 Using demo data. <a href="/login" className="text-indigo-400 hover:underline">Login with Spotify</a> for a personalized roast!
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Roast button */}
          <motion.button
            onClick={getRoast}
            disabled={loading}
            className={`relative px-12 py-4 rounded-full text-xl font-bold transition-all duration-300 ${
              loading
                ? 'bg-gray-700 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:shadow-2xl hover:shadow-red-500/30 hover:scale-105'
            }`}
            whileHover={!loading ? { scale: 1.05 } : {}}
            whileTap={!loading ? { scale: 0.95 } : {}}
          >
            {loading ? (
              <span className="flex items-center gap-3">
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="inline-block"
                >
                  🔥
                </motion.span>
                Generating Roast...
              </span>
            ) : (
              <span className="flex items-center gap-3">
                🔥 Roast Me 🔥
              </span>
            )}
          </motion.button>

          {/* Roast result */}
          <AnimatePresence mode="wait">
            {roast && (
              <motion.div
                initial={{ opacity: 0, y: 40, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", duration: 0.8 }}
                className="mt-12"
              >
                <div className="relative bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-lg rounded-2xl p-8 max-w-3xl mx-auto border border-red-500/30 shadow-2xl shadow-red-500/10">
                  {/* Decorative flames */}
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-4xl">
                    🔥
                  </div>
                  
                  <h3 className="text-2xl font-bold text-red-400 mb-6">Your Roast:</h3>
                  <TypewriterText 
                    text={roast} 
                    className="text-lg text-gray-200 leading-relaxed text-left"
                  />
                  
                  {/* Share buttons */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 2 }}
                    className="mt-8 flex flex-wrap gap-4 justify-center"
                  >
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`🔥 My SonicMirror Roast:\n\n${roast}\n\nGet roasted at sonicmirror.app`);
                        alert('Roast copied to clipboard!');
                      }}
                      className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                    >
                      📋 Copy to Clipboard
                    </button>
                    <button
                      onClick={() => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`🔥 Just got roasted by AI for my music taste!\n\n"${roast.slice(0, 200)}..."\n\nGet roasted at sonicmirror.app`)}`)}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm transition-colors"
                    >
                      🐦 Share on X
                    </button>
                    <button
                      onClick={getRoast}
                      className="px-6 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm transition-colors"
                    >
                      🔄 Roast Again
                    </button>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-8 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Fun facts section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="max-w-4xl mx-auto mt-24"
        >
          <h2 className="text-3xl font-bold text-center mb-12 bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
            Why Get Roasted?
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: "😂", title: "Pure Entertainment", desc: "Because sometimes you need to laugh at yourself" },
              { icon: "🎯", title: "Brutally Honest", desc: "AI doesn't hold back or sugarcoat anything" },
              { icon: "📱", title: "Shareable", desc: "Show off your thick skin to friends" },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 + i * 0.1 }}
                className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 text-center border border-gray-700/30 hover:border-orange-500/30 transition-colors"
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
} 