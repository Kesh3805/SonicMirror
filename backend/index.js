const fs = require('fs');
const https = require('https');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Placeholder: Spotify OAuth2 route
app.use('/auth', require('./routes/auth'));

// Placeholder: LLM (OpenAI) route
app.use('/llm', require('./routes/llm'));

app.use('/spotify', require('./routes/spotify'));

app.get('/', (req, res) => {
  res.send('SonicMirror Backend Running');
});

// On Render, use app.listen(PORT) -- Render provides HTTPS automatically
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 