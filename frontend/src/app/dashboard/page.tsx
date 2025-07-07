"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from 'next/navigation';
// @ts-ignore: dom-to-image-more has no types
import domtoimage from "dom-to-image-more";
import jsPDF from "jspdf";
import Link from "next/link";


interface SpotifyImage {
  url: string;
}

interface SpotifyUser {
  display_name: string;
  images: SpotifyImage[];
  email?: string;
}

interface SpotifyArtist {
  id: string;
  name: string;
  images: SpotifyImage[];
}

interface SpotifyTrack {
  id: string;
  name: string;
  album: { images: SpotifyImage[] };
  artists: { name: string }[];
}

interface GenreCount {
  genre: string;
  count: number;
}

interface AudioFeatures {
  avg_danceability: number;
  avg_energy: number;
  avg_valence: number;
  avg_tempo: number;
  avg_speechiness: number;
  avg_acousticness: number;
  avg_instrumentalness: number;
  avg_liveness: number;
}

function getTokenFromUrl() {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("access_token");
}

// Enhanced Tooltip component with better styling
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block align-middle"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
      tabIndex={0}
    >
      {children}
      {show && (
        <span className="absolute z-10 left-1/2 -translate-x-1/2 mt-2 w-max max-w-xs bg-gray-800 text-xs text-white rounded-lg px-3 py-2 shadow-xl border border-indigo-400 whitespace-pre-line backdrop-blur-sm">
          {text}
        </span>
      )}
    </span>
  );
}

// Enhanced ShareDropdown component
function ShareDropdown({ profile, uniqueArtists, uniqueTracks, mainstreamScore, buttonClassName = "" }: any) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  let badgeText = '';
  if (mainstreamScore !== null) {
    if (mainstreamScore >= 80) badgeText = 'Mainstream';
    else if (mainstreamScore >= 60) badgeText = 'Balanced';
    else if (mainstreamScore >= 40) badgeText = 'Indie';
    else badgeText = 'Underground';
  }
  const displayName = profile?.display_name || 'Spotify User';
  const topArtist = uniqueArtists[0]?.name || '';
  const topTrack = uniqueTracks[0]?.name || '';
  const text = `Check out my Spotify stats!\nName: ${displayName}\nTop Artist: ${topArtist}\nTop Track: ${topTrack}\nTaste: ${badgeText}\n#SonicMirror`;
  const encodedText = encodeURIComponent(text);
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
  const whatsappUrl = `https://wa.me/?text=${encodedText}`;
  const tumblrUrl = `https://www.tumblr.com/widgets/share/tool?posttype=quote&tags=spotify,sonicmirror&caption=${encodeURIComponent(displayName)}&content=${encodedText}`;
  
  function copyToClipboard() {
    navigator.clipboard.writeText(text);
    setOpen(false);
    alert('Stats copied! Open Instagram and paste into your story or post.');
  }
  
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className={`bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold flex items-center gap-2 h-full px-4 py-2 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl ${buttonClassName}`}
        onClick={() => setOpen((v) => !v)}
        title="Share your stats"
      >
        <span>Share</span>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15.75L15.75 8.25M15.75 8.25H9.75M15.75 8.25v6" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-indigo-500 rounded-xl shadow-2xl z-20 flex flex-col overflow-hidden">
          <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800 text-blue-400 transition-colors duration-200">
            <span className="text-lg">🐦</span>
            <span>Twitter/X</span>
          </a>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800 text-green-400 transition-colors duration-200">
            <span className="text-lg">🟢</span>
            <span>WhatsApp</span>
          </a>
          <a href={tumblrUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800 text-purple-400 transition-colors duration-200">
            <span className="text-lg">📚</span>
            <span>Tumblr</span>
          </a>
          <button onClick={copyToClipboard} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800 text-pink-400 w-full text-left transition-colors duration-200">
            <span className="text-lg">📸</span>
            <span>Instagram (Copy)</span>
          </button>
        </div>
      )}
    </div>
  );
}

