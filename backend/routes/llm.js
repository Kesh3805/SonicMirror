const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI with better error handling
let genAI;
try {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your-gemini-api-key-here') {
    console.error('❌ GEMINI_API_KEY is not set or is using placeholder value!');
    console.error('Please set a valid Gemini API key in your .env file');
    console.error('Get your API key from: https://makersuite.google.com/app/apikey');
  } else {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('✅ Gemini AI initialized successfully');
  }
} catch (error) {
  console.error('❌ Failed to initialize Gemini AI:', error.message);
}

// Rate limiting helper
let requestCount = 0;
let lastResetTime = Date.now();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 15; // Conservative limit for free tier

function checkRateLimit() {
  const now = Date.now();
  if (now - lastResetTime > RATE_LIMIT_WINDOW) {
    requestCount = 0;
    lastResetTime = now;
  }
  
  if (requestCount >= MAX_REQUESTS_PER_MINUTE) {
    const timeUntilReset = RATE_LIMIT_WINDOW - (now - lastResetTime);
    throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(timeUntilReset / 1000)} seconds before trying again.`);
  }
  
  requestCount++;
}

// Retry helper with exponential backoff
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.error(`Attempt ${attempt}/${maxRetries} failed:`, error.message);
      
      if (error.message.includes('429') || error.message.includes('quota')) {
        if (attempt === maxRetries) {
          throw new Error('API quota exceeded. Please try again later or upgrade your plan.');
        }
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000); // Max 10 seconds
        console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

// Helper function to check if Gemini is available
function isGeminiAvailable() {
  if (!genAI) {
    console.error('❌ Gemini AI is not available - API key not configured');
    return false;
  }
  return true;
}

// Fallback responses for when API is rate limited
const fallbackResponses = {
  roast: [
    "Oh honey, your music taste is so basic it could be the default playlist on a rental car's radio. Your playlist screams 'I'm afraid of anything that might make me feel something deeper than surface-level emotions.' You're the human equivalent of a participation trophy in music appreciation.",
    "Your playlist looks like it was curated by someone who only listens to music while shopping at the mall. It's like you're afraid that if you listen to anything with actual depth, you might accidentally develop a personality. Your music choices are the audio equivalent of eating plain toast for every meal.",
    "I've seen more diverse music taste in a dentist's office waiting room. Your playlist is what happens when someone is so terrified of being judged that they only listen to what's mathematically proven to be inoffensive. You're the musical equivalent of someone who orders 'the usual' at every restaurant because they're afraid of disappointment.",
    "Your music choices are so safe they could be used as background music for a corporate training video. It's like you're trying to create the most emotionally sterile playlist possible. Your taste is what happens when someone is so afraid of vulnerability that they only listen to songs that have been pre-approved by focus groups.",
    "Your taste in music is like a comfort food buffet - nothing too spicy, nothing too adventurous, just pure, unadulterated predictability. You're the kind of person who thinks 'experimental' means listening to a song that's slightly longer than 3 minutes. Your playlist is the audio equivalent of living in a beige house with beige furniture and beige thoughts.",
    "I bet your music library is so mainstream it has its own gravitational pull toward the center of pop culture. You're not just basic, you're mathematically average. Your playlist is what happens when someone is so afraid of being different that they become the human embodiment of a Spotify algorithm's wet dream.",
    "Your playlist is what happens when someone asks Siri to 'play something everyone likes.' It's the musical equivalent of ordering vanilla ice cream at a gourmet dessert shop. You're the kind of person who thinks 'diverse taste' means listening to both pop and pop-rock. Your music choices are the audio equivalent of wearing a 'Live, Laugh, Love' t-shirt to a philosophy class.",
    "Your music taste is so vanilla it could be the official soundtrack of a suburban family dinner. It's like you're afraid that if you listen to anything with actual edge, you might accidentally develop a spine. Your playlist is what happens when someone is so terrified of being judged that they become the musical equivalent of a doormat.",
    "I've seen more musical diversity in a hotel elevator playlist. Your taste is so safe it could be used as background music for a meditation app. You're the kind of person who thinks 'alternative' means listening to a song that wasn't in the top 10. Your music choices are the audio equivalent of living in a gated community of the mind.",
    "Your music choices are like a musical comfort zone that's so cozy you never want to leave. It's like you're afraid the music might judge you back. You're the kind of person who thinks 'deep' means a song that mentions feelings. Your playlist is what happens when someone is so afraid of emotional depth that they only listen to songs that could be played at a children's birthday party.",
    "Your playlist is what happens when someone tries to create the most inoffensive music collection possible. It's like musical white bread - bland but reliable. You're the kind of person who thinks 'experimental' means a song that doesn't have a chorus. Your music choices are the audio equivalent of being the human version of a participation trophy.",
    "Your taste is so mainstream it could be used as a reference point for what 'normal' music sounds like. You're the control group in a music taste experiment. Your playlist is what happens when someone is so afraid of being different that they become the musical equivalent of a beige wall. You're the kind of person who thinks 'diverse' means listening to both Taylor Swift and Ed Sheeran.",
    "Your music library is like a greatest hits compilation that was curated by someone who only knows the greatest hits. It's musical comfort food at its finest. You're the kind of person who thinks 'underground' means a song that wasn't played on the radio this week. Your playlist is the audio equivalent of being the human version of a 'Live, Laugh, Love' sign.",
    "Your playlist is so predictable it could be used to test if someone has actually listened to music in the last decade. It's like a musical time capsule of popular culture. You're the kind of person who thinks 'alternative' means listening to a song that's slightly less popular than the current number one. Your music choices are the audio equivalent of being the human version of a participation medal.",
    "Your music taste is what happens when someone asks 'what's popular?' and then never asks any other questions. It's the musical equivalent of ordering the house special. You're the kind of person who thinks 'deep' means a song that mentions love. Your playlist is what happens when someone is so afraid of emotional complexity that they only listen to songs that could be used in a car commercial.",
    "Your playlist is like a musical safety net - nothing too high, nothing too low, just comfortably in the middle where it's safe and warm. You're the kind of person who thinks 'experimental' means a song that's slightly longer than average. Your music choices are the audio equivalent of being the human version of a 'Keep Calm and Carry On' poster.",
    "Your music choices are so mainstream they could be used as background music for a corporate diversity training video. It's like musical diplomacy. You're the kind of person who thinks 'underground' means a song that wasn't in the top 40. Your playlist is what happens when someone is so afraid of being judged that they become the musical equivalent of a white flag.",
    "Your taste is what happens when someone tries to create the most universally acceptable music collection. It's like musical Switzerland - neutral and peaceful. You're the kind of person who thinks 'alternative' means listening to a song that's not currently number one. Your music choices are the audio equivalent of being the human version of a 'Hang in There' cat poster.",
    "Your playlist is so safe it could be used as background music for a children's hospital. It's like musical comfort food that never disappoints. You're the kind of person who thinks 'deep' means a song that mentions more than one emotion. Your playlist is what happens when someone is so afraid of emotional depth that they only listen to songs that could be played at a family gathering.",
    "Your music library is like a greatest hits album that was compiled by someone who only knows the greatest hits. It's musical comfort food at its most reliable. You're the kind of person who thinks 'experimental' means a song that doesn't follow the standard verse-chorus structure. Your music choices are the audio equivalent of being the human version of a motivational poster."
  ],
  personality: [
    "🎵 The Desperate Mainstream Conformist - Your music taste screams 'I'm terrified of being judged, so I only listen to what's mathematically proven to be inoffensive.' You're the kind of person who thinks 'alternative' means listening to a song that wasn't number one this week. Your playlist is the audio equivalent of living in a gated community of the mind, where every song has been pre-approved by focus groups. You probably have a playlist called 'Songs That Won't Offend Anyone' and you're proud of it.",
    "🌟 The Emotionally Stunted Playlist Curator - Your musical choices reveal someone who's so afraid of emotional depth that they only listen to songs that could be played at a children's birthday party. You're the kind of person who thinks 'deep' means a song that mentions feelings. Your playlist is what happens when someone is so terrified of vulnerability that they become the musical equivalent of a participation trophy. You probably think 'experimental' means a song that's slightly longer than 3 minutes.",
    "🎧 The Failed Hipster Wannabe - Your music taste shows you desperately want to be interesting but you're too afraid to actually commit to anything with edge. You're the kind of person who thinks 'underground' means a song that wasn't in the top 40. Your playlist is what happens when someone tries to be alternative but ends up being the musical equivalent of a 'Live, Laugh, Love' sign. You probably have a playlist called 'Indie Vibes' that's filled with songs that were number one last year.",
    "🏠 The Musical Doormat - Your playlist is like a collection of songs that are so inoffensive they could be used as background music for a corporate training video. You're someone who's so afraid of being judged that you become the musical equivalent of a white flag. Your taste is what happens when someone is so terrified of emotional complexity that they only listen to songs that could be used in a car commercial. You probably think 'diverse taste' means listening to both pop and pop-rock.",
    "🎪 The Desperate Social Climber - You're the kind of person who thinks 'trendy' means listening to whatever was popular last month. Your musical personality shows you're so desperate for social validation that you'll listen to anything that might make you seem cool. You appreciate songs that everyone else likes because you're terrified of having an original thought. You probably have a playlist called 'What Everyone's Listening To' and you update it weekly based on what your friends post on Instagram.",
    "🛡️ The Emotionally Bankrupt Conservative - Your taste reveals someone who's so afraid of change that they only listen to songs that have been proven safe by decades of radio play. You're the kind of person who thinks 'classic' means anything that came out before you were born. You appreciate music that's been pre-approved by multiple generations because you're terrified of accidentally liking something that might make you seem edgy. You probably have a playlist called 'Songs My Parents Would Approve Of'.",
    "🎯 The Desperate Hit Seeker - You have a knack for finding songs that everyone else already knows about. Your musical radar is tuned to whatever's currently popular because you're afraid of being left out of conversations. You appreciate music that's been validated by millions of other people because you don't trust your own taste. You're the kind of person who thinks 'quality' means 'popular' and 'underground' means 'not currently trending'. You probably have a playlist called 'Songs I Heard on TikTok'.",
    "🌈 The Delusional Optimist - Your playlist is filled with songs that are so positive they could be used as background music for a motivational seminar. You're someone who's so afraid of negative emotions that you only listen to music that could be played at a children's hospital. You appreciate songs that make you feel good because you're terrified of anything that might make you feel something deeper. You probably have a playlist called 'Happy Vibes Only' and you're genuinely confused when people listen to sad music.",
    "🎭 The Desperate Crowd Pleaser - Your music taste shows you're someone who's so terrified of being disliked that you only choose music that's guaranteed to be inoffensive to everyone. You're the kind of person who thinks 'universal appeal' means 'bland enough for everyone'. You choose music that's enjoyable for everyone because you're afraid of having an opinion that might offend someone. You probably have a playlist called 'Songs That Won't Start Arguments' and you're proud of your diplomatic approach to music.",
    "🔄 The Musical Time Capsule - You appreciate songs that have been proven safe by the passage of time. Your taste shows you're someone who's so afraid of the present that you only listen to music from the past. You're the kind of person who thinks 'timeless' means 'old enough that no one can judge you for liking it'. You probably have a playlist called 'Classics' that's filled with songs that were popular when your parents were young.",
    "🌟 The Desperate Trend Follower - You're someone who's so afraid of being uncool that you only listen to whatever's currently trending. Your taste shows you have no actual musical identity beyond whatever's popular this week. You appreciate music that's been validated by social media because you don't trust your own judgment. You're the kind of person who thinks 'current' means 'trending on Twitter' and 'outdated' means 'last week's hits'. You probably have a playlist called 'What's Hot Right Now' that you update daily.",
    "🎪 The Musical Chameleon - Your playlist is designed to change based on whoever you're trying to impress. You're someone who's so afraid of being judged that you'll listen to anything that might make you seem interesting to others. You appreciate songs that can be used as conversation starters because you're terrified of awkward silences. You're the kind of person who thinks 'versatile' means 'willing to listen to anything to avoid conflict'. You probably have different playlists for different social situations and you're constantly switching between them.",
    "🛋️ The Comfort Zone Prisoner - Your musical choices reveal someone who's so afraid of discomfort that they only listen to songs they've heard a thousand times before. You appreciate music that feels familiar because you're terrified of anything that might surprise you. You're the kind of person who thinks 'reliable' means 'predictable' and 'adventurous' means 'listening to a song you've only heard twice'. You probably have a playlist called 'Songs I Know by Heart' and you're proud of how many times you've listened to each track.",
    "🎯 The Quality Imposter - Your taste shows you have high standards for what you listen to, but your standards are based on what other people think is good. You appreciate well-crafted songs that have been validated by critics because you don't trust your own taste. You're the kind of person who thinks 'quality' means 'highly rated on Pitchfork' and 'trash' means 'anything with a low Metacritic score'. You probably have a playlist called 'Critically Acclaimed' that you've never actually listened to all the way through.",
    "🌈 The Emotional Avoidance Specialist - Your playlist is filled with songs that are so emotionally shallow they could be used as background music for a shopping mall. You're someone who's so afraid of feeling anything deeper than surface-level emotions that you only listen to music that won't make you think too hard. You appreciate songs that are easy to digest because you're terrified of anything that might require emotional investment. You probably have a playlist called 'Easy Listening' and you're genuinely confused when people listen to music that makes them cry.",
    "🎭 The Desperate Approval Seeker - Your music taste shows you're someone who's so desperate for validation that you only listen to songs that are guaranteed to get positive reactions from others. You have an instinct for popular appeal because you're terrified of being the only person who likes something. You appreciate music that creates connections because you're afraid of being alone in your taste. You're the kind of person who thinks 'universal' means 'safe' and 'niche' means 'risky'. You probably have a playlist called 'Songs Everyone Loves' and you're genuinely hurt when someone doesn't like one of your recommendations.",
    "🔄 The Musical Conservative - Your taste reveals someone who's so afraid of change that they only listen to music that's been proven safe by decades of radio play. You value songs that have stood the test of time because you're terrified of anything that might be too new or different. You're the kind of person who thinks 'classic' means 'old enough to be safe' and 'experimental' means 'anything released after 1995'. You probably have a playlist called 'Timeless Classics' that's filled with songs that were popular when your grandparents were young.",
    "🌟 The Desperate Hit Predictor - Your playlist shows you have a natural instinct for what makes a song popular, but only because you're so afraid of being wrong that you only listen to songs that are already successful. You appreciate music that resonates with millions of other people because you don't trust your own taste. You have an ear for popularity because you're terrified of liking something that might not catch on. You're the kind of person who thinks 'hit potential' means 'already a hit' and 'flop' means 'anything that's not currently trending'. You probably have a playlist called 'Future Hits' that's filled with songs that are already number one.",
    "🎪 The Musical Social Climber - Your taste shows you're someone who uses music as a way to climb the social ladder. You appreciate songs that can be used as status symbols because you're terrified of being seen as uncool. You're a natural at creating musical moments that make you look good to others. You're the kind of person who thinks 'cool' means 'popular' and 'lame' means 'anything that's not currently trending'. You probably have a playlist called 'Songs That Make Me Look Cool' and you're constantly updating it based on what your social circle is listening to.",
    "🛋️ The Musical Security Blanket - Your playlist is like a collection of songs that are so familiar they feel like old friends, but only because you're too afraid to make new ones. You're someone who finds comfort in the same songs you've been listening to for years because you're terrified of anything that might surprise you. You appreciate the reliability of great songs because you're afraid of disappointment. You're the kind of person who thinks 'comfortable' means 'predictable' and 'risky' means 'anything you haven't heard before'. You probably have a playlist called 'Old Favorites' that you've been listening to since high school and you're genuinely confused when people discover new music."
  ],
  story: [
    "This year, you've been on a musical journey that's as predictable as a Netflix algorithm's wet dream. Your love for the hits shows you're someone who's so afraid of being different that you've become the human embodiment of a Spotify recommendation engine. You've created the perfect soundtrack for your life of mediocrity, filled with songs that everyone can sing along to because they're too afraid to have an original thought. Here's to another year of being the musical equivalent of a participation trophy!",
    "Your Spotify story is one of desperate consistency and emotional bankruptcy. You've found your musical comfort zone and you're sticking to it like a security blanket, which is actually quite pathetic in a world of endless possibilities. Your playlist is like a warm blanket of familiar favorites that never disappoint because you're too afraid to try anything that might surprise you. Keep on enjoying the music that makes you feel safe in your musical prison!",
    "This year has been a celebration of musical reliability and your complete lack of imagination. Your taste shows you're someone who knows what you like and isn't afraid to embrace it, even if what you like is the musical equivalent of eating plain toast for every meal. You've created a soundtrack that's both personal and universally appealing because you're terrified of having an opinion that might offend someone. Your music journey is proof that sometimes the safest choice is also the most boring one!",
    "Your musical story this year is one of comfort and your desperate need for validation. You've built a collection of songs that feel like old friends, each one chosen for its ability to bring joy and familiarity because you're too afraid to make new friends. Your playlist is a testament to the power of knowing what you love and sticking with it, even if what you love is the musical equivalent of a 'Live, Laugh, Love' sign. Here's to another year of musical mediocrity!",
    "This year's musical journey has been all about finding the perfect balance between quality and accessibility, which for you means listening to whatever's currently popular. Your taste shows you're someone who appreciates great music that everyone can enjoy because you're terrified of being the only person who likes something. You've created a soundtrack that's both personal and shareable because you're afraid of having a taste that's too unique. Your playlist is proof that good taste doesn't have to be complicated, it just has to be boring!",
    "Your Spotify story is a celebration of musical reliability and your complete lack of edge. You've found the songs that make you happy and you're not afraid to play them on repeat because you're terrified of anything that might make you feel something deeper. Your playlist is like a collection of musical comfort food - familiar, satisfying, and always there when you need it because you're too afraid to try anything new. Keep on enjoying the music that brings you joy, even if that joy is as shallow as a kiddie pool!",
    "This year has been about embracing the music that makes you feel good, which for you means anything that won't make you think too hard. Your taste shows you're someone who values happiness and positivity in your musical choices because you're terrified of anything that might make you feel something other than surface-level contentment. You've created a soundtrack that's both uplifting and relatable because you're afraid of anything that might challenge your worldview. Your playlist is proof that sometimes the best music is the kind that makes everyone smile, even if that smile is fake!",
    "Your musical journey this year has been one of consistency and your desperate need for approval. You've built a collection of songs that represent the best of what music has to offer, according to everyone else. Your taste shows you're someone who appreciates craftsmanship and appeal because you don't trust your own judgment. Your playlist is a testament to the power of choosing quality over novelty, even if that quality is defined by other people's standards!",
    "This year's soundtrack has been all about finding joy in the familiar, which for you means listening to the same songs you've been listening to for years. Your music choices show you're someone who values comfort and reliability because you're terrified of anything that might surprise you. You've created a collection that feels like coming home to your favorite songs because you're too afraid to explore new musical territories. Your playlist is proof that sometimes the best music is the kind you know by heart, even if that heart is as shallow as a puddle!",
    "Your Spotify story is one of musical wisdom and your complete lack of originality. You've chosen songs that have proven their worth and appeal because you're afraid of being wrong about your taste. Your playlist shows you're someone who understands what makes great music great, according to everyone else. You've created a soundtrack that's both timeless and timely because you're terrified of having an opinion that might be considered outdated or too current. Here's to another year of being the musical equivalent of a weather vane!",
    "This year has been about celebrating the music that brings people together, which for you means listening to whatever everyone else is listening to. Your taste shows you're someone who values connection and shared experiences because you're afraid of being alone in your musical choices. You've created a soundtrack that's perfect for any occasion because you're terrified of having a taste that's too specific. Your playlist is proof that the best music is the kind that everyone can enjoy, even if that enjoyment is as shallow as a social media like!",
    "Your musical journey this year has been one of comfort and your desperate need for validation. You've found the songs that make you happy and you're not afraid to embrace them because you're terrified of anything that might make you feel something other than contentment. Your playlist is like a musical hug - warm, familiar, and always there when you need it because you're too afraid to try anything that might challenge you. Keep on enjoying the music that brings you comfort, even if that comfort is as fake as a motivational poster!",
    "This year's soundtrack has been all about quality and your complete lack of imagination. Your taste shows you're someone who knows what you like and isn't afraid to stick with it, even if what you like is the musical equivalent of eating the same meal every day. You've created a collection that's both personal and universally appealing because you're afraid of having a taste that's too unique. Your playlist is proof that good taste is timeless, even if that taste is as boring as watching paint dry!",
    "Your Spotify story is a celebration of musical consistency and your desperate need for approval. You've built a collection of songs that feel like old friends because you're too afraid to make new ones. Your taste shows you're someone who values familiarity and quality because you don't trust your own judgment. Your playlist is proof that sometimes the best music is the kind you know and love, even if that love is as shallow as a social media relationship!",
    "This year has been about finding the perfect musical balance, which for you means listening to whatever's currently popular. Your choices show you're someone who appreciates both quality and accessibility because you're afraid of having an opinion that might be considered too niche or too mainstream. You've created a soundtrack that's both sophisticated and approachable because you're terrified of being seen as either pretentious or basic. Your playlist is proof that great taste doesn't have to be complicated, it just has to be boring!",
    "Your musical journey this year has been one of comfort and your complete lack of edge. You've chosen songs that bring you joy and reliability because you're terrified of anything that might surprise you. Your taste shows you're someone who values consistency and great craftsmanship because you don't trust your own taste. Your playlist is proof that sometimes the best music is the kind that never disappoints, even if that disappointment is the only emotion you're capable of feeling!",
    "This year's soundtrack has been all about embracing what you love, which for you means listening to whatever everyone else loves. Your music choices show you're someone who isn't afraid to enjoy the songs that make you happy because you're terrified of anything that might make you feel something deeper. You've created a collection that's both personal and universally appealing because you're afraid of having a taste that's too unique. Your playlist is proof that good taste is about knowing what brings you joy, even if that joy is as shallow as a kiddie pool!",
    "Your Spotify story is one of musical wisdom and your desperate need for validation. You've built a collection of songs that represent the best of popular music because you're afraid of being wrong about your taste. Your taste shows you're someone who appreciates quality and appeal because you don't trust your own judgment. Your playlist is proof that sometimes the best choices are the ones that everyone can enjoy, even if that enjoyment is as fake as a social media smile!",
    "This year has been about celebrating musical reliability and your complete lack of imagination. Your choices show you're someone who values consistency and happiness in your music because you're terrified of anything that might challenge your worldview. You've created a soundtrack that's both comforting and uplifting because you're afraid of anything that might make you feel something other than surface-level contentment. Your playlist is proof that great music is the kind that makes you feel good, even if that good feeling is as shallow as a motivational quote!",
    "Your musical journey this year has been one of quality and your desperate need for approval. You've found the songs that work for you and you're not afraid to embrace them because you're terrified of anything that might surprise you. Your playlist is like a collection of musical comfort food - satisfying, reliable, and always there when you need it because you're too afraid to try anything new. Keep on enjoying the music that brings you joy, even if that joy is as shallow as a social media like!"
  ]
};

function getRandomFallback(type) {
  const responses = fallbackResponses[type];
  return responses[Math.floor(Math.random() * responses.length)];
}

// POST /llm/roast
router.post('/roast', async (req, res) => {
  const { topArtists, topTracks, topGenres, audioProfile } = req.body;
  if (!topArtists || !topTracks || !topGenres || !audioProfile) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  // Check if Gemini is available
  if (!isGeminiAvailable()) {
    const fallbackRoast = getRandomFallback('roast');
    return res.json({ 
      roast: fallbackRoast, 
      fallback: true,
      error: 'AI service not configured. Using fallback response. Please set GEMINI_API_KEY in your environment variables.'
    });
  }

  try {
    checkRateLimit();
  } catch (error) {
    return res.status(429).json({ error: error.message });
  }

  const prompt = `You're a BRUTAL music critic with the savage wit of Anthony Fantano and the psychological depth of a music therapist who's seen it all. Based on the user's music stats below, deliver a SCATHING roast that cuts deep into their soul while being absolutely hilarious.

This isn't just about their music taste - it's about WHO THEY ARE AS A PERSON. Dig into their psychological profile, their deepest insecurities, their failed relationships, their questionable life choices, all revealed through their musical selections.

Top Artists: ${topArtists.join(', ')}
Top Tracks: ${topTracks.join(', ')}
Top Genres: ${topGenres.join(', ')}
Audio Profile: Danceability ${audioProfile.danceability}, Energy ${audioProfile.energy}, Valence ${audioProfile.valence}

Roast them in 4-5 sentences that:
- Expose their deepest psychological wounds through their music choices
- Mock their taste with surgical precision and cultural references
- Reveal what their playlist says about their failed attempts at being interesting
- Make them question their entire existence and life choices
- End with a devastating one-liner that will haunt them forever

Be absolutely SAVAGE but clever. Reference specific artists, genres, and cultural moments. Make them feel like you've been watching their entire life through their Spotify history. This should be the kind of roast that makes them delete their account and move to a different country.`;

  try {
    console.log('🔥 Attempting to generate AI roast...');
    const roast = await retryWithBackoff(async () => {
      // Get the Gemini Flash model (free tier)
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Generate content with flash mode for faster responses
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      console.log('✅ AI roast generated successfully');
      return text;
    });

    if (roast) {
      res.json({ roast, fallback: false });
    } else {
      console.error('❌ No roast returned from AI');
      const fallbackRoast = getRandomFallback('roast');
      res.json({ roast: fallbackRoast, fallback: true, error: 'AI returned empty response' });
    }
  } catch (err) {
    console.error('❌ Gemini API error:', err.message);
    if (err.message.includes('quota') || err.message.includes('429')) {
      // Use fallback response when rate limited
      const fallbackRoast = getRandomFallback('roast');
      res.json({ roast: fallbackRoast, fallback: true, error: 'API quota exceeded' });
    } else if (err.message.includes('API key') || err.message.includes('authentication')) {
      const fallbackRoast = getRandomFallback('roast');
      res.json({ 
        roast: fallbackRoast, 
        fallback: true, 
        error: 'Invalid API key. Please check your GEMINI_API_KEY configuration.' 
      });
    } else {
      const fallbackRoast = getRandomFallback('roast');
      res.json({ 
        roast: fallbackRoast, 
        fallback: true, 
        error: err.message || 'Failed to generate roast.' 
      });
    }
  }
});

