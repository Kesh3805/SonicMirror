'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

// Floating music note component
function FloatingNote({ delay, x, size }: { delay: number; x: number; size: number }) {
  return (
    <motion.div
      className="absolute text-pink-300/30 pointer-events-none"
      initial={{ y: '100vh', x: `${x}vw`, opacity: 0, rotate: 0 }}
      animate={{ 
        y: '-20vh', 
        opacity: [0, 0.6, 0.6, 0],
        rotate: 360,
      }}
      transition={{
        duration: 8 + Math.random() * 4,
        delay,
        repeat: Infinity,
        ease: 'linear',
      }}
      style={{ fontSize: `${size}rem` }}
    >
      ♪
    </motion.div>
  );
}

// Feature card component
function FeatureCard({ icon, title, delay }: { icon: string; title: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="flex items-center gap-2 bg-white/50 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-gray-700 shadow-sm"
    >
      <span>{icon}</span>
      <span>{title}</span>
    </motion.div>
  );
}

export default function Login() {
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const floatingNotes = Array.from({ length: 8 }, (_, i) => ({
    delay: i * 1.2,
    x: 10 + (i * 12),
    size: 1.5 + Math.random() * 1.5,
  }));

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-100 text-gray-900 overflow-hidden relative">
      {/* Floating music notes background */}
      {mounted && floatingNotes.map((note, i) => (
        <FloatingNote key={i} {...note} />
      ))}

      {/* Gradient orbs for visual interest */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-pink-200 to-purple-200 rounded-full blur-3xl opacity-40 -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-indigo-200 to-pink-200 rounded-full blur-3xl opacity-40 translate-y-1/2 -translate-x-1/2" />

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="p-6 relative z-10"
      >
        <Link href="/">
          <span className="text-pink-600 text-lg font-medium hover:text-pink-800 transition-colors cursor-pointer flex items-center gap-2 group">
            <motion.svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={2} 
              stroke="currentColor" 
              className="w-5 h-5"
              whileHover={{ x: -4 }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </motion.svg>
            <span className="group-hover:underline">Back to Home</span>
          </span>
        </Link>
      </motion.div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative"
        >
          {/* Glow effect behind card */}
          <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-purple-500 rounded-3xl blur-2xl opacity-20 scale-105" />
          
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl text-center max-w-md w-full p-8 border border-white/50 relative">
            {/* Logo/Image */}
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              onHoverStart={() => setIsHovering(true)}
              onHoverEnd={() => setIsHovering(false)}
              className="relative inline-block"
            >
              <div className={`absolute inset-0 bg-gradient-to-r from-pink-400 to-purple-500 rounded-2xl blur-lg transition-opacity duration-300 ${isHovering ? 'opacity-60' : 'opacity-30'}`} />
              <img 
                src="/2.jpeg" 
                alt="SonicMirror" 
                className="w-32 h-32 mx-auto mb-6 rounded-2xl shadow-lg object-cover cursor-pointer relative z-10 border-2 border-white" 
                onClick={() => setShowEasterEgg(true)} 
              />
            </motion.div>

            {/* Title */}
            <motion.h2 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold mb-2 bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent"
            >
              Welcome to SonicMirror
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mb-6 text-gray-600"
            >
              Discover what your music says about you
            </motion.p>

            {/* Feature tags */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex flex-wrap justify-center gap-2 mb-8"
            >
              <FeatureCard icon="🔥" title="AI Roasts" delay={0.5} />
              <FeatureCard icon="🧠" title="Personality" delay={0.6} />
              <FeatureCard icon="📊" title="Deep Stats" delay={0.7} />
            </motion.div>
            
            {/* Login Button */}
            <motion.a 
              href="https://sonicmirror-backend.onrender.com/auth/login"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <motion.button 
                whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(240, 7, 151, 0.3)' }}
                whileTap={{ scale: 0.98 }}
                className="w-full px-8 py-4 text-white font-semibold rounded-xl text-lg transition-all duration-300 shadow-lg flex items-center justify-center gap-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                Continue with Spotify
              </motion.button>
            </motion.a>
            
            {/* Terms */}
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="mt-6 text-xs text-gray-500"
            >
              By signing in, you agree to our{' '}
              <a href="#" className="text-pink-600 hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-pink-600 hover:underline">Privacy Policy</a>
            </motion.p>
          </div>
        </motion.div>

        {/* Social proof */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-8 text-center"
        >
          <p className="text-gray-500 text-sm">
            Trusted by <span className="font-semibold text-gray-700">10,000+</span> music lovers
          </p>
          <div className="flex items-center justify-center gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <span key={i} className="text-yellow-400 text-lg">★</span>
            ))}
            <span className="text-gray-600 text-sm ml-2">4.9/5 rating</span>
          </div>
        </motion.div>
      </div>
      
      {/* Easter Egg Modal */}
      <AnimatePresence>
        {showEasterEgg && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowEasterEgg(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full flex flex-col items-center relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 transition-colors" 
                onClick={() => setShowEasterEgg(false)}
              >
                ✕
              </button>
              <div className="text-5xl mb-4">🌈✨</div>
              <h3 className="text-2xl font-bold mb-2 text-gray-900">Secret Track Unlocked!</h3>
              <p className="mb-4 text-gray-600 text-center">
                You found a hidden gem:<br/>
                <span className="font-bold text-pink-600">Bad Religion</span> by Frank Ocean
              </p>
              <iframe 
                src="https://open.spotify.com/embed/track/2pMPWE7PJH1PizfgGRMnR9" 
                width="100%" 
                height="80" 
                frameBorder="0" 
                allow="encrypted-media" 
                title="Bad Religion by Frank Ocean" 
                className="rounded-lg"
              />
              <a 
                href="https://open.spotify.com/track/2pMPWE7PJH1PizfgGRMnR9" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="mt-4 text-green-600 font-semibold hover:underline flex items-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0z"/>
                </svg>
                Open in Spotify
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 