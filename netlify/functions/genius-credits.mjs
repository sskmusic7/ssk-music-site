// Netlify Function - Fetches Genius production credits for SSK Music
// This provides real-time data from Genius API (lyrics, credits, songs)

const GENIUS_CLIENT_ID = 'YOUR_GENIUS_CLIENT_ID_HERE'; // Get from genius.com/api-clients
const GENIUS_CLIENT_SECRET = 'YOUR_GENIUS_CLIENT_SECRET_HERE'; // Get from genius.com/api-clients
const GENIUS_ACCESS_TOKEN = ''; // Will be fetched dynamically

const BASE_URL = 'https://genius.com';

/**
 * Fetch Genius access token
 */
async function getGeniusToken() {
    const response = await fetch(`${BASE_URL}/oauth/token`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${GENIUS_CLIENT_ID}:${GENIUS_CLIENT_SECRET}`).toString('base64')}`
        },
        body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
        throw new Error(`Genius token request failed: ${response.status}`);
    }

    const data = await response.json();
    return data.access_token;
}

/**
 * Search for SSK Music credits on Genius
 */
async function searchGeniusCredits(artist = 'SSK Music') {
    const token = await getGeniusToken();

    if (!token) {
        return {
            error: true,
            message: 'Genius token not configured in environment variables'
        };
    }

    // Search for songs by SSK Music as artist or producer
    const searchResponse = await fetch(
        `${BASE_URL}/api/search/song?per_page=50&q=artist:${encodeURIComponent(artist)}+lyrics`,
        {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }
    );

    if (!searchResponse.ok) {
        throw new Error(`Genius search failed: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json();

    // Get detailed song data to extract production credits
    const credits = [];

    if (searchData.response && searchData.response.hits) {
        for (const hit of searchData.response.hits) {
            const songData = hit.result;

            // Extract credits from different roles
            if (songData.producer_artists) {
                songData.producer_artists.forEach(producer => {
                    credits.push({
                        track: songData.title,
                        artist: producer.name,
                        role: 'Producer',
                        year: songData.release_date_components ? songData.release_date_components.year : null,
                        label: songData.label ? songData.label.name : null,
                        genius_url: songData.url,
                        type: 'production'
                    });
                });
            }

            if (songData.writer_artists) {
                songData.writer_artists.forEach(writer => {
                    credits.push({
                        track: songData.title,
                        artist: writer.name,
                        role: 'Writer',
                        year: songData.release_date_components ? songData.release_date_components.year : null,
                        label: songData.label ? songData.label.name : null,
                        genius_url: songData.url,
                        type: 'production'
                    });
                });
            }

            if (songData.producer_credits) {
                songData.producer_credits.forEach(producer => {
                    credits.push({
                        track: songData.title,
                        artist: producer.name,
                        role: 'Producer',
                        year: songData.release_date_components ? songData.release_date_components.year : null,
                        label: songData.label ? songData.label.name : null,
                        genius_url: songData.url,
                        type: 'production'
                    });
                });
            }
        }
    }

    return {
        success: true,
        data: {
            credits: credits,
            total_found: credits.length,
            artist: artist
        }
    };
}

export default async function handler(req, context) {
    // Handle CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
    };

    try {
        const { searchParams } = new URL(req.url).searchParams;
        const artist = searchParams.get('artist') || 'SSK Music';

        console.log(`Genius credits search for: ${artist}`);

        const result = await searchGeniusCredits(artist);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(result)
        };
    } catch (error) {
        console.error('Genius API error:', error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                error: true,
                message: error.message || 'Failed to fetch Genius credits'
            })
        };
    }
}
