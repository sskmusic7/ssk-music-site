// Netlify Function - Fetches YouTube Stats Server-Side
// API Keys MUST be set as environment variables in Netlify dashboard

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || '';
const YOUTUBE_PLAYLIST_ID = process.env.YOUTUBE_PLAYLIST_ID || 'PL60PtskKjky1r3e9iFacHX_laEZAxxE71';
const SPOTIFY_STREAMS = 17000000; // Verified Spotify streams

export default async function handler(req, context) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Check if API key is configured
  if (!YOUTUBE_API_KEY) {
    console.error('YOUTUBE_API_KEY not configured in environment variables');
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'API configuration error',
        youtube: SPOTIFY_STREAMS,
        spotify: SPOTIFY_STREAMS,
        cached: false
      })
    };
  }

  try {
    // Fetch YouTube playlist items
    let totalViews = 0;
    let nextPageToken = '';
    let pageCount = 0;
    const maxPages = 10; // Limit to avoid quota issues

    do {
      const playlistUrl = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${YOUTUBE_PLAYLIST_ID}&pageToken=${nextPageToken}&key=${YOUTUBE_API_KEY}`;
      const playlistResponse = await fetch(playlistUrl);
      const playlistData = await playlistResponse.json();

      if (playlistData.error) {
        throw new Error(playlistData.error.message);
      }

      if (!playlistData.items || playlistData.items.length === 0) {
        break;
      }

      // Get video IDs from this page
      const videoIds = playlistData.items
        .map(item => item.contentDetails?.videoId)
        .filter(id => id)
        .join(',');

      if (!videoIds) break;

      // Fetch statistics for these videos
      const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`;
      const statsResponse = await fetch(statsUrl);
      const statsData = await statsResponse.json();

      if (statsData.items) {
        statsData.items.forEach(video => {
          const views = parseInt(video.statistics?.viewCount || 0);
          totalViews += views;
        });
      }

      nextPageToken = playlistData.nextPageToken || '';
      pageCount++;

    } while (nextPageToken && pageCount < maxPages);

    // Return successful response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        youtube: totalViews,
        spotify: SPOTIFY_STREAMS,
        cached: false,
        success: true
      })
    };

  } catch (error) {
    console.error('YouTube API error:', error.message);
    return {
      statusCode: 200, // Return 200 with fallback data
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        youtube: 38000000, // Fallback
        spotify: SPOTIFY_STREAMS,
        cached: false,
        error: true,
        message: error.message
      })
    };
  }
}
