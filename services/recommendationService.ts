import Song from '../models/songModel';

async function getRecommendations(songId: string) {
  const song = await Song.findOne({ songId });
  if (!song) {
    throw new Error('Song not found');
  }

  const allSongs = await Song.find({
    songId: { $ne: songId }, // Exclude the selected song
  });

  // Calculate a score for each song based on similarity
  const scoredSongs = allSongs.map(otherSong => {
    let score = 0;

    // Ensure composers are arrays
    const songComposers = Array.isArray(song.composer) ? song.composer : [song.composer];
    const otherSongComposers = Array.isArray(otherSong.composer) ? otherSong.composer : [otherSong.composer];

    // Add points for matching genre
    score += otherSong.genre.filter(genre => song.genre.includes(genre)).length;

    // Add points for matching composer
    score += otherSongComposers.filter(composer => songComposers.includes(composer)).length;

    // Add points for matching album (less weight)
    if (otherSong.album === song.album) {
      score += 0.5;
    }

    // Add points for similar year (less weight), if both years are defined
    if (otherSong.year !== undefined && song.year !== undefined) {
      if (Math.abs(otherSong.year - song.year) <= 2) {
        score += 0.5;
      }
    }

    // Ensure tags are initialized
    const songTags = song.tags ?? [];
    const otherSongTags = otherSong.tags ?? [];

    // Add points for matching tags, if they exist
    if (songTags.length > 0 && otherSongTags.length > 0) {
      score += otherSongTags.filter(tag => songTags.includes(tag)).length;
    }

    return { song: otherSong, score };
  });

  // Sort songs by score in descending order and take the top 5
  const recommendations = scoredSongs.sort((a, b) => b.score - a.score).slice(0, 5).map(item => item.song);

  return recommendations;
}

export default getRecommendations;