// Enhanced DownloadDropdown component
function DownloadDropdown({ buttonClassName = "" }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);
  
  async function downloadPNG() {
    setOpen(false);
    const dashboard = document.querySelector('.max-w-6xl');
    if (!dashboard) return;
    domtoimage.toPng(dashboard as HTMLElement)
      .then((dataUrl: string) => {
        const link = document.createElement('a');
        link.download = 'sonicmirror-dashboard.png';
        link.href = dataUrl;
        link.click();
      })
      .catch((error: any) => {
        alert('Download failed: ' + error);
      });
  }
  
  async function downloadPDF() {
    setOpen(false);
    const dashboard = document.querySelector('.max-w-6xl');
    if (!dashboard) return;
    domtoimage.toPng(dashboard as HTMLElement)
      .then((imgData: string) => {
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const img = new window.Image();
        img.src = imgData;
        img.onload = function () {
          const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
          const imgWidth = img.width * ratio;
          const imgHeight = img.height * ratio;
          pdf.addImage(img, 'PNG', (pageWidth - imgWidth) / 2, 20, imgWidth, imgHeight);
          pdf.save('sonicmirror-dashboard.pdf');
        };
      })
      .catch((error: any) => {
        alert('Download failed: ' + error);
      });
  }
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className={`bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-bold flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl ${buttonClassName}`}
        onClick={() => setOpen((v) => !v)}
        title="Download your dashboard"
      >
        <span>Download</span>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5v-12m0 12l-3.75-3.75M12 16.5l3.75-3.75M21 21.75H3" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-gray-900 border border-emerald-500 rounded-xl shadow-2xl z-20 flex flex-col overflow-hidden">
          <button onClick={downloadPNG} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800 text-emerald-300 w-full text-left transition-colors duration-200">
            <span className="text-lg">🖼️</span>
            <span>PNG Image</span>
          </button>
          <button onClick={downloadPDF} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-800 text-emerald-400 w-full text-left transition-colors duration-200">
            <span className="text-lg">📄</span>
            <span>PDF</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const accessToken = getTokenFromUrl();
  const [profile, setProfile] = useState<SpotifyUser | null>(null);
  const [topArtists, setTopArtists] = useState<SpotifyArtist[]>([]);
  const [topTracks, setTopTracks] = useState<SpotifyTrack[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<SpotifyTrack[]>([]);
  const [topGenres, setTopGenres] = useState<GenreCount[]>([]);
  const [audioFeatures, setAudioFeatures] = useState<AudioFeatures | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sectionErrors, setSectionErrors] = useState<{[key: string]: string}>({});

  // Time period options for Repeat Offender
  const periodOptions = [
    { label: "Last week", value: "week" },
    { label: "Last month", value: "month" },
    { label: "Last year", value: "year" },
    { label: "All", value: "all" },
  ];
  const [repeatPeriod, setRepeatPeriod] = useState("week");

  // Genre Hopping Index: how often you switch genres in recently played
  const [genreHoppingIndex, setGenreHoppingIndex] = useState<number | null>(null);
  const [genreHoppingMsg, setGenreHoppingMsg] = useState<string>("");

  // Musical Era Analysis: group recently played tracks by decade
  const [eraData, setEraData] = useState<{ [decade: string]: number }>({});
  const [eraMsg, setEraMsg] = useState("");

  // Listening Time Analysis: analyze played_at timestamps
  const [listeningTimeMsg, setListeningTimeMsg] = useState("");

  // Helper to filter tracks by time period
  function filterByPeriod(tracks: SpotifyTrack[], period: string) {
    if (period === "all") return tracks;
    const now = new Date();
    let cutoff = new Date();
    if (period === "week") cutoff.setDate(now.getDate() - 7);
    else if (period === "month") cutoff.setMonth(now.getMonth() - 1);
    else if (period === "year") cutoff.setFullYear(now.getFullYear() - 1);
    return tracks.filter((t: any) => t.played_at && new Date(t.played_at) >= cutoff);
  }

  const [roast, setRoast] = useState("");
  const [roastLoading, setRoastLoading] = useState(false);
  const [roastError, setRoastError] = useState("");
  const [personality, setPersonality] = useState("");
  const [personalityLoading, setPersonalityLoading] = useState(false);
  const [personalityError, setPersonalityError] = useState("");
  const [moodAnalysis, setMoodAnalysis] = useState<any>(null);
  const [moodLoading, setMoodLoading] = useState(false);
  const [moodError, setMoodError] = useState("");
  const [recommendations, setRecommendations] = useState<any>(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState("");

  // New AI features state variables
  const [musicalCompatibility, setMusicalCompatibility] = useState<any>(null);
  const [musicalCompatibilityLoading, setMusicalCompatibilityLoading] = useState(false);
  const [musicalCompatibilityError, setMusicalCompatibilityError] = useState("");
  const [lyricalAnalysis, setLyricalAnalysis] = useState<any>(null);
  const [lyricalAnalysisLoading, setLyricalAnalysisLoading] = useState(false);
  const [lyricalAnalysisError, setLyricalAnalysisError] = useState("");

  const [showSinatraEgg, setShowSinatraEgg] = useState(false);
  const [showJVKEEgg, setShowJVKEEgg] = useState(false);
  const [discoMode, setDiscoMode] = useState(false);
  const [showFunFactEgg, setShowFunFactEgg] = useState(false);
  const [funFact, setFunFact] = useState("");
  const [funFactLoading, setFunFactLoading] = useState(false);
  const [funFactNumber, setFunFactNumber] = useState<number | null>(null);
  const funFactTimer = useRef<NodeJS.Timeout | null>(null);

  // Disco mode effect
  useEffect(() => {
    if (discoMode) {
      document.body.classList.add('disco-mode');
      // Auto-disable disco mode after 30 seconds
      const timer = setTimeout(() => {
        setDiscoMode(false);
      }, 30000);
      return () => clearTimeout(timer);
    } else {
      document.body.classList.remove('disco-mode');
    }
  }, [discoMode]);

  // Show Rick Roll notification when disco mode is activated
  useEffect(() => {
    if (discoMode) {
      // Play local audio file
      const audio = new Audio('/Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)');
      audio.volume = 0.3; // Set volume to 30%
      audio.play().catch(e => {
        // If autoplay fails, show a message
        console.log('Autoplay blocked, but disco mode is still active!');
      });
      
      // Cleanup when disco mode ends
      return () => {
        audio.pause();
        audio.currentTime = 0;
      };
    }
  }, [discoMode]);

  // Fun fact long-press handlers
  function handleStatMouseDown(number: number) {
    funFactTimer.current = setTimeout(async () => {
      setFunFactNumber(number);
      setFunFactLoading(true);
      setShowFunFactEgg(true);
      
      try {
        const res = await fetch('https://sonicmirror-backend.onrender.com/llm/fun-fact', {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ number })
        });
        const data = await res.json();
        if (data.funFact) {
          setFunFact(data.funFact);
        } else {
          setFunFact("This number is special to you! 🎵");
        }
      } catch (e) {
        setFunFact("This number is special to you! 🎵");
      } finally {
        setFunFactLoading(false);
      }
    }, 1000);
  }

  function handleStatMouseUp() {
    if (funFactTimer.current) clearTimeout(funFactTimer.current);
  }

  async function handleRoastMe() {
    setRoastLoading(true);
    setRoastError("");
    setRoast("");
    try {
      // Prepare data for roast
      const topArtistNames = uniqueArtists.slice(0, 3).map(a => a.name);
      const topTrackNames = uniqueTracks.slice(0, 2).map(t => t.name);
      const topGenreNames = topGenres.slice(0, 2).map(g => g.genre);
      const audioProfile = audioFeatures ? {
        danceability: audioFeatures.avg_danceability?.toFixed(2) ?? 0,
        energy: audioFeatures.avg_energy?.toFixed(2) ?? 0,
        valence: audioFeatures.avg_valence?.toFixed(2) ?? 0
      } : { danceability: 0, energy: 0, valence: 0 };
      const res = await fetch('https://sonicmirror-backend.onrender.com/llm/roast', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topArtists: topArtistNames,
          topTracks: topTrackNames,
          topGenres: topGenreNames,
          audioProfile
        })
      });
      const data = await res.json();
      if (data.roast) {
        setRoast(data.roast);
        if (data.fallback) {
          console.log('Using fallback roast due to API rate limits');
        }
      } else {
        setRoastError(data.error || "No roast returned.");
      }
    } catch (e) {
      setRoastError("Failed to fetch roast.");
    } finally {
      setRoastLoading(false);
    }
  }

  async function handleGetPersonality() {
    setPersonalityLoading(true);
    setPersonalityError("");
    setPersonality("");
    try {
      // Prepare data for personality analysis
      const topArtistNames = uniqueArtists.slice(0, 3).map(a => a.name);
      const topTrackNames = uniqueTracks.slice(0, 2).map(t => t.name);
      const topGenreNames = topGenres.slice(0, 2).map(g => g.genre);
      const audioProfile = audioFeatures ? {
        danceability: audioFeatures.avg_danceability?.toFixed(2) ?? 0,
        energy: audioFeatures.avg_energy?.toFixed(2) ?? 0,
        valence: audioFeatures.avg_valence?.toFixed(2) ?? 0
      } : { danceability: 0, energy: 0, valence: 0 };
      const res = await fetch('https://sonicmirror-backend.onrender.com/llm/personality', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topArtists: topArtistNames,
          topTracks: topTrackNames,
          topGenres: topGenreNames,
          audioProfile
        })
      });
      const data = await res.json();
      if (data.personality) {
        setPersonality(data.personality);
        if (data.fallback) {
          console.log('Using fallback personality due to API rate limits');
        }
      } else {
        setPersonalityError(data.error || "No personality analysis returned.");
      }
    } catch (e) {
      setPersonalityError("Failed to fetch personality analysis.");
    } finally {
      setPersonalityLoading(false);
    }
  }

  async function handleGetMoodAnalysis() {
    setMoodLoading(true);
    setMoodError("");
    setMoodAnalysis(null);
    try {
      // Prepare data for mood analysis
      const topArtistNames = uniqueArtists.slice(0, 3).map(a => a.name);
      const topTrackNames = uniqueTracks.slice(0, 2).map(t => t.name);
      const topGenreNames = topGenres.slice(0, 2).map(g => g.genre);
      const audioProfile = audioFeatures ? {
        danceability: audioFeatures.avg_danceability?.toFixed(2) ?? 0,
        energy: audioFeatures.avg_energy?.toFixed(2) ?? 0,
        valence: audioFeatures.avg_valence?.toFixed(2) ?? 0
      } : { danceability: 0, energy: 0, valence: 0 };
      const recentlyPlayedNames = uniqueRecentlyPlayed.slice(0, 5).map(t => t.name);
      
      const res = await fetch('https://sonicmirror-backend.onrender.com/llm/mood-analysis', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topArtists: topArtistNames,
          topTracks: topTrackNames,
          topGenres: topGenreNames,
          audioProfile,
          recentlyPlayed: recentlyPlayedNames
        })
      });
      const data = await res.json();
      if (data.moodAnalysis) {
        setMoodAnalysis(data.moodAnalysis);
        if (data.fallback) {
          console.log('Using fallback mood analysis due to API rate limits');
        }
      } else {
        setMoodError(data.error || "No mood analysis returned.");
      }
    } catch (e) {
      setMoodError("Failed to fetch mood analysis.");
    } finally {
      setMoodLoading(false);
    }
  }

  async function handleGetRecommendations() {
    setRecommendationsLoading(true);
    setRecommendationsError("");
    setRecommendations(null);
    try {
      // Prepare data for recommendations
      const topArtistNames = uniqueArtists.slice(0, 3).map(a => a.name);
      const topTrackNames = uniqueTracks.slice(0, 2).map(t => t.name);
      const topGenreNames = topGenres.slice(0, 2).map(g => g.genre);
      const audioProfile = audioFeatures ? {
        danceability: audioFeatures.avg_danceability?.toFixed(2) ?? 0,
        energy: audioFeatures.avg_energy?.toFixed(2) ?? 0,
        valence: audioFeatures.avg_valence?.toFixed(2) ?? 0
      } : { danceability: 0, energy: 0, valence: 0 };
      const recentlyPlayedNames = uniqueRecentlyPlayed.slice(0, 5).map(t => t.name);
      
      const res = await fetch('https://sonicmirror-backend.onrender.com/llm/recommendations', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topArtists: topArtistNames,
          topTracks: topTrackNames,
          topGenres: topGenreNames,
          audioProfile,
          recentlyPlayed: recentlyPlayedNames
        })
      });
      const data = await res.json();
      if (data.recommendations) {
        // Enhance recommendations with Spotify data if available
        const enhancedRecommendations = {
          ...data.recommendations,
          recommendations: await Promise.all(
            data.recommendations.recommendations.map(async (rec: any) => {
              try {
                if (rec.type === 'artist') {
                  // Search for artist on Spotify
                  const searchRes = await fetch(`https://sonicmirror-backend.onrender.com/spotify/search-artists?access_token=${accessToken}&q=${encodeURIComponent(rec.name)}`);
                  const searchData = await searchRes.json();
                  
                  if (searchData.artists?.items?.length > 0) {
                    const artist = searchData.artists.items[0];
                    return {
                      ...rec,
                      spotifyId: artist.id,
                      imageUrl: artist.images?.[0]?.url || null,
                      popularity: artist.popularity,
                      followers: artist.followers?.total
                    };
                  }
                } else if (rec.type === 'track') {
                  // Search for track on Spotify
                  const searchRes = await fetch(`https://sonicmirror-backend.onrender.com/spotify/search-tracks?access_token=${accessToken}&q=${encodeURIComponent(`${rec.name} ${rec.artist}`)}`);
                  const searchData = await searchRes.json();
                  
                  if (searchData.tracks?.items?.length > 0) {
                    const track = searchData.tracks.items[0];
                    return {
                      ...rec,
                      spotifyId: track.id,
                      imageUrl: track.album?.images?.[0]?.url || null,
                      popularity: track.popularity,
                      duration: track.duration_ms
                    };
                  }
                }
              } catch (error) {
                console.error('Error fetching Spotify data for recommendation:', error);
              }
              
              // Return original recommendation if Spotify data couldn't be fetched
              return rec;
            })
          )
        };
        
        setRecommendations(enhancedRecommendations);
        if (data.fallback) {
          console.log('Using fallback recommendations due to API rate limits');
        }
      } else {
        setRecommendationsError(data.error || "No recommendations returned.");
      }
    } catch (e) {
      setRecommendationsError("Failed to fetch recommendations.");
    } finally {
      setRecommendationsLoading(false);
    }
  }

  const [followedArtists, setFollowedArtists] = useState<Set<string>>(new Set());

  // New LLM feature handlers
  const [genreAnalysis, setGenreAnalysis] = useState<any>(null);
  const [genreAnalysisError, setGenreAnalysisError] = useState<string | null>(null);
  const [listeningHabits, setListeningHabits] = useState<any>(null);
  const [listeningHabitsError, setListeningHabitsError] = useState<string | null>(null);
  const [musicTherapy, setMusicTherapy] = useState<any>(null);
  const [musicTherapyError, setMusicTherapyError] = useState<string | null>(null);
  const [playlistGenerator, setPlaylistGenerator] = useState<any>(null);
  const [playlistGeneratorError, setPlaylistGeneratorError] = useState<string | null>(null);
  const [wrappedStory, setWrappedStory] = useState<string | null>(null);
  const [wrappedStoryError, setWrappedStoryError] = useState<string | null>(null);
  const [spotifyWrapped, setSpotifyWrapped] = useState<any>(null);
  const [spotifyWrappedError, setSpotifyWrappedError] = useState<string | null>(null);

  async function handleGenreAnalysis() {
    if (loading) return;
    setLoading(true);
    setGenreAnalysis(null);
    setGenreAnalysisError(null);

    try {
      const response = await fetch('https://sonicmirror-backend.onrender.com/llm/genre-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topArtists: uniqueArtists.slice(0, 10).map(artist => artist.name),
          topTracks: uniqueTracks.slice(0, 10).map(track => track.name),
          topGenres: topGenres.slice(0, 10).map(genre => genre.genre),
          audioProfile: {
            danceability: audioFeatures?.avg_danceability || 0.5,
            energy: audioFeatures?.avg_energy || 0.5,
            valence: audioFeatures?.avg_valence || 0.5
          },
          listeningStats: {
            totalTracks: uniqueTracks.length,
            totalArtists: uniqueArtists.length,
            totalGenres: topGenres.length
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.genreAnalysis) {
        setGenreAnalysis(data.genreAnalysis);
      } else {
        setGenreAnalysisError('No genre analysis received from the server.');
      }
    } catch (error) {
      console.error('Error fetching genre analysis:', error);
      setGenreAnalysisError('Failed to fetch genre analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleListeningHabits() {
    if (loading) return;
    setLoading(true);
    setListeningHabits(null);
    setListeningHabitsError(null);

    try {
      const response = await fetch('https://sonicmirror-backend.onrender.com/llm/listening-habits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topArtists: uniqueArtists.slice(0, 10).map(artist => artist.name),
          topTracks: uniqueTracks.slice(0, 10).map(track => track.name),
          topGenres: topGenres.slice(0, 10).map(genre => genre.genre),
          audioProfile: {
            danceability: audioFeatures?.avg_danceability || 0.5,
            energy: audioFeatures?.avg_energy || 0.5,
            valence: audioFeatures?.avg_valence || 0.5
          },
          listeningStats: {
            totalTracks: uniqueTracks.length,
            totalArtists: uniqueArtists.length,
            totalGenres: topGenres.length
          },
          recentlyPlayed: uniqueRecentlyPlayed?.slice(0, 10).map((track: any) => track.name) || []
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.listeningHabits) {
        setListeningHabits(data.listeningHabits);
      } else {
        setListeningHabitsError('No listening habits analysis received from the server.');
      }
    } catch (error) {
      console.error('Error fetching listening habits:', error);
      setListeningHabitsError('Failed to fetch listening habits analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleMusicTherapy() {
    if (loading) return;
    setLoading(true);
    setMusicTherapy(null);
    setMusicTherapyError(null);

    try {
      const response = await fetch('https://sonicmirror-backend.onrender.com/llm/music-therapy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topArtists: uniqueArtists.slice(0, 10).map(artist => artist.name),
          topTracks: uniqueTracks.slice(0, 10).map(track => track.name),
          topGenres: topGenres.slice(0, 10).map(genre => genre.genre),
          audioProfile: {
            danceability: audioFeatures?.avg_danceability || 0.5,
            energy: audioFeatures?.avg_energy || 0.5,
            valence: audioFeatures?.avg_valence || 0.5
          },
          recentlyPlayed: uniqueRecentlyPlayed?.slice(0, 5).map((track: any) => track.name) || []
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.musicTherapy) {
        setMusicTherapy(data.musicTherapy);
      } else {
        setMusicTherapyError('No music therapy analysis received from the server.');
      }
    } catch (error) {
      console.error('Error fetching music therapy:', error);
      setMusicTherapyError('Failed to fetch music therapy analysis. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePlaylistGenerator() {
    if (loading) return;
    setLoading(true);
    setPlaylistGenerator(null);
    setPlaylistGeneratorError(null);

    try {
      const response = await fetch('https://sonicmirror-backend.onrender.com/llm/playlist-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topArtists: uniqueArtists.slice(0, 10).map(artist => artist.name),
          topTracks: uniqueTracks.slice(0, 10).map(track => track.name),
          topGenres: topGenres.slice(0, 10).map(genre => genre.genre),
          audioProfile: {
            danceability: audioFeatures?.avg_danceability || 0.5,
            energy: audioFeatures?.avg_energy || 0.5,
            valence: audioFeatures?.avg_valence || 0.5
          },
          mood: 'energetic',
          occasion: 'daily listening',
          duration: '1 hour'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.playlistGenerator) {
        setPlaylistGenerator(data.playlistGenerator);
      } else {
        setPlaylistGeneratorError('No playlist generated from the server.');
      }
    } catch (error) {
      console.error('Error generating playlist:', error);
      setPlaylistGeneratorError('Failed to generate playlist. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleWrappedStory() {
    if (loading) return;
    setLoading(true);
    setWrappedStory(null);
    setWrappedStoryError(null);

    try {
      const response = await fetch('https://sonicmirror-backend.onrender.com/llm/wrapped-story', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topArtists: uniqueArtists.slice(0, 10).map(artist => artist.name),
          topTracks: uniqueTracks.slice(0, 10).map(track => track.name),
          topGenres: topGenres.slice(0, 10).map(genre => genre.genre),
          audioProfile: {
            danceability: audioFeatures?.avg_danceability || 0.5,
            energy: audioFeatures?.avg_energy || 0.5,
            valence: audioFeatures?.avg_valence || 0.5
          },
          listeningStats: {
            totalTracks: uniqueTracks.length,
            totalArtists: uniqueArtists.length,
            genreDiversity: topGenres.length,
            mainstreamScore: mainstreamScore
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.story) {
        setWrappedStory(data.story);
      } else {
        setWrappedStoryError('No story generated from the server.');
      }
    } catch (error) {
      console.error('Error generating wrapped story:', error);
      setWrappedStoryError('Failed to generate wrapped story. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSpotifyWrapped() {
    if (loading) return;
    setLoading(true);
    setSpotifyWrapped(null);
    setSpotifyWrappedError(null);

    try {
      const response = await fetch('https://sonicmirror-backend.onrender.com/llm/spotify-wrapped', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topArtists: uniqueArtists.slice(0, 10).map(artist => artist.name),
          topTracks: uniqueTracks.slice(0, 10).map(track => track.name),
          topGenres: topGenres.slice(0, 10).map(genre => genre.genre),
          audioProfile: {
            danceability: audioFeatures?.avg_danceability || 0.5,
            energy: audioFeatures?.avg_energy || 0.5,
            valence: audioFeatures?.avg_valence || 0.5,
            tempo: audioFeatures?.avg_tempo || 120
          },
          listeningStats: {
            totalTracks: uniqueTracks.length,
            totalArtists: uniqueArtists.length,
            genreDiversity: topGenres.length,
            mainstreamScore: mainstreamScore
          },
          recentlyPlayed: recentlyPlayed.slice(0, 10).map(track => track.name)
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.wrapped) {
        setSpotifyWrapped(data.wrapped);
      } else {
        setSpotifyWrappedError('No wrapped data generated from the server.');
      }
    } catch (error) {
      console.error('Error generating Spotify Wrapped:', error);
      setSpotifyWrappedError('Failed to generate Spotify Wrapped. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleMusicalCompatibility() {
    if (musicalCompatibilityLoading) return;
    setMusicalCompatibilityLoading(true);
    setMusicalCompatibility(null);
    setMusicalCompatibilityError("");

    try {
      const response = await fetch('https://sonicmirror-backend.onrender.com/llm/musical-compatibility', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topArtists: uniqueArtists.slice(0, 10).map(artist => artist.name),
          topTracks: uniqueTracks.slice(0, 10).map(track => track.name),
          topGenres: topGenres.slice(0, 10).map(genre => genre.genre),
          audioProfile: {
            danceability: audioFeatures?.avg_danceability || 0.5,
            energy: audioFeatures?.avg_energy || 0.5,
            valence: audioFeatures?.avg_valence || 0.5
          },
          recentlyPlayed: uniqueRecentlyPlayed?.slice(0, 5).map((track: any) => track.name) || []
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.musicalCompatibility) {
        setMusicalCompatibility(data.musicalCompatibility);
      } else {
        setMusicalCompatibilityError('No musical compatibility analysis received from the server.');
      }
    } catch (error) {
      console.error('Error fetching musical compatibility:', error);
      setMusicalCompatibilityError('Failed to fetch musical compatibility analysis. Please try again.');
    } finally {
      setMusicalCompatibilityLoading(false);
    }
  }

  async function handleLyricalAnalysis() {
    if (lyricalAnalysisLoading) return;
    setLyricalAnalysisLoading(true);
    setLyricalAnalysis(null);
    setLyricalAnalysisError("");

    try {
      const response = await fetch('https://sonicmirror-backend.onrender.com/llm/lyrical-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topArtists: uniqueArtists.slice(0, 10).map(artist => artist.name),
          topTracks: uniqueTracks.slice(0, 10).map(track => track.name),
          topGenres: topGenres.slice(0, 10).map(genre => genre.genre),
          audioProfile: {
            danceability: audioFeatures?.avg_danceability || 0.5,
            energy: audioFeatures?.avg_energy || 0.5,
            valence: audioFeatures?.avg_valence || 0.5
          },
          recentlyPlayed: uniqueRecentlyPlayed?.slice(0, 5).map((track: any) => track.name) || []
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.lyricalAnalysis) {
        setLyricalAnalysis(data.lyricalAnalysis);
      } else {
        setLyricalAnalysisError('No lyrical analysis received from the server.');
      }
    } catch (error) {
      console.error('Error fetching lyrical analysis:', error);
      setLyricalAnalysisError('Failed to fetch lyrical analysis. Please try again.');
    } finally {
      setLyricalAnalysisLoading(false);
    }
  }

  async function handleSpotifyAction(action: any) {
    if (!accessToken) {
      alert('Please log in to Spotify to use this feature.');
      return;
    }

    try {
      if (action.type === 'playlist') {
        // Create playlist with recommended tracks
        const trackRecommendations = recommendations.recommendations
          .filter((rec: any) => rec.type === 'track')
          .slice(0, 10); // Limit to 10 tracks

        // Search for actual track URIs
        const trackUris = [];
        for (const rec of trackRecommendations) {
          try {
            const searchRes = await fetch(`https://sonicmirror-backend.onrender.com/spotify/search-tracks?access_token=${accessToken}&q=${encodeURIComponent(`${rec.name} ${rec.artist}`)}`);
            const searchData = await searchRes.json();
            
            if (searchData.tracks?.items?.length > 0) {
              const track = searchData.tracks.items[0];
              // Validate that we have a proper Spotify URI
              if (track.uri && track.uri.startsWith('spotify:track:')) {
                trackUris.push(track.uri);
              }
            }
          } catch (error) {
            console.error('Failed to search for track:', rec.name, error);
          }
        }

        // Only create playlist if we have valid track URIs
        if (trackUris.length === 0) {
          alert('Could not find any valid tracks to add to the playlist. Please try again.');
          return;
        }

        const res = await fetch(`https://sonicmirror-backend.onrender.com/spotify/create-playlist?access_token=${accessToken}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: action.name,
            description: action.description,
            trackUris: trackUris
          })
        });
        
        const data = await res.json();
        if (data.success) {
          alert(`Playlist "${action.name}" created successfully!`);
        } else {
          alert('Failed to create playlist: ' + (data.details || data.error));
        }
      } else if (action.type === 'artist') {
        // Search for artist and follow
        const searchRes = await fetch(`https://sonicmirror-backend.onrender.com/spotify/search-artists?access_token=${accessToken}&q=${encodeURIComponent(action.name)}`);
        const searchData = await searchRes.json();
        
        if (searchData.artists?.items?.length > 0) {
          const artistId = searchData.artists.items[0].id;
          const followRes = await fetch(`https://sonicmirror-backend.onrender.com/spotify/follow-artist?access_token=${accessToken}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ artistId })
          });
          
          const followData = await followRes.json();
          if (followData.success) {
            // Add to followed artists set
            setFollowedArtists(prev => new Set(prev).add(action.name));
          } else {
            alert('Failed to follow artist: ' + (followData.details || followData.error));
          }
        } else {
          alert(`Could not find artist: ${action.name}`);
        }
      }
    } catch (error) {
      console.error('Spotify action error:', error);
      alert('Failed to perform Spotify action. Please try again.');
    }
  }

  useEffect(() => {
    const accessToken = getTokenFromUrl();
    if (!accessToken) {
      setError("No access token found. Please login again.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setSectionErrors({});

    // Helper to fetch and handle errors per section
    const fetchSection = async (url: string, setter: (data: any) => void, section: string, transform?: (data: any) => any) => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch ${section}`);
        const data = await res.json();
        setter(transform ? transform(data) : data);
      } catch (err: any) {
        setSectionErrors(prev => ({ ...prev, [section]: err.message }));
        setter(section === 'audioFeatures' ? null : []);
      }
    };

          fetchSection(`https://sonicmirror-backend.onrender.com/spotify/me?access_token=${accessToken}`, setProfile, 'profile');
      fetchSection(`https://sonicmirror-backend.onrender.com/spotify/top-artists?access_token=${accessToken}`, d => setTopArtists(d.items || []), 'topArtists');
      fetchSection(`https://sonicmirror-backend.onrender.com/spotify/top-tracks?access_token=${accessToken}`, d => setTopTracks(d.items || []), 'topTracks');
      fetchSection(`https://sonicmirror-backend.onrender.com/spotify/recently-played?access_token=${accessToken}`, d => setRecentlyPlayed((d.items || []).map((item: any) => item.track)), 'recentlyPlayed');
      fetchSection(`https://sonicmirror-backend.onrender.com/spotify/top-genres?access_token=${accessToken}`, d => setTopGenres(d.topGenres || []), 'topGenres');
      fetchSection(`https://sonicmirror-backend.onrender.com/spotify/audio-features?access_token=${accessToken}`, setAudioFeatures, 'audioFeatures');

    setLoading(false);
  }, []);

  useEffect(() => {
    async function calculateGenreHopping() {
      if (!recentlyPlayed.length) {
        setGenreHoppingIndex(null);
        setGenreHoppingMsg("");
        return;
      }
      // Fetch genres for each track's first artist
      const artistIds = Array.from(new Set((recentlyPlayed as any[]).map((t: any) => t.artists?.[0]?.id).filter(Boolean)));
      const genreMap: { [artistId: string]: string[] } = {};
      for (let i = 0; i < artistIds.length; i += 50) {
        const ids = artistIds.slice(i, i + 50).join(",");
        const res = await fetch(`https://sonicmirror-backend.onrender.com/spotify/artists?ids=${ids}`);
        if (res.ok) {
          const data = await res.json();
          (data.artists || []).forEach((artist: any) => {
            genreMap[artist.id] = artist.genres || [];
          });
        }
      }
      // Assign genre to each track (first genre of first artist, or 'Unknown')
      const genres = (recentlyPlayed as any[]).map((t: any) => {
        const artistId = t.artists?.[0]?.id;
        return genreMap[artistId]?.[0] || "Unknown";
      });
      // Count hops
      let hops = 0;
      for (let i = 1; i < genres.length; i++) {
        if (genres[i] !== genres[i - 1]) hops++;
      }
      const index = genres.length > 1 ? hops / (genres.length - 1) : 0;
      setGenreHoppingIndex(index);
      if (index > 0.7) setGenreHoppingMsg("You're a genre explorer! 🎧🌈");
      else if (index > 0.4) setGenreHoppingMsg("You like to mix it up!");
      else setGenreHoppingMsg("You stick to your favorite vibes.");
    }
    calculateGenreHopping();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentlyPlayed]);

  useEffect(() => {
    if (!recentlyPlayed.length) {
      setEraData({});
      setEraMsg("");
      return;
    }
    const decadeCounts: { [decade: string]: number } = {};
    (recentlyPlayed as any[]).forEach((track: any) => {
      const date = track.album?.release_date;
      if (!date) return;
      const year = parseInt(date.slice(0, 4));
      if (isNaN(year)) return;
      const decade = Math.floor(year / 10) * 10;
      const label = `${decade}s`;
      decadeCounts[label] = (decadeCounts[label] || 0) + 1;
    });
    setEraData(decadeCounts);
    // Find most common decade
    const sorted = Object.entries(decadeCounts).sort((a, b) => b[1] - a[1]);
    if (sorted.length) {
      setEraMsg(`Your most played era: ${sorted[0][0]} (${sorted[0][1]} tracks)`);
    } else {
      setEraMsg("");
    }
  }, [recentlyPlayed]);

  useEffect(() => {
    if (!recentlyPlayed.length) {
      setListeningTimeMsg("");
      return;
    }
    // Count tracks by hour (local time)
    const hourCounts = Array(24).fill(0);
    (recentlyPlayed as any[]).forEach((track: any) => {
      if (track.played_at) {
        const d = new Date(track.played_at);
        const hour = d.getHours();
        hourCounts[hour]++;
      }
    });
    // Find the most common hour
    const maxCount = Math.max(...hourCounts);
    const peakHour = hourCounts.findIndex((c) => c === maxCount);
    // Map hour to period
    let period = "";
    let fun = "";
    if (peakHour >= 5 && peakHour < 12) {
      period = "Morning";
      fun = "Early bird gets the bops! ☀️";
    } else if (peakHour >= 12 && peakHour < 17) {
      period = "Afternoon";
      fun = "You jam through the day! 🎶";
    } else if (peakHour >= 17 && peakHour < 22) {
      period = "Evening";
      fun = "Prime time for tunes! 🌆";
    } else {
      period = "Late Night";
      fun = "Night owl vibes detected! 🌙";
    }
    setListeningTimeMsg(`You mostly listen in the ${period} (peak hour: ${peakHour}:00). ${fun}`);
  }, [recentlyPlayed]);

  // Remove duplicates by ID for artists and tracks
  const uniqueArtists = Array.from(new Map(topArtists.map(a => [a.id, a])).values());
  const uniqueTracks = Array.from(new Map(topTracks.map(t => [t.id, t])).values());
  const uniqueRecentlyPlayed = Array.from(new Map(recentlyPlayed.map(t => [t.id, t])).values());

  // Mainstream Meter calculation
  const mainstreamScore = uniqueTracks.length
    ? Math.round(
        uniqueTracks.reduce((sum, t) => sum + (t as any).popularity, 0) / uniqueTracks.length
      )
    : null;
  let mainstreamMessage = '';
  let mainstreamBadge = null;
  if (mainstreamScore !== null) {
    if (mainstreamScore >= 80) {
      mainstreamMessage = "You're basic and proud!";
      mainstreamBadge = <span className="inline-flex items-center gap-1 bg-yellow-400 text-yellow-900 font-bold px-3 py-1 rounded-full text-xs ml-2">⭐ Mainstream</span>;
    } else if (mainstreamScore >= 60) {
      mainstreamMessage = "You like the hits, but you know some gems.";
      mainstreamBadge = <span className="inline-flex items-center gap-1 bg-blue-400 text-blue-900 font-bold px-3 py-1 rounded-full text-xs ml-2">🎵 Balanced</span>;
    } else if (mainstreamScore >= 40) {
      mainstreamMessage = "You have a balanced taste—mainstream and indie.";
      mainstreamBadge = <span className="inline-flex items-center gap-1 bg-green-400 text-green-900 font-bold px-3 py-1 rounded-full text-xs ml-2">🌱 Indie</span>;
    } else {
      mainstreamMessage = "You're a true tastemaker! Underground legend.";
      mainstreamBadge = <span className="inline-flex items-center gap-1 bg-purple-400 text-purple-900 font-bold px-3 py-1 rounded-full text-xs ml-2">🕳️ Underground</span>;
    }
  }

  // Repeat Offenders: top 5 most repeated tracks in recently played (no dropdown)
  let repeatOffenders: { track: SpotifyTrack; count: number }[] = [];
  if (recentlyPlayed.length) {
    const countMap: { [id: string]: { track: SpotifyTrack; count: number } } = {};
    (recentlyPlayed as any[]).forEach((track: any) => {
      if (!countMap[track.id]) countMap[track.id] = { track, count: 0 };
      countMap[track.id].count++;
    });
    repeatOffenders = Object.values(countMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  function handleLogout() {
    // Remove access_token from URL and redirect to login
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  if (loading) return <div className="text-center mt-12 text-xl">Loading your Spotify data...</div>;
  if (error) return <div className="text-center mt-12 text-red-400">{error}</div>;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-700 text-white p-4">
      {/* Log Out Button */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={() => setDiscoMode(!discoMode)}
          className={`font-bold rounded-full px-4 py-2 text-sm shadow transition ${
            discoMode 
              ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-yellow-500 animate-pulse' 
              : 'bg-purple-600 hover:bg-purple-500'
          } text-white`}
        >
          {discoMode ? '🎉 Disco ON!' : '🕺 Disco Mode'}
        </button>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-400 text-white font-bold rounded-full px-6 py-2 text-lg shadow transition"
        >
          Log Out
        </button>
      </div>
      <div className="w-full max-w-6xl mx-auto grid gap-10 py-8">
        {/* User Profile Card */}
        <div className="w-full max-w-md mx-auto bg-gray-900 bg-opacity-80 rounded-2xl shadow-lg flex flex-col items-center p-6 mb-8 border border-indigo-500 transition-transform transition-shadow hover:shadow-2xl hover:scale-[1.02]">
          {profile?.images?.[0]?.url && (
            <img src={profile.images[0].url} alt="Profile" className="rounded-full mb-4 cursor-pointer" style={{ width: 96, height: 96 }} onClick={() => setShowSinatraEgg(true)} />
          )}
          <h2 className="text-2xl font-bold mb-1">{profile?.display_name || "Spotify User"}</h2>
          {profile?.email && <div className="text-gray-300 text-sm mb-2">{profile.email}</div>}
        </div>
        {/* Sinatra Easter Egg Modal */}
        {showSinatraEgg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full flex flex-col items-center relative">
              <button className="absolute top-2 right-2 text-gray-500 hover:text-black text-2xl font-bold" onClick={() => setShowSinatraEgg(false)}>&times;</button>
              <h3 className="text-2xl font-bold mb-4 text-black">🌙 To the Moon!</h3>
              <p className="mb-4 text-lg text-gray-800 text-center">You found the hidden track:<br/><span className="font-bold">Fly Me to the Moon</span> by Frank Sinatra<br/>A timeless classic for dreamers.</p>
              <iframe src="https://open.spotify.com/embed/track/2dR5WkrpwylTuT3jRWNufa" width="300" height="80" frameBorder="0" allow="encrypted-media" title="Fly Me to the Moon by Frank Sinatra" className="rounded-lg"></iframe>
              <a href="https://open.spotify.com/track/2dR5WkrpwylTuT3jRWNufa" target="_blank" rel="noopener noreferrer" className="mt-4 text-green-600 font-bold underline">Play on Spotify</a>
            </div>
          </div>
        )}
        <h2 className="text-3xl font-bold mb-4 text-center">Welcome, {profile?.display_name || "Spotify User"}!</h2>
        <p className="mb-6 text-center">Here are your top artists and tracks, plus more stats:</p>
        {/* AI Features Section */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
            AI-Powered Insights
          </h2>
          <p className="mb-8 text-center text-gray-300 text-lg">
            Discover what your music taste reveals about you
          </p>
          
          {/* AI Feature Buttons */}
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-white mb-4 text-center flex items-center justify-center gap-3">
              <span className="text-3xl">🤖</span>
              AI-Powered Insights
              <span className="text-3xl">✨</span>
            </h2>
            <p className="text-gray-300 text-center mb-6 max-w-2xl mx-auto">
              Discover what your music taste reveals about your personality, emotions, and listening habits with our advanced AI analysis
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <button
              onClick={handleRoastMe}
              className="group relative overflow-hidden bg-gradient-to-br from-pink-500 to-pink-700 hover:from-pink-400 hover:to-pink-600 rounded-2xl p-6 text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={roastLoading}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-pink-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-3xl mb-3">🔥</div>
                <div className="text-lg font-bold mb-2">Roast Me</div>
                <div className="text-sm opacity-90">Get a witty roast of your music taste</div>
                {roastLoading && (
                  <div className="mt-3 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span className="ml-2 text-sm">Roasting...</span>
                  </div>
                )}
              </div>
            </button>

            <button
              onClick={handleGetPersonality}
              className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-700 hover:from-purple-400 hover:to-purple-600 rounded-2xl p-6 text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={personalityLoading}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-3xl mb-3">🧠</div>
                <div className="text-lg font-bold mb-2">Personality</div>
                <div className="text-sm opacity-90">What your music says about you</div>
                {personalityLoading && (
                  <div className="mt-3 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span className="ml-2 text-sm">Analyzing...</span>
                  </div>
                )}
              </div>
            </button>

            <button
              onClick={handleGetMoodAnalysis}
              className="group relative overflow-hidden bg-gradient-to-br from-teal-500 to-teal-700 hover:from-teal-400 hover:to-teal-600 rounded-2xl p-6 text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={moodLoading}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-teal-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-3xl mb-3">🎭</div>
                <div className="text-lg font-bold mb-2">Mood Analysis</div>
                <div className="text-sm opacity-90">Your emotional music profile</div>
                {moodLoading && (
                  <div className="mt-3 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span className="ml-2 text-sm">Analyzing...</span>
                  </div>
                )}
              </div>
            </button>

            <button
              onClick={handleGetRecommendations}
              className="group relative overflow-hidden bg-gradient-to-br from-orange-500 to-orange-700 hover:from-orange-400 hover:to-orange-600 rounded-2xl p-6 text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={recommendationsLoading}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-3xl mb-3">🎵</div>
                <div className="text-lg font-bold mb-2">Recommendations</div>
                <div className="text-sm opacity-90">Discover new music</div>
                {recommendationsLoading && (
                  <div className="mt-3 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span className="ml-2 text-sm">Finding...</span>
                  </div>
                )}
              </div>
            </button>
          </div>

          {/* Additional AI Feature Buttons */}
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-white mb-4 text-center flex items-center justify-center gap-3">
              <span className="text-3xl">🔮</span>
              Advanced AI Features
              <span className="text-3xl">🌟</span>
            </h2>
            <p className="text-gray-300 text-center mb-6 max-w-2xl mx-auto">
              Explore deeper insights with genre analysis, listening habits, music therapy, and AI-generated playlists
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <button
              onClick={handleGenreAnalysis}
              className="group relative overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-700 hover:from-indigo-400 hover:to-indigo-600 rounded-2xl p-6 text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-3xl mb-3">🎼</div>
                <div className="text-lg font-bold mb-2">Genre Analysis</div>
                <div className="text-sm opacity-90">Deep dive into your genre preferences</div>
                {loading && (
                  <div className="mt-3 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span className="ml-2 text-sm">Analyzing...</span>
                  </div>
                )}
              </div>
            </button>

            <button
              onClick={handleListeningHabits}
              className="group relative overflow-hidden bg-gradient-to-br from-emerald-500 to-emerald-700 hover:from-emerald-400 hover:to-emerald-600 rounded-2xl p-6 text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-3xl mb-3">📊</div>
                <div className="text-lg font-bold mb-2">Listening Habits</div>
                <div className="text-sm opacity-90">Understand your music behavior patterns</div>
                {loading && (
                  <div className="mt-3 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span className="ml-2 text-sm">Analyzing...</span>
                  </div>
                )}
              </div>
            </button>

            <button
              onClick={handleMusicTherapy}
              className="group relative overflow-hidden bg-gradient-to-br from-rose-500 to-rose-700 hover:from-rose-400 hover:to-rose-600 rounded-2xl p-6 text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-rose-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-3xl mb-3">💆‍♀️</div>
                <div className="text-lg font-bold mb-2">Music Therapy</div>
                <div className="text-sm opacity-90">Heal through your music choices</div>
                {loading && (
                  <div className="mt-3 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span className="ml-2 text-sm">Therapizing...</span>
                  </div>
                )}
              </div>
            </button>

            <button
              onClick={handlePlaylistGenerator}
              className="group relative overflow-hidden bg-gradient-to-br from-cyan-500 to-cyan-700 hover:from-cyan-400 hover:to-cyan-600 rounded-2xl p-6 text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-3xl mb-3">🎧</div>
                <div className="text-lg font-bold mb-2">Playlist Generator</div>
                <div className="text-sm opacity-90">AI-curated playlists just for you</div>
                {loading && (
                  <div className="mt-3 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span className="ml-2 text-sm">Generating...</span>
                  </div>
                )}
              </div>
            </button>

            <button
              onClick={handleWrappedStory}
              className="group relative overflow-hidden bg-gradient-to-br from-violet-500 to-violet-700 hover:from-violet-400 hover:to-violet-600 rounded-2xl p-6 text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-violet-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-3xl mb-3">📖</div>
                <div className="text-lg font-bold mb-2">Wrapped Story</div>
                <div className="text-sm opacity-90">Dark comedy story of your music life</div>
                {loading && (
                  <div className="mt-3 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span className="ml-2 text-sm">Writing...</span>
                  </div>
                )}
              </div>
            </button>

            <button
              onClick={handleSpotifyWrapped}
              className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 rounded-2xl p-6 text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-green-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-3xl mb-3">🎵</div>
                <div className="text-lg font-bold mb-2">Spotify Wrapped</div>
                <div className="text-sm opacity-90">Your current music recap</div>
                {loading && (
                  <div className="mt-3 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span className="ml-2 text-sm">Predicting...</span>
                  </div>
                )}
              </div>
            </button>

            <button
              onClick={handleMusicalCompatibility}
              className="group relative overflow-hidden bg-gradient-to-br from-amber-500 to-amber-700 hover:from-amber-400 hover:to-amber-600 rounded-2xl p-6 text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={musicalCompatibilityLoading}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-3xl mb-3">💕</div>
                <div className="text-lg font-bold mb-2">Musical Compatibility</div>
                <div className="text-sm opacity-90">Your relationship potential through music</div>
                {musicalCompatibilityLoading && (
                  <div className="mt-3 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span className="ml-2 text-sm">Analyzing...</span>
                  </div>
                )}
              </div>
            </button>

            <button
              onClick={handleLyricalAnalysis}
              className="group relative overflow-hidden bg-gradient-to-br from-lime-500 to-lime-700 hover:from-lime-400 hover:to-lime-600 rounded-2xl p-6 text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-2xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={lyricalAnalysisLoading}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-lime-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative z-10">
                <div className="text-3xl mb-3">📝</div>
                <div className="text-lg font-bold mb-2">Lyrical Analysis</div>
                <div className="text-sm opacity-90">What your lyrics say about you</div>
                {lyricalAnalysisLoading && (
                  <div className="mt-3 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span className="ml-2 text-sm">Analyzing...</span>
                  </div>
                )}
              </div>
            </button>
          </div>

          {/* Action Buttons Row */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <ShareDropdown
              profile={profile}
              uniqueArtists={uniqueArtists}
              uniqueTracks={uniqueTracks}
              mainstreamScore={mainstreamScore}
              buttonClassName="px-6 py-3 rounded-xl text-base shadow-lg hover:shadow-xl transition-all duration-300"
            />
            <DownloadDropdown buttonClassName="px-6 py-3 rounded-xl text-base shadow-lg hover:shadow-xl transition-all duration-300" />
            <Link
              href={accessToken ? `/analysis?access_token=${encodeURIComponent(accessToken)}` : "/analysis"}
              className="px-6 py-3 rounded-xl text-base shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-bold flex items-center justify-center">
              <span className="mr-2">📊</span>
              Detailed Analysis
            </Link>
          </div>

          {/* AI Results Display */}
          {(roast || personality || moodAnalysis || recommendations || genreAnalysis || listeningHabits || musicTherapy || playlistGenerator || wrappedStory || spotifyWrapped || musicalCompatibility || lyricalAnalysis) && (
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white mb-4 text-center flex items-center justify-center gap-3">
                <span className="text-3xl">📊</span>
                Your AI Analysis Results
                <span className="text-3xl">🎯</span>
              </h2>
              <p className="text-gray-300 text-center mb-6 max-w-2xl mx-auto">
                Personalized insights generated just for you based on your unique music taste
              </p>
            </div>
          )}
          <div className="space-y-6">
            {/* Roast Result */}
            {roast && (
              <div className="bg-gradient-to-br from-red-900/80 to-pink-800/60 rounded-2xl p-8 shadow-2xl border border-red-500/30 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-red-400 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-3xl">🔥</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold text-red-200 mb-1">Your Music Roast</h3>
                    <p className="text-red-300 text-sm">Brutally honest analysis of your musical soul</p>
                  </div>
                  {roastError && roastError.includes('fallback') && (
                    <div className="ml-auto">
                      <span className="inline-flex items-center gap-1 bg-yellow-400 text-yellow-900 font-bold px-3 py-1 rounded-full text-xs">
                        ⚠️ Fallback Response
                      </span>
                    </div>
                  )}
                </div>
                
                                  <div className="bg-gradient-to-br from-red-800/80 to-pink-700/60 rounded-xl p-8 border border-red-500/30 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-400 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-red-100 text-xl">💀</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xl text-red-100 leading-relaxed font-medium drop-shadow-lg">{roast}</p>
                    </div>
                  </div>
                </div>
                
                {roastError && roastError.includes('fallback') && (
                  <div className="mt-6 p-4 bg-yellow-900/40 rounded-xl border border-yellow-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-300">⚠️</span>
                      <span className="text-yellow-200 font-semibold">AI Service Unavailable</span>
                    </div>
                    <p className="text-yellow-100 text-sm">
                      {roastError.includes('API key') 
                        ? 'Please configure your Gemini API key to get personalized AI insights. Run "npm run setup-gemini" in the backend directory.'
                        : 'Using fallback response. The AI service is currently unavailable or rate limited.'
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
            {roastError && (
              <div className="bg-red-900/80 rounded-2xl p-6 shadow-lg border border-red-500/30">
                <div className="text-red-200 text-center">{roastError}</div>
              </div>
            )}

            {/* Personality Result */}
            {personality && (
              <div className="bg-gradient-to-br from-purple-900/80 to-indigo-800/60 rounded-2xl p-8 shadow-2xl border border-purple-500/30 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-3xl">🧠</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold text-purple-200 mb-1">Your Music Personality</h3>
                    <p className="text-purple-300 text-sm">Deep psychological insights through your music</p>
                  </div>
                  {personalityError && personalityError.includes('fallback') && (
                    <div className="ml-auto">
                      <span className="inline-flex items-center gap-1 bg-yellow-400 text-yellow-900 font-bold px-3 py-1 rounded-full text-xs">
                        ⚠️ Fallback Response
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="bg-gradient-to-br from-purple-800/80 to-indigo-700/60 rounded-xl p-8 border border-purple-500/30 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-purple-100 text-xl">🔍</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xl text-purple-100 leading-relaxed font-medium drop-shadow-lg">{personality}</p>
                    </div>
                  </div>
                </div>
                
                {personalityError && personalityError.includes('fallback') && (
                  <div className="mt-6 p-4 bg-yellow-900/40 rounded-xl border border-yellow-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-300">⚠️</span>
                      <span className="text-yellow-200 font-semibold">AI Service Unavailable</span>
                    </div>
                    <p className="text-yellow-100 text-sm">
                      {personalityError.includes('API key') 
                        ? 'Please configure your Gemini API key to get personalized AI insights. Run "npm run setup-gemini" in the backend directory.'
                        : 'Using fallback response. The AI service is currently unavailable or rate limited.'
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
            {personalityError && (
              <div className="bg-red-900/80 rounded-2xl p-6 shadow-lg border border-red-500/30">
                <div className="text-red-200 text-center">{personalityError}</div>
              </div>
            )}

            {/* Mood Analysis Result */}
            {moodAnalysis && (
              <div className="bg-gradient-to-br from-teal-900/80 to-teal-800/60 rounded-2xl p-8 shadow-2xl border border-teal-500/30 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-teal-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-3xl">🎭</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold text-teal-200 mb-1">Music Mood Analysis</h3>
                    <p className="text-teal-300 text-sm">Emotional profile through your musical choices</p>
                  </div>
                  {moodError && moodError.includes('fallback') && (
                    <div className="ml-auto">
                      <span className="inline-flex items-center gap-1 bg-yellow-400 text-yellow-900 font-bold px-3 py-1 rounded-full text-xs">
                        ⚠️ Fallback Response
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Primary and Secondary Moods */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-teal-800/60 rounded-xl p-6 border border-teal-500/30">
                    <h4 className="text-lg font-semibold text-teal-200 mb-3 flex items-center gap-2">
                      <span>🌟</span>
                      Primary Mood
                    </h4>
                    <p className="text-3xl font-bold text-teal-100">{moodAnalysis.primaryMood}</p>
                  </div>
                  <div className="bg-teal-800/60 rounded-xl p-6 border border-teal-500/30">
                    <h4 className="text-lg font-semibold text-teal-200 mb-3 flex items-center gap-2">
                      <span>✨</span>
                      Secondary Mood
                    </h4>
                    <p className="text-3xl font-bold text-teal-100">{moodAnalysis.secondaryMood}</p>
                  </div>
                </div>

                {/* Emotional Profile Chart */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-teal-200 mb-4 flex items-center gap-2">
                    <span>📊</span>
                    Emotional Profile
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(moodAnalysis.emotionalProfile).map(([key, value]) => (
                      <div key={key} className="bg-teal-800/60 rounded-xl p-4 text-center border border-teal-500/30">
                        <div className="text-sm text-teal-300 capitalize mb-2">{key}</div>
                        <div className="text-2xl font-bold text-teal-100 mb-2">{value as number}%</div>
                        <div className="w-full bg-teal-900/60 rounded-full h-3">
                          <div 
                            className="bg-gradient-to-r from-teal-400 to-teal-300 h-3 rounded-full transition-all duration-1000" 
                            style={{ width: `${value as number}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Mood Insights */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-teal-200 mb-4 flex items-center gap-2">
                    <span>💭</span>
                    Mood Insights
                  </h4>
                  <div className="bg-teal-800/40 rounded-xl p-6">
                    <ul className="space-y-3">
                      {moodAnalysis.moodInsights.map((insight: string, index: number) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="text-teal-300 text-lg mt-0.5">•</span>
                          <span className="text-teal-100">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Mood Recommendations */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-teal-200 mb-4 flex items-center gap-2">
                    <span>💡</span>
                    Mood Recommendations
                  </h4>
                  <div className="bg-teal-800/40 rounded-xl p-6">
                    <ul className="space-y-3">
                      {moodAnalysis.moodRecommendations.map((rec: string, index: number) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="text-teal-300 text-lg mt-0.5">💡</span>
                          <span className="text-teal-100">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Emotional Summary */}
                <div className="bg-teal-800/60 rounded-xl p-6 border border-teal-500/30">
                  <h4 className="text-lg font-semibold text-teal-200 mb-3 flex items-center gap-2">
                    <span>📝</span>
                    Emotional Summary
                  </h4>
                  <p className="text-teal-100 leading-relaxed">{moodAnalysis.emotionalSummary}</p>
                </div>
              </div>
            )}
            {moodError && (
              <div className="bg-red-900/80 rounded-2xl p-6 shadow-lg border border-red-500/30">
                <div className="text-red-200 text-center">{moodError}</div>
              </div>
            )}

            {/* Recommendations Result */}
            {recommendations && (
              <div className="bg-gradient-to-br from-orange-900/80 to-orange-800/60 rounded-2xl p-8 shadow-2xl border border-orange-500/30 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-3xl">🎵</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold text-orange-200 mb-1">AI Music Recommendations</h3>
                    <p className="text-orange-300 text-sm">Personalized discoveries for your musical journey</p>
                  </div>
                  {recommendationsError && recommendationsError.includes('fallback') && (
                    <div className="ml-auto">
                      <span className="inline-flex items-center gap-1 bg-yellow-400 text-yellow-900 font-bold px-3 py-1 rounded-full text-xs">
                        ⚠️ Fallback Response
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Artist Recommendations */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-orange-200 mb-4 flex items-center gap-2">
                    <span>🎤</span>
                    Artist Recommendations
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recommendations.recommendations
                      .filter((rec: any) => rec.type === 'artist')
                      .map((rec: any, index: number) => (
                        <div key={index} className="bg-gradient-to-br from-orange-800/80 to-orange-700/60 rounded-xl p-6 border border-orange-500/30 hover:from-orange-800/90 hover:to-orange-700/80 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]">
                                                  <div className="flex items-center gap-4 mb-4">
                          {rec.imageUrl ? (
                            <img 
                              src={rec.imageUrl} 
                              alt={rec.name} 
                              className="w-16 h-16 rounded-full object-cover shadow-lg border-2 border-orange-400"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                              <span className="text-2xl">🎤</span>
                            </div>
                          )}
                            <div className="flex-1">
                              <h5 className="text-xl font-bold text-orange-100 mb-1">{rec.name}</h5>
                              <div className="text-sm text-orange-200 bg-orange-900/40 rounded-lg px-3 py-1 inline-block font-medium">{rec.genre}</div>
                              {rec.popularity && (
                                <div className="text-xs text-orange-300 mt-1">
                                  Popularity: {rec.popularity}/100
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="text-sm text-orange-100 leading-relaxed bg-orange-900/20 rounded-lg p-3 border-l-4 border-orange-400">
                              {rec.reason}
                            </div>
                            <div className="text-xs text-orange-300 italic bg-orange-900/30 rounded-lg px-3 py-2">
                              <span className="font-semibold">Similar to:</span> {rec.similarity}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Track Recommendations */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-orange-200 mb-4 flex items-center gap-2">
                    <span>🎵</span>
                    Track Recommendations
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recommendations.recommendations
                      .filter((rec: any) => rec.type === 'track')
                      .map((rec: any, index: number) => (
                        <div key={index} className="bg-gradient-to-br from-orange-800/80 to-orange-700/60 rounded-xl p-6 border border-orange-500/30 hover:from-orange-800/90 hover:to-orange-700/80 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]">
                                                  <div className="flex items-center gap-4 mb-4">
                          {rec.imageUrl ? (
                            <img 
                              src={rec.imageUrl} 
                              alt={rec.name} 
                              className="w-16 h-16 rounded object-cover shadow-lg border-2 border-orange-400"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                              <span className="text-2xl">🎵</span>
                            </div>
                          )}
                            <div className="flex-1">
                              <h5 className="text-xl font-bold text-orange-100 mb-1">{rec.name}</h5>
                              <div className="text-sm text-orange-200 font-medium">{rec.artist}</div>
                              <div className="text-sm text-orange-200 bg-orange-900/40 rounded-lg px-3 py-1 inline-block mt-1">{rec.genre}</div>
                              {rec.popularity && (
                                <div className="text-xs text-orange-300 mt-1">
                                  Popularity: {rec.popularity}/100
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="text-sm text-orange-100 leading-relaxed bg-orange-900/20 rounded-lg p-3 border-l-4 border-orange-400">
                              {rec.reason}
                            </div>
                            <div className="text-xs text-orange-300 italic bg-orange-900/30 rounded-lg px-3 py-2">
                              <span className="font-semibold">Similar to:</span> {rec.similarity}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Discovery Insights */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-orange-200 mb-4 flex items-center gap-2">
                    <span>🔍</span>
                    Discovery Insights
                  </h4>
                  <div className="bg-gradient-to-br from-orange-800/60 to-orange-700/40 rounded-xl p-6 border border-orange-500/30 shadow-lg">
                    <ul className="space-y-4">
                      {recommendations.discoveryInsights.map((insight: string, index: number) => (
                        <li key={index} className="flex items-start gap-4 bg-orange-900/30 rounded-lg p-4 border-l-4 border-orange-400">
                          <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-orange-100 text-sm font-bold">{index + 1}</span>
                          </div>
                          <span className="text-orange-100 leading-relaxed">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Recommendation Strategy */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-orange-200 mb-4 flex items-center gap-2">
                    <span>🎯</span>
                    Recommendation Strategy
                  </h4>
                  <div className="bg-gradient-to-br from-orange-800/80 to-orange-700/60 rounded-xl p-6 border border-orange-500/30 shadow-lg">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-orange-100 text-xl">🎯</span>
                      </div>
                      <p className="text-orange-100 leading-relaxed text-lg">{recommendations.recommendationStrategy}</p>
                    </div>
                  </div>
                </div>

                {/* Spotify Actions */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-orange-200 mb-4 flex items-center gap-2">
                    <span>🎵</span>
                    Spotify Actions
                  </h4>
                  <div className="space-y-4">
                    {recommendations.spotifyActions?.map((action: any, index: number) => (
                      <div key={index} className="bg-gradient-to-br from-orange-800/80 to-orange-700/60 rounded-xl p-6 border border-orange-500/30 shadow-lg hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                              <span className="text-xl">
                                {action.type === 'playlist' ? '📝' : '👤'}
                              </span>
                            </div>
                            <div>
                              <div className="font-bold text-orange-100 text-lg mb-1">
                                {action.type === 'playlist' ? action.name : action.name}
                              </div>
                              <div className="text-sm text-orange-200 bg-orange-900/40 rounded-lg px-3 py-1 inline-block">
                                {action.type === 'playlist' ? action.description : action.action}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleSpotifyAction(action)}
                            className={`px-6 py-3 font-bold rounded-full text-sm transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 ${
                              action.type === 'playlist' 
                                ? 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white'
                                : followedArtists.has(action.name)
                                  ? 'bg-gradient-to-r from-gray-600 to-gray-500 text-gray-300 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white'
                            }`}
                            disabled={action.type === 'artist' && followedArtists.has(action.name)}
                          >
                            {action.type === 'playlist' 
                              ? 'Create Playlist' 
                              : followedArtists.has(action.name) 
                                ? 'Following' 
                                : 'Follow Artist'
                            }
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {recommendationsError && <div className="text-red-400 mt-2 mb-4">{recommendationsError}</div>}

            {/* Genre Analysis Result */}
            {genreAnalysis && (
              <div className="bg-gradient-to-br from-indigo-900/80 to-indigo-800/60 rounded-2xl p-8 shadow-2xl border border-indigo-500/30 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-3xl">🎼</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold text-indigo-200 mb-1">Genre Analysis</h3>
                    <p className="text-indigo-300 text-sm">Deep dive into your musical preferences</p>
                  </div>
                  {genreAnalysisError && genreAnalysisError.includes('fallback') && (
                    <div className="ml-auto">
                      <span className="inline-flex items-center gap-1 bg-yellow-400 text-yellow-900 font-bold px-3 py-1 rounded-full text-xs">
                        ⚠️ Fallback Response
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Genre Personality */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-indigo-200 mb-4 flex items-center gap-2">
                    <span>🎭</span>
                    Your Genre Personality
                  </h4>
                  <div className="bg-gradient-to-br from-indigo-800/80 to-indigo-700/60 rounded-xl p-6 border border-indigo-500/30 shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-2xl">🎼</span>
                      </div>
                      <div>
                        <h5 className="text-2xl font-bold text-indigo-100 mb-2">{genreAnalysis.genrePersonality}</h5>
                        <p className="text-indigo-200 leading-relaxed">{genreAnalysis.genreSummary}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Genre Breakdown */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-indigo-200 mb-4 flex items-center gap-2">
                    <span>📊</span>
                    Genre Breakdown
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {genreAnalysis.genreBreakdown?.map((genre: any, index: number) => (
                      <div key={index} className="bg-gradient-to-br from-indigo-800/80 to-indigo-700/60 rounded-xl p-6 border border-indigo-500/30 hover:from-indigo-800/90 hover:to-indigo-700/80 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]">
                        <div className="flex items-center justify-between mb-4">
                          <h5 className="text-xl font-bold text-indigo-100">{genre.genre}</h5>
                          <div className="text-2xl font-bold text-indigo-300">{genre.percentage}%</div>
                        </div>
                        <div className="w-full bg-indigo-900/60 rounded-full h-3 mb-4">
                          <div 
                            className="bg-gradient-to-r from-indigo-400 to-indigo-300 h-3 rounded-full transition-all duration-1000" 
                            style={{ width: `${genre.percentage}%` }}
                          ></div>
                        </div>
                        <div className="space-y-3">
                          <div className="text-sm text-indigo-100 leading-relaxed bg-indigo-900/20 rounded-lg p-3 border-l-4 border-indigo-400">
                            <span className="font-semibold">Psychological Insight:</span> {genre.psychologicalInsight}
                          </div>
                          <div className="text-sm text-indigo-100 leading-relaxed bg-indigo-900/20 rounded-lg p-3 border-l-4 border-indigo-400">
                            <span className="font-semibold">Cultural Implications:</span> {genre.culturalImplications}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Genre Conflicts */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-indigo-200 mb-4 flex items-center gap-2">
                    <span>⚡</span>
                    Genre Conflicts
                  </h4>
                  <div className="bg-gradient-to-br from-indigo-800/60 to-indigo-700/40 rounded-xl p-6 border border-indigo-500/30 shadow-lg">
                    <ul className="space-y-4">
                      {genreAnalysis.genreConflicts?.map((conflict: string, index: number) => (
                        <li key={index} className="flex items-start gap-4 bg-indigo-900/30 rounded-lg p-4 border-l-4 border-indigo-400">
                          <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-indigo-100 text-sm font-bold">{index + 1}</span>
                          </div>
                          <span className="text-indigo-100 leading-relaxed">{conflict}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Genre Evolution */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-indigo-200 mb-4 flex items-center gap-2">
                    <span>🔄</span>
                    Genre Evolution
                  </h4>
                  <div className="bg-gradient-to-br from-indigo-800/60 to-indigo-700/40 rounded-xl p-6 border border-indigo-500/30 shadow-lg">
                    <ul className="space-y-4">
                      {genreAnalysis.genreEvolution?.map((evolution: string, index: number) => (
                        <li key={index} className="flex items-start gap-4 bg-indigo-900/30 rounded-lg p-4 border-l-4 border-indigo-400">
                          <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-indigo-100 text-sm font-bold">{index + 1}</span>
                          </div>
                          <span className="text-indigo-100 leading-relaxed">{evolution}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Genre Recommendations */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-indigo-200 mb-4 flex items-center gap-2">
                    <span>💡</span>
                    Genre Recommendations
                  </h4>
                  <div className="bg-gradient-to-br from-indigo-800/60 to-indigo-700/40 rounded-xl p-6 border border-indigo-500/30 shadow-lg">
                    <ul className="space-y-4">
                      {genreAnalysis.genreRecommendations?.map((recommendation: string, index: number) => (
                        <li key={index} className="flex items-start gap-4 bg-indigo-900/30 rounded-lg p-4 border-l-4 border-indigo-400">
                          <div className="w-8 h-8 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-indigo-100 text-sm font-bold">{index + 1}</span>
                          </div>
                          <span className="text-indigo-100 leading-relaxed">{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            {genreAnalysisError && (
              <div className="bg-red-900/80 rounded-2xl p-6 shadow-lg border border-red-500/30">
                <div className="text-red-200 text-center">{genreAnalysisError}</div>
              </div>
            )}

            {/* Listening Habits Result */}
            {listeningHabits && (
              <div className="bg-gradient-to-br from-emerald-900/80 to-emerald-800/60 rounded-2xl p-8 shadow-2xl border border-emerald-500/30 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-3xl">📊</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold text-emerald-200 mb-1">Listening Habits Analysis</h3>
                    <p className="text-emerald-300 text-sm">Behavioral patterns in your music consumption</p>
                  </div>
                  {listeningHabitsError && listeningHabitsError.includes('fallback') && (
                    <div className="ml-auto">
                      <span className="inline-flex items-center gap-1 bg-yellow-400 text-yellow-900 font-bold px-3 py-1 rounded-full text-xs">
                        ⚠️ Fallback Response
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Listening Personality */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-emerald-200 mb-4 flex items-center gap-2">
                    <span>🎭</span>
                    Your Listening Personality
                  </h4>
                  <div className="bg-gradient-to-br from-emerald-800/80 to-emerald-700/60 rounded-xl p-6 border border-emerald-500/30 shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-2xl">📊</span>
                      </div>
                      <div>
                        <h5 className="text-2xl font-bold text-emerald-100 mb-2">{listeningHabits.listeningPersonality}</h5>
                        <p className="text-emerald-200 leading-relaxed">{listeningHabits.habitSummary}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Habit Patterns */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-emerald-200 mb-4 flex items-center gap-2">
                    <span>📈</span>
                    Habit Patterns
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {listeningHabits.habitPatterns?.map((pattern: any, index: number) => (
                      <div key={index} className="bg-gradient-to-br from-emerald-800/80 to-emerald-700/60 rounded-xl p-6 border border-emerald-500/30 hover:from-emerald-800/90 hover:to-emerald-700/80 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-xl">📈</span>
                          </div>
                          <div>
                            <h5 className="text-lg font-bold text-emerald-100">{pattern.pattern}</h5>
                            <div className="text-sm text-emerald-200 bg-emerald-900/40 rounded-lg px-3 py-1 inline-block font-medium">{pattern.frequency}</div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="text-sm text-emerald-100 leading-relaxed bg-emerald-900/20 rounded-lg p-3 border-l-4 border-emerald-400">
                            <span className="font-semibold">Psychological Insight:</span> {pattern.psychologicalInsight}
                          </div>
                          <div className="text-sm text-emerald-100 leading-relaxed bg-emerald-900/20 rounded-lg p-3 border-l-4 border-emerald-400">
                            <span className="font-semibold">Social Implications:</span> {pattern.socialImplications}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Listening Triggers */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-emerald-200 mb-4 flex items-center gap-2">
                    <span>🎯</span>
                    Listening Triggers
                  </h4>
                  <div className="bg-gradient-to-br from-emerald-800/60 to-emerald-700/40 rounded-xl p-6 border border-emerald-500/30 shadow-lg">
                    <ul className="space-y-4">
                      {listeningHabits.listeningTriggers?.map((trigger: string, index: number) => (
                        <li key={index} className="flex items-start gap-4 bg-emerald-900/30 rounded-lg p-4 border-l-4 border-emerald-400">
                          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-emerald-100 text-sm font-bold">{index + 1}</span>
                          </div>
                          <span className="text-emerald-100 leading-relaxed">{trigger}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Habit Red Flags */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-emerald-200 mb-4 flex items-center gap-2">
                    <span>⚠️</span>
                    Habit Red Flags
                  </h4>
                  <div className="bg-gradient-to-br from-emerald-800/60 to-emerald-700/40 rounded-xl p-6 border border-emerald-500/30 shadow-lg">
                    <ul className="space-y-4">
                      {listeningHabits.habitRedFlags?.map((redFlag: string, index: number) => (
                        <li key={index} className="flex items-start gap-4 bg-emerald-900/30 rounded-lg p-4 border-l-4 border-emerald-400">
                          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-emerald-100 text-sm font-bold">{index + 1}</span>
                          </div>
                          <span className="text-emerald-100 leading-relaxed">{redFlag}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Habit Recommendations */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-emerald-200 mb-4 flex items-center gap-2">
                    <span>💡</span>
                    Habit Recommendations
                  </h4>
                  <div className="bg-gradient-to-br from-emerald-800/60 to-emerald-700/40 rounded-xl p-6 border border-emerald-500/30 shadow-lg">
                    <ul className="space-y-4">
                      {listeningHabits.habitRecommendations?.map((recommendation: string, index: number) => (
                        <li key={index} className="flex items-start gap-4 bg-emerald-900/30 rounded-lg p-4 border-l-4 border-emerald-400">
                          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-emerald-100 text-sm font-bold">{index + 1}</span>
                          </div>
                          <span className="text-emerald-100 leading-relaxed">{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            {listeningHabitsError && (
              <div className="bg-red-900/80 rounded-2xl p-6 shadow-lg border border-red-500/30">
                <div className="text-red-200 text-center">{listeningHabitsError}</div>
              </div>
            )}

            {/* Music Therapy Result */}
            {musicTherapy && (
              <div className="bg-gradient-to-br from-rose-900/80 to-rose-800/60 rounded-2xl p-8 shadow-2xl border border-rose-500/30 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-rose-400 to-pink-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-3xl">💆‍♀️</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold text-rose-200 mb-1">Music Therapy Session</h3>
                    <p className="text-rose-300 text-sm">Healing through the power of music</p>
                  </div>
                  {musicTherapyError && musicTherapyError.includes('fallback') && (
                    <div className="ml-auto">
                      <span className="inline-flex items-center gap-1 bg-yellow-400 text-yellow-900 font-bold px-3 py-1 rounded-full text-xs">
                        ⚠️ Fallback Response
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Emotional Diagnosis */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-rose-200 mb-4 flex items-center gap-2">
                    <span>🏥</span>
                    Emotional Diagnosis
                  </h4>
                  <div className="bg-gradient-to-br from-rose-800/80 to-rose-700/60 rounded-xl p-6 border border-rose-500/30 shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-rose-400 to-rose-600 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-2xl">🏥</span>
                      </div>
                      <div>
                        <h5 className="text-2xl font-bold text-rose-100 mb-2">{musicTherapy.emotionalDiagnosis}</h5>
                        <p className="text-rose-200 leading-relaxed">{musicTherapy.therapySummary}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Therapeutic Playlist */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-rose-200 mb-4 flex items-center gap-2">
                    <span>🎵</span>
                    Therapeutic Playlist
                  </h4>
                  <div className="space-y-6">
                    {musicTherapy.therapeuticPlaylist?.map((playlist: any, index: number) => (
                      <div key={index} className="bg-gradient-to-br from-rose-800/80 to-rose-700/60 rounded-xl p-6 border border-rose-500/30 shadow-lg">
                        <h5 className="text-xl font-bold text-rose-100 mb-4 flex items-center gap-2">
                          <span>🎭</span>
                          {playlist.mood}
                        </h5>
                        <div className="space-y-4">
                          {playlist.tracks?.map((track: any, trackIndex: number) => (
                            <div key={trackIndex} className="bg-rose-900/40 rounded-lg p-4 border-l-4 border-rose-400">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-rose-400 to-rose-600 rounded-full flex items-center justify-center shadow-lg">
                                  <span className="text-lg">🎵</span>
                                </div>
                                <div>
                                  <h6 className="text-lg font-bold text-rose-100">{track.title}</h6>
                                  <div className="text-sm text-rose-200">{track.artist}</div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="text-sm text-rose-100 leading-relaxed bg-rose-900/20 rounded-lg p-3">
                                  <span className="font-semibold">Therapeutic Purpose:</span> {track.therapeuticPurpose}
                                </div>
                                <div className="text-sm text-rose-100 leading-relaxed bg-rose-900/20 rounded-lg p-3">
                                  <span className="font-semibold">Emotional Effect:</span> {track.emotionalEffect}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Musical Prescriptions */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-rose-200 mb-4 flex items-center gap-2">
                    <span>💊</span>
                    Musical Prescriptions
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {musicTherapy.musicalPrescriptions?.map((prescription: any, index: number) => (
                      <div key={index} className="bg-gradient-to-br from-rose-800/80 to-rose-700/60 rounded-xl p-6 border border-rose-500/30 hover:from-rose-800/90 hover:to-rose-700/80 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-rose-400 to-rose-600 rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-xl">💊</span>
                          </div>
                          <div>
                            <h5 className="text-lg font-bold text-rose-100">{prescription.prescription}</h5>
                            <div className="text-sm text-rose-200 bg-rose-900/40 rounded-lg px-3 py-1 inline-block font-medium">{prescription.dosage}</div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="text-sm text-rose-100 leading-relaxed bg-rose-900/20 rounded-lg p-3 border-l-4 border-rose-400">
                            <span className="font-semibold">Side Effects:</span> {prescription.sideEffects}
                          </div>
                          <div className="text-sm text-rose-100 leading-relaxed bg-rose-900/20 rounded-lg p-3 border-l-4 border-rose-400">
                            <span className="font-semibold">Expected Outcome:</span> {prescription.expectedOutcome}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Therapeutic Insights */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-rose-200 mb-4 flex items-center gap-2">
                    <span>💭</span>
                    Therapeutic Insights
                  </h4>
                  <div className="bg-gradient-to-br from-rose-800/60 to-rose-700/40 rounded-xl p-6 border border-rose-500/30 shadow-lg">
                    <ul className="space-y-4">
                      {musicTherapy.therapeuticInsights?.map((insight: string, index: number) => (
                        <li key={index} className="flex items-start gap-4 bg-rose-900/30 rounded-lg p-4 border-l-4 border-rose-400">
                          <div className="w-8 h-8 bg-gradient-to-br from-rose-400 to-rose-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-rose-100 text-sm font-bold">{index + 1}</span>
                          </div>
                          <span className="text-rose-100 leading-relaxed">{insight}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Healing Recommendations */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-rose-200 mb-4 flex items-center gap-2">
                    <span>💡</span>
                    Healing Recommendations
                  </h4>
                  <div className="bg-gradient-to-br from-rose-800/60 to-rose-700/40 rounded-xl p-6 border border-rose-500/30 shadow-lg">
                    <ul className="space-y-4">
                      {musicTherapy.healingRecommendations?.map((recommendation: string, index: number) => (
                        <li key={index} className="flex items-start gap-4 bg-rose-900/30 rounded-lg p-4 border-l-4 border-rose-400">
                          <div className="w-8 h-8 bg-gradient-to-br from-rose-400 to-rose-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-rose-100 text-sm font-bold">{index + 1}</span>
                          </div>
                          <span className="text-rose-100 leading-relaxed">{recommendation}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            {musicTherapyError && (
              <div className="bg-red-900/80 rounded-2xl p-6 shadow-lg border border-red-500/30">
                <div className="text-red-200 text-center">{musicTherapyError}</div>
              </div>
            )}

            {/* Playlist Generator Result */}
            {playlistGenerator && (
              <div className="bg-gradient-to-br from-cyan-900/80 to-cyan-800/60 rounded-2xl p-8 shadow-2xl border border-cyan-500/30 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-3xl">🎧</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold text-cyan-200 mb-1">AI Playlist Generator</h3>
                    <p className="text-cyan-300 text-sm">Curated musical journeys just for you</p>
                  </div>
                  {playlistGeneratorError && playlistGeneratorError.includes('fallback') && (
                    <div className="ml-auto">
                      <span className="inline-flex items-center gap-1 bg-yellow-400 text-yellow-900 font-bold px-3 py-1 rounded-full text-xs">
                        ⚠️ Fallback Response
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Playlist Concept */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-cyan-200 mb-4 flex items-center gap-2">
                    <span>🎯</span>
                    Playlist Concept
                  </h4>
                  <div className="bg-gradient-to-br from-cyan-800/80 to-cyan-700/60 rounded-xl p-6 border border-cyan-500/30 shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-2xl">🎧</span>
                      </div>
                      <div>
                        <h5 className="text-2xl font-bold text-cyan-100 mb-2">{playlistGenerator.playlistConcept}</h5>
                        <p className="text-cyan-200 leading-relaxed">{playlistGenerator.playlistDescription}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Curated Tracks */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-cyan-200 mb-4 flex items-center gap-2">
                    <span>🎵</span>
                    Curated Tracks
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {playlistGenerator.curatedTracks?.map((track: any, index: number) => (
                      <div key={index} className="bg-gradient-to-br from-cyan-800/80 to-cyan-700/60 rounded-xl p-6 border border-cyan-500/30 hover:from-cyan-800/90 hover:to-cyan-700/80 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-2xl">🎵</span>
                          </div>
                          <div className="flex-1">
                            <h5 className="text-xl font-bold text-cyan-100 mb-1">{track.title}</h5>
                            <div className="text-sm text-cyan-200 font-medium">{track.artist}</div>
                            <div className="text-sm text-cyan-200 bg-cyan-900/40 rounded-lg px-3 py-1 inline-block mt-1">{track.genre}</div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="text-sm text-cyan-100 leading-relaxed bg-cyan-900/20 rounded-lg p-3 border-l-4 border-cyan-400">
                            <span className="font-semibold">Reason:</span> {track.reason}
                          </div>
                          <div className="text-sm text-cyan-100 leading-relaxed bg-cyan-900/20 rounded-lg p-3 border-l-4 border-cyan-400">
                            <span className="font-semibold">Emotional Impact:</span> {track.emotionalImpact}
                          </div>
                          <div className="text-sm text-cyan-100 leading-relaxed bg-cyan-900/20 rounded-lg p-3 border-l-4 border-cyan-400">
                            <span className="font-semibold">Similarity:</span> {track.similarity}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Playlist Flow */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-cyan-200 mb-4 flex items-center gap-2">
                    <span>🌊</span>
                    Playlist Flow
                  </h4>
                  <div className="bg-gradient-to-br from-cyan-800/60 to-cyan-700/40 rounded-xl p-6 border border-cyan-500/30 shadow-lg">
                    <ul className="space-y-4">
                      {playlistGenerator.playlistFlow?.map((flow: string, index: number) => (
                        <li key={index} className="flex items-start gap-4 bg-cyan-900/30 rounded-lg p-4 border-l-4 border-cyan-400">
                          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-cyan-100 text-sm font-bold">{index + 1}</span>
                          </div>
                          <span className="text-cyan-100 leading-relaxed">{flow}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Listening Instructions */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-cyan-200 mb-4 flex items-center gap-2">
                    <span>📋</span>
                    Listening Instructions
                  </h4>
                  <div className="bg-gradient-to-br from-cyan-800/60 to-cyan-700/40 rounded-xl p-6 border border-cyan-500/30 shadow-lg">
                    <ul className="space-y-4">
                      {playlistGenerator.listeningInstructions?.map((instruction: string, index: number) => (
                        <li key={index} className="flex items-start gap-4 bg-cyan-900/30 rounded-lg p-4 border-l-4 border-cyan-400">
                          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-cyan-100 text-sm font-bold">{index + 1}</span>
                          </div>
                          <span className="text-cyan-100 leading-relaxed">{instruction}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Playlist Summary */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-cyan-200 mb-4 flex items-center gap-2">
                    <span>📝</span>
                    Playlist Summary
                  </h4>
                  <div className="bg-gradient-to-br from-cyan-800/80 to-cyan-700/60 rounded-xl p-6 border border-cyan-500/30 shadow-lg">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-cyan-100 text-xl">📝</span>
                      </div>
                      <p className="text-cyan-100 leading-relaxed text-lg">{playlistGenerator.playlistSummary}</p>
                    </div>
                  </div>
                </div>
                
                {playlistGeneratorError && playlistGeneratorError.includes('fallback') && (
                  <div className="mt-4 p-4 bg-yellow-900/40 rounded-xl border border-yellow-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-300">⚠️</span>
                      <span className="text-yellow-200 font-semibold">AI Service Unavailable</span>
                    </div>
                    <p className="text-yellow-100 text-sm">
                      {playlistGeneratorError.includes('API key') 
                        ? 'Please configure your Gemini API key to get personalized AI insights. Run "npm run setup-gemini" in the backend directory.'
                        : 'Using fallback response. The AI service is currently unavailable or rate limited.'
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
            {playlistGeneratorError && !playlistGeneratorError.includes('fallback') && (
              <div className="bg-red-900/80 rounded-2xl p-6 shadow-lg border border-red-500/30">
                <div className="text-red-200 text-center">{playlistGeneratorError}</div>
              </div>
            )}

            {/* Wrapped Story Result */}
            {wrappedStory && (
              <div className="bg-gradient-to-br from-violet-900/80 to-purple-800/60 rounded-2xl p-8 shadow-2xl border border-violet-500/30 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-violet-400 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-3xl">📖</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold text-violet-200 mb-1">Your Wrapped Story</h3>
                    <p className="text-violet-300 text-sm">A dark comedy tale of your musical journey</p>
                  </div>
                  {wrappedStoryError && wrappedStoryError.includes('fallback') && (
                    <div className="ml-auto">
                      <span className="inline-flex items-center gap-1 bg-yellow-400 text-yellow-900 font-bold px-3 py-1 rounded-full text-xs">
                        ⚠️ Fallback Response
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="bg-gradient-to-br from-violet-800/80 to-purple-700/60 rounded-xl p-8 border border-violet-500/30 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-violet-400 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-violet-100 text-xl">🎭</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-xl text-violet-100 leading-relaxed font-medium drop-shadow-lg">{wrappedStory}</p>
                    </div>
                  </div>
                </div>
                
                {wrappedStoryError && wrappedStoryError.includes('fallback') && (
                  <div className="mt-6 p-4 bg-yellow-900/40 rounded-xl border border-yellow-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-300">⚠️</span>
                      <span className="text-yellow-200 font-semibold">AI Service Unavailable</span>
                    </div>
                    <p className="text-yellow-100 text-sm">
                      {wrappedStoryError.includes('API key') 
                        ? 'Please configure your Gemini API key to get personalized AI insights. Run "npm run setup-gemini" in the backend directory.'
                        : 'Using fallback response. The AI service is currently unavailable or rate limited.'
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
            {wrappedStoryError && !wrappedStoryError.includes('fallback') && (
              <div className="bg-red-900/80 rounded-2xl p-6 shadow-lg border border-red-500/30">
                <div className="text-red-200 text-center">{wrappedStoryError}</div>
              </div>
            )}

            {/* Spotify Wrapped Result */}
            {spotifyWrapped && (
              <div className="bg-gradient-to-br from-green-900/80 to-emerald-800/60 rounded-2xl p-8 shadow-2xl border border-green-500/30 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-500">
                {/* Premium Limitation Notice */}
                <div className="mb-6 p-4 bg-yellow-900/40 rounded-xl border border-yellow-500/30">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-yellow-300 text-xl">⚠️</span>
                    <span className="text-yellow-200 font-semibold text-lg">Spotify Premium Limitation</span>
                  </div>
                  <p className="text-yellow-100 text-sm leading-relaxed">
                    <strong>Note:</strong> Spotify Wrapped data is limited for free accounts. This display shows your available data, but full Wrapped insights require a Spotify Premium subscription. Premium users get access to detailed listening statistics, personalized playlists, and comprehensive year-end summaries.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-yellow-300">💡</span>
                    <span className="text-yellow-100 text-sm">Upgrade to Premium for complete Wrapped features and unlimited access to your listening data.</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-3xl">🎵</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold text-green-200 mb-1">Spotify Wrapped {spotifyWrapped.year}</h3>
                    <p className="text-green-300 text-sm">Your current music recap</p>
                  </div>
                  {spotifyWrappedError && spotifyWrappedError.includes('fallback') && (
                    <div className="ml-auto">
                      <span className="inline-flex items-center gap-1 bg-yellow-400 text-yellow-900 font-bold px-3 py-1 rounded-full text-xs">
                        ⚠️ Fallback Response
                      </span>
                    </div>
                  )}
                </div>

                {/* Total Minutes */}
                <div className="mb-8">
                  <div className="bg-gradient-to-br from-green-800/80 to-emerald-700/60 rounded-xl p-8 border border-green-500/30 shadow-lg text-center">
                    <div className="text-6xl font-bold text-green-100 mb-2">{spotifyWrapped.totalMinutes?.toLocaleString()}</div>
                    <div className="text-xl text-green-200">minutes listened</div>
                  </div>
                </div>

                {/* Top Artists */}
                <div className="mb-8">
                  <h4 className="text-2xl font-bold text-green-200 mb-6 flex items-center gap-2">
                    <span>🎤</span>
                    Your Top Artists
                  </h4>
                  <div className="space-y-4">
                    {spotifyWrapped.topArtists?.map((artist: any, index: number) => (
                      <div key={index} className="bg-gradient-to-br from-green-800/80 to-emerald-700/60 rounded-xl p-6 border border-green-500/30 hover:from-green-800/90 hover:to-emerald-700/80 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                              <span className="text-green-100 text-lg font-bold">#{artist.rank}</span>
                            </div>
                            <div>
                              <h5 className="text-xl font-bold text-green-100">{artist.name}</h5>
                              <div className="text-green-200">{artist.minutes?.toLocaleString()} minutes</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Tracks */}
                <div className="mb-8">
                  <h4 className="text-2xl font-bold text-green-200 mb-6 flex items-center gap-2">
                    <span>🎵</span>
                    Your Top Tracks
                  </h4>
                  <div className="space-y-4">
                    {spotifyWrapped.topTracks?.map((track: any, index: number) => (
                      <div key={index} className="bg-gradient-to-br from-green-800/80 to-emerald-700/60 rounded-xl p-6 border border-green-500/30 hover:from-green-800/90 hover:to-emerald-700/80 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                              <span className="text-green-100 text-lg font-bold">#{track.rank}</span>
                            </div>
                            <div>
                              <h5 className="text-xl font-bold text-green-100">{track.name}</h5>
                              <div className="text-green-200">{track.plays?.toLocaleString()} plays</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Genres */}
                <div className="mb-8">
                  <h4 className="text-2xl font-bold text-green-200 mb-6 flex items-center gap-2">
                    <span>🎼</span>
                    Your Top Genres
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {spotifyWrapped.topGenres?.map((genre: any, index: number) => (
                      <div key={index} className="bg-gradient-to-br from-green-800/80 to-emerald-700/60 rounded-xl p-6 border border-green-500/30 hover:from-green-800/90 hover:to-emerald-700/80 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                              <span className="text-green-100 text-sm font-bold">#{genre.rank}</span>
                            </div>
                            <h5 className="text-lg font-bold text-green-100">{genre.name}</h5>
                          </div>
                          <div className="text-2xl font-bold text-green-300">{genre.percentage}%</div>
                        </div>
                        <div className="w-full bg-green-900/60 rounded-full h-3">
                          <div 
                            className="bg-gradient-to-r from-green-400 to-emerald-300 h-3 rounded-full transition-all duration-1000" 
                            style={{ width: `${genre.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Audio Personality */}
                <div className="mb-8">
                  <h4 className="text-2xl font-bold text-green-200 mb-6 flex items-center gap-2">
                    <span>🎭</span>
                    Your Audio Personality
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-green-800/60 rounded-xl p-4 text-center border border-green-500/30">
                      <div className="text-sm text-green-300 mb-2">Danceability</div>
                      <div className="text-2xl font-bold text-green-100 mb-2">{spotifyWrapped.audioPersonality?.danceability}%</div>
                      <div className="w-full bg-green-900/60 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-green-400 to-emerald-300 h-2 rounded-full" 
                          style={{ width: `${spotifyWrapped.audioPersonality?.danceability}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="bg-green-800/60 rounded-xl p-4 text-center border border-green-500/30">
                      <div className="text-sm text-green-300 mb-2">Energy</div>
                      <div className="text-2xl font-bold text-green-100 mb-2">{spotifyWrapped.audioPersonality?.energy}%</div>
                      <div className="w-full bg-green-900/60 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-green-400 to-emerald-300 h-2 rounded-full" 
                          style={{ width: `${spotifyWrapped.audioPersonality?.energy}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="bg-green-800/60 rounded-xl p-4 text-center border border-green-500/30">
                      <div className="text-sm text-green-300 mb-2">Happiness</div>
                      <div className="text-2xl font-bold text-green-100 mb-2">{spotifyWrapped.audioPersonality?.valence}%</div>
                      <div className="w-full bg-green-900/60 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-green-400 to-emerald-300 h-2 rounded-full" 
                          style={{ width: `${spotifyWrapped.audioPersonality?.valence}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="bg-green-800/60 rounded-xl p-4 text-center border border-green-500/30">
                      <div className="text-sm text-green-300 mb-2">Tempo</div>
                      <div className="text-2xl font-bold text-green-100 mb-2">{spotifyWrapped.audioPersonality?.tempo} BPM</div>
                      <div className="w-full bg-green-900/60 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-green-400 to-emerald-300 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, (spotifyWrapped.audioPersonality?.tempo / 200) * 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Listening Stats */}
                <div className="mb-8">
                  <h4 className="text-2xl font-bold text-green-200 mb-6 flex items-center gap-2">
                    <span>📊</span>
                    Your Listening Stats
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-green-800/80 to-emerald-700/60 rounded-xl p-6 border border-green-500/30 text-center">
                      <div className="text-3xl mb-2">🎭</div>
                      <div className="text-lg font-bold text-green-100 mb-1">{spotifyWrapped.listeningPersonality}</div>
                      <div className="text-green-200 text-sm">Your listening type</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-800/80 to-emerald-700/60 rounded-xl p-6 border border-green-500/30 text-center">
                      <div className="text-3xl mb-2">📅</div>
                      <div className="text-lg font-bold text-green-100 mb-1">{spotifyWrapped.topMonth}</div>
                      <div className="text-green-200 text-sm">Top listening month</div>
                    </div>
                    <div className="bg-gradient-to-br from-green-800/80 to-emerald-700/60 rounded-xl p-6 border border-green-500/30 text-center">
                      <div className="text-3xl mb-2">⏰</div>
                      <div className="text-lg font-bold text-green-100 mb-1">{spotifyWrapped.favoriteTime}</div>
                      <div className="text-green-200 text-sm">Favorite listening time</div>
                    </div>
                  </div>
                </div>

                {/* Year Summary */}
                <div className="mb-6">
                  <h4 className="text-2xl font-bold text-green-200 mb-4 flex items-center gap-2">
                    <span>📝</span>
                    Your {spotifyWrapped.year} Summary
                  </h4>
                  <div className="bg-gradient-to-br from-green-800/80 to-emerald-700/60 rounded-xl p-6 border border-green-500/30 shadow-lg">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-green-100 text-xl">✨</span>
                      </div>
                      <p className="text-green-100 leading-relaxed text-lg">{spotifyWrapped.yearSummary}</p>
                    </div>
                  </div>
                </div>
                
                {spotifyWrappedError && spotifyWrappedError.includes('fallback') && (
                  <div className="mt-6 p-4 bg-yellow-900/40 rounded-xl border border-yellow-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-300">⚠️</span>
                      <span className="text-yellow-200 font-semibold">AI Service Unavailable</span>
                    </div>
                    <p className="text-yellow-100 text-sm">
                      {spotifyWrappedError.includes('API key') 
                        ? 'Please configure your Gemini API key to get personalized AI insights. Run "npm run setup-gemini" in the backend directory.'
                        : 'Using fallback response. The AI service is currently unavailable or rate limited.'
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
            {spotifyWrappedError && !spotifyWrappedError.includes('fallback') && (
              <div className="bg-red-900/80 rounded-2xl p-6 shadow-lg border border-red-500/30">
                <div className="text-red-200 text-center">{spotifyWrappedError}</div>
              </div>
            )}

            {/* Musical Compatibility Result */}
            {musicalCompatibility && (
              <div className="bg-gradient-to-br from-amber-900/80 to-orange-800/60 rounded-2xl p-8 shadow-2xl border border-amber-500/30 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-3xl">💕</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold text-amber-200 mb-1">Musical Compatibility</h3>
                    <p className="text-amber-300 text-sm">Your relationship potential through music</p>
                  </div>
                  {musicalCompatibilityError && musicalCompatibilityError.includes('fallback') && (
                    <div className="ml-auto">
                      <span className="inline-flex items-center gap-1 bg-yellow-400 text-yellow-900 font-bold px-3 py-1 rounded-full text-xs">
                        ⚠️ Fallback Response
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-gradient-to-br from-amber-800/80 to-orange-700/60 rounded-xl p-6 border border-amber-500/30 shadow-lg">
                    <h4 className="text-xl font-bold text-amber-100 mb-4 flex items-center gap-2">
                      <span>🎭</span>
                      Compatibility Type
                    </h4>
                    <p className="text-amber-200 text-lg font-semibold">{musicalCompatibility.compatibilityType}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-amber-800/80 to-orange-700/60 rounded-xl p-6 border border-amber-500/30 shadow-lg">
                    <h4 className="text-xl font-bold text-amber-100 mb-4 flex items-center gap-2">
                      <span>📊</span>
                      Compatibility Score
                    </h4>
                    <div className="text-4xl font-bold text-amber-200 mb-2">{musicalCompatibility.compatibilityScore}/100</div>
                    <div className="w-full bg-amber-900/60 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-amber-400 to-orange-300 h-3 rounded-full transition-all duration-1000" 
                        style={{ width: `${musicalCompatibility.compatibilityScore}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-amber-800/80 to-orange-700/60 rounded-xl p-6 border border-amber-500/30 shadow-lg">
                    <h4 className="text-xl font-bold text-amber-100 mb-4 flex items-center gap-2">
                      <span>💭</span>
                      Relationship Insights
                    </h4>
                    <ul className="space-y-3">
                      {musicalCompatibility.relationshipInsights?.map((insight: string, index: number) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="text-amber-300 text-lg">•</span>
                          <p className="text-amber-200 leading-relaxed">{insight}</p>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-amber-800/80 to-orange-700/60 rounded-xl p-6 border border-amber-500/30 shadow-lg">
                      <h4 className="text-xl font-bold text-amber-100 mb-4 flex items-center gap-2">
                        <span>💬</span>
                        Communication Style
                      </h4>
                      <p className="text-amber-200 leading-relaxed">{musicalCompatibility.communicationStyle}</p>
                    </div>

                    <div className="bg-gradient-to-br from-amber-800/80 to-orange-700/60 rounded-xl p-6 border border-amber-500/30 shadow-lg">
                      <h4 className="text-xl font-bold text-amber-100 mb-4 flex items-center gap-2">
                        <span>🤝</span>
                        Conflict Resolution
                      </h4>
                      <p className="text-amber-200 leading-relaxed">{musicalCompatibility.conflictResolution}</p>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-amber-800/80 to-orange-700/60 rounded-xl p-6 border border-amber-500/30 shadow-lg">
                    <h4 className="text-xl font-bold text-amber-100 mb-4 flex items-center gap-2">
                      <span>🌱</span>
                      Growth Potential
                    </h4>
                    <p className="text-amber-200 leading-relaxed">{musicalCompatibility.growthPotential}</p>
                  </div>

                  <div className="bg-gradient-to-br from-amber-800/80 to-orange-700/60 rounded-xl p-6 border border-amber-500/30 shadow-lg">
                    <h4 className="text-xl font-bold text-amber-100 mb-4 flex items-center gap-2">
                      <span>📋</span>
                      Summary
                    </h4>
                    <p className="text-amber-200 leading-relaxed">{musicalCompatibility.compatibilitySummary}</p>
                  </div>
                </div>
                
                {musicalCompatibilityError && musicalCompatibilityError.includes('fallback') && (
                  <div className="mt-6 p-4 bg-yellow-900/40 rounded-xl border border-yellow-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-300">⚠️</span>
                      <span className="text-yellow-200 font-semibold">AI Service Unavailable</span>
                    </div>
                    <p className="text-yellow-100 text-sm">
                      {musicalCompatibilityError.includes('API key') 
                        ? 'Please configure your Gemini API key to get personalized AI insights. Run "npm run setup-gemini" in the backend directory.'
                        : 'Using fallback response. The AI service is currently unavailable or rate limited.'
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
            {musicalCompatibilityError && !musicalCompatibilityError.includes('fallback') && (
              <div className="bg-red-900/80 rounded-2xl p-6 shadow-lg border border-red-500/30">
                <div className="text-red-200 text-center">{musicalCompatibilityError}</div>
              </div>
            )}

            {/* Lyrical Analysis Result */}
            {lyricalAnalysis && (
              <div className="bg-gradient-to-br from-lime-900/80 to-green-800/60 rounded-2xl p-8 shadow-2xl border border-lime-500/30 backdrop-blur-sm animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-lime-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-3xl">📝</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-3xl font-bold text-lime-200 mb-1">Lyrical Analysis</h3>
                    <p className="text-lime-300 text-sm">What your lyrics say about you</p>
                  </div>
                  {lyricalAnalysisError && lyricalAnalysisError.includes('fallback') && (
                    <div className="ml-auto">
                      <span className="inline-flex items-center gap-1 bg-yellow-400 text-yellow-900 font-bold px-3 py-1 rounded-full text-xs">
                        ⚠️ Fallback Response
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="bg-gradient-to-br from-lime-800/80 to-green-700/60 rounded-xl p-6 border border-lime-500/30 shadow-lg mb-6">
                  <h4 className="text-xl font-bold text-lime-100 mb-4 flex items-center gap-2">
                    <span>🎭</span>
                    Lyrical Personality
                  </h4>
                  <p className="text-lime-200 text-lg font-semibold">{lyricalAnalysis.lyricalPersonality}</p>
                </div>

                <div className="space-y-6">
                  <div className="bg-gradient-to-br from-lime-800/80 to-green-700/60 rounded-xl p-6 border border-lime-500/30 shadow-lg">
                    <h4 className="text-xl font-bold text-lime-100 mb-4 flex items-center gap-2">
                      <span>🎵</span>
                      Lyrical Themes
                    </h4>
                    <div className="space-y-4">
                      {lyricalAnalysis.lyricalThemes?.map((theme: any, index: number) => (
                        <div key={index} className="bg-lime-900/40 rounded-lg p-4 border border-lime-500/20">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-lg font-semibold text-lime-100">{theme.theme}</h5>
                            <span className="text-lime-300 text-sm font-medium">{theme.frequency}</span>
                          </div>
                          <p className="text-lime-200 mb-3">{theme.psychologicalInsight}</p>
                          <div className="space-y-1">
                            {theme.lyricalExamples?.map((example: string, exampleIndex: number) => (
                              <p key={exampleIndex} className="text-lime-300 text-sm italic">• {example}</p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-lime-800/80 to-green-700/60 rounded-xl p-6 border border-lime-500/30 shadow-lg">
                      <h4 className="text-xl font-bold text-lime-100 mb-4 flex items-center gap-2">
                        <span>🔍</span>
                        Lyrical Depth
                      </h4>
                      <p className="text-lime-200 leading-relaxed">{lyricalAnalysis.lyricalDepth}</p>
                    </div>

                    <div className="bg-gradient-to-br from-lime-800/80 to-green-700/60 rounded-xl p-6 border border-lime-500/30 shadow-lg">
                      <h4 className="text-xl font-bold text-lime-100 mb-4 flex items-center gap-2">
                        <span>❤️</span>
                        Lyrical Preferences
                      </h4>
                      <ul className="space-y-2">
                        {lyricalAnalysis.lyricalPreferences?.map((pref: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-lime-300 text-sm">•</span>
                            <p className="text-lime-200 text-sm">{pref}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gradient-to-br from-lime-800/80 to-green-700/60 rounded-xl p-6 border border-lime-500/30 shadow-lg">
                      <h4 className="text-xl font-bold text-lime-100 mb-4 flex items-center gap-2">
                        <span>⚠️</span>
                        Red Flags
                      </h4>
                      <ul className="space-y-2">
                        {lyricalAnalysis.lyricalRedFlags?.map((flag: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-lime-300 text-sm">•</span>
                            <p className="text-lime-200 text-sm">{flag}</p>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-gradient-to-br from-lime-800/80 to-green-700/60 rounded-xl p-6 border border-lime-500/30 shadow-lg">
                      <h4 className="text-xl font-bold text-lime-100 mb-4 flex items-center gap-2">
                        <span>🌱</span>
                        Growth Opportunities
                      </h4>
                      <ul className="space-y-2">
                        {lyricalAnalysis.lyricalGrowth?.map((growth: string, index: number) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-lime-300 text-sm">•</span>
                            <p className="text-lime-200 text-sm">{growth}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-lime-800/80 to-green-700/60 rounded-xl p-6 border border-lime-500/30 shadow-lg">
                    <h4 className="text-xl font-bold text-lime-100 mb-4 flex items-center gap-2">
                      <span>📋</span>
                      Summary
                    </h4>
                    <p className="text-lime-200 leading-relaxed">{lyricalAnalysis.lyricalSummary}</p>
                  </div>
                </div>
                
                {lyricalAnalysisError && lyricalAnalysisError.includes('fallback') && (
                  <div className="mt-6 p-4 bg-yellow-900/40 rounded-xl border border-yellow-500/30">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-yellow-300">⚠️</span>
                      <span className="text-yellow-200 font-semibold">AI Service Unavailable</span>
                    </div>
                    <p className="text-yellow-100 text-sm">
                      {lyricalAnalysisError.includes('API key') 
                        ? 'Please configure your Gemini API key to get personalized AI insights. Run "npm run setup-gemini" in the backend directory.'
                        : 'Using fallback response. The AI service is currently unavailable or rate limited.'
                      }
                    </p>
                  </div>
                )}
              </div>
            )}
            {lyricalAnalysisError && !lyricalAnalysisError.includes('fallback') && (
              <div className="bg-red-900/80 rounded-2xl p-6 shadow-lg border border-red-500/30">
                <div className="text-red-200 text-center">{lyricalAnalysisError}</div>
              </div>
            )}
          </div>
        </div>
        {/* Top Artists */}
        <div className="mb-8 bg-indigo-900 bg-opacity-70 rounded-xl p-6 shadow-lg transition-transform transition-shadow hover:shadow-2xl hover:scale-[1.02]">
          <h3 className="text-2xl font-semibold mb-2 flex items-center gap-2">
            Top Artists
            <Tooltip text="Your most listened-to artists on Spotify.">
              <span className="text-indigo-300 cursor-pointer">ℹ️</span>
            </Tooltip>
          </h3>
          {sectionErrors.topArtists && <div className="text-red-400 mb-2">{sectionErrors.topArtists}</div>}
          <ul className="grid grid-cols-2 gap-2 mb-4">
            {uniqueArtists.map((artist) => (
              <li key={artist.id} className="bg-indigo-800 bg-opacity-60 rounded p-2 flex items-center gap-2 transition hover:bg-opacity-80 hover:scale-105 cursor-pointer">
                {artist.images?.[0]?.url && (
                  <img src={artist.images[0].url} alt={artist.name} className="w-8 h-8 rounded-full" />
                )}
                <span>{artist.name}</span>
              </li>
            ))}
          </ul>
        </div>
        {/* Top Tracks */}
        <div className="mb-8 bg-purple-900 bg-opacity-70 rounded-xl p-6 shadow-lg transition-transform transition-shadow hover:shadow-2xl hover:scale-[1.02]">
          <h3 className="text-2xl font-semibold mb-2 flex items-center gap-2">
            Top Tracks
            <Tooltip text="Your most played tracks on Spotify.">
              <span className="text-purple-300 cursor-pointer">ℹ️</span>
            </Tooltip>
          </h3>
          {sectionErrors.topTracks && <div className="text-red-400 mb-2">{sectionErrors.topTracks}</div>}
          <ul className="grid grid-cols-2 gap-2">
            {uniqueTracks.map((track) => (
              <li key={track.id} className="bg-purple-800 bg-opacity-60 rounded p-2 flex items-center gap-2 transition hover:bg-opacity-80 hover:scale-105 cursor-pointer">
                {track.album?.images?.[0]?.url && (
                  <img src={track.album.images[0].url} alt={track.name} className="w-8 h-8 rounded" />
                )}
                <span>{track.name} <span className="text-xs text-gray-300">by {track.artists?.[0]?.name}</span></span>
              </li>
            ))}
          </ul>
        </div>
        {/* Recently Played */}
        <div className="mb-8 bg-blue-900 bg-opacity-70 rounded-xl p-6 shadow-lg transition-transform transition-shadow hover:shadow-2xl hover:scale-[1.02]">
          <h3 className="text-2xl font-semibold mb-2 flex items-center gap-2">
            Recently Played Tracks
            <Tooltip text="Tracks you've listened to most recently.">
              <span className="text-blue-300 cursor-pointer">ℹ️</span>
            </Tooltip>
          </h3>
          {sectionErrors.recentlyPlayed && (
            <div className="text-red-400 mb-2">
              {sectionErrors.recentlyPlayed.includes('403') || sectionErrors.recentlyPlayed.toLowerCase().includes('premium')
                ? 'Some features require a Spotify Premium account.'
                : sectionErrors.recentlyPlayed}
            </div>
          )}
          <ul className="grid grid-cols-2 gap-2">
            {uniqueRecentlyPlayed.slice(0, 10).map((track) => (
              <li key={track.id} className="bg-pink-800 bg-opacity-60 rounded p-2 flex items-center gap-2 transition hover:bg-opacity-80 hover:scale-105 cursor-pointer">
                {track.album?.images?.[0]?.url && (
                  <img src={track.album.images[0].url} alt={track.name} className="w-8 h-8 rounded" />
                )}
                <span>{track.name} <span className="text-xs text-gray-300">by {track.artists?.[0]?.name}</span></span>
              </li>
            ))}
          </ul>
        </div>
        {/* Repeat Offenders */}
        <div className="mb-8 bg-yellow-900 bg-opacity-70 rounded-xl p-6 shadow-lg w-full transition-transform transition-shadow hover:shadow-2xl hover:scale-[1.02]">
          <h3 className="text-2xl font-semibold mb-2 flex items-center gap-2">
            Repeat Offenders
            <Tooltip text="Tracks you've played multiple times recently.">
              <span className="text-yellow-300 cursor-pointer">ℹ️</span>
            </Tooltip>
            <span className="inline-flex items-center gap-1 bg-yellow-400 text-yellow-900 font-bold px-2 py-0.5 rounded-full text-xs ml-2">🔁</span>
          </h3>
          <div className="text-xs text-gray-400 mb-2">Based on your last 50 played tracks (Spotify API limitation)</div>
          <table className="w-full text-left bg-yellow-900 bg-opacity-60 rounded mb-4">
            <thead>
              <tr>
                <th className="p-2">Track</th>
                <th className="p-2">Artist</th>
                <th className="p-2">Plays</th>
              </tr>
            </thead>
            <tbody>
              {repeatOffenders.length ? (
                repeatOffenders.map(({ track, count }) => (
                  <tr key={track.id} className="transition hover:bg-gray-700/70 cursor-pointer">
                    <td className="p-2 flex items-center gap-2">
                      <span className="text-yellow-300 text-lg">🔁</span>
                      {track.album?.images?.[0]?.url && (
                        <img src={track.album.images[0].url} alt={track.name} className="w-8 h-8 rounded" />
                      )}
                      <span>{track.name}</span>
                    </td>
                    <td className="p-2">{track.artists?.[0]?.name}</td>
                    <td className="p-2">{count}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={3} className="text-gray-300 p-2">Not enough data to determine your repeat offenders.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Top Genres */}
        <div className="mb-8 bg-green-900 bg-opacity-70 rounded-xl p-6 shadow-lg">
          <h3 className="text-2xl font-semibold mb-2 flex items-center gap-2">
            Top Genres
            <Tooltip text="Your most listened-to genres, based on your top artists.">
              <span className="text-green-300 cursor-pointer">ℹ️</span>
            </Tooltip>
          </h3>
          {sectionErrors.topGenres && <div className="text-red-400 mb-2">{sectionErrors.topGenres}</div>}
          {topGenres.length ? (
            <ul className="flex flex-wrap gap-2 justify-center">
              {topGenres.slice(0, 10).map((genre) => (
                <li key={genre.genre} className="bg-green-700 bg-opacity-60 rounded px-3 py-1 text-sm">
                  {genre.genre}
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-gray-300">Not enough data to display top genres.</div>
          )}
        </div>
        {/* Mainstream Meter */}
        <div className="mb-8 bg-pink-900 bg-opacity-70 rounded-xl p-6 shadow-lg">
          <h3 className="text-2xl font-semibold mb-2 flex items-center gap-2">
            Mainstream Meter
            <Tooltip text="How popular your top tracks are, on average (0 = underground, 100 = super mainstream).">
              <span className="text-pink-300 cursor-pointer">ℹ️</span>
            </Tooltip>
            {mainstreamBadge && (
              <span className="inline-flex items-center gap-1 bg-yellow-400 text-yellow-900 font-bold px-3 py-1 rounded-full text-xs ml-2 cursor-pointer" onClick={() => setShowJVKEEgg(true)}>{mainstreamBadge.props.children}</span>
            )}
          </h3>
          {/* JVKE Easter Egg Modal */}
          {showJVKEEgg && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
              <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full flex flex-col items-center relative">
                <button className="absolute top-2 right-2 text-gray-500 hover:text-black text-2xl font-bold" onClick={() => setShowJVKEEgg(false)}>&times;</button>
                <h3 className="text-2xl font-bold mb-4 text-black">💖 Hidden Love!</h3>
                <p className="mb-4 text-lg text-gray-800 text-center">You found the hidden track:<br/><span className="font-bold">her</span> by JVKE<br/>A modern love anthem for your playlist.</p>
                <iframe src="https://open.spotify.com/embed/track/6G9YlbU3ByPJQvOFDRdwyM" width="300" height="80" frameBorder="0" allow="encrypted-media" title="her by JVKE" className="rounded-lg"></iframe>
                <a href="https://open.spotify.com/track/6G9YlbU3ByPJQvOFDRdwyM" target="_blank" rel="noopener noreferrer" className="mt-4 text-green-600 font-bold underline">Play on Spotify</a>
              </div>
            </div>
          )}
          <table className="w-full text-left bg-pink-900 bg-opacity-60 rounded mb-4">
            <tbody>
              <tr>
                <td 
                  className="p-2 text-4xl font-bold cursor-pointer select-none"
                  onMouseDown={() => handleStatMouseDown(mainstreamScore || 0)}
                  onMouseUp={handleStatMouseUp}
                  onMouseLeave={handleStatMouseUp}
                  onTouchStart={() => handleStatMouseDown(mainstreamScore || 0)}
                  onTouchEnd={handleStatMouseUp}
                  title="Long-press for a fun fact!"
                >
                  {mainstreamScore !== null ? `${mainstreamScore}/100` : 'N/A'}
                </td>
                <td className="p-2 text-lg">{mainstreamScore !== null ? mainstreamMessage : 'Not enough data to calculate mainstream score.'}</td>
              </tr>
              <tr>
                <td colSpan={2} className="p-2">
                  <div className="w-full bg-gray-700 rounded-full h-4">
                    <div
                      className="bg-green-400 h-4 rounded-full transition-all"
                      style={{ width: `${mainstreamScore ?? 0}%` }}
                    ></div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* Genre Hopping Index */}
        <div className="mb-8 bg-fuchsia-900 bg-opacity-70 rounded-xl p-6 shadow-lg">
          <h3 className="text-2xl font-semibold mb-2 flex items-center gap-2">
            Genre Hopping Index
            <Tooltip text="How often you switch genres in your recent listening.">
              <span className="text-fuchsia-300 cursor-pointer">ℹ️</span>
            </Tooltip>
          </h3>
          <table className="w-full text-left bg-fuchsia-900 bg-opacity-60 rounded mb-4">
            <tbody>
              <tr>
                <td 
                  className="p-2 text-4xl font-bold cursor-pointer select-none"
                  onMouseDown={() => handleStatMouseDown(Math.round((genreHoppingIndex || 0) * 100))}
                  onMouseUp={handleStatMouseUp}
                  onMouseLeave={handleStatMouseUp}
                  onTouchStart={() => handleStatMouseDown(Math.round((genreHoppingIndex || 0) * 100))}
                  onTouchEnd={handleStatMouseUp}
                  title="Long-press for a fun fact!"
                >
                  {genreHoppingIndex !== null ? `${(genreHoppingIndex * 100).toFixed(0)}%` : 'N/A'}
                </td>
                <td className="p-2 text-lg">{genreHoppingIndex !== null ? genreHoppingMsg : 'Not enough data to calculate genre hopping.'}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* Listening Time Analysis */}
        <div className="mb-8 bg-cyan-900 bg-opacity-70 rounded-xl p-6 shadow-lg">
          <h3 className="text-2xl font-semibold mb-2 flex items-center gap-2">
            Listening Time Analysis
            <Tooltip text="When you listen to music most often (morning, afternoon, evening, late night).">
              <span className="text-cyan-300 cursor-pointer">ℹ️</span>
            </Tooltip>
          </h3>
          <table className="w-full text-left bg-cyan-900 bg-opacity-60 rounded mb-4">
            <tbody>
              <tr>
                <td className="p-2 text-lg text-blue-300">{listeningTimeMsg ? listeningTimeMsg : 'Not enough data to analyze listening times.'}</td>
              </tr>
            </tbody>
          </table>
        </div>
        {/* Musical Era Analysis */}
        <div className="mb-8 bg-gray-900 bg-opacity-70 rounded-xl p-6 shadow-lg">
          <h3 className="text-2xl font-semibold mb-2 flex items-center gap-2">
            Musical Era Analysis
            <Tooltip text="Which decades your recently played tracks come from.">
              <span className="text-gray-300 cursor-pointer">ℹ️</span>
            </Tooltip>
          </h3>
          <table className="w-full text-left bg-gray-900 bg-opacity-60 rounded mb-4">
            <thead>
              <tr>
                <th className="p-2">Decade</th>
                <th className="p-2">Count</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(eraData).length ? (
                Object.entries(eraData)
                  .sort((a, b) => b[1] - a[1])
                  .map(([decade, count]) => (
                    <tr key={decade}>
                      <td className="p-2">{decade}</td>
                      <td className="p-2">{count}</td>
                    </tr>
                  ))
              ) : (
                <tr><td colSpan={2} className="text-gray-300 p-2">Not enough data to analyze musical era.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Hidden Gems */}
        <div className="mb-8 bg-emerald-900 bg-opacity-70 rounded-xl p-6 shadow-lg">
          <h3 className="text-2xl font-semibold mb-2 flex items-center gap-2">
            Hidden Gems
            <Tooltip text="Tracks you've played recently that aren't very popular (popularity < 50).">
              <span className="text-emerald-300 cursor-pointer">ℹ️</span>
            </Tooltip>
            <span className="inline-flex items-center gap-1 bg-emerald-400 text-emerald-900 font-bold px-2 py-0.5 rounded-full text-xs ml-2">💎</span>
          </h3>
          <table className="w-full text-left bg-emerald-900 bg-opacity-60 rounded mb-4">
            <thead>
              <tr>
                <th className="p-2">Track</th>
                <th className="p-2">Artist</th>
                <th className="p-2">Popularity</th>
              </tr>
            </thead>
            <tbody>
              {recentlyPlayed && recentlyPlayed.length > 0 ? (
                (() => {
                  const hiddenGems = (recentlyPlayed as any[])
                    .filter((track: any) => track.popularity < 50)
                    .sort((a: any, b: any) => a.popularity - b.popularity)
                    .slice(0, 5);
                  if (hiddenGems.length === 0) {
                    return <tr><td colSpan={3} className="text-gray-300 p-2">No hidden gems found in your recent plays.</td></tr>;
                  }
                  return hiddenGems.map((track: any, idx: number) => (
                    <tr key={track.id + idx} className="transition hover:bg-gray-700/70 cursor-pointer">
                      <td className="p-2 font-medium text-lg flex items-center gap-2">
                        <span className="text-emerald-300 text-lg">💎</span>
                        {track.name}
                      </td>
                      <td className="p-2 text-gray-400">{track.artists?.[0]?.name || "Unknown Artist"}</td>
                      <td className="p-2 text-xs bg-gray-700 text-gray-200 rounded">{track.popularity}</td>
                    </tr>
                  ));
                })()
              ) : (
                <tr><td colSpan={3} className="text-gray-300 p-2">No recently played tracks found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {/* Audio Features */}
        {sectionErrors.audioFeatures && (
          <div className="mb-8 bg-red-900 bg-opacity-80 rounded-xl p-6 shadow-lg w-full text-center text-red-200 flex flex-col items-center transition-transform transition-shadow hover:shadow-2xl hover:scale-[1.02]">
            {'Audio features are unavailable for your account.'}
          </div>
        )}
        {/* Fun Fact Easter Egg Modal */}
        {showFunFactEgg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full flex flex-col items-center relative">
              <button className="absolute top-2 right-2 text-gray-500 hover:text-black text-2xl font-bold" onClick={() => setShowFunFactEgg(false)}>&times;</button>
              <h3 className="text-2xl font-bold mb-4 text-black">🎲 Fun Fact About {funFactNumber}!</h3>
              <div className="mb-4 text-lg text-gray-800 text-center">
                {funFactLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span>Generating fun fact...</span>
                  </div>
                ) : (
                  <p>{funFact}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 