# Discography Extraction Report

## Summary

Successfully extracted production credit data from 7 years of YouTube video reports (2020-2026).

## Statistics

- **Total Unique Tracks**: 73
- **Total YouTube Views**: 458,522
- **Years Covered**: 2020, 2021, 2022, 2023, 2024, 2025, 2026
- **CSV Files Processed**: 7

## View Distribution

- **Tracks with 100K+ views**: 1
- **Tracks with 10K-100K views**: 3
- **Tracks with 1K-10K views**: 13
- **Tracks with <1K views**: 56

## Top 10 Tracks by Views

| Rank | Track Title | Views | Year |
|------|-------------|--------|------|
| 1 | When It Rains | 396,947 | 2021 |
| 2 | The Coldest Winter | 13,041 | 2020 |
| 3 | INAG | 12,660 | 2020 |
| 4 | Every Hood | 10,620 | 2020 |
| 5 | Dr Dr | 3,892 | 2021 |
| 6 | The African Dream | 3,427 | 2026 |
| 7 | Dairy Free | 1,699 | 2020 |
| 8 | Really Need Somebody | 1,364 | 2020 |
| 9 | Lotus | 1,329 | 2020 |
| 10 | Just the 2 | 1,233 | 2020 |

## Complete Track Listing (Sorted by Views)

1. When It Rains (396,947 views) - 2021
2. The Coldest Winter (13,041 views) - 2020
3. INAG (12,660 views) - 2020
4. Every Hood (10,620 views) - 2020
5. Dr Dr (3,892 views) - 2021
6. The African Dream (3,427 views) - 2026
7. Dairy Free (1,699 views) - 2020
8. Really Need Somebody (1,364 views) - 2020
9. Lotus (1,329 views) - 2020
10. Just the 2 (1,233 views) - 2020
11. All Night Long (1,002 views) - 2020
12. Sweet Love (975 views) - 2020
13. Intentions (937 views) - 2020
14. Feeling It (769 views) - 2020
15. Ability (735 views) - 2020
16. Creep Life (726 views) - 2021
17. In Motion (724 views) - 2020
18. Speak Up (677 views) - 2021
19. Living it Up (525 views) - 2020
20. Move On (500 views) - 2020
21. Me & Mariah (480 views) - 2020
22. Fresh (368 views) - 2020
23. The Influence (363 views) - 2020
24. Too Bad Girl (349 views) - 2020
25. Pop Champ (342 views) - 2020
26. Bounce For Me (273 views) - 2020
27. Enjoy Yourself (261 views) - 2022
28. String Vest Season (213 views) - 2020
29. Against The World (190 views) - 2020
30. Promises (168 views) - 2020
31. 9 Months (168 views) - 2020
32. Drill & Chill (144 views) - 2024
33. Hey Ma 18 (133 views) - 2020
34. Summer Crush (131 views) - 2021
35. Dairy Free Changed Key (111 views) - 2020
36. Numbers Game (95 views) - 2020
37. Nevaeh (79 views) - 2020
38. Prod by SSK (75 views) - 2020
39. Where The Party At (73 views) - 2020
40. Drama Free (Version 2) (58 views) - 2020
41. Rodeo (58 views) - 2020
42. HighKey 18 (54 views) - 2020
43. New Zion (53 views) - 2020
44. SSK x Mokuba Lives - New Dream (39 views) - 2020
45. This is How We Do It (33 views) - 2020
46. A Whole New World (33 views) - 2020
47. Won-Ton (29 views) - 2020
48. Kenya (28 views) - 2020
49. Love Story 2 (28 views) - 2020
50. Sycho (28 views) - 2020
51. James Blake type beat - Parisian Girl (Prod. by SSK) (28 views) - 2020
52. SSK Lockdown Challenge instrumental (24 views) - 2021
53. Bogota (24 views) - 2020
54. High Times (22 views) - 2020
55. Everything you feel (22 views) - 2020
56. Dolla Bills (21 views) - 2020
57. Oh Baby (19 views) - 2021
58. Spring to Fall (19 views) - 2021
59. New wifey who dis (18 views) - 2021
60. Gym Buddy (18 views) - 2020
61. Fela Kuti type beat (14 views) - 2025
62. One Way Street (11 views) - 2021
63. West Coast Soul (11 views) - 2020
64. The Pull Up (8 views) - 2023
65. Caught Feels (6 views) - 2021
66. Follow My Lead (5 views) - 2026
67. Borrow & Buy - Prod by (4 views) - 2021
68. Watered Plants (2 views) - 2022
69. Magnificent (2 views) - 2021
70. Ghastly (2 views) - 2020
71. Zion 18 (1 view) - 2026
72. Aint No Fun (1 view) - 2021
73. Lightning (1 view) - 2020

## Processing Details

### Data Sources
- YouTube video reports from 2020-2026
- Monetized views data extracted and aggregated
- Track titles cleaned (removed producer credits)
- Duplicate tracks identified by title and merged

### Data Cleaning
- Removed producer credits from track titles (e.g., "- Prod. by SSK")
- Normalized whitespace and punctuation
- Combined views from multiple channels/videos for same track
- Extracted year from filename pattern

### Artist Attribution
- Default: "Various Artists" for producer credits
- Artist inference from CSV channel data where available
- All tracks credited as "SSK Music" as producer

### Output Format
JSON structure with the following fields per track:
- `id`: Unique identifier (track-001 to track-073)
- `title`: Cleaned track name
- `artist`: Artist or "Various Artists"
- `producer`: Always "SSK Music"
- `year`: Release year (earliest year from CSVs)
- `type`: Always "single"
- `youtube_views`: Total monetized views across all years
- `platforms`: YouTube link to primary video (if available)

## Files Generated

1. **discography.json** - Complete track data in JSON format
2. **extract_discography.py** - Python script for data extraction
3. **DISCOGRAPHY_EXTRACTION_REPORT.md** - This report

## Notes

- All data is derived from YouTube Content ID monetization reports
- Views represent monetized views only (may differ from total views)
- Year is extracted from CSV filename, not necessarily actual release date
- Some tracks appear in multiple CSVs (across different years/channels)
- Duplicate tracks were merged by title, combining their view counts

## Next Steps

To improve the data:
1. Manually verify artist names where "Various Artists" is used
2. Cross-reference with Spotify/streaming data if available
3. Add more platform links (Spotify, Apple Music, etc.)
4. Verify actual release years vs. year of monetization
5. Add genre tags or other metadata
