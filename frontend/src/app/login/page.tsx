'use client';
import React, { useState } from 'react';
import Link from 'next/link';

export default function Login() {
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-pink-50 to-pink-100 text-gray-900">
      {/* Top left: Back to Home */}
      <div className="p-6">
        <Link href="/">
          <span className="text-pink-700 text-lg font-medium hover:text-pink-900 transition-colors cursor-pointer flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Home
          </span>
        </Link>
      </div>
      
      {/* Centered Card */}
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-xl text-center max-w-md w-full p-8 border-2 border-pink-200 transition-all duration-300 hover:shadow-2xl hover:border-pink-300">
          <img 
            src="/2.jpeg" 
            alt="Login Illustration" 
            className="w-32 h-32 mx-auto mb-6 rounded-2xl shadow-md object-cover cursor-pointer transition-transform hover:scale-105 border-2 border-pink-200" 
            onClick={() => setShowEasterEgg(true)} 
          />
          <h2 className="text-3xl font-bold mb-3 text-gray-900">Sign in to SonicMirror</h2>
          <p className="mb-8 text-gray-600">Unlock your AI-powered Spotify stats and insights!</p>
          
          <a href="https://sonicmirror-backend.onrender.com/auth/login">
            <button className="w-full px-8 py-4 text-white font-semibold rounded-full text-lg transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-3" style={{backgroundColor: '#f00797'}}>
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
              </svg>
              Sign in with Spotify
            </button>
          </a>
          
          <div className="mt-6 text-sm text-pink-600">
            <p>By signing in, you agree to our terms of service</p>
          </div>
        </div>
      </div>
      
      {/* Easter Egg Modal */}
      {showEasterEgg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full flex flex-col items-center relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-black text-2xl font-bold" onClick={() => setShowEasterEgg(false)}>&times;</button>
            <h3 className="text-2xl font-bold mb-4 text-black">🌈 Secret Unlocked!</h3>
            <p className="mb-4 text-lg text-gray-800 text-center">You found the hidden track:<br/><span className="font-bold">Bad Religion</span> by Frank Ocean<br/>A heartfelt classic for your feels.</p>
            <iframe src="https://open.spotify.com/embed/track/2pMPWE7PJH1PizfgGRMnR9" width="300" height="80" frameBorder="0" allow="encrypted-media" title="Bad Religion by Frank Ocean" className="rounded-lg"></iframe>
            <a href="https://open.spotify.com/track/2pMPWE7PJH1PizfgGRMnR9" target="_blank" rel="noopener noreferrer" className="mt-4 text-green-600 font-bold underline">Play on Spotify</a>
          </div>
        </div>
      )}
    </div>
  );
} 