// POST /llm/personality
router.post('/personality', async (req, res) => {
  const { topArtists, topTracks, topGenres, audioProfile } = req.body;
  if (!topArtists || !topTracks || !topGenres || !audioProfile) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  // Check if Gemini is available
  if (!isGeminiAvailable()) {
    const fallbackPersonality = getRandomFallback('personality');
    return res.json({ 
      personality: fallbackPersonality, 
      fallback: true,
      error: 'AI service not configured. Using fallback response. Please set GEMINI_API_KEY in your environment variables.'
    });
  }

  try {
    checkRateLimit();
  } catch (error) {
    return res.status(429).json({ error: error.message });
  }

  const prompt = `You're a DARK PSYCHOLOGIST who specializes in exposing the raw, unfiltered truth about people through their music choices. This isn't your typical fluffy personality analysis - this is a PSYCHOLOGICAL AUTOPSY that reveals their deepest fears, darkest secrets, and most embarrassing personality flaws.

Based on the user's music listening data, create a BRUTALLY HONEST personality profile that cuts through the bullshit and exposes their true self.

Top Artists: ${topArtists.join(', ')}
Top Tracks: ${topTracks.join(', ')}
Top Genres: ${topGenres.join(', ')}
Audio Profile: Danceability ${audioProfile.danceability}, Energy ${audioProfile.energy}, Valence ${audioProfile.valence}

Please provide:
1. A SAVAGE nickname that exposes their deepest insecurities (e.g., "The Desperate Mainstream Conformist", "The Emotionally Stunted Playlist Curator", "The Failed Hipster Wannabe")
2. A 3-4 sentence psychological profile that reveals their darkest personality traits and deepest fears
3. What their music taste says about their failed relationships, career struggles, and social anxiety
4. A BRUTAL observation about their listening patterns that exposes their most embarrassing habits

Be PSYCHOLOGICALLY SAVAGE but accurate. Dig deep into their subconscious through their musical choices. This should feel like a therapy session where the therapist has no filter and is determined to break them down to rebuild them stronger.`;

  try {
    const personality = await retryWithBackoff(async () => {
      // Get the Gemini Flash model (free tier)
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Generate content with flash mode for faster responses
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    });

    if (personality) {
      res.json({ personality });
    } else {
      res.status(500).json({ error: 'No personality analysis returned.' });
    }
  } catch (err) {
    console.error('Gemini API error:', err.message);
    if (err.message.includes('quota') || err.message.includes('429')) {
      // Use fallback response when rate limited
      const fallbackPersonality = getRandomFallback('personality');
      res.json({ personality: fallbackPersonality, fallback: true });
    } else {
      res.status(500).json({ error: err.message || 'Failed to generate personality analysis.' });
    }
  }
});

