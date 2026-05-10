#!/usr/bin/env python3
import csv
import json
import re
from collections import defaultdict
from pathlib import Path

# CSV files to process
csv_files = {
    2026: '/Users/sskmusic/Downloads/yt-video-report-2026-01.csv',
    2025: '/Users/sskmusic/Downloads/yt-video-report-2025-01.csv',
    2024: '/Users/sskmusic/Downloads/yt-video-report-2024-01.csv',
    2023: '/Users/sskmusic/Downloads/yt-video-report-2023-01.csv',
    2022: '/Users/sskmusic/Downloads/yt-video-report-2022-01.csv',
    2021: '/Users/sskmusic/Downloads/yt-video-report-2021-01.csv',
    2020: '/Users/sskmusic/Downloads/yt-video-report-2020-01.csv',
}

# Dictionary to store track data (deduplicated by title)
tracks = defaultdict(lambda: {
    'title': '',
    'youtube_views': 0,
    'years': set(),
    'video_links': set(),
    'channel_links': set()
})

def parse_views(views_str):
    """Parse view count string like '1,234' or '5,678,901' to integer"""
    if not views_str or views_str.strip() == '':
        return 0
    # Remove commas and convert to integer
    cleaned = views_str.replace(',', '').strip()
    try:
        return int(cleaned)
    except ValueError:
        return 0

def clean_title(title):
    """Clean the track title - remove producer credits and normalize"""
    if not title:
        return "Unknown"

    # Remove common producer credit patterns
    title = re.sub(r'\s*-\s*Prod\.? by SSK.*$', '', title, flags=re.IGNORECASE)
    title = re.sub(r'\s*-\s*Prod by SSK.*$', '', title, flags=re.IGNORECASE)
    title = re.sub(r'\s*-\s*Might Prod\.? by SSK.*$', '', title, flags=re.IGNORECASE)
    title = re.sub(r'\s*-\s*Prod\.? By SSK Music.*$', '', title, flags=re.IGNORECASE)

    # Remove extra quotes
    title = title.replace('"', '').strip()

    return title

def infer_artist_from_title(title):
    """Try to infer artist name from title if possible"""
    # This is a placeholder - in real usage, you'd want to look up artist info
    # For now, we'll return None to let the calling code handle it
    return None

# Process each CSV file
for year, file_path in csv_files.items():
    try:
        with open(file_path, 'r', encoding='utf-8-sig') as f:
            reader = csv.DictReader(f)
            for row in reader:
                title = clean_title(row.get('Asset Title', ''))
                views_str = row.get('Monetized Views', '0')
                video_link = row.get('Video Link', '')
                channel_link = row.get('Channel Link', '')

                if not title or title == 'Unknown':
                    continue

                # Parse views
                views = parse_views(views_str)

                # Store track data
                tracks[title]['title'] = title
                tracks[title]['youtube_views'] += views
                tracks[title]['years'].add(year)
                if video_link:
                    tracks[title]['video_links'].add(video_link)
                if channel_link:
                    tracks[title]['channel_links'].add(channel_link)

    except FileNotFoundError:
        print(f"Warning: File not found: {file_path}")
    except Exception as e:
        print(f"Error processing {file_path}: {e}")

# Convert to list and sort by total views (descending)
sorted_tracks = sorted(tracks.items(), key=lambda x: x[1]['youtube_views'], reverse=True)

# Generate JSON
releases = []
for idx, (title, data) in enumerate(sorted_tracks, start=1):
    # Use the earliest year as the release year
    release_year = min(data['years']) if data['years'] else 2020

    # Try to infer artist from title (placeholder logic)
    artist = infer_artist_from_title(title)
    if not artist:
        # Use "Various Artists" for producer credits when artist is unknown
        artist = "Various Artists"

    # Get the first YouTube link (if available)
    video_links = list(data['video_links'])
    platforms = {}
    if video_links:
        platforms['youtube'] = video_links[0]

    # Create release object
    release = {
        'id': f'track-{idx:03d}',
        'title': title,
        'artist': artist,
        'producer': 'SSK Music',
        'year': release_year,
        'type': 'single',
        'youtube_views': data['youtube_views']
    }

    if platforms:
        release['platforms'] = platforms

    releases.append(release)

# Create final JSON structure
output = {
    'releases': releases
}

# Write to file
output_path = '/Users/sskmusic/SSK Music Website/ssk-music-site/data/discography.json'
with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f"✓ Processed {len(releases)} unique tracks")
print(f"✓ Total views across all tracks: {sum(r['youtube_views'] for r in releases):,}")
print(f"✓ Output written to: {output_path}")

# Print summary statistics
print("\n=== Summary Statistics ===")
print(f"Total unique tracks: {len(releases)}")
print(f"Tracks with 100K+ views: {sum(1 for r in releases if r['youtube_views'] >= 100000)}")
print(f"Tracks with 1M+ views: {sum(1 for r in releases if r['youtube_views'] >= 1000000)}")
print(f"Tracks with 10M+ views: {sum(1 for r in releases if r['youtube_views'] >= 10000000)}")

print("\n=== Top 10 Tracks by Views ===")
for i, release in enumerate(releases[:10], start=1):
    print(f"{i}. {release['title']}: {release['youtube_views']:,} views")
