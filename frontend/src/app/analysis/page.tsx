"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// @ts-ignore: dom-to-image-more has no types
import domtoimage from "dom-to-image-more";
import jsPDF from "jspdf";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { LineChart, Line } from 'recharts';

interface EndSong {
  ts: string;
  username: string;
  platform: string;
  ms_played: number;
  conn_country: string;
  ip_addr_decrypted: string;
  user_agent_decrypted: string;
  master_metadata_track_name: string;
  master_metadata_album_artist_name: string;
  master_metadata_album_album_name: string;
  spotify_track_uri: string;
  episode_name: string;
  episode_show_name: string;
  spotify_episode_uri: string;
  reason_start: string;
  reason_end: string;
  shuffle: boolean | null;
  skipped: boolean | null;
  offline: boolean | null;
  offline_timestamp: number | null;
  incognito_mode: boolean | null;
}

// Profile card component (copied from dashboard)
function ProfileCard({ profile }: { profile: any }) {
  return (
    <div className="w-full max-w-md mx-auto bg-gray-900 bg-opacity-80 rounded-2xl shadow-lg flex flex-col items-center p-6 mb-8 border border-indigo-500">
      {profile?.images?.[0]?.url && (
        <img src={profile.images[0].url} alt="Profile" className="rounded-full mb-4" style={{ width: 96, height: 96 }} />
      )}
      <h2 className="text-2xl font-bold mb-1">{profile?.display_name || "Spotify User"}</h2>
      {profile?.email && <div className="text-gray-300 text-sm mb-2">{profile.email}</div>}
    </div>
  );
}

// Roast Me button logic (local state)
function RoastMeButton({ onRoast, loading }: { onRoast: () => void, loading: boolean }) {
  return (
    <button
      onClick={onRoast}
      className="px-6 py-2 h-12 min-w-[130px] bg-pink-600 rounded-full font-semibold hover:bg-pink-700 text-base flex items-center justify-center shadow transition"
      disabled={loading}
    >
      {loading ? "Roasting..." : "Roast Me"}
    </button>
  );
}

