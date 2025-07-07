"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [showEasterEgg, setShowEasterEgg] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-900 to-purple-700 text-white">
      {/* Header */}
      <header className="text-center py-12">
        <h1 className="text-6xl font-bold mb-4">SonicMirror</h1>
        <p className="text-xl text-gray-300 mb-8">AI-powered Spotify analyzer & music psychologist</p>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <img 
            src="/1.jpeg" 
            alt="SonicMirror Hero" 
            className="w-64 h-64 mx-auto mb-8 rounded-2xl shadow-2xl cursor-pointer transition-transform hover:scale-105 sonicmirror-logo"
            onClick={() => setShowEasterEgg(true)}
          />
          <h2 className="text-3xl font-bold mb-4">Discover Your Music Personality</h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl">
            Get brutally honest AI-powered insights into your Spotify listening habits. 
            From savage roasts to deep psychological analysis, discover what your music taste really says about you.
          </p>
          <Link href="/login">
            <button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-8 rounded-full text-xl transition">
              Get Roasted
            </button>
          </Link>
        </div>

        {/* AI Features Section */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-center mb-8">🤖 AI-Powered Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl">
            <div className="bg-red-900 bg-opacity-70 rounded-xl p-6 text-center border border-red-500">
              <div className="text-4xl mb-4">🔥</div>
              <h3 className="font-bold mb-2">AI Roast</h3>
              <p className="text-sm text-gray-300">Get brutally roasted about your music taste</p>
            </div>
            <div className="bg-purple-900 bg-opacity-70 rounded-xl p-6 text-center border border-purple-500">
              <div className="text-4xl mb-4">🎭</div>
              <h3 className="font-bold mb-2">Personality Analysis</h3>
              <p className="text-sm text-gray-300">Deep psychological profile through music</p>
            </div>
            <div className="bg-blue-900 bg-opacity-70 rounded-xl p-6 text-center border border-blue-500">
              <div className="text-4xl mb-4">💭</div>
              <h3 className="font-bold mb-2">Mood Analysis</h3>
              <p className="text-sm text-gray-300">Emotional patterns in your listening</p>
            </div>
            <div className="bg-green-900 bg-opacity-70 rounded-xl p-6 text-center border border-green-500">
              <div className="text-4xl mb-4">🌟</div>
              <h3 className="font-bold mb-2">Music Recommendations</h3>
              <p className="text-sm text-gray-300">AI-curated suggestions for your taste</p>
            </div>
            <div className="bg-yellow-900 bg-opacity-70 rounded-xl p-6 text-center border border-yellow-500">
              <div className="text-4xl mb-4">🎵</div>
              <h3 className="font-bold mb-2">Genre Analysis</h3>
              <p className="text-sm text-gray-300">What your genre choices reveal about you</p>
            </div>
            <div className="bg-pink-900 bg-opacity-70 rounded-xl p-6 text-center border border-pink-500">
              <div className="text-4xl mb-4">🎧</div>
              <h3 className="font-bold mb-2">Listening Habits</h3>
              <p className="text-sm text-gray-300">Your music consumption patterns</p>
            </div>
            <div className="bg-cyan-900 bg-opacity-70 rounded-xl p-6 text-center border border-cyan-500">
              <div className="text-4xl mb-4">🧠</div>
              <h3 className="font-bold mb-2">Music Therapy</h3>
              <p className="text-sm text-gray-300">Therapeutic insights and recommendations</p>
            </div>
            <div className="bg-emerald-900 bg-opacity-70 rounded-xl p-6 text-center border border-emerald-500">
              <div className="text-4xl mb-4">🎼</div>
              <h3 className="font-bold mb-2">Playlist Generator</h3>
              <p className="text-sm text-gray-300">AI-created playlists for any mood</p>
            </div>
            <div className="bg-fuchsia-900 bg-opacity-70 rounded-xl p-6 text-center border border-fuchsia-500">
              <div className="text-4xl mb-4">📖</div>
              <h3 className="font-bold mb-2">Wrapped Story</h3>
              <p className="text-sm text-gray-300">Narrative of your musical journey</p>
            </div>
            <div className="bg-indigo-900 bg-opacity-70 rounded-xl p-6 text-center border border-indigo-500">
              <div className="text-4xl mb-4">💕</div>
              <h3 className="font-bold mb-2">Musical Compatibility</h3>
              <p className="text-sm text-gray-300">Your relationship potential through music</p>
            </div>
            <div className="bg-orange-900 bg-opacity-70 rounded-xl p-6 text-center border border-orange-500">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="font-bold mb-2">Lyrical Analysis</h3>
              <p className="text-sm text-gray-300">What your lyrics preferences reveal</p>
            </div>
            <div className="bg-gray-900 bg-opacity-70 rounded-xl p-6 text-center border border-gray-500">
              <div className="text-4xl mb-4">🎪</div>
              <h3 className="font-bold mb-2">Spotify Wrapped</h3>
              <p className="text-sm text-gray-300">Your year in music, AI-style</p>
            </div>
          </div>
        </div>

        {/* Stats Features Grid */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-center mb-8">📊 Music Analytics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl">
            <div className="bg-indigo-900 bg-opacity-70 rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">🎵</div>
              <h3 className="font-bold mb-2">Top Artists & Tracks</h3>
              <p className="text-sm text-gray-300">See your most listened to music</p>
            </div>
            <div className="bg-purple-900 bg-opacity-70 rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="font-bold mb-2">Detailed Stats</h3>
              <p className="text-sm text-gray-300">Deep dive into your listening patterns</p>
            </div>
            <div className="bg-blue-900 bg-opacity-70 rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="font-bold mb-2">Mainstream Meter</h3>
              <p className="text-sm text-gray-300">How popular your taste is</p>
            </div>
            <div className="bg-green-900 bg-opacity-70 rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">🕐</div>
              <h3 className="font-bold mb-2">Listening Time</h3>
              <p className="text-sm text-gray-300">When you listen most</p>
            </div>
            <div className="bg-yellow-900 bg-opacity-70 rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">🎪</div>
              <h3 className="font-bold mb-2">Genre Hopping</h3>
              <p className="text-sm text-gray-300">Your musical diversity</p>
            </div>
            <div className="bg-pink-900 bg-opacity-70 rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">🔁</div>
              <h3 className="font-bold mb-2">Repeat Offenders</h3>
              <p className="text-sm text-gray-300">Songs you can't stop playing</p>
            </div>
            <div className="bg-cyan-900 bg-opacity-70 rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">💎</div>
              <h3 className="font-bold mb-2">Hidden Gems</h3>
              <p className="text-sm text-gray-300">Discover your unique music finds</p>
            </div>
            <div className="bg-emerald-900 bg-opacity-70 rounded-xl p-6 text-center">
              <div className="text-4xl mb-4">🎨</div>
              <h3 className="font-bold mb-2">Audio Features</h3>
              <p className="text-sm text-gray-300">Danceability, energy, and more</p>
            </div>
          </div>
        </div>



        {/* CTA Section */}
        <div className="text-center mb-12">
          <h3 className="text-2xl font-bold mb-4">Ready to get brutally honest about your music?</h3>
          <p className="text-lg text-gray-300 mb-6">Connect your Spotify account and prepare for some savage AI insights</p>
          <Link href="/login">
            <button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-full text-lg transition">
              Connect Spotify & Get Roasted
            </button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-8 border-t border-indigo-500">
        <div 
          className="text-sm text-gray-400 cursor-pointer hover:text-white transition-colors"
          title="Click 3 times quickly for a surprise!"
        >
          -- .- -. --- --- --- .-. .- -. .--- .. -. .. .. .. ..
        </div>
      </footer>

      {/* Easter Egg Modal */}
      {showEasterEgg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full flex flex-col items-center relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-black text-2xl font-bold" onClick={() => setShowEasterEgg(false)}>&times;</button>
            <h3 className="text-2xl font-bold mb-4 text-black">🎵 Secret Track Unlocked!</h3>
            <p className="mb-4 text-lg text-gray-800 text-center">You found the hidden track:<br/><span className="font-bold">Candy Licker</span> by Marvin Sease<br/>A classic that's not for the faint of heart!</p>
            <iframe src="https://open.spotify.com/embed/track/24nD7CG7Nu4EVLSBX4ZcFA" width="300" height="80" frameBorder="0" allow="encrypted-media" title="Candy Licker by Marvin Sease" className="rounded-lg"></iframe>
            <a href="https://open.spotify.com/track/24nD7CG7Nu4EVLSBX4ZcFA" target="_blank" rel="noopener noreferrer" className="mt-4 text-green-600 font-bold underline">Play on Spotify</a>
          </div>
        </div>
      )}
    </div>
  );
}