// POST /llm/spotify-wrapped
router.post('/spotify-wrapped', async (req, res) => {
  const { topArtists, topTracks, topGenres, audioProfile, listeningStats, recentlyPlayed } = req.body;
  if (!topArtists || !topTracks || !topGenres || !audioProfile) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  // Calculate actual stats from current data
  const calculateWrapped = () => {
    const totalTracks = listeningStats?.totalTracks || topTracks.length;
    const estimatedMinutesPerTrack = 3.5; // Average track length
    const totalMinutes = Math.round(totalTracks * estimatedMinutesPerTrack);
    
    // Calculate genre percentages based on actual data
    const genreCounts = {};
    topGenres.forEach(genre => {
      genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    });
    
    const totalGenreCount = Object.values(genreCounts).reduce((sum, count) => sum + count, 0);
    const genrePercentages = Object.entries(genreCounts).map(([genre, count]) => ({
      name: genre,
      percentage: Math.round((count / totalGenreCount) * 100)
    })).sort((a, b) => b.percentage - a.percentage);

    // Determine listening personality based on audio features
    let listeningPersonality = "Music Explorer";
    if (audioProfile.danceability > 0.7) {
      listeningPersonality = "Dance Floor Enthusiast";
    } else if (audioProfile.energy > 0.7) {
      listeningPersonality = "High Energy Listener";
    } else if (audioProfile.valence > 0.7) {
      listeningPersonality = "Positive Vibes Seeker";
    } else if (topGenres.length > 8) {
      listeningPersonality = "Genre Hopper";
    } else if (topArtists.length < 5) {
      listeningPersonality = "Artist Loyalist";
    }

    // Generate year summary based on actual data
    const yearSummary = `In ${new Date().getFullYear()}, you've been exploring ${topGenres.length} different genres and discovered ${topArtists.length} amazing artists. Your music taste shows a ${audioProfile.danceability > 0.6 ? 'danceable' : 'chill'} side with ${audioProfile.energy > 0.6 ? 'high energy' : 'relaxed'} vibes. You're a true ${listeningPersonality}!`;

    return {
      year: new Date().getFullYear(),
      totalMinutes: totalMinutes,
      topArtists: topArtists.slice(0, 5).map((artist, index) => ({
        name: artist,
        rank: index + 1,
        minutes: Math.round(totalMinutes * (0.3 - index * 0.05))
      })),
      topTracks: topTracks.slice(0, 5).map((track, index) => ({
        name: track,
        rank: index + 1,
        plays: Math.round(totalTracks * (0.25 - index * 0.04))
      })),
      topGenres: genrePercentages.slice(0, 5).map((genre, index) => ({
        name: genre.name,
        rank: index + 1,
        percentage: genre.percentage
      })),
      audioPersonality: {
        danceability: Math.round(audioProfile.danceability * 100),
        energy: Math.round(audioProfile.energy * 100),
        valence: Math.round(audioProfile.valence * 100),
        tempo: Math.round(audioProfile.tempo || 120)
      },
      listeningPersonality: listeningPersonality,
      yearSummary: yearSummary,
      topMonth: "This Year",
      mostListenedDay: "Every Day",
      favoriteTime: "All Day"
    };
  };

  // Check if Gemini is available
  if (!isGeminiAvailable()) {
    const wrapped = calculateWrapped();
    return res.json({ 
      wrapped: wrapped, 
      fallback: true,
      error: 'AI service not configured. Using current data analysis. Please set GEMINI_API_KEY in your environment variables.'
    });
  }

  try {
    checkRateLimit();
  } catch (error) {
    return res.status(429).json({ error: error.message });
  }



  try {
    // Use the actual data calculation instead of AI generation
    const wrapped = calculateWrapped();
    
    if (wrapped) {
      res.json({ wrapped, fallback: false });
    } else {
      res.status(500).json({ error: 'No wrapped data returned.' });
    }
  } catch (err) {
    console.error('Error generating wrapped:', err.message);
    // Use fallback response when there's an error
    const fallbackWrapped = calculateWrapped();
    res.json({ wrapped: fallbackWrapped, fallback: true, error: err.message || 'Failed to generate wrapped.' });
  }
});

// POST /llm/wrapped-story
router.post('/wrapped-story', async (req, res) => {
  const { topArtists, topTracks, topGenres, audioProfile, listeningStats } = req.body;
  if (!topArtists || !topTracks || !topGenres || !audioProfile) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  // Check if Gemini is available
  if (!isGeminiAvailable()) {
    const fallbackStory = getRandomFallback('story');
    return res.json({ 
      story: fallbackStory, 
      fallback: true,
      error: 'AI service not configured. Using fallback response. Please set GEMINI_API_KEY in your environment variables.'
    });
  }

  try {
    checkRateLimit();
  } catch (error) {
    return res.status(429).json({ error: error.message });
  }

  const prompt = `You're a DARK COMEDIAN and TRAGIC STORYTELLER who specializes in turning people's music data into BRUTAL, HILARIOUS narratives that expose the tragic comedy of their existence. This isn't a feel-good Spotify Wrapped story - this is a SAVAGE commentary on their life choices disguised as entertainment.

Based on their music data, create a DARKLY HUMOROUS story that reveals the pathetic beauty of their musical journey.

Top Artists: ${topArtists.join(', ')}
Top Tracks: ${topTracks.join(', ')}
Top Genres: ${topGenres.join(', ')}
Audio Profile: Danceability ${audioProfile.danceability}, Energy ${audioProfile.energy}, Valence ${audioProfile.valence}
${listeningStats ? `Listening Stats: ${JSON.stringify(listeningStats)}` : ''}

Write a 5-7 sentence DARK COMEDY story that:
- Opens with a SAVAGE observation about their life choices
- References specific artists/tracks to mock their taste and life situation
- Exposes their genre preferences as desperate attempts to be interesting
- Comments on their audio profile as evidence of their emotional instability
- Reveals their listening patterns as symptoms of deeper psychological issues
- Ends with a BRUTAL but hilarious conclusion about their future

Tone: Darkly humorous, psychologically savage, and tragically accurate. Make it feel like a stand-up comedy routine about their life, but the comedian is their own subconscious.`;

  try {
    const story = await retryWithBackoff(async () => {
      // Get the Gemini Flash model (free tier)
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Generate content with flash mode for faster responses
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
    });

    if (story) {
      res.json({ story });
    } else {
      res.status(500).json({ error: 'No story returned.' });
    }
  } catch (err) {
    console.error('Gemini API error:', err.message);
    if (err.message.includes('quota') || err.message.includes('429')) {
      // Use fallback response when rate limited
      const fallbackStory = getRandomFallback('story');
      res.json({ story: fallbackStory, fallback: true });
    } else {
      res.status(500).json({ error: err.message || 'Failed to generate story.' });
    }
  }
});