// ShareDropdown component (copied from dashboard)
function ShareDropdown({ profile, uniqueArtists, uniqueTracks, mainstreamScore, buttonClassName = "" }: any) {
  const [open, setOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
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
  React.useEffect(() => {
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
        className={`bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-2 h-full ${buttonClassName}`}
        onClick={() => setOpen((v) => !v)}
        title="Share your stats"
      >
        <span>Share</span>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15.75L15.75 8.25M15.75 8.25H9.75M15.75 8.25v6" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-gray-900 border border-indigo-500 rounded-lg shadow-lg z-20 flex flex-col">
          <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800 text-blue-400">
            <span>🐦 Twitter/X</span>
          </a>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800 text-green-400">
            <span>🟢 WhatsApp</span>
          </a>
          <a href={tumblrUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800 text-purple-400">
            <span>📚 Tumblr</span>
          </a>
          <button onClick={copyToClipboard} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800 text-pink-400 w-full text-left">
            <span>📸 Instagram (Copy to Clipboard)</span>
          </button>
        </div>
      )}
    </div>
  );
}

// DownloadDropdown component (copied from dashboard)
function DownloadDropdown({ buttonClassName = "" }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
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
    const dashboard = document.querySelector('.max-w-2xl');
    if (!dashboard) return;
    domtoimage.toPng(dashboard as HTMLElement)
      .then((dataUrl: string) => {
        const link = document.createElement('a');
        link.download = 'sonicmirror-analysis.png';
        link.href = dataUrl;
        link.click();
      })
      .catch((error: any) => {
        alert('Download failed: ' + error);
      });
  }
  async function downloadPDF() {
    setOpen(false);
    const dashboard = document.querySelector('.max-w-2xl');
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
          pdf.save('sonicmirror-analysis.pdf');
        };
      })
      .catch((error: any) => {
        alert('Download failed: ' + error);
      });
  }
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className={`bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-2 ${buttonClassName}`}
        onClick={() => setOpen((v) => !v)}
        title="Download your dashboard"
      >
        <span>Download</span>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5v-12m0 12l-3.75-3.75M12 16.5l3.75-3.75M21 21.75H3" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-gray-900 border border-emerald-500 rounded-lg shadow-lg z-20 flex flex-col">
          <button onClick={downloadPNG} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800 text-emerald-300 w-full text-left">
            <span>🖼️ PNG Image</span>
          </button>
          <button onClick={downloadPDF} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-800 text-emerald-400 w-full text-left">
            <span>📄 PDF</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function AnalysisPage() {
  const [data, setData] = useState<EndSong[]>([]);
  const [error, setError] = useState("");
  const [topArtists, setTopArtists] = useState<{ name: string; count: number }[]>([]);
  const [topTracks, setTopTracks] = useState<{ name: string; count: number }[]>([]);
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const accessToken = searchParams?.get('access_token') || "";
  const [hiddenGems, setHiddenGems] = useState<any[]>([]);
  const [tokenError, setTokenError] = useState("");
  const [loadingGems, setLoadingGems] = useState(false);
  const [years, setYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [profile, setProfile] = useState<any>(null);
  const [roast, setRoast] = useState("");
  const [roastLoading, setRoastLoading] = useState(false);
  const [roastError, setRoastError] = useState("");
  const [moodAnalysis, setMoodAnalysis] = useState<any>(null);
  const [moodLoading, setMoodLoading] = useState(false);
  const [moodError, setMoodError] = useState("");
  const [recommendations, setRecommendations] = useState<any>(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState("");
  const [followedArtists, setFollowedArtists] = useState<Set<string>>(new Set());
  const [listeningHour, setListeningHour] = useState<number | null>(null);
  const [listeningDay, setListeningDay] = useState<string>("");
  const [uniqueArtistCount, setUniqueArtistCount] = useState(0);
  const [uniqueTrackCount, setUniqueTrackCount] = useState(0);
  const [diversityScore, setDiversityScore] = useState(0);
  const [show505Egg, setShow505Egg] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (!Array.isArray(json)) throw new Error("File must be a JSON array.");
        setData(json);
        // Extract years from timestamps
        const yearSet = new Set<string>();
        json.forEach((s: EndSong) => {
          if (s.ts && s.ts.length >= 4) {
            yearSet.add(s.ts.slice(0, 4));
          }
        });
        const yearArr = Array.from(yearSet).sort((a, b) => b.localeCompare(a));
        setYears(yearArr);
        setSelectedYear(yearArr[0] || "");
        // Top Tracks and analytics (filtered by year)
        let filtered = json;
        if (selectedYear) {
          filtered = json.filter((s: EndSong) => s.ts && s.ts.startsWith(selectedYear));
        }
        const trackCounts: Record<string, number> = {};
        filtered.forEach((s: EndSong) => {
          const key = s.master_metadata_track_name + " - " + s.master_metadata_album_artist_name;
          if (key.trim() === "-") return;
          trackCounts[key] = (trackCounts[key] || 0) + 1;
        });
        // Top Tracks
        const topTracksArr = Object.entries(trackCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        setTopTracks(topTracksArr);
        // Top Artists
        const artistCounts: Record<string, number> = {};
        filtered.forEach((s: EndSong) => {
          const artist = s.master_metadata_album_artist_name;
          if (!artist) return;
          artistCounts[artist] = (artistCounts[artist] || 0) + 1;
        });
        const topArtistsArr = Object.entries(artistCounts)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
        setTopArtists(topArtistsArr);
        // Debug logging
        console.log('Access token:', accessToken);
        const uris = Array.from(new Set(json.map((s: EndSong) => s.spotify_track_uri).filter(Boolean)));
        console.log('Unique Spotify track URIs:', uris);
        // Hidden Gems (popularity < 50, using Spotify API)
        if (accessToken) {
          setLoadingGems(true);
          // Get unique Spotify track URIs (filter out empty)
          const ids = uris.map(uri => uri.replace('spotify:track:', ''));
          let allTracks: any[] = [];
          for (let i = 0; i < ids.length; i += 50) {
            const batch = ids.slice(i, i + 50);
            try {
              const res = await fetch(`https://api.spotify.com/v1/tracks?ids=${batch.join(",")}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              if (res.status === 401) {
                setTokenError("Your Spotify session has expired. Please return to the dashboard and log in again.");
                setLoadingGems(false);
                break;
              }
              if (res.ok) {
                const data = await res.json();
                allTracks = allTracks.concat(data.tracks || []);
              }
            } catch {}
          }
          // Filter for hidden gems
          const gems = allTracks.filter(t => t && t.popularity < 50).slice(0, 5);
          setHiddenGems(gems);
          setLoadingGems(false);
        } else {
          setTokenError("No Spotify access token found. Please return to the dashboard and log in again.");
        }
      } catch (err: any) {
        setError("Invalid JSON file: " + err.message);
        setData([]);
      }
    };
    reader.readAsText(file);
  }

  // Recompute analytics when year changes
  useEffect(() => {
    if (!data.length || !selectedYear) return;
    // Filtered data for selected year
    const filtered = data.filter((s: EndSong) => s.ts && s.ts.startsWith(selectedYear));
    // Top Tracks
    const trackCounts: Record<string, number> = {};
    filtered.forEach((s: EndSong) => {
      const key = s.master_metadata_track_name + " - " + s.master_metadata_album_artist_name;
      if (key.trim() === "-") return;
      trackCounts[key] = (trackCounts[key] || 0) + 1;
    });
    const topTracksArr = Object.entries(trackCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    setTopTracks(topTracksArr);
    // Top Artists
    const artistCounts: Record<string, number> = {};
    filtered.forEach((s: EndSong) => {
      const artist = s.master_metadata_album_artist_name;
      if (!artist) return;
      artistCounts[artist] = (artistCounts[artist] || 0) + 1;
    });
    const topArtistsArr = Object.entries(artistCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    setTopArtists(topArtistsArr);
  }, [selectedYear, data]);

  // Fetch Spotify profile if accessToken is present
  useEffect(() => {
    if (!accessToken) return;
    fetch(`https://sonicmirror-backend.onrender.com/spotify/me?access_token=${accessToken}`)
      .then(res => res.json())
      .then(data => setProfile(data))
      .catch(() => setProfile(null));
  }, [accessToken]);

  // Listening Time Analysis
  useEffect(() => {
    if (!data.length || !selectedYear) {
      setListeningHour(null);
      setListeningDay("");
      return;
    }
    const filtered = data.filter((s: EndSong) => s.ts && s.ts.startsWith(selectedYear));
    // Hour analysis
    const hourCounts = Array(24).fill(0);
    filtered.forEach((s: EndSong) => {
      const d = new Date(s.ts);
      hourCounts[d.getHours()]++;
    });
    const maxHour = hourCounts.indexOf(Math.max(...hourCounts));
    setListeningHour(maxHour);
    // Day of week analysis
    const dayCounts = Array(7).fill(0);
    filtered.forEach((s: EndSong) => {
      const d = new Date(s.ts);
      dayCounts[d.getDay()]++;
    });
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const maxDay = dayCounts.indexOf(Math.max(...dayCounts));
    setListeningDay(days[maxDay]);
  }, [data, selectedYear]);

  // Artist/Track Diversity
  useEffect(() => {
    if (!data.length || !selectedYear) {
      setUniqueArtistCount(0);
      setUniqueTrackCount(0);
      setDiversityScore(0);
      return;
    }
    const filtered = data.filter((s: EndSong) => s.ts && s.ts.startsWith(selectedYear));
    const artistSet = new Set(filtered.map(s => s.master_metadata_album_artist_name).filter(Boolean));
    const trackSet = new Set(filtered.map(s => s.master_metadata_track_name + ' - ' + s.master_metadata_album_artist_name).filter(k => k.trim() !== '-'));
    setUniqueArtistCount(artistSet.size);
    setUniqueTrackCount(trackSet.size);
    setDiversityScore(filtered.length ? Math.round((trackSet.size / filtered.length) * 100) : 0);
  }, [data, selectedYear]);

  async function handleRoastMe() {
    setRoastLoading(true);
    setRoastError("");
    setRoast("");
    try {
      // Prepare data for roast (use topArtists, topTracks, etc.)
      const topArtistNames = topArtists.slice(0, 3).map(a => a.name);
      const topTrackNames = topTracks.slice(0, 2).map(t => t.name);
      // No genres/audio features in local analysis, so send empty
      const audioProfile = {};
      const res = await fetch('https://sonicmirror-backend.onrender.com/llm/roast', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topArtists: topArtistNames,
          topTracks: topTrackNames,
          topGenres: [],
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

  async function handleGetMoodAnalysis() {
    setMoodLoading(true);
    setMoodError("");
    setMoodAnalysis(null);
    try {
      // Prepare data for mood analysis
      const topArtistNames = topArtists.slice(0, 3).map(a => a.name);
      const topTrackNames = topTracks.slice(0, 2).map(t => t.name);
      // No genres/audio features in local analysis, so send empty
      const audioProfile = {};
      const res = await fetch('https://sonicmirror-backend.onrender.com/llm/mood-analysis', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topArtists: topArtistNames,
          topTracks: topTrackNames,
          topGenres: [],
          audioProfile
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
      const topArtistNames = topArtists.slice(0, 3).map(a => a.name);
      const topTrackNames = topTracks.slice(0, 2).map(t => t.name);
      // No genres/audio features in local analysis, so send empty
      const audioProfile = {};
      const res = await fetch('https://sonicmirror-backend.onrender.com/llm/recommendations', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topArtists: topArtistNames,
          topTracks: topTrackNames,
          topGenres: [],
          audioProfile
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-900 to-purple-700 text-white p-4">
      {/* Profile Card */}
      <ProfileCard profile={profile} />
      {/* AI Features Section */}
      <div className="mb-12">
        <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
          AI-Powered Analysis
        </h2>
        <p className="mb-8 text-center text-gray-300 text-lg">
          Deep insights into your music listening patterns
        </p>
        
        {/* AI Feature Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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

        {/* Action Buttons Row */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <ShareDropdown
            profile={profile}
            uniqueArtists={topArtists}
            uniqueTracks={topTracks}
            mainstreamScore={null}
            buttonClassName="px-6 py-3 rounded-xl text-base shadow-lg hover:shadow-xl transition-all duration-300"
          />
          <DownloadDropdown buttonClassName="px-6 py-3 rounded-xl text-base shadow-lg hover:shadow-xl transition-all duration-300" />
        </div>

        {/* AI Results Display */}
        <div className="space-y-6">
          {/* Roast Result */}
          {roast && (
            <div className="bg-gradient-to-br from-pink-900/80 to-pink-800/60 rounded-2xl p-8 shadow-2xl border border-pink-500/30 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🔥</span>
                <h3 className="text-2xl font-bold text-pink-200">Your Music Roast</h3>
              </div>
              <div className="text-lg text-pink-100 leading-relaxed bg-pink-900/40 rounded-xl p-6">
                {roast}
              </div>
            </div>
          )}
          {roastError && (
            <div className="bg-red-900/80 rounded-2xl p-6 shadow-lg border border-red-500/30">
              <div className="text-red-200 text-center">{roastError}</div>
            </div>
          )}

          {/* Mood Analysis Result */}
          {moodAnalysis && (
            <div className="bg-gradient-to-br from-teal-900/80 to-teal-800/60 rounded-2xl p-8 shadow-2xl border border-teal-500/30 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">🎭</span>
                <h3 className="text-2xl font-bold text-teal-200">Music Mood Analysis</h3>
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
            <div className="bg-gradient-to-br from-orange-900/80 to-orange-800/60 rounded-2xl p-8 shadow-2xl border border-orange-500/30 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">🎵</span>
                <h3 className="text-2xl font-bold text-orange-200">AI Music Recommendations</h3>
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
        </div>
      </div>
      <div className="w-full max-w-none mx-auto bg-gray-900 bg-opacity-80 rounded-2xl shadow-lg flex flex-col items-center p-8 border border-indigo-500 mt-8 transition-transform transition-shadow hover:shadow-2xl hover:scale-[1.02]">
        <div className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
          <h1 className="text-3xl font-bold">Detailed Analysis</h1>
          {years.length > 1 && (
            <div className="flex items-center">
              <label className="mr-2 font-semibold">Year:</label>
              <select
                className="bg-gray-800 text-white rounded px-3 py-1 border border-indigo-500"
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
              >
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <p className="mb-4 text-center">Upload your Spotify streaming history JSON file for custom analysis.</p>
        
        {/* Instructions for getting Spotify data */}
        <div className="mb-6 w-full max-w-2xl bg-gradient-to-br from-indigo-900/80 to-purple-900/80 rounded-xl p-6 shadow-lg border border-indigo-500/30">
          <h3 className="text-xl font-bold mb-4 text-indigo-200 flex items-center gap-2">
            <span>📋</span>
            How to Get Your Spotify Listening History
          </h3>
          <div className="space-y-4 text-sm text-gray-200">
            <div className="bg-indigo-800/60 rounded-lg p-4 border border-indigo-500/30">
              <h4 className="font-semibold text-indigo-200 mb-2 flex items-center gap-2">
                <span>1️⃣</span>
                Request Your Data
              </h4>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Go to <a href="https://www.spotify.com/account/privacy/" target="_blank" rel="noopener noreferrer" className="text-indigo-300 hover:text-indigo-200 underline">Spotify Privacy Settings</a></li>
                <li>Scroll down to "Download your data"</li>
                <li>Click "Request" next to "Extended streaming history"</li>
                <li>Confirm your email address</li>
              </ol>
            </div>
            
            <div className="bg-purple-800/60 rounded-lg p-4 border border-purple-500/30">
              <h4 className="font-semibold text-purple-200 mb-2 flex items-center gap-2">
                <span>2️⃣</span>
                Wait for Email
              </h4>
              <p>Spotify will email you within 30 days with a download link. The email will be from <span className="font-mono text-purple-300">privacy@spotify.com</span></p>
            </div>
            
            <div className="bg-emerald-800/60 rounded-lg p-4 border border-emerald-500/30">
              <h4 className="font-semibold text-emerald-200 mb-2 flex items-center gap-2">
                <span>3️⃣</span>
                Download & Extract
              </h4>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Click the download link in the email</li>
                <li>Extract the ZIP file</li>
                <li>Look for the <span className="font-mono text-emerald-300">StreamingHistory*.json</span> file</li>
                <li>Upload that file here</li>
              </ol>
            </div>
            
            <div className="bg-orange-800/60 rounded-lg p-4 border border-orange-500/30">
              <h4 className="font-semibold text-orange-200 mb-2 flex items-center gap-2">
                <span>💡</span>
                Pro Tips
              </h4>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Data includes your listening history from the past year</li>
                <li>You can request data multiple times</li>
                <li>Free and Premium users can both request their data</li>
                <li>The file contains detailed info about every song you've played</li>
              </ul>
            </div>
          </div>
        </div>
        
        <input
          className="mb-6 w-full max-w-md text-black rounded border border-indigo-400 px-3 py-2 bg-gray-100"
          type="file"
          accept="application/json"
          onChange={handleFile}
        />
        {error && <div className="text-red-400 mb-2">{error}</div>}
        {topArtists.length > 0 && (
          <div className="mb-8 bg-indigo-900 bg-opacity-70 rounded-xl p-8 shadow-lg w-full max-w-none transition-transform transition-shadow hover:shadow-2xl hover:scale-[1.02]">
            <h3 className="text-2xl font-semibold mb-2 cursor-pointer" onClick={() => setShow505Egg(true)}>Top Artists</h3>
            <ul className="grid grid-cols-2 gap-2 mb-4">
              {topArtists.map((artist) => (
                <li key={artist.name} className="bg-indigo-800 bg-opacity-60 rounded p-2 flex items-center gap-2 transition hover:bg-opacity-80 hover:scale-105 cursor-pointer">
                  <span>{artist.name}</span>
                  <span className="ml-auto text-xs text-gray-300">{artist.count} plays</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {topTracks.length > 0 && (
          <div className="mb-8 bg-purple-900 bg-opacity-70 rounded-xl p-8 shadow-lg w-full max-w-none transition-transform transition-shadow hover:shadow-2xl hover:scale-[1.02]">
            <h3 className="text-2xl font-semibold mb-2">Top Tracks</h3>
            <ul className="grid grid-cols-2 gap-2">
              {topTracks.map((track) => (
                <li key={track.name} className="bg-purple-800 bg-opacity-60 rounded p-2 flex items-center gap-2 transition hover:bg-opacity-80 hover:scale-105 cursor-pointer">
                  <span>{track.name}</span>
                  <span className="ml-auto text-xs text-gray-300">{track.count} plays</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {hiddenGems.length > 0 && (
          <div className="mb-8 bg-emerald-900 bg-opacity-70 rounded-xl p-8 shadow-lg w-full max-w-none transition-transform transition-shadow hover:shadow-2xl hover:scale-[1.02]">
            <h3 className="text-2xl font-semibold mb-2 flex items-center gap-2">Hidden Gems <span className="inline-flex items-center gap-1 bg-emerald-400 text-emerald-900 font-bold px-2 py-0.5 rounded-full text-xs ml-2">💎</span></h3>
            <table className="w-full text-left bg-emerald-900 bg-opacity-60 rounded mb-4">
              <thead>
                <tr>
                  <th className="p-2">Track</th>
                  <th className="p-2">Artist</th>
                  <th className="p-2">Popularity</th>
                </tr>
              </thead>
              <tbody>
                {hiddenGems.map((track: any, idx: number) => (
                  <tr key={track.id + idx} className="transition hover:bg-gray-700/70 cursor-pointer">
                    <td className="p-2 font-medium text-lg flex items-center gap-2">
                      <span className="text-emerald-300 text-lg">💎</span>
                      {track.name}
                    </td>
                    <td className="p-2 text-gray-400">{track.artists?.[0]?.name || "Unknown Artist"}</td>
                    <td className="p-2 text-xs bg-gray-700 text-gray-200 rounded">{track.popularity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {hiddenGems.length === 0 && accessToken && data.length > 0 && (
          <div className="mb-8 bg-emerald-900 bg-opacity-70 rounded-xl p-8 shadow-lg w-full max-w-none text-center text-emerald-200 transition-transform transition-shadow hover:shadow-2xl hover:scale-[1.02]">
            No hidden gems found in your data (or all tracks are popular!).
          </div>
        )}
        {/* Token error message and go back button */}
        {tokenError && (
          <div className="mb-8 bg-red-900 bg-opacity-80 rounded-xl p-8 shadow-lg w-full max-w-none text-center text-red-200 flex flex-col items-center transition-transform transition-shadow hover:shadow-2xl hover:scale-[1.02]">
            <div className="mb-4">{tokenError}</div>
            <a href="/dashboard" className="px-6 py-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base shadow transition">Go back to dashboard</a>
          </div>
        )}
        {/* Loading spinner/message for Hidden Gems */}
        {loadingGems && (
          <div className="mb-8 bg-emerald-900 bg-opacity-70 rounded-xl p-8 shadow-lg w-full max-w-none text-center flex flex-col items-center transition-transform transition-shadow hover:shadow-2xl hover:scale-[1.02]">
            <svg className="animate-spin h-8 w-8 text-emerald-300 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
            </svg>
            <div>Finding hidden gems in your Spotify data...</div>
          </div>
        )}
        {/* Listening Time Analysis (styled card) */}
        <div className="mb-8 bg-blue-900 bg-opacity-70 rounded-xl p-8 shadow-lg w-full max-w-none transition-transform transition-shadow hover:shadow-2xl hover:scale-[1.02]">
          <h3 className="text-2xl font-semibold mb-2">Listening Time Analysis</h3>
          <div className="bg-blue-800 bg-opacity-60 rounded p-2 mb-2">
            {listeningHour !== null && (
              <div className="mb-1">Most active hour: <span className="font-bold">{listeningHour}:00</span></div>
            )}
            {listeningDay && (
              <div>Most active day: <span className="font-bold">{listeningDay}</span></div>
            )}
            {listeningHour === null && !listeningDay && <div className="text-gray-400">No listening data for this year.</div>}
          </div>
        </div>
        {/* Average Listening by Day of Week Line Chart (under Listening Time Analysis) */}
        <WeekdayListenTimeChart data={data} selectedYear={selectedYear} />
        {/* Artist/Track Diversity (styled card) */}
        <div className="mb-8 bg-green-900 bg-opacity-70 rounded-xl p-8 shadow-lg w-full max-w-none transition-transform transition-shadow hover:shadow-2xl hover:scale-[1.02]">
          <h3 className="text-2xl font-semibold mb-2">Artist/Track Diversity</h3>
          <div className="bg-green-800 bg-opacity-60 rounded p-2">
            <div>Unique artists: <span className="font-bold">{uniqueArtistCount}</span></div>
            <div>Unique tracks: <span className="font-bold">{uniqueTrackCount}</span></div>
            <div>Diversity score: <span className="font-bold">{diversityScore}%</span> <span className="text-xs text-gray-300">(unique tracks / total plays)</span></div>
          </div>
        </div>
      </div>
      {/* 505 Easter Egg Modal */}
      {show505Egg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full flex flex-col items-center relative">
            <button className="absolute top-2 right-2 text-gray-500 hover:text-black text-2xl font-bold" onClick={() => setShow505Egg(false)}>&times;</button>
            <h3 className="text-2xl font-bold mb-4 text-black">🕰️ 505 Unlocked!</h3>
            <p className="mb-4 text-lg text-gray-800 text-center">You found the hidden track:<br/><span className="font-bold">505</span> by Arctic Monkeys<br/>A moody indie anthem for late nights.</p>
            <iframe src="https://open.spotify.com/embed/track/58ge6dfP91o9oXMzq3XkIS" width="300" height="80" frameBorder="0" allow="encrypted-media" title="505 by Arctic Monkeys" className="rounded-lg"></iframe>
            <a href="https://open.spotify.com/track/58ge6dfP91o9oXMzq3XkIS" target="_blank" rel="noopener noreferrer" className="mt-4 text-green-600 font-bold underline">Play on Spotify</a>
          </div>
        </div>
      )}
    </div>
  );
}

// Weekday Listen Time Chart component
function WeekdayListenTimeChart({ data, selectedYear }: { data: EndSong[]; selectedYear: string }) {
  // Compute average plays per weekday (Mon-Sun) for the selected year
  const [weekdayData, setWeekdayData] = React.useState<{ day: string; avgPlays: number }[]>([]);
  React.useEffect(() => {
    if (!data.length || !selectedYear) {
      setWeekdayData([]);
      return;
    }
    // Filter data for the selected year
    const filtered = data.filter((s: EndSong) => s.ts && s.ts.startsWith(selectedYear));
    // Count plays per weekday and number of each weekday in the year
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const playCounts = Array(7).fill(0);
    filtered.forEach((s: EndSong) => {
      const d = new Date(s.ts);
      // JS: 0=Sun, 1=Mon, ..., 6=Sat; shift so 0=Mon, 6=Sun
      const jsDay = d.getDay();
      const idx = jsDay === 0 ? 6 : jsDay - 1;
      playCounts[idx]++;
    });
    // Count number of each weekday in the year
    const year = parseInt(selectedYear);
    const date = new Date(year, 0, 1);
    const weekdayTotals = Array(7).fill(0);
    while (date.getFullYear() === year) {
      const jsDay = date.getDay();
      const idx = jsDay === 0 ? 6 : jsDay - 1;
      weekdayTotals[idx]++;
      date.setDate(date.getDate() + 1);
    }
    // Compute averages
    const avgData = days.map((day, i) => ({
      day,
      avgPlays: weekdayTotals[i] ? +(playCounts[i] / weekdayTotals[i]).toFixed(2) : 0
    }));
    setWeekdayData(avgData);
  }, [data, selectedYear]);
  if (!weekdayData.length) return null;
  return (
    <div className="mb-8 w-full max-w-none transition-transform transition-shadow hover:shadow-2xl hover:scale-[1.02]">
      <h4 className="text-lg font-semibold mb-2">Average Listening by Day of Week</h4>
      <div className="bg-gray-800 bg-opacity-60 rounded p-4">
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={weekdayData} margin={{ top: 10, right: 20, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#8884d8" />
            <XAxis dataKey="day" tick={{ fill: '#fff', fontSize: 14 }} height={40} />
            <YAxis tick={{ fill: '#fff', fontSize: 14 }} allowDecimals={true} />
            <Tooltip contentStyle={{ background: '#222', border: '1px solid #8884d8', color: '#fff' }} />
            <Line type="monotone" dataKey="avgPlays" stroke="#38bdf8" strokeWidth={3} dot={{ r: 3, fill: '#38bdf8' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 