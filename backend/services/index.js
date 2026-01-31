/**
 * Services index - exports all services
 */
const spotifyService = require('./spotifyService');
const geminiService = require('./geminiService');

module.exports = {
  spotify: spotifyService,
  gemini: geminiService,
};
