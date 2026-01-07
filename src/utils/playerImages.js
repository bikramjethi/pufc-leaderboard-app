// Player profile image mapping
// Add player-specific images here as they become available

import defaultImage from '../assets/player-profiles/default.jpeg';
import jethiImage from '../assets/player-profiles/jethi.jpg';
import vinitImage from '../assets/player-profiles/vinit.jpg';
import rahulDhekImage from '../assets/player-profiles/rahuldhek.jpg';
import sudeepImage from '../assets/player-profiles/sudeep.jpg';
import prateekImage from "../assets/player-profiles/prateek.jpeg";
import pandeyImage from "../assets/player-profiles/pandey.jpeg";
import joeImage from "../assets/player-profiles/joe.jpeg";

// Map player names (lowercase) to their profile images
const playerImageMap = {
  'jethi': jethiImage,
  'vinit': vinitImage,
  "rahul dhek": rahulDhekImage,
  "sudeep": sudeepImage,
  "pandey": pandeyImage,
  "joe": joeImage,
  "prateek": prateekImage
  // Add more player images here as they become available
  // 'ashish': ashishImage,
  // 'vinay': vinayImage,
};

/**
 * Get the profile image for a player
 * @param {string} playerName - The player's name
 * @returns {string} - The image URL for the player
 */
export const getPlayerImage = (playerName) => {
  if (!playerName) return defaultImage;
  
  const normalizedName = playerName.toLowerCase().trim();
  return playerImageMap[normalizedName] || defaultImage;
};

export default getPlayerImage;

