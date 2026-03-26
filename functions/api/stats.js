export async function onRequestGet(context) {
  const YOUTUBE_API_KEY = context.env.YOUTUBE_API_KEY || '';
  const YOUTUBE_PLAYLIST_ID = context.env.YOUTUBE_PLAYLIST_ID || 'PL60PtskKjky1r3e9iFacHX_laEZAxxE71';
  const SPOTIFY_STREAMS = 17000000;

  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  };

  if (!YOUTUBE_API_KEY) {
    return new Response(JSON.stringify({
      error: 'API configuration error',
      youtube: SPOTIFY_STREAMS,
      spotify: SPOTIFY_STREAMS,
      cached: false
    }), { status: 500, headers });
  }

  try {
    let totalViews = 0;
    let nextPageToken = '';
    let pageCount = 0;
    const maxPages = 10;

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

      const videoIds = playlistData.items
        .map(item => item.contentDetails?.videoId)
        .filter(id => id)
        .join(',');

      if (!videoIds) break;

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

    return new Response(JSON.stringify({
      youtube: totalViews,
      spotify: SPOTIFY_STREAMS,
      cached: false,
      success: true
    }), { status: 200, headers });

  } catch (error) {
    return new Response(JSON.stringify({
      youtube: 38000000,
      spotify: SPOTIFY_STREAMS,
      cached: false,
      error: true,
      message: error.message
    }), { status: 200, headers });
  }
}