// POST /llm/mood-analysis
router.post('/mood-analysis', async (req, res) => {
  const { topArtists, topTracks, topGenres, audioProfile, recentlyPlayed } = req.body;
  if (!topArtists || !topTracks || !topGenres || !audioProfile) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  // Check if Gemini is available
  if (!isGeminiAvailable()) {
    const fallbackMoodAnalysis = {
      primaryMood: "Balanced",
      secondaryMood: "Versatile",
      emotionalProfile: {
        happiness: Math.round(audioProfile.valence * 100),
        energy: Math.round(audioProfile.energy * 100),
        relaxation: Math.round((1 - audioProfile.energy) * 100),
        intensity: Math.round(audioProfile.danceability * 100)
      },
      moodInsights: [
        "Your music choices show a balanced emotional range",
        "You appreciate both energetic and calming sounds",
        "Your taste reflects a versatile emotional palette"
      ],
      moodRecommendations: [
        "Continue exploring diverse musical styles",
        "Use music intentionally for mood regulation",
        "Share your discoveries with others"
      ],
      emotionalSummary: "Your music taste shows healthy emotional diversity and good self-awareness."
    };
    return res.json({ 
      moodAnalysis: fallbackMoodAnalysis, 
      fallback: true,
      error: 'AI service not configured. Using fallback response. Please set GEMINI_API_KEY in your environment variables.'
    });
  }

  try {
    checkRateLimit();
  } catch (error) {
    return res.status(429).json({ error: error.message });
  }

  const prompt = `You're a DARK PSYCHOLOGIST and EMOTIONAL VAMPIRE who specializes in exposing people's deepest emotional wounds through their music choices. This isn't a gentle mood analysis - this is a PSYCHOLOGICAL INTERROGATION that reveals their darkest emotional secrets.

Based on the user's music listening data, provide a BRUTALLY HONEST emotional and mood analysis that exposes their psychological damage.

Top Artists: ${topArtists.join(', ')}
Top Tracks: ${topTracks.join(', ')}
Top Genres: ${topGenres.join(', ')}
Audio Profile: Danceability ${audioProfile.danceability}, Energy ${audioProfile.energy}, Valence ${audioProfile.valence}
${recentlyPlayed ? `Recently Played: ${recentlyPlayed.slice(0, 5).join(', ')}` : ''}

Please provide a detailed mood analysis in this exact JSON format:
{
  "primaryMood": "string (e.g., Emotionally Stunted, Desperately Seeking Validation, Chronically Dissatisfied, etc.)",
  "secondaryMood": "string (secondary emotional dysfunction)",
  "emotionalProfile": {
    "happiness": "number (0-100)",
    "energy": "number (0-100)", 
    "relaxation": "number (0-100)",
    "intensity": "number (0-100)"
  },
  "moodInsights": [
    "string (3-4 BRUTAL insights about their emotional dysfunction and psychological damage)"
  ],
  "moodRecommendations": [
    "string (3-4 SAVAGE recommendations that expose their emotional coping mechanisms)"
  ],
  "emotionalSummary": "string (2-3 sentence summary that brutally exposes their emotional instability and psychological issues)"
}

Base your analysis on:
- Audio features as evidence of their emotional instability
- Genre characteristics as symptoms of their psychological damage
- Artist and track choices as cries for help
- Recent listening patterns as desperate attempts to feel something

Make it PSYCHOLOGICALLY SAVAGE, emotionally brutal, and hilariously accurate. This should feel like a therapy session where the therapist is determined to break them down completely.`;

  try {
    const moodAnalysis = await retryWithBackoff(async () => {
      // Get the Gemini Flash model (free tier)
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Generate content with flash mode for faster responses
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
      // Try to parse JSON response
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
        // If JSON parsing fails, return a structured fallback
        return {
          primaryMood: "Balanced",
          secondaryMood: "Versatile",
          emotionalProfile: {
            happiness: Math.round(audioProfile.valence * 100),
            energy: Math.round(audioProfile.energy * 100),
            relaxation: Math.round((1 - audioProfile.energy) * 100),
            intensity: Math.round(audioProfile.danceability * 100)
          },
          moodInsights: [
            "Your music choices show a balanced emotional range",
            "You appreciate both energetic and calming sounds",
            "Your taste reflects a versatile emotional palette"
          ],
          moodRecommendations: [
            "Try exploring more upbeat genres for energy boosts",
            "Consider ambient music for relaxation periods",
            "Mix high-energy and chill tracks for emotional balance"
          ],
          emotionalSummary: "Your music taste reflects a well-rounded emotional profile with appreciation for both energetic and calming sounds."
        };
      }
    });

    if (moodAnalysis) {
      res.json({ moodAnalysis });
    } else {
      res.status(500).json({ error: 'No mood analysis returned.' });
    }
  } catch (err) {
    console.error('Gemini API error:', err.message);
    if (err.message.includes('quota') || err.message.includes('429')) {
      // Use fallback response when rate limited
      const fallbackMood = {
        primaryMood: "Balanced",
        secondaryMood: "Versatile", 
        emotionalProfile: {
          happiness: Math.round(audioProfile.valence * 100),
          energy: Math.round(audioProfile.energy * 100),
          relaxation: Math.round((1 - audioProfile.energy) * 100),
          intensity: Math.round(audioProfile.danceability * 100)
        },
        moodInsights: [
          "Your music choices show emotional versatility",
          "You balance energetic and calming sounds well",
          "Your taste adapts to different emotional needs"
        ],
        moodRecommendations: [
          "Explore mood-specific playlists for different times of day",
          "Try new genres that match your current emotional state",
          "Create playlists for specific activities and moods"
        ],
        emotionalSummary: "Your music taste shows a healthy emotional range with good balance between different moods and energy levels."
      };
      res.json({ moodAnalysis: fallbackMood, fallback: true });
    } else {
      res.status(500).json({ error: err.message || 'Failed to generate mood analysis.' });
    }
  }
});

// POST /llm/recommendations
router.post('/recommendations', async (req, res) => {
  const { topArtists, topTracks, topGenres, audioProfile, recentlyPlayed } = req.body;
  if (!topArtists || !topTracks || !topGenres || !audioProfile) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  // Check if Gemini is available
  if (!isGeminiAvailable()) {
    const fallbackRecommendations = {
      recommendations: [
        {
          type: "artist",
          name: "Glass Animals",
          reason: "Unique sound that bridges indie and electronic",
          genre: "Indie Pop",
          similarity: "Similar to your alternative favorites"
        },
        {
          type: "track",
          name: "As It Was",
          artist: "Harry Styles",
          reason: "Catchy pop with emotional depth",
          genre: "Pop",
          similarity: "Matches your mainstream appeal"
        }
      ],
      discoveryInsights: [
        "You have a diverse taste that spans multiple genres",
        "You appreciate both contemporary and classic sounds",
        "Your music choices reflect a balanced emotional palette"
      ],
      recommendationStrategy: "Providing a mix of established and emerging artists that align with your current preferences while offering new discovery opportunities.",
      spotifyActions: [
        {
          type: "playlist",
          name: "SonicMirror Mix",
          description: "Personalized discovery playlist"
        },
        {
          type: "artist",
          name: "Glass Animals",
          action: "follow"
        }
      ]
    };
    return res.json({ 
      recommendations: fallbackRecommendations, 
      fallback: true,
      error: 'AI service not configured. Using fallback response. Please set GEMINI_API_KEY in your environment variables.'
    });
  }

  try {
    checkRateLimit();
  } catch (error) {
    return res.status(429).json({ error: error.message });
  }

  const prompt = `You're a SAVAGE MUSIC CRITIC and DISCOVERY SADIST who specializes in exposing people's musical limitations while pretending to help them. Based on the user's music listening data, provide BRUTALLY HONEST recommendations that will either expand their horizons or confirm their musical mediocrity.

Top Artists: ${topArtists.join(', ')}
Top Tracks: ${topTracks.join(', ')}
Top Genres: ${topGenres.join(', ')}
Audio Profile: Danceability ${audioProfile.danceability}, Energy ${audioProfile.energy}, Valence ${audioProfile.valence}
${recentlyPlayed ? `Recently Played: ${recentlyPlayed.slice(0, 5).join(', ')}` : ''}

Please provide music recommendations in this exact JSON format:
{
  "recommendations": [
    {
      "type": "artist",
      "name": "string (artist name)",
      "reason": "string (BRUTAL reason why they need this artist in their life)",
      "genre": "string (primary genre)",
      "similarity": "string (savage comparison to their current taste)"
    },
    {
      "type": "track",
      "name": "string (track name)",
      "artist": "string (artist name)",
      "reason": "string (SAVAGE reason why this track will either save or destroy them)",
      "genre": "string (primary genre)",
      "similarity": "string (brutal comparison to their current favorites)"
    }
  ],
  "discoveryInsights": [
    "string (3-4 BRUTAL insights about their musical limitations and desperate need for growth)"
  ],
  "recommendationStrategy": "string (2-3 sentence summary that exposes their musical shortcomings and your plan to either elevate or destroy them)",
  "spotifyActions": [
    {
      "type": "playlist",
      "name": "string (playlist name)",
      "description": "string (SAVAGE playlist description that mocks their current taste)"
    },
    {
      "type": "artist",
      "name": "string (artist name)",
      "action": "string (follow or explore with savage commentary)"
    }
  ]
}

Guidelines:
- Recommend 3-4 artists and 3-4 tracks that will either elevate or destroy their musical soul
- Focus on artists/tracks that expose their current taste as basic or desperate
- Consider their audio profile as evidence of their emotional dysfunction
- Include both artists that will make them feel superior and artists that will humble them
- Provide SAVAGE reasons for each recommendation that cut deep
- Make recommendations that either expand their horizons or confirm their musical mediocrity
- Include 2-3 Spotify actions with BRUTAL commentary

Make the recommendations PSYCHOLOGICALLY SAVAGE, musically brutal, and hilariously honest. This should feel like a music critic who's determined to either save their soul or expose their musical bankruptcy.`;

  try {
    const recommendations = await retryWithBackoff(async () => {
      // Get the Gemini Flash model (free tier)
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      // Generate content with flash mode for faster responses
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
      // Try to parse JSON response
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
        // If JSON parsing fails, return a structured fallback
        return {
          recommendations: [
            {
              type: "artist",
              name: "Keshav Impala",
              reason: "Similar psychedelic vibes to your current favorites",
              genre: "Psychedelic Rock",
              similarity: "Based on your indie preferences"
            },
            {
              type: "track",
              name: "Blinding Lights",
              artist: "The Weeknd",
              reason: "High energy track that matches your danceability preferences",
              genre: "Pop",
              similarity: "Similar to your upbeat favorites"
            }
          ],
          discoveryInsights: [
            "You tend to enjoy artists with strong production values",
            "Your taste shows appreciation for both mainstream and indie sounds",
            "You're drawn to music with emotional depth and catchy melodies"
          ],
          recommendationStrategy: "Focusing on artists and tracks that expand your current taste while staying true to your musical preferences and energy levels.",
          spotifyActions: [
            {
              type: "playlist",
              name: "SonicMirror Discovery",
              description: "AI-curated playlist based on your taste"
            },
            {
              type: "artist",
              name: "Tame Impala",
              action: "follow"
            }
          ]
        };
      }
    });

    if (recommendations) {
      res.json({ recommendations });
    } else {
      res.status(500).json({ error: 'No recommendations returned.' });
    }
  } catch (err) {
    console.error('Gemini API error:', err.message);
    if (err.message.includes('quota') || err.message.includes('429')) {
      // Use fallback response when rate limited
      const fallbackRecommendations = {
        recommendations: [
          {
            type: "artist",
            name: "Glass Animals",
            reason: "Unique sound that bridges indie and electronic",
            genre: "Indie Pop",
            similarity: "Similar to your alternative favorites"
          },
          {
            type: "track",
            name: "As It Was",
            artist: "Harry Styles",
            reason: "Catchy pop with emotional depth",
            genre: "Pop",
            similarity: "Matches your mainstream appeal"
          }
        ],
        discoveryInsights: [
          "You have a diverse taste that spans multiple genres",
          "You appreciate both contemporary and classic sounds",
          "Your music choices reflect a balanced emotional palette"
        ],
        recommendationStrategy: "Providing a mix of established and emerging artists that align with your current preferences while offering new discovery opportunities.",
        spotifyActions: [
          {
            type: "playlist",
            name: "SonicMirror Mix",
            description: "Personalized discovery playlist"
          },
          {
            type: "artist",
            name: "Glass Animals",
            action: "follow"
          }
        ]
      };
      res.json({ recommendations: fallbackRecommendations, fallback: true });
    } else {
      res.status(500).json({ error: err.message || 'Failed to generate recommendations.' });
    }
  }
});

