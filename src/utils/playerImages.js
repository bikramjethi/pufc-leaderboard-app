// Player profile image mapping
// Add player-specific images here as they become available

import defaultImage from '../assets/player-profiles/default.jpeg';
import jethi from '../assets/player-profiles/jethi.jpg';
import vinit from '../assets/player-profiles/vinit.jpg';
import rahulDhekImage from '../assets/player-profiles/rahuldhek.jpg';
import sudeep from '../assets/player-profiles/sudeep.jpg';
import prateek from "../assets/player-profiles/prateek.jpeg";
import pandey from "../assets/player-profiles/pandey.jpeg";
import joe from "../assets/player-profiles/joe2.jpeg";
import rishav from "../assets/player-profiles/rishav2.jpeg";
import vikalp from "../assets/player-profiles/vikalp2.jpeg";
import animesh from "../assets/player-profiles/animesh.jpeg";
import ashish from "../assets/player-profiles/ashish.jpeg";
import vedant from "../assets/player-profiles/vedant.jpeg";
import rohitGautam from "../assets/player-profiles/rohitgautam.jpeg";
import mani from "../assets/player-profiles/mani.jpeg";
import rajat from "../assets/player-profiles/rajat.jpeg";
import rishabh from "../assets/player-profiles/rishabh.jpeg";
import subarna from "../assets/player-profiles/subarna.jpeg";
import vinay from "../assets/player-profiles/vinay.jpeg";
import vinoth from "../assets/player-profiles/vinoth.jpeg";
import vivek from "../assets/player-profiles/vivek.jpeg";
import tushar from "../assets/player-profiles/tushar.jpeg";
import deepak from "../assets/player-profiles/deepak.jpeg";
import rohitHyd from "../assets/player-profiles/rohit-hyd.jpeg";
import umaImage from "../assets/player-profiles/uma2.jpg";


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
  ashish,
  vedant,
  "rohit gautam": rohitGautam,
  mani,
  rajat,
  rishabh,
  subarna,
  vinay,
  vinoth,
  vivek,
  tushar,
  deepak,
  "rohit hyd": rohitHyd,
  "uma shankar": umaImage,
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
