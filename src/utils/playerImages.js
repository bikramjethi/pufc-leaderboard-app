// Player profile image mapping
// Add player-specific images here as they become available

import defaultImage from '../assets/player-profiles/default.jpeg';
import jethi from '../assets/player-profiles/jethi.jpg';
import vinit from '../assets/player-profiles/vinit.jpg';
import rahulDhekImage from '../assets/player-profiles/rahuldhek.jpg';
import sudeep from '../assets/player-profiles/sudeep.jpg';
import prateek from "../assets/player-profiles/prateek.jpeg";
import pandey from "../assets/player-profiles/pandey.jpeg";
import joe from "../assets/player-profiles/joe.jpeg";
import rishav from "../assets/player-profiles/rishav.jpeg";
import vikalp from "../assets/player-profiles/vikalp.jpeg";
import animesh from "../assets/player-profiles/animesh.jpg";
import ashish from "../assets/player-profiles/ashish.jpeg";

// Map player names (lowercase) to their profile images
const playerImageMap = {
  jethi,
  vinit,
  "rahul dhek": rahulDhekImage,
  sudeep,
  pandey,
  joe,
  prateek,
  rishav,
  vikalp,
  animesh,
  ashish
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