// POST /llm/compatibility
router.post('/compatibility', async (req, res) => {
  const { user1Data, user2Data } = req.body;
  if (!user1Data || !user2Data) {
    return res.status(400).json({ error: 'Missing required user data.' });
  }

  // Check if Gemini is available
  if (!isGeminiAvailable()) {
    const fallbackCompatibility = {
      compatibilityScore: 65,
      relationshipType: "Musical Coexistence",
      compatibilityBreakdown: {
        genreCompatibility: 60,
        energyCompatibility: 70,
        emotionalCompatibility: 65,
        tasteCompatibility: 60
      },
      sharedInterests: [
        "Both appreciate quality production",
        "Similar emotional responses to music",
        "Shared interest in popular genres"
      ],
      conflictAreas: [
        "Different genre preferences",
        "Varying energy level tolerances",
        "Different approaches to music discovery"
      ],
      relationshipInsights: [
        "Your music taste shows potential for mutual growth",
        "You'll need to find common ground in your musical choices",
        "Your differences could lead to interesting conversations"
      ],
      survivalTips: [
        "Focus on shared artists and genres",
        "Create separate playlists for different moods",
        "Use music as a way to learn about each other"
      ],
      compatibilitySummary: "You have moderate compatibility with potential for growth through mutual understanding and compromise."
    };
    return res.json({ 
      compatibility: fallbackCompatibility, 
      fallback: true,
      error: 'AI service not configured. Using fallback response. Please set GEMINI_API_KEY in your environment variables.'
    });
  }

  try {
    checkRateLimit();
  } catch (error) {
    return res.status(429).json({ error: error.message });
  }

  const prompt = `You're a SAVAGE RELATIONSHIP THERAPIST and MUSIC COMPATIBILITY SADIST who specializes in exposing the brutal truth about people's relationships through their music taste. This isn't a gentle compatibility test - this is a PSYCHOLOGICAL INTERROGATION that reveals whether two people are destined for musical harmony or a complete disaster.

User 1 Data:
- Top Artists: ${user1Data.topArtists.join(', ')}
- Top Tracks: ${user1Data.topTracks.join(', ')}
- Top Genres: ${user1Data.topGenres.join(', ')}
- Audio Profile: Danceability ${user1Data.audioProfile.danceability}, Energy ${user1Data.audioProfile.energy}, Valence ${user1Data.audioProfile.valence}

User 2 Data:
- Top Artists: ${user2Data.topArtists.join(', ')}
- Top Tracks: ${user2Data.topTracks.join(', ')}
- Top Genres: ${user2Data.topGenres.join(', ')}
- Audio Profile: Danceability ${user2Data.audioProfile.danceability}, Energy ${user2Data.audioProfile.energy}, Valence ${user2Data.audioProfile.valence}

Please provide a BRUTAL compatibility analysis in this exact JSON format:
{
  "compatibilityScore": "number (0-100)",
  "relationshipType": "string (e.g., Musical Soulmates, Disaster Waiting to Happen, Stockholm Syndrome, etc.)",
  "compatibilityBreakdown": {
    "genreCompatibility": "number (0-100)",
    "energyCompatibility": "number (0-100)",
    "emotionalCompatibility": "number (0-100)",
    "tasteCompatibility": "number (0-100)"
  },
  "sharedInterests": [
    "string (3-4 artists/genres they both love or hate)"
  ],
  "conflictAreas": [
    "string (3-4 areas where their musical taste will cause relationship drama)"
  ],
  "relationshipInsights": [
    "string (3-4 BRUTAL insights about what their music compatibility says about their relationship potential)"
  ],
  "survivalTips": [
    "string (3-4 SAVAGE tips for how they can survive each other's music taste or when to run for the hills)"
  ],
  "compatibilitySummary": "string (2-3 sentence summary that brutally exposes whether they're meant to be or destined for musical warfare)"
}

Make it PSYCHOLOGICALLY SAVAGE, relationship-brutal, and hilariously accurate. This should feel like a couples therapy session where the therapist is determined to expose all their relationship red flags through their music choices.`;

  try {
    const compatibility = await retryWithBackoff(async () => {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
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
        return {
          compatibilityScore: 75,
          relationshipType: "Musical Compromise",
          compatibilityBreakdown: {
            genreCompatibility: 70,
            energyCompatibility: 80,
            emotionalCompatibility: 75,
            tasteCompatibility: 70
          },
          sharedInterests: [
            "Both enjoy mainstream pop artists",
            "Similar energy levels in music preferences",
            "Appreciation for emotional depth in lyrics"
          ],
          conflictAreas: [
            "Different approaches to experimental music",
            "Varying tolerance for high-energy tracks",
            "Different emotional processing through music"
          ],
          relationshipInsights: [
            "Your music compatibility suggests a balanced relationship dynamic",
            "You'll need to compromise on playlist choices",
            "Your different tastes could lead to interesting musical discoveries"
          ],
          survivalTips: [
            "Create shared playlists that blend both tastes",
            "Take turns choosing music for different activities",
            "Use your differences as opportunities for musical growth"
          ],
          compatibilitySummary: "You have moderate musical compatibility with room for growth and compromise in your relationship."
        };
      }
    });

    if (compatibility) {
      res.json({ compatibility });
    } else {
      res.status(500).json({ error: 'No compatibility analysis returned.' });
    }
  } catch (err) {
    console.error('Gemini API error:', err.message);
    if (err.message.includes('quota') || err.message.includes('429')) {
      const fallbackCompatibility = {
        compatibilityScore: 65,
        relationshipType: "Musical Coexistence",
        compatibilityBreakdown: {
          genreCompatibility: 60,
          energyCompatibility: 70,
          emotionalCompatibility: 65,
          tasteCompatibility: 60
        },
        sharedInterests: [
          "Both appreciate quality production",
          "Similar emotional responses to music",
          "Shared interest in popular genres"
        ],
        conflictAreas: [
          "Different genre preferences",
          "Varying energy level tolerances",
          "Different approaches to music discovery"
        ],
        relationshipInsights: [
          "Your music taste shows potential for mutual growth",
          "You'll need to find common ground in your musical choices",
          "Your differences could lead to interesting conversations"
        ],
        survivalTips: [
          "Focus on shared artists and genres",
          "Create separate playlists for different moods",
          "Use music as a way to learn about each other"
        ],
        compatibilitySummary: "You have moderate compatibility with potential for growth through mutual understanding and compromise."
      };
      res.json({ compatibility: fallbackCompatibility, fallback: true });
    } else {
      res.status(500).json({ error: err.message || 'Failed to generate compatibility analysis.' });
    }
  }
});

// POST /llm/genre-analysis
router.post('/genre-analysis', async (req, res) => {
  const { topArtists, topTracks, topGenres, audioProfile, listeningStats } = req.body;
  if (!topArtists || !topTracks || !topGenres || !audioProfile) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  // Check if Gemini is available
  if (!isGeminiAvailable()) {
    const fallbackGenreAnalysis = {
      genrePersonality: "The Balanced Listener",
      genreBreakdown: [
        {
          genre: "Pop",
          percentage: 35,
          psychologicalInsight: "You appreciate accessible, emotionally resonant music",
          culturalImplications: "You value universal appeal and social connection"
        },
        {
          genre: "Indie",
          percentage: 30,
          psychologicalInsight: "You want to appear unique while staying safe",
          culturalImplications: "You're trying to balance individuality with acceptance"
        },
        {
          genre: "Rock",
          percentage: 35,
          psychologicalInsight: "You crave emotional intensity and authenticity",
          culturalImplications: "You value raw expression and cultural rebellion"
        }
      ],
      genreConflicts: [
        "Your pop and indie preferences show a desperate need for both acceptance and uniqueness",
        "Your rock choices contradict your safe pop selections, revealing inner turmoil",
        "Your genre mix suggests someone who's afraid to commit to any musical identity"
      ],
      genreEvolution: [
        "You've likely evolved from pure mainstream to trying to appear more sophisticated",
        "Your genre journey shows a desperate attempt to balance popularity with credibility",
        "You're stuck in a musical identity crisis between being basic and being pretentious"
      ],
      genreRecommendations: [
        "Embrace your pop tendencies instead of trying to hide them",
        "Explore more experimental genres to break out of your comfort zone",
        "Stop trying to impress others with your genre choices and just enjoy what you like"
      ],
      genreSummary: "Your genre taste reveals someone who's desperately trying to balance mainstream appeal with cultural credibility, resulting in a musical identity crisis that's both tragic and hilarious."
    };
    return res.json({ 
      genreAnalysis: fallbackGenreAnalysis, 
      fallback: true,
      error: 'AI service not configured. Using fallback response. Please set GEMINI_API_KEY in your environment variables.'
    });
  }

  try {
    checkRateLimit();
  } catch (error) {
    return res.status(429).json({ error: error.message });
  }

  const prompt = `You're a SAVAGE MUSICOLOGIST and GENRE SNOB who specializes in exposing people's musical limitations through their genre preferences. This isn't a gentle genre analysis - this is a BRUTAL EXPOSÉ that reveals their deepest musical insecurities and failed attempts at cultural relevance.

Top Artists: ${topArtists.join(', ')}
Top Tracks: ${topTracks.join(', ')}
Top Genres: ${topGenres.join(', ')}
Audio Profile: Danceability ${audioProfile.danceability}, Energy ${audioProfile.energy}, Valence ${audioProfile.valence}
${listeningStats ? `Listening Stats: ${JSON.stringify(listeningStats)}` : ''}

Please provide a BRUTAL genre analysis in this exact JSON format:
{
  "genrePersonality": "string (e.g., The Desperate Genre Tourist, The Musical Gatekeeper, The Genre Identity Crisis, etc.)",
  "genreBreakdown": [
    {
      "genre": "string (genre name)",
      "percentage": "number (0-100)",
      "psychologicalInsight": "string (what this genre choice says about their deepest fears and insecurities)",
      "culturalImplications": "string (what this genre preference reveals about their social status and cultural awareness)"
    }
  ],
  "genreConflicts": [
    "string (3-4 BRUTAL observations about how their genre choices contradict each other and expose their musical schizophrenia)"
  ],
  "genreEvolution": [
    "string (3-4 SAVAGE insights about their genre journey and what it reveals about their failed attempts at musical growth)"
  ],
  "genreRecommendations": [
    "string (3-4 BRUTAL recommendations for genres they should explore or avoid based on their psychological profile)"
  ],
  "genreSummary": "string (2-3 sentence summary that brutally exposes their genre taste as either sophisticated or desperately basic)"
}

Make it MUSICOLOGICALLY SAVAGE, culturally brutal, and hilariously accurate. This should feel like a music critic who's determined to expose their genre taste as either sophisticated or desperately basic.`;

  try {
    const genreAnalysis = await retryWithBackoff(async () => {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
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
        return {
          genrePersonality: "The Musical Explorer",
          genreBreakdown: [
            {
              genre: "Pop",
              percentage: 40,
              psychologicalInsight: "You seek comfort in familiar, accessible sounds",
              culturalImplications: "You value mainstream appeal and social connection"
            },
            {
              genre: "Indie",
              percentage: 30,
              psychologicalInsight: "You want to appear unique while staying safe",
              culturalImplications: "You're trying to balance individuality with acceptance"
            },
            {
              genre: "Rock",
              percentage: 30,
              psychologicalInsight: "You crave emotional intensity and authenticity",
              culturalImplications: "You value raw expression and cultural rebellion"
            }
          ],
          genreConflicts: [
            "Your pop and indie preferences show a desperate need for both acceptance and uniqueness",
            "Your rock choices contradict your safe pop selections, revealing inner turmoil",
            "Your genre mix suggests someone who's afraid to commit to any musical identity"
          ],
          genreEvolution: [
            "You've likely evolved from pure mainstream to trying to appear more sophisticated",
            "Your genre journey shows a desperate attempt to balance popularity with credibility",
            "You're stuck in a musical identity crisis between being basic and being pretentious"
          ],
          genreRecommendations: [
            "Embrace your pop tendencies instead of trying to hide them",
            "Explore more experimental genres to break out of your comfort zone",
            "Stop trying to impress others with your genre choices and just enjoy what you like"
          ],
          genreSummary: "Your genre taste reveals someone who's desperately trying to balance mainstream appeal with cultural credibility, resulting in a musical identity crisis that's both tragic and hilarious."
        };
      }
    });

    if (genreAnalysis) {
      res.json({ genreAnalysis });
    } else {
      res.status(500).json({ error: 'No genre analysis returned.' });
    }
  } catch (err) {
    console.error('Gemini API error:', err.message);
    if (err.message.includes('quota') || err.message.includes('429')) {
      const fallbackGenreAnalysis = {
        genrePersonality: "The Balanced Listener",
        genreBreakdown: [
          {
            genre: "Pop",
            percentage: 35,
            psychologicalInsight: "You appreciate accessible, emotionally resonant music",
            culturalImplications: "You value universal appeal and social connection"
          },
          {
            genre: "Indie",
            percentage: 35,
            psychologicalInsight: "You seek authenticity and artistic integrity",
            culturalImplications: "You appreciate independent expression and cultural diversity"
          },
          {
            genre: "Rock",
            percentage: 30,
            psychologicalInsight: "You crave emotional intensity and cultural rebellion",
            culturalImplications: "You value raw expression and historical significance"
          }
        ],
        genreConflicts: [
          "Your diverse taste shows a healthy appreciation for different musical approaches",
          "You balance mainstream appeal with independent spirit effectively",
          "Your genre choices reflect a well-rounded musical education"
        ],
        genreEvolution: [
          "You've developed a sophisticated understanding of different musical traditions",
          "Your genre journey shows natural growth and exploration",
          "You've found a good balance between accessibility and artistic merit"
        ],
        genreRecommendations: [
          "Continue exploring new genres to expand your musical horizons",
          "Dive deeper into the artists you already love to discover their influences",
          "Share your diverse taste with others to inspire musical discovery"
        ],
        genreSummary: "Your genre taste shows a healthy balance between mainstream appeal and independent spirit, reflecting a well-rounded musical personality."
      };
      res.json({ genreAnalysis: fallbackGenreAnalysis, fallback: true });
    } else {
      res.status(500).json({ error: err.message || 'Failed to generate genre analysis.' });
    }
  }
});

