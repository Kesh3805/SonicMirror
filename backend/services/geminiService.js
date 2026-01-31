/**
 * Gemini AI Service
 * Centralized service for all AI/LLM interactions
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');
const { logAICall } = require('../middleware/logger');
const { checkRateLimit } = require('../middleware/rateLimit');

// Initialize Gemini AI
let genAI = null;
let isInitialized = false;

/**
 * Initialize Gemini AI client
 */
function initializeGemini() {
  if (isInitialized) return;

  try {
    if (!config.gemini.apiKey || config.gemini.apiKey === 'your-gemini-api-key-here') {
      console.error('❌ GEMINI_API_KEY is not set or is using placeholder value!');
      console.error('Please set a valid Gemini API key in your .env file');
      console.error('Get your API key from: https://makersuite.google.com/app/apikey');
    } else {
      genAI = new GoogleGenerativeAI(config.gemini.apiKey);
      console.log('✅ Gemini AI initialized successfully');
    }
  } catch (error) {
    console.error('❌ Failed to initialize Gemini AI:', error.message);
  }

  isInitialized = true;
}

// Initialize on module load
initializeGemini();

/**
 * Check if Gemini is available
 * @returns {boolean}
 */
function isAvailable() {
  return genAI !== null;
}

/**
 * Retry with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum retry attempts
 * @returns {Promise<any>}
 */
