// Exercise video mappings - curated YouTube links for form guidance
export const EXERCISE_VIDEOS = {
  'Dumbbell Bench Press / Push-Up': 'https://www.youtube.com/watch?v=iA6xEQ31jGI&t=255s',
  'Half-Kneeling Single-Arm Press': 'https://www.youtube.com/watch?v=d3CRIDSCOhw',
  'Cable Triceps Pressdown / Close-Grip Push-Up': 'https://www.youtube.com/watch?v=2cdIRe5tcqI',
  'Goblet Squat': 'https://www.youtube.com/watch?v=gCESNsDsbqk',
  'Dumbbell Romanian Deadlift': 'https://www.youtube.com/watch?v=xAL7lHwj30E',
  'Split Squat': 'https://www.youtube.com/watch?v=la0pLPq-3A8',
  'Dead Bug': 'https://www.youtube.com/watch?v=GbSC02oU3To',
  'Chest-Supported Dumbbell Row': 'https://www.youtube.com/watch?v=9zkP4Cd_cz0',
  'Lat Pulldown / Resistance Band Pulldown': 'https://www.youtube.com/watch?v=_97pmOC2tzE',
  'Resistance Band Face Pull': 'https://www.youtube.com/watch?v=JBpj9-3tP0c',
  'Zone 2 Cardio': 'https://www.youtube.com/watch?v=L5J6sgQLvuE',
  'Dynamic Warm-Up': 'https://www.youtube.com/watch?v=1e528F0pYPg',
};

// Check if an exercise is basketball-related (no video guide needed)
export function isBasketballExercise(exerciseName) {
  if (!exerciseName) return false;
  const name = exerciseName.toLowerCase();
  return name.includes('basketball');
}

// Get video URL for an exercise
export function getExerciseVideo(exerciseName) {
  return EXERCISE_VIDEOS[exerciseName] || null;
}

// Extract YouTube video ID from URL
export function getYouTubeVideoId(url) {
  if (!url) return null;
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('youtube.com')) {
      return urlObj.searchParams.get('v');
    } else if (urlObj.hostname.includes('youtu.be')) {
      return urlObj.pathname.slice(1);
    }
  } catch {
    return null;
  }
  return null;
}

// Get YouTube thumbnail URL
export function getYouTubeThumbnail(url) {
  const videoId = getYouTubeVideoId(url);
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}