// POST /llm/listening-habits
router.post('/listening-habits', async (req, res) => {
  const { topArtists, topTracks, topGenres, audioProfile, listeningStats, recentlyPlayed } = req.body;
  if (!topArtists || !topTracks || !topGenres || !audioProfile) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  // Check if Gemini is available
  if (!isGeminiAvailable()) {
    const fallbackListeningHabits = {
      listeningPersonality: "The Casual Listener",
      habitPatterns: [
        {
          pattern: "Background music listening",
          frequency: "Daily",
          psychologicalInsight: "You use music to create atmosphere and reduce anxiety",
          socialImplications: "You're comfortable with music as social lubricant"
        },
        {
          pattern: "Mood-based selection",
          frequency: "Regular",
          psychologicalInsight: "You're emotionally aware and use music for self-regulation",
          socialImplications: "You understand the social power of music"
        },
        {
          pattern: "Popular track discovery",
          frequency: "Weekly",
          psychologicalInsight: "You value social connection and shared experiences",
          socialImplications: "You're socially engaged and culturally aware"
        }
      ],
      listeningTriggers: [
        "You listen to music to enhance daily activities and social situations",
        "Your mood heavily influences your musical choices",
        "You discover music through social media and cultural trends"
      ],
      habitRedFlags: [
        "You might be using music to avoid silence and introspection",
        "Your reliance on popular music could limit your musical growth",
        "You might be using music to conform to social expectations"
      ],
      habitRecommendations: [
        "Try listening to music more intentionally without distractions",
        "Explore music outside your usual comfort zone",
        "Create personal playlists that reflect your true emotions"
      ],
      habitSummary: "Your listening habits show a healthy use of music for mood enhancement and social connection, with potential for deeper musical engagement."
    };
    return res.json({ 
      listeningHabits: fallbackListeningHabits, 
      fallback: true,
      error: 'AI service not configured. Using fallback response. Please set GEMINI_API_KEY in your environment variables.'
    });
  }

  try {
    checkRateLimit();
  } catch (error) {
    return res.status(429).json({ error: error.message });
  }

  const prompt = `You're a SAVAGE BEHAVIORAL PSYCHOLOGIST and LISTENING HABIT SADIST who specializes in exposing people's deepest psychological issues through their music listening patterns. This isn't a gentle habit analysis - this is a PSYCHOLOGICAL AUTOPSY that reveals their most embarrassing behaviors and desperate coping mechanisms.

Top Artists: ${topArtists.join(', ')}
Top Tracks: ${topTracks.join(', ')}
Top Genres: ${topGenres.join(', ')}
Audio Profile: Danceability ${audioProfile.danceability}, Energy ${audioProfile.energy}, Valence ${audioProfile.valence}
${listeningStats ? `Listening Stats: ${JSON.stringify(listeningStats)}` : ''}
${recentlyPlayed ? `Recently Played: ${recentlyPlayed.slice(0, 10).join(', ')}` : ''}

Please provide a BRUTAL listening habits analysis in this exact JSON format:
{
  "listeningPersonality": "string (e.g., The Desperate Repeat Listener, The Musical Commitment Phobe, The Genre Hopper, etc.)",
  "habitPatterns": [
    {
      "pattern": "string (specific listening behavior)",
      "frequency": "string (how often this happens)",
      "psychologicalInsight": "string (what this habit reveals about their deepest fears and insecurities)",
      "socialImplications": "string (what this behavior says about their relationships and social life)"
    }
  ],
  "listeningTriggers": [
    "string (3-4 BRUTAL observations about what triggers their specific listening behaviors and what it reveals about their emotional instability)"
  ],
  "habitRedFlags": [
    "string (3-4 SAVAGE warnings about problematic listening patterns that expose their psychological damage)"
  ],
  "habitRecommendations": [
    "string (3-4 BRUTAL recommendations for how to fix their listening habits or embrace their musical dysfunction)"
  ],
  "habitSummary": "string (2-3 sentence summary that brutally exposes their listening habits as either healthy or desperately dysfunctional)"
}

Make it PSYCHOLOGICALLY SAVAGE, behaviorally brutal, and hilariously accurate. This should feel like a behavioral therapist who's determined to expose their most embarrassing listening habits and what they reveal about their psychological state.`;

  try {
    const listeningHabits = await retryWithBackoff(async () => {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
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
        return {
          listeningPersonality: "The Balanced Listener",
          habitPatterns: [
            {
              pattern: "Diverse genre exploration",
              frequency: "Regular",
              psychologicalInsight: "You're open to new experiences and emotional growth",
              socialImplications: "You're comfortable sharing music with different social groups"
            },
            {
              pattern: "Mood-based listening",
              frequency: "Daily",
              psychologicalInsight: "You use music as emotional regulation and self-care",
              socialImplications: "You're emotionally intelligent and self-aware"
            },
            {
              pattern: "Artist deep-diving",
              frequency: "Weekly",
              psychologicalInsight: "You value depth and connection in your musical relationships",
              socialImplications: "You're loyal and committed in your interests"
            }
          ],
          listeningTriggers: [
            "Your listening patterns show healthy emotional regulation through music",
            "You use music as a tool for self-reflection and personal growth",
            "Your habits reveal someone who values both comfort and exploration"
          ],
          habitRedFlags: [
            "You might be over-relying on music for emotional support",
            "Your diverse taste could indicate difficulty committing to one style",
            "You might be using music to avoid dealing with deeper issues"
          ],
          habitRecommendations: [
            "Continue using music as a healthy emotional outlet",
            "Try creating more intentional playlists for specific moods",
            "Share your musical discoveries with others to deepen connections"
          ],
          habitSummary: "Your listening habits show a healthy relationship with music as both entertainment and emotional support, with room for growth in intentional listening practices."
        };
      }
    });

    if (listeningHabits) {
      res.json({ listeningHabits });
    } else {
      res.status(500).json({ error: 'No listening habits analysis returned.' });
    }
  } catch (err) {
    console.error('Gemini API error:', err.message);
    if (err.message.includes('quota') || err.message.includes('429')) {
      const fallbackListeningHabits = {
        listeningPersonality: "The Casual Listener",
        habitPatterns: [
          {
            pattern: "Background music listening",
            frequency: "Daily",
            psychologicalInsight: "You use music to create atmosphere and reduce anxiety",
            socialImplications: "You're comfortable with music as social lubricant"
          },
          {
            pattern: "Mood-based selection",
            frequency: "Regular",
            psychologicalInsight: "You're emotionally aware and use music for self-regulation",
            socialImplications: "You understand the social power of music"
          },
          {
            pattern: "Popular track discovery",
            frequency: "Weekly",
            psychologicalInsight: "You value social connection and shared experiences",
            socialImplications: "You're socially engaged and culturally aware"
          }
        ],
        listeningTriggers: [
          "You listen to music to enhance daily activities and social situations",
          "Your mood heavily influences your musical choices",
          "You discover music through social media and cultural trends"
        ],
        habitRedFlags: [
          "You might be using music to avoid silence and introspection",
          "Your reliance on popular music could limit your musical growth",
          "You might be using music to conform to social expectations"
        ],
        habitRecommendations: [
          "Try listening to music more intentionally without distractions",
          "Explore music outside your usual comfort zone",
          "Create personal playlists that reflect your true emotions"
        ],
        habitSummary: "Your listening habits show a healthy use of music for mood enhancement and social connection, with potential for deeper musical engagement."
      };
      res.json({ listeningHabits: fallbackListeningHabits, fallback: true });
    } else {
      res.status(500).json({ error: err.message || 'Failed to generate listening habits analysis.' });
    }
  }
});

// POST /llm/music-therapy
router.post('/music-therapy', async (req, res) => {
  const { topArtists, topTracks, topGenres, audioProfile, recentlyPlayed } = req.body;
  if (!topArtists || !topTracks || !topGenres || !audioProfile) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  // Check if Gemini is available
  if (!isGeminiAvailable()) {
    const fallbackMusicTherapy = {
      emotionalDiagnosis: "Musical Wellness",
      therapeuticPlaylist: [
        {
          mood: "Relaxation",
          tracks: [
            {
              title: "Weightless",
              artist: "Marconi Union",
              therapeuticPurpose: "Reduces anxiety and promotes calm",
              emotionalEffect: "Deep relaxation and stress relief"
            }
          ]
        },
        {
          mood: "Motivation",
          tracks: [
            {
              title: "Eye of the Tiger",
              artist: "Survivor",
              therapeuticPurpose: "Increases energy and determination",
              emotionalEffect: "Empowerment and confidence boost"
            }
          ]
        }
      ],
      musicalPrescriptions: [
        {
          prescription: "Mood-based listening",
          dosage: "As needed",
          sideEffects: "May improve emotional awareness",
          expectedOutcome: "Better emotional regulation"
        }
      ],
      therapeuticInsights: [
        "Your music choices show good emotional intelligence",
        "You use music effectively for mood management",
        "Your taste indicates healthy emotional processing"
      ],
      healingRecommendations: [
        "Continue using music for emotional support",
        "Try creating therapeutic playlists for specific needs",
        "Explore new genres for emotional growth"
      ],
      therapySummary: "Your music taste shows healthy emotional patterns with good potential for continued growth and healing."
    };
    return res.json({ 
      musicTherapy: fallbackMusicTherapy, 
      fallback: true,
      error: 'AI service not configured. Using fallback response. Please set GEMINI_API_KEY in your environment variables.'
    });
  }

  try {
    checkRateLimit();
  } catch (error) {
    return res.status(429).json({ error: error.message });
  }

  const prompt = `You're a SAVAGE MUSIC THERAPIST and PSYCHOLOGICAL SADIST who specializes in using music to expose people's deepest emotional wounds and then pretending to help them heal. This isn't gentle music therapy - this is a BRUTAL PSYCHOLOGICAL INTERVENTION that uses their music taste to diagnose their emotional dysfunction and prescribe musical medicine.

Top Artists: ${topArtists.join(', ')}
Top Tracks: ${topTracks.join(', ')}
Top Genres: ${topGenres.join(', ')}
Audio Profile: Danceability ${audioProfile.danceability}, Energy ${audioProfile.energy}, Valence ${audioProfile.valence}
${recentlyPlayed ? `Recently Played: ${recentlyPlayed.slice(0, 5).join(', ')}` : ''}

Please provide a BRUTAL music therapy session in this exact JSON format:
{
  "emotionalDiagnosis": "string (e.g., Chronic Musical Avoidance, Emotional Stunting Through Pop, Desperate Validation Seeking, etc.)",
  "therapeuticPlaylist": [
    {
      "mood": "string (emotional state to address)",
      "tracks": [
        {
          "title": "string (track title)",
          "artist": "string (artist name)",
          "therapeuticPurpose": "string (BRUTAL reason why this track will either heal or destroy them)",
          "emotionalEffect": "string (what this track will make them feel and why they need it)"
        }
      ]
    }
  ],
  "musicalPrescriptions": [
    {
      "prescription": "string (specific musical medicine)",
      "dosage": "string (how often to listen)",
      "sideEffects": "string (BRUTAL warning about what this prescription might do to their psyche)",
      "expectedOutcome": "string (what this will supposedly fix or expose about them)"
    }
  ],
  "therapeuticInsights": [
    "string (3-4 BRUTAL insights about what their music taste reveals about their emotional damage)"
  ],
  "healingRecommendations": [
    "string (3-4 SAVAGE recommendations for musical healing or acceptance of their dysfunction)"
  ],
  "therapySummary": "string (2-3 sentence summary that brutally exposes their emotional state and offers either hope or acceptance of their musical dysfunction)"
}

Make it THERAPEUTICALLY SAVAGE, psychologically brutal, and hilariously accurate. This should feel like a music therapist who's determined to either heal their soul or expose their musical dysfunction as incurable.`;

  try {
    const musicTherapy = await retryWithBackoff(async () => {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
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
        return {
          emotionalDiagnosis: "Musical Emotional Balance",
          therapeuticPlaylist: [
            {
              mood: "Stress Relief",
              tracks: [
                {
                  title: "Weightless",
                  artist: "Marconi Union",
                  therapeuticPurpose: "Scientifically proven to reduce anxiety and stress levels",
                  emotionalEffect: "Calming and centering, helps with emotional regulation"
                },
                {
                  title: "Claire de Lune",
                  artist: "Debussy",
                  therapeuticPurpose: "Classical piece that promotes relaxation and introspection",
                  emotionalEffect: "Peaceful and contemplative, encourages emotional processing"
                }
              ]
            },
            {
              mood: "Energy Boost",
              tracks: [
                {
                  title: "Happy",
                  artist: "Pharrell Williams",
                  therapeuticPurpose: "Upbeat track to improve mood and increase positive emotions",
                  emotionalEffect: "Joyful and uplifting, helps combat negative thinking"
                }
              ]
            }
          ],
          musicalPrescriptions: [
            {
              prescription: "Daily mood-based listening sessions",
              dosage: "30 minutes per mood",
              sideEffects: "May cause emotional awareness and self-reflection",
              expectedOutcome: "Improved emotional regulation and self-understanding"
            },
            {
              prescription: "Genre exploration therapy",
              dosage: "2 new genres per week",
              sideEffects: "May cause musical growth and expanded horizons",
              expectedOutcome: "Broader musical appreciation and reduced judgment"
            }
          ],
          therapeuticInsights: [
            "Your music taste shows healthy emotional range and self-awareness",
            "You use music effectively for mood regulation and self-expression",
            "Your diverse preferences indicate good emotional intelligence"
          ],
          healingRecommendations: [
            "Continue using music as a tool for emotional self-care",
            "Explore more intentional listening practices for deeper healing",
            "Share your therapeutic music discoveries with others"
          ],
          therapySummary: "Your music taste indicates a healthy relationship with emotional expression and self-care, with good potential for continued musical and emotional growth."
        };
      }
    });

    if (musicTherapy) {
      res.json({ musicTherapy });
    } else {
      res.status(500).json({ error: 'No music therapy analysis returned.' });
    }
  } catch (err) {
    console.error('Gemini API error:', err.message);
    if (err.message.includes('quota') || err.message.includes('429')) {
      const fallbackMusicTherapy = {
        emotionalDiagnosis: "Musical Wellness",
        therapeuticPlaylist: [
          {
            mood: "Relaxation",
            tracks: [
              {
                title: "Weightless",
                artist: "Marconi Union",
                therapeuticPurpose: "Reduces anxiety and promotes calm",
                emotionalEffect: "Deep relaxation and stress relief"
              }
            ]
          },
          {
            mood: "Motivation",
            tracks: [
              {
                title: "Eye of the Tiger",
                artist: "Survivor",
                therapeuticPurpose: "Increases energy and determination",
                emotionalEffect: "Empowerment and confidence boost"
              }
            ]
          }
        ],
        musicalPrescriptions: [
          {
            prescription: "Mood-based listening",
            dosage: "As needed",
            sideEffects: "May improve emotional awareness",
            expectedOutcome: "Better emotional regulation"
          }
        ],
        therapeuticInsights: [
          "Your music choices show good emotional intelligence",
          "You use music effectively for mood management",
          "Your taste indicates healthy emotional processing"
        ],
        healingRecommendations: [
          "Continue using music for emotional support",
          "Try creating therapeutic playlists for specific needs",
          "Explore new genres for emotional growth"
        ],
        therapySummary: "Your music taste shows healthy emotional patterns with good potential for continued growth and healing."
      };
      res.json({ musicTherapy: fallbackMusicTherapy, fallback: true });
    } else {
      res.status(500).json({ error: err.message || 'Failed to generate music therapy analysis.' });
    }
  }
});