async function retryWithBackoff(fn, maxRetries = config.rateLimit.geminiMaxRetries) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.error(`Attempt ${attempt}/${maxRetries} failed:`, error.message);

      if (error.message.includes('429') || error.message.includes('quota')) {
        if (attempt === maxRetries) {
          throw new Error('API quota exceeded. Please try again later or upgrade your plan.');
        }
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

/**
 * Generate content using Gemini
 * @param {string} prompt - The prompt to send
 * @param {string} feature - Feature name for logging
 * @returns {Promise<string>} Generated text
 */
async function generateContent(prompt, feature = 'unknown') {
  if (!isAvailable()) {
    throw new Error('Gemini AI is not available. Please configure GEMINI_API_KEY.');
  }

  // Check rate limit
  const rateLimitResult = checkRateLimit('gemini', 10, 60000);
  if (!rateLimitResult.allowed) {
    throw new Error(rateLimitResult.message);
  }

  const startTime = Date.now();

  try {
    const result = await retryWithBackoff(async () => {
      const model = genAI.getGenerativeModel({ model: config.gemini.model });
      const response = await model.generateContent(prompt);
      return response.response.text().trim();
    });

    logAICall(config.gemini.model, feature, true, Date.now() - startTime);
    return result;
  } catch (error) {
    logAICall(config.gemini.model, feature, false, Date.now() - startTime);
    throw error;
  }
}

/**
 * Generate and parse JSON response
 * @param {string} prompt - The prompt to send
 * @param {string} feature - Feature name for logging
 * @param {Object} fallback - Fallback object if parsing fails
 * @returns {Promise<Object>} Parsed JSON object
 */
async function generateJSON(prompt, feature, fallback = {}) {
  const text = await generateContent(prompt, feature);

  try {
    // Clean up the response - remove markdown code blocks if present
    let cleanText = text.trim();
    if (cleanText.startsWith('```json')) {
      cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    return JSON.parse(cleanText);
  } catch (parseError) {
    console.warn(`Failed to parse JSON for ${feature}, using fallback`);
    return fallback;
  }
}

/**
 * Prompts for different features
 */
const prompts = {
  /**
   * Generate roast prompt
   */
  roast: (data) => `You're a BRUTAL music critic with the savage wit of Anthony Fantano and the psychological depth of a music therapist who's seen it all. Based on the user's music stats below, deliver a SCATHING roast that cuts deep into their soul while being absolutely hilarious.

This isn't just about their music taste - it's about WHO THEY ARE AS A PERSON. Dig into their psychological profile, their deepest insecurities, their failed relationships, their questionable life choices, all revealed through their musical selections.

Top Artists: ${data.topArtists.join(', ')}
Top Tracks: ${data.topTracks.join(', ')}
Top Genres: ${data.topGenres.join(', ')}
Audio Profile: Danceability ${data.audioProfile.danceability}, Energy ${data.audioProfile.energy}, Valence ${data.audioProfile.valence}

Roast them in 4-5 sentences that:
- Expose their deepest psychological wounds through their music choices
- Mock their taste with surgical precision and cultural references
- Reveal what their playlist says about their failed attempts at being interesting
- Make them question their entire existence and life choices
- End with a devastating one-liner that will haunt them forever

Be absolutely SAVAGE but clever. Reference specific artists, genres, and cultural moments. Make them feel like you've been watching their entire life through their Spotify history.`,

  /**
   * Generate personality prompt
   */
  personality: (data) => `You're a DARK PSYCHOLOGIST who specializes in exposing the raw, unfiltered truth about people through their music choices. This isn't your typical fluffy personality analysis - this is a PSYCHOLOGICAL AUTOPSY that reveals their deepest fears, darkest secrets, and most embarrassing personality flaws.

Based on the user's music listening data, create a BRUTALLY HONEST personality profile that cuts through the bullshit and exposes their true self.

Top Artists: ${data.topArtists.join(', ')}
Top Tracks: ${data.topTracks.join(', ')}
Top Genres: ${data.topGenres.join(', ')}
Audio Profile: Danceability ${data.audioProfile.danceability}, Energy ${data.audioProfile.energy}, Valence ${data.audioProfile.valence}

Please provide:
1. A SAVAGE nickname that exposes their deepest insecurities
2. A 3-4 sentence psychological profile that reveals their darkest personality traits
3. What their music taste says about their failed relationships and career struggles
4. A BRUTAL observation about their listening patterns

Be PSYCHOLOGICALLY SAVAGE but accurate. Dig deep into their subconscious through their musical choices.`,

  /**
   * Generate mood analysis prompt
   */
  moodAnalysis: (data) => `You're a DARK PSYCHOLOGIST and EMOTIONAL VAMPIRE who specializes in exposing people's deepest emotional wounds through their music choices.

Based on the user's music listening data, provide a BRUTALLY HONEST emotional and mood analysis.

Top Artists: ${data.topArtists.join(', ')}
Top Tracks: ${data.topTracks.join(', ')}
Top Genres: ${data.topGenres.join(', ')}
Audio Profile: Danceability ${data.audioProfile.danceability}, Energy ${data.audioProfile.energy}, Valence ${data.audioProfile.valence}
${data.recentlyPlayed ? `Recently Played: ${data.recentlyPlayed.slice(0, 5).join(', ')}` : ''}

Provide analysis in this exact JSON format:
{
  "primaryMood": "string",
  "secondaryMood": "string",
  "emotionalProfile": {
    "happiness": number (0-100),
    "energy": number (0-100),
    "relaxation": number (0-100),
    "intensity": number (0-100)
  },
  "moodInsights": ["3-4 insights"],
  "moodRecommendations": ["3-4 recommendations"],
  "emotionalSummary": "2-3 sentence summary"
}`,

  /**
   * Generate recommendations prompt
   */
  recommendations: (data) => `You're a SAVAGE music curator who knows exactly what people need based on their current taste.

Based on their data, provide personalized music recommendations:

Top Artists: ${data.topArtists.join(', ')}
Top Tracks: ${data.topTracks.join(', ')}
Top Genres: ${data.topGenres.join(', ')}
Audio Profile: Danceability ${data.audioProfile.danceability}, Energy ${data.audioProfile.energy}, Valence ${data.audioProfile.valence}

Provide recommendations in this exact JSON format:
{
  "recommendations": [
    {
      "name": "Artist/Track name",
      "artist": "Artist name (for tracks)",
      "type": "artist" or "track",
      "reason": "Why they'd like this",
      "matchScore": number (1-100)
    }
  ],
  "summary": "Overall recommendation summary",
  "expandYourHorizons": "Suggestion for something different"
}

Provide 5-8 recommendations mixing artists and tracks.`,
};

/**
 * Fallback responses for when API is unavailable
 */
const fallbacks = {
  roast: [
    "Oh honey, your music taste is so basic it could be the default playlist on a rental car's radio. Your playlist screams 'I'm afraid of anything that might make me feel something deeper than surface-level emotions.' You're the human equivalent of a participation trophy in music appreciation.",
    "Your playlist looks like it was curated by someone who only listens to music while shopping at the mall. It's like you're afraid that if you listen to anything with actual depth, you might accidentally develop a personality.",
    "I've seen more diverse music taste in a dentist's office waiting room. Your playlist is what happens when someone is so terrified of being judged that they only listen to what's mathematically proven to be inoffensive.",
  ],
  personality: [
    "🎵 The Desperate Mainstream Conformist - Your music taste screams 'I'm terrified of being judged, so I only listen to what's mathematically proven to be inoffensive.' Your playlist is the audio equivalent of living in a gated community of the mind.",
    "🌟 The Emotionally Stunted Playlist Curator - Your musical choices reveal someone who's so afraid of emotional depth that they only listen to songs that could be played at a children's birthday party.",
  ],
  story: [
    "This year, you've been on a musical journey that's as predictable as a Netflix algorithm's wet dream. Your love for the hits shows you're someone who's so afraid of being different that you've become the human embodiment of a Spotify recommendation engine.",
  ],
};

/**
 * Get random fallback response
 * @param {string} type - Response type
 * @returns {string}
 */
function getRandomFallback(type) {
  const responses = fallbacks[type] || [];
  return responses[Math.floor(Math.random() * responses.length)] || 'Unable to generate response.';
}

module.exports = {
  isAvailable,
  generateContent,
  generateJSON,
  prompts,
  fallbacks,
  getRandomFallback,
  initializeGemini,
};
