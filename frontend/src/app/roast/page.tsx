"use client";
import React, { useState } from "react";


export default function RoastPage() {
  const [roast, setRoast] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Mock user data for demo
  const mockData = {
    topArtists: ["Taylor Swift", "Drake", "Ed Sheeran"],
    topTracks: ["Shape of You", "God's Plan"],
    topGenres: ["Pop", "Hip Hop"],
    audioProfile: { danceability: 0.82, energy: 0.91, valence: 0.40 }
  };

  const getRoast = async () => {
    setLoading(true);
    setError("");
    setRoast("");
    try {
      const res = await fetch('https://sonicmirror-backend.onrender.com/llm/roast', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mockData)
      });
      const data = await res.json();
      if (data.roast) setRoast(data.roast);
      else setError(data.error || "No roast returned.");
    } catch (e) {
      setError("Failed to fetch roast.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <h1 className="text-3xl font-bold mb-4">Roast Me</h1>
      <p className="mb-6 text-gray-300">Get a witty, AI-powered roast of your music taste!</p>
      <button
        onClick={getRoast}
        className="px-6 py-2 bg-pink-600 rounded-lg font-semibold hover:bg-pink-700 mb-6"
        disabled={loading}
      >
        {loading ? "Roasting..." : "Roast Me"}
      </button>
      {roast && (
        <div className="bg-gray-800 rounded-lg p-6 max-w-xl text-lg shadow-lg border border-pink-500">
          {roast}
        </div>
      )}
      {error && <div className="text-red-400 mt-4">{error}</div>}
    </div>
  );
} 