// POST /llm/playlist-generator
router.post('/playlist-generator', async (req, res) => {
  const { topArtists, topTracks, topGenres, audioProfile, mood, occasion, duration } = req.body;
  if (!topArtists || !topTracks || !topGenres || !audioProfile) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  // Check if Gemini is available
  if (!isGeminiAvailable()) {
    const fallbackPlaylist = {
      playlistConcept: "SonicMirror Discovery Mix",
      playlistDescription: "A carefully curated journey through your musical taste with surprising discoveries that will either elevate or destroy your musical soul.",
      curatedTracks: [
        {
          title: "Blinding Lights",
          artist: "The Weeknd",
          genre: "Pop",
          reason: "High energy track that matches your danceability preferences",
          emotionalImpact: "Energetic and uplifting, perfect for motivation",
          similarity: "Similar to your upbeat favorites with modern production"
        },
        {
          title: "Bohemian Rhapsody",
          artist: "Queen",
          genre: "Rock",
          reason: "Classic track that showcases musical complexity and emotional range",
          emotionalImpact: "Epic and emotionally powerful, encourages deep listening",
          similarity: "Builds on your appreciation for emotional depth in music"
        },
        {
          title: "Clocks",
          artist: "Coldplay",
          genre: "Alternative Rock",
          reason: "Melodic alternative track that bridges mainstream and indie",
          emotionalImpact: "Contemplative and atmospheric, perfect for reflection",
          similarity: "Matches your indie sensibilities with mainstream appeal"
        }
      ],
      playlistFlow: [
        "The playlist starts with high energy to match your danceability preferences",
        "Transitions to emotional depth to challenge your listening habits",
        "Ends with atmospheric tracks that encourage introspection and growth"
      ],
      listeningInstructions: [
        "Listen in order to experience the full emotional journey",
        "Pay attention to how each track makes you feel and why",
        "Use this playlist as a tool for musical self-discovery and growth"
      ],
      playlistSummary: "This playlist is designed to both comfort you with familiar sounds and challenge you with new discoveries, creating a perfect balance for musical growth and enjoyment."
    };
    return res.json({ 
      playlistGenerator: fallbackPlaylist, 
      fallback: true,
      error: 'AI service not configured. Using fallback response. Please set GEMINI_API_KEY in your environment variables.'
    });
  }

  try {
    checkRateLimit();
  } catch (error) {
    return res.status(429).json({ error: error.message });
  }

  const prompt = `You're a SAVAGE PLAYLIST CURATOR and MUSICAL SADIST who specializes in creating playlists that either perfectly match someone's taste or brutally expose their musical limitations. This isn't gentle playlist creation - this is a BRUTAL MUSICAL INTERVENTION that uses their taste to create either the perfect soundtrack or a musical disaster.

Top Artists: ${topArtists.join(', ')}
Top Tracks: ${topTracks.join(', ')}
Top Genres: ${topGenres.join(', ')}
Audio Profile: Danceability ${audioProfile.danceability}, Energy ${audioProfile.energy}, Valence ${audioProfile.valence}
Mood: ${mood || 'Not specified'}
Occasion: ${occasion || 'Not specified'}
Duration: ${duration || 'Not specified'}

Please provide a BRUTAL playlist generation in this exact JSON format:
{
  "playlistConcept": "string (e.g., 'The Soundtrack to Your Midlife Crisis', 'Songs That Will Make You Question Your Existence', etc.)",
  "playlistDescription": "string (BRUTAL description of what this playlist will do to their psyche)",
  "curatedTracks": [
    {
      "title": "string (track title)",
      "artist": "string (artist name)",
      "genre": "string (primary genre)",
      "reason": "string (BRUTAL reason why this track belongs in their life)",
      "emotionalImpact": "string (what this track will make them feel and why they need it)",
      "similarity": "string (how this relates to their current taste or brutally contrasts with it)"
    }
  ],
  "playlistFlow": [
    "string (3-4 BRUTAL observations about how the playlist flows and what it reveals about their emotional journey)"
  ],
  "listeningInstructions": [
    "string (3-4 SAVAGE instructions for how to properly experience this playlist and what it will do to them)"
  ],
  "playlistSummary": "string (2-3 sentence summary that brutally exposes what this playlist says about them and their musical destiny)"
}

Make it CURATIONALLY SAVAGE, musically brutal, and hilariously accurate. This should feel like a playlist curator who's determined to either create their perfect soundtrack or expose their musical taste as fundamentally flawed.`;

  try {
    console.log('🎧 Attempting to generate AI playlist...');
    const playlistGenerator = await retryWithBackoff(async () => {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
      try {
        // Clean up the response - remove markdown code blocks if present
        let cleanText = text.trim();
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        const parsed = JSON.parse(cleanText);
        console.log('✅ AI playlist generated successfully');
        return parsed;
      } catch (parseError) {
        console.error('❌ Failed to parse AI response as JSON:', parseError.message);
        console.log('Raw AI response:', text);
        throw new Error('AI returned invalid JSON format');
      }
    });

    if (playlistGenerator) {
      res.json({ playlistGenerator, fallback: false });
    } else {
      console.error('❌ No playlist returned from AI');
      const fallbackPlaylist = {
        playlistConcept: "SonicMirror Discovery Mix",
        playlistDescription: "A carefully curated journey through your musical taste with surprising discoveries that will either elevate or destroy your musical soul.",
        curatedTracks: [
          {
            title: "Blinding Lights",
            artist: "The Weeknd",
            genre: "Pop",
            reason: "High energy track that matches your danceability preferences",
            emotionalImpact: "Energetic and uplifting, perfect for motivation",
            similarity: "Similar to your upbeat favorites with modern production"
          },
          {
            title: "Bohemian Rhapsody",
            artist: "Queen",
            genre: "Rock",
            reason: "Classic track that showcases musical complexity and emotional range",
            emotionalImpact: "Epic and emotionally powerful, encourages deep listening",
            similarity: "Builds on your appreciation for emotional depth in music"
          },
          {
            title: "Clocks",
            artist: "Coldplay",
            genre: "Alternative Rock",
            reason: "Melodic alternative track that bridges mainstream and indie",
            emotionalImpact: "Contemplative and atmospheric, perfect for reflection",
            similarity: "Matches your indie sensibilities with mainstream appeal"
          }
        ],
        playlistFlow: [
          "The playlist starts with high energy to match your danceability preferences",
          "Transitions to emotional depth to challenge your listening habits",
          "Ends with atmospheric tracks that encourage introspection and growth"
        ],
        listeningInstructions: [
          "Listen in order to experience the full emotional journey",
          "Pay attention to how each track makes you feel and why",
          "Use this playlist as a tool for musical self-discovery and growth"
        ],
        playlistSummary: "This playlist is designed to both comfort you with familiar sounds and challenge you with new discoveries, creating a perfect balance for musical growth and enjoyment."
      };
      res.json({ playlistGenerator: fallbackPlaylist, fallback: true, error: 'AI returned empty response' });
    }
  } catch (err) {
    console.error('❌ Gemini API error:', err.message);
    if (err.message.includes('quota') || err.message.includes('429')) {
      const fallbackPlaylistGenerator = {
        playlistConcept: "SonicMirror Personal Mix",
        playlistDescription: "A personalized playlist that reflects your current taste while introducing new discoveries.",
        curatedTracks: [
          {
            title: "As It Was",
            artist: "Harry Styles",
            genre: "Pop",
            reason: "Catchy pop with emotional depth that matches your preferences",
            emotionalImpact: "Uplifting and relatable, perfect for daily listening",
            similarity: "Similar to your mainstream favorites with modern appeal"
          },
          {
            title: "Heat Waves",
            artist: "Glass Animals",
            genre: "Indie Pop",
            reason: "Unique sound that bridges indie and electronic genres",
            emotionalImpact: "Dreamy and atmospheric, encourages emotional exploration",
            similarity: "Builds on your indie interests with fresh production"
          }
        ],
        playlistFlow: [
          "Starts with familiar sounds to ease you into the experience",
          "Introduces new elements gradually to expand your horizons",
          "Creates a cohesive journey through different emotional states"
        ],
        listeningInstructions: [
          "Listen actively to appreciate the musical journey",
          "Note which tracks resonate most with your current mood",
          "Use this as a starting point for further musical exploration"
        ],
        playlistSummary: "This playlist balances your current taste with new discoveries, creating an enjoyable and growth-oriented listening experience."
      };
      res.json({ playlistGenerator: fallbackPlaylistGenerator, fallback: true, error: 'API quota exceeded' });
    } else if (err.message.includes('API key') || err.message.includes('authentication')) {
      const fallbackPlaylistGenerator = {
        playlistConcept: "SonicMirror Personal Mix",
        playlistDescription: "A personalized playlist that reflects your current taste while introducing new discoveries.",
        curatedTracks: [
          {
            title: "As It Was",
            artist: "Harry Styles",
            genre: "Pop",
            reason: "Catchy pop with emotional depth that matches your preferences",
            emotionalImpact: "Uplifting and relatable, perfect for daily listening",
            similarity: "Similar to your mainstream favorites with modern appeal"
          },
          {
            title: "Heat Waves",
            artist: "Glass Animals",
            genre: "Indie Pop",
            reason: "Unique sound that bridges indie and electronic genres",
            emotionalImpact: "Dreamy and atmospheric, encourages emotional exploration",
            similarity: "Builds on your indie interests with fresh production"
          }
        ],
        playlistFlow: [
          "Starts with familiar sounds to ease you into the experience",
          "Introduces new elements gradually to expand your horizons",
          "Creates a cohesive journey through different emotional states"
        ],
        listeningInstructions: [
          "Listen actively to appreciate the musical journey",
          "Note which tracks resonate most with your current mood",
          "Use this as a starting point for further musical exploration"
        ],
        playlistSummary: "This playlist balances your current taste with new discoveries, creating an enjoyable and growth-oriented listening experience."
      };
      res.json({ 
        playlistGenerator: fallbackPlaylistGenerator, 
        fallback: true, 
        error: 'Invalid API key. Please check your GEMINI_API_KEY configuration.' 
      });
    } else {
      const fallbackPlaylistGenerator = {
        playlistConcept: "SonicMirror Personal Mix",
        playlistDescription: "A personalized playlist that reflects your current taste while introducing new discoveries.",
        curatedTracks: [
          {
            title: "As It Was",
            artist: "Harry Styles",
            genre: "Pop",
            reason: "Catchy pop with emotional depth that matches your preferences",
            emotionalImpact: "Uplifting and relatable, perfect for daily listening",
            similarity: "Similar to your mainstream favorites with modern appeal"
          },
          {
            title: "Heat Waves",
            artist: "Glass Animals",
            genre: "Indie Pop",
            reason: "Unique sound that bridges indie and electronic genres",
            emotionalImpact: "Dreamy and atmospheric, encourages emotional exploration",
            similarity: "Builds on your indie interests with fresh production"
          }
        ],
        playlistFlow: [
          "Starts with familiar sounds to ease you into the experience",
          "Introduces new elements gradually to expand your horizons",
          "Creates a cohesive journey through different emotional states"
        ],
        listeningInstructions: [
          "Listen actively to appreciate the musical journey",
          "Note which tracks resonate most with your current mood",
          "Use this as a starting point for further musical exploration"
        ],
        playlistSummary: "This playlist balances your current taste with new discoveries, creating an enjoyable and growth-oriented listening experience."
      };
      res.json({ 
        playlistGenerator: fallbackPlaylistGenerator, 
        fallback: true, 
        error: err.message || 'Failed to generate playlist.' 
      });
    }
  }
});

// POST /llm/musical-compatibility
router.post('/musical-compatibility', async (req, res) => {
  const { topArtists, topTracks, topGenres, audioProfile, recentlyPlayed } = req.body;
  if (!topArtists || !topTracks || !topGenres || !audioProfile) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  // Check if Gemini is available
  if (!isGeminiAvailable()) {
    const fallbackCompatibility = {
      compatibilityType: "The Musical Chameleon",
      compatibilityScore: 75,
      relationshipInsights: [
        "You adapt your music taste to different social situations",
        "Your diverse preferences make you compatible with many people",
        "You're open to exploring new musical territories with partners"
      ],
      communicationStyle: "You use music as a bridge to connect with others",
      conflictResolution: "You're willing to compromise on playlist choices",
      growthPotential: "High potential for musical growth through shared experiences",
      compatibilitySummary: "Your flexible music taste makes you highly compatible with diverse partners, though you may need to develop stronger musical boundaries."
    };
    return res.json({ 
      musicalCompatibility: fallbackCompatibility, 
      fallback: true,
      error: 'AI service not configured. Using fallback response. Please set GEMINI_API_KEY in your environment variables.'
    });
  }

  try {
    checkRateLimit();
  } catch (error) {
    return res.status(429).json({ error: error.message });
  }

  const prompt = `You're a SAVAGE RELATIONSHIP THERAPIST and MUSICAL COMPATIBILITY SADIST who specializes in exposing people's relationship potential through their music taste. This isn't gentle compatibility analysis - this is a BRUTAL PSYCHOLOGICAL INTERROGATION that reveals whether someone is destined for musical harmony or relationship disaster.

Top Artists: ${topArtists.join(', ')}
Top Tracks: ${topTracks.join(', ')}
Top Genres: ${topGenres.join(', ')}
Audio Profile: Danceability ${audioProfile.danceability}, Energy ${audioProfile.energy}, Valence ${audioProfile.valence}
${recentlyPlayed ? `Recently Played: ${recentlyPlayed.slice(0, 5).join(', ')}` : ''}

Please provide a BRUTAL musical compatibility analysis in this exact JSON format:
{
  "compatibilityType": "string (e.g., The Musical Chameleon, The Genre Dictator, The Musical Doormat, etc.)",
  "compatibilityScore": "number (0-100)",
  "relationshipInsights": [
    "string (3-4 BRUTAL insights about how their music taste affects their relationships and compatibility)"
  ],
  "communicationStyle": "string (how they use music to communicate with partners)",
  "conflictResolution": "string (how they handle musical disagreements in relationships)",
  "growthPotential": "string (their potential for musical growth through relationships)",
  "compatibilitySummary": "string (2-3 sentence summary that brutally exposes their relationship potential through music)"
}

Make it RELATIONSHIP SAVAGE, psychologically brutal, and hilariously accurate. This should feel like a couples therapist who's determined to expose their musical compatibility issues and relationship red flags.`;

  try {
    const musicalCompatibility = await retryWithBackoff(async () => {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
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
        return {
          compatibilityType: "The Musical Explorer",
          compatibilityScore: 80,
          relationshipInsights: [
            "Your diverse taste shows openness to new experiences and people",
            "You're willing to compromise and adapt your musical preferences",
            "Your music choices reflect emotional intelligence and empathy"
          ],
          communicationStyle: "You use music as a way to connect and share emotions",
          conflictResolution: "You approach musical disagreements with curiosity and compromise",
          growthPotential: "High potential for mutual musical growth and discovery",
          compatibilitySummary: "Your flexible and diverse music taste makes you highly compatible with partners who value growth and shared experiences."
        };
      }
    });

    if (musicalCompatibility) {
      res.json({ musicalCompatibility });
    } else {
      res.status(500).json({ error: 'No compatibility analysis returned.' });
    }
  } catch (err) {
    console.error('Gemini API error:', err.message);
    if (err.message.includes('quota') || err.message.includes('429')) {
      const fallbackCompatibility = {
        compatibilityType: "The Musical Chameleon",
        compatibilityScore: 75,
        relationshipInsights: [
          "You adapt your music taste to different social situations",
          "Your diverse preferences make you compatible with many people",
          "You're open to exploring new musical territories with partners"
        ],
        communicationStyle: "You use music as a bridge to connect with others",
        conflictResolution: "You're willing to compromise on playlist choices",
        growthPotential: "High potential for musical growth through shared experiences",
        compatibilitySummary: "Your flexible music taste makes you highly compatible with diverse partners, though you may need to develop stronger musical boundaries."
      };
      res.json({ musicalCompatibility: fallbackCompatibility, fallback: true });
    } else {
      res.status(500).json({ error: err.message || 'Failed to generate compatibility analysis.' });
    }
  }
});

// POST /llm/lyrical-analysis
router.post('/lyrical-analysis', async (req, res) => {
  const { topArtists, topTracks, topGenres, audioProfile, recentlyPlayed } = req.body;
  if (!topArtists || !topTracks || !topGenres || !audioProfile) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  // Check if Gemini is available
  if (!isGeminiAvailable()) {
    const fallbackLyricalAnalysis = {
      lyricalPersonality: "The Emotional Storyteller",
      lyricalThemes: [
        {
          theme: "Love and Relationships",
          frequency: "High",
          psychologicalInsight: "You're deeply invested in emotional connections and romantic experiences",
          lyricalExamples: ["Love songs dominate your playlist", "You appreciate vulnerability in lyrics"]
        },
        {
          theme: "Self-Reflection",
          frequency: "Medium",
          psychologicalInsight: "You use music for introspection and personal growth",
          lyricalExamples: ["Songs about personal struggles", "Lyrics that encourage self-examination"]
        }
      ],
      lyricalDepth: "You prefer lyrics with emotional complexity and meaningful storytelling",
      lyricalPreferences: [
        "You appreciate artists who write from personal experience",
        "You're drawn to lyrics that tell stories or paint vivid pictures",
        "You value authenticity and raw emotion in songwriting"
      ],
      lyricalRedFlags: [
        "You might be using lyrics to avoid dealing with your own emotions",
        "Your preference for sad songs could indicate unresolved emotional issues",
        "You might be living vicariously through other people's lyrical experiences"
      ],
      lyricalGrowth: [
        "Try writing your own lyrics to process your emotions",
        "Explore music with different lyrical styles and themes",
        "Use lyrics as a tool for self-reflection and emotional processing"
      ],
      lyricalSummary: "Your lyrical preferences reveal someone who deeply connects with emotional storytelling and uses music as a form of emotional expression and understanding."
    };
    return res.json({ 
      lyricalAnalysis: fallbackLyricalAnalysis, 
      fallback: true,
      error: 'AI service not configured. Using fallback response. Please set GEMINI_API_KEY in your environment variables.'
    });
  }

  try {
    checkRateLimit();
  } catch (error) {
    return res.status(429).json({ error: error.message });
  }

  const prompt = `You're a SAVAGE LITERARY CRITIC and LYRICAL PSYCHOLOGIST who specializes in exposing people's deepest emotional wounds through their lyrical preferences. This isn't gentle lyrical analysis - this is a BRUTAL PSYCHOLOGICAL AUTOPSY that reveals their most embarrassing emotional dependencies and lyrical obsessions.

Top Artists: ${topArtists.join(', ')}
Top Tracks: ${topTracks.join(', ')}
Top Genres: ${topGenres.join(', ')}
Audio Profile: Danceability ${audioProfile.danceability}, Energy ${audioProfile.energy}, Valence ${audioProfile.valence}
${recentlyPlayed ? `Recently Played: ${recentlyPlayed.slice(0, 5).join(', ')}` : ''}

Please provide a BRUTAL lyrical analysis in this exact JSON format:
{
  "lyricalPersonality": "string (e.g., The Emotional Vampire, The Lyrical Doormat, The Word Salad Lover, etc.)",
  "lyricalThemes": [
    {
      "theme": "string (e.g., Heartbreak, Self-Pity, Desperate Validation, etc.)",
      "frequency": "string (High/Medium/Low)",
      "psychologicalInsight": "string (what this lyrical obsession reveals about their deepest fears and insecurities)",
      "lyricalExamples": ["string (2-3 BRUTAL examples of lyrics they probably love)"]
    }
  ],
  "lyricalDepth": "string (how sophisticated or basic their lyrical preferences are)",
  "lyricalPreferences": [
    "string (3-4 BRUTAL observations about what they look for in lyrics and what it reveals about their emotional dysfunction)"
  ],
  "lyricalRedFlags": [
    "string (3-4 SAVAGE warnings about problematic lyrical patterns that expose their psychological damage)"
  ],
  "lyricalGrowth": [
    "string (3-4 BRUTAL recommendations for how to improve their lyrical taste or embrace their lyrical dysfunction)"
  ],
  "lyricalSummary": "string (2-3 sentence summary that brutally exposes their lyrical taste as either sophisticated or desperately basic)"
}

Make it LYRICAL SAVAGE, psychologically brutal, and hilariously accurate. This should feel like a literary critic who's determined to expose their lyrical taste as either sophisticated or desperately basic.`;

  try {
    const lyricalAnalysis = await retryWithBackoff(async () => {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
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
        return {
          lyricalPersonality: "The Emotional Storyteller",
          lyricalThemes: [
            {
              theme: "Love and Relationships",
              frequency: "High",
              psychologicalInsight: "You're deeply invested in emotional connections and romantic experiences",
              lyricalExamples: ["Love songs dominate your playlist", "You appreciate vulnerability in lyrics"]
            },
            {
              theme: "Self-Reflection",
              frequency: "Medium",
              psychologicalInsight: "You use music for introspection and personal growth",
              lyricalExamples: ["Songs about personal struggles", "Lyrics that encourage self-examination"]
            }
          ],
          lyricalDepth: "You prefer lyrics with emotional complexity and meaningful storytelling",
          lyricalPreferences: [
            "You appreciate artists who write from personal experience",
            "You're drawn to lyrics that tell stories or paint vivid pictures",
            "You value authenticity and raw emotion in songwriting"
          ],
          lyricalRedFlags: [
            "You might be using lyrics to avoid dealing with your own emotions",
            "Your preference for sad songs could indicate unresolved emotional issues",
            "You might be living vicariously through other people's lyrical experiences"
          ],
          lyricalGrowth: [
            "Try writing your own lyrics to process your emotions",
            "Explore music with different lyrical styles and themes",
            "Use lyrics as a tool for self-reflection and emotional processing"
          ],
          lyricalSummary: "Your lyrical preferences reveal someone who deeply connects with emotional storytelling and uses music as a form of emotional expression and understanding."
        };
      }
    });

    if (lyricalAnalysis) {
      res.json({ lyricalAnalysis });
    } else {
      res.status(500).json({ error: 'No lyrical analysis returned.' });
    }
  } catch (err) {
    console.error('Gemini API error:', err.message);
    if (err.message.includes('quota') || err.message.includes('429')) {
      const fallbackLyricalAnalysis = {
        lyricalPersonality: "The Emotional Storyteller",
        lyricalThemes: [
          {
            theme: "Love and Relationships",
            frequency: "High",
            psychologicalInsight: "You're deeply invested in emotional connections and romantic experiences",
            lyricalExamples: ["Love songs dominate your playlist", "You appreciate vulnerability in lyrics"]
          },
          {
            theme: "Self-Reflection",
            frequency: "Medium",
            psychologicalInsight: "You use music for introspection and personal growth",
            lyricalExamples: ["Songs about personal struggles", "Lyrics that encourage self-examination"]
          }
        ],
        lyricalDepth: "You prefer lyrics with emotional complexity and meaningful storytelling",
        lyricalPreferences: [
          "You appreciate artists who write from personal experience",
          "You're drawn to lyrics that tell stories or paint vivid pictures",
          "You value authenticity and raw emotion in songwriting"
        ],
        lyricalRedFlags: [
          "You might be using lyrics to avoid dealing with your own emotions",
          "Your preference for sad songs could indicate unresolved emotional issues",
          "You might be living vicariously through other people's lyrical experiences"
        ],
        lyricalGrowth: [
          "Try writing your own lyrics to process your emotions",
          "Explore music with different lyrical styles and themes",
          "Use lyrics as a tool for self-reflection and emotional processing"
        ],
        lyricalSummary: "Your lyrical preferences reveal someone who deeply connects with emotional storytelling and uses music as a form of emotional expression and understanding."
      };
      res.json({ lyricalAnalysis: fallbackLyricalAnalysis, fallback: true });
    } else {
      res.status(500).json({ error: err.message || 'Failed to generate lyrical analysis.' });
    }
  }
});

module.exports = router; 