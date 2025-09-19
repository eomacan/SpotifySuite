/**
 * Unified Spotify API Module
 * Handles authentication and all Spotify API operations
 */

const axios = require('axios');
const readline = require('readline');
const { loadSpotifyConfig } = require('./config');

/**
 * Get access token from Spotify API using Client Credentials flow
 * @returns {Promise<string>} Access token for API requests
 * @throws {Error} If authentication fails
 */
async function getAccessToken() {
    const config = loadSpotifyConfig();
    
    // Prepare authentication data
    const authData = new URLSearchParams();
    authData.append('grant_type', 'client_credentials');
    
    // Create base64 encoded client credentials
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
    
    try {
        console.log('Authenticating with Spotify API...');
        
        const response = await axios.post(config.authUrl, authData, {
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        if (response.data.access_token) {
            console.log('✓ Successfully authenticated with Spotify API');
            return response.data.access_token;
        } else {
            throw new Error('No access token received from Spotify');
        }
        
    } catch (error) {
        if (error.response) {
            throw new Error(`Spotify authentication failed: ${error.response.status} - ${error.response.data.error_description || error.response.data.error}`);
        } else {
            throw new Error(`Network error during authentication: ${error.message}`);
        }
    }
}

/**
 * Create authenticated axios instance for Spotify API calls
 * @param {string} accessToken - Valid Spotify access token
 * @returns {Object} Configured axios instance
 */
function createSpotifyApiClient(accessToken) {
    const config = loadSpotifyConfig();
    
    return axios.create({
        baseURL: config.apiBaseUrl,
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });
}

/**
 * Search for playlists by name using Spotify API
 * @param {Object} apiClient - Authenticated Spotify API client
 * @param {string} playlistName - Name of the playlist to search for
 * @param {string} [owner] - Optional owner username to filter results
 * @returns {Promise<Array>} Array of matching playlists
 * @throws {Error} If search fails
 */
async function searchPlaylistsByName(apiClient, playlistName, owner = null) {
    try {
        let searchQuery = playlistName;
        let logMessage = `Searching for playlists with name: "${playlistName}"`;
        
        if (owner) {
            searchQuery += ` owner:${owner}`;
            logMessage += ` by owner: "${owner}"`;
        }
        
        console.log(logMessage + '...');
        
        // Search for playlists using Spotify API
        const response = await apiClient.get('/search', {
            params: {
                q: searchQuery,
                type: 'playlist',
                limit: 50 // Get up to 50 results to handle duplicates
            }
        });
        
        const playlists = response.data.playlists.items;
        
        // Filter to exact name matches (case-insensitive) with null checks
        let exactMatches = playlists.filter(playlist => 
            playlist && 
            playlist.name && 
            playlist.name.toLowerCase() === playlistName.toLowerCase()
        );
        
        // If owner specified, further filter by owner
        if (owner) {
            exactMatches = exactMatches.filter(playlist =>
                playlist.owner && 
                playlist.owner.id &&
                playlist.owner.id.toLowerCase() === owner.toLowerCase()
            );
        }
        
        console.log(`Found ${exactMatches.length} playlist(s) with exact name match`);
        
        return exactMatches;
        
    } catch (error) {
        if (error.response) {
            throw new Error(`Playlist search failed: ${error.response.status} - ${error.response.data.error?.message || 'Unknown error'}`);
        } else {
            throw new Error(`Network error during playlist search: ${error.message}`);
        }
    }
}

/**
 * Extract playlist ID from Spotify URL
 * @param {string} url - Spotify playlist URL
 * @returns {string} Playlist ID
 * @throws {Error} If URL format is invalid
 */
function extractPlaylistIdFromUrl(url) {
    // Support both HTTP and Spotify URI formats
    const httpMatch = url.match(/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
    const uriMatch = url.match(/spotify:playlist:([a-zA-Z0-9]+)/);
    
    const playlistId = httpMatch?.[1] || uriMatch?.[1];
    
    if (!playlistId) {
        throw new Error('Invalid Spotify playlist URL format. Expected: https://open.spotify.com/playlist/ID or spotify:playlist:ID');
    }
    
    return playlistId;
}

/**
 * Get playlist by ID using Spotify API
 * @param {Object} apiClient - Authenticated Spotify API client
 * @param {string} playlistId - Spotify playlist ID
 * @returns {Promise<Object>} Playlist object
 * @throws {Error} If playlist fetch fails
 */
async function getPlaylistById(apiClient, playlistId) {
    try {
        console.log(`Fetching playlist with ID: "${playlistId}"...`);
        
        const response = await apiClient.get(`/playlists/${playlistId}`);
        
        if (!response.data) {
            throw new Error('No playlist data received');
        }
        
        console.log(`✓ Successfully fetched playlist: "${response.data.name}"`);
        return response.data;
        
    } catch (error) {
        if (error.response) {
            if (error.response.status === 404) {
                throw new Error('Playlist not found. Please check the playlist ID and ensure it is public.');
            }
            throw new Error(`Playlist fetch failed: ${error.response.status} - ${error.response.data.error?.message || 'Unknown error'}`);
        } else {
            throw new Error(`Network error during playlist fetch: ${error.message}`);
        }
    }
}

/**
 * Get all tracks from a playlist with pagination handling
 * @param {Object} apiClient - Authenticated Spotify API client
 * @param {string} playlistId - Spotify playlist ID
 * @returns {Promise<Array>} Array of track objects with detailed information
 * @throws {Error} If track retrieval fails
 */
async function getPlaylistTracks(apiClient, playlistId) {
    try {
        console.log('Retrieving playlist tracks...');
        
        let allTracks = [];
        let offset = 0;
        const limit = 50; // Spotify API limit per request
        let total = 0;
        
        do {
            const endRange = total > 0 ? Math.min(offset + limit, total) : offset + limit;
            console.log(`Fetching tracks ${offset + 1}-${endRange}...`);
            
            const response = await apiClient.get(`/playlists/${playlistId}/tracks`, {
                params: {
                    offset: offset,
                    limit: limit,
                    fields: 'total,items(track(id,name,artists(name),album(name,release_date),duration_ms,popularity))'
                }
            });
            
            if (!response.data || !response.data.items) {
                throw new Error('Invalid track data received from Spotify API');
            }
            
            // Set total on first request
            if (offset === 0) {
                total = response.data.total;
                console.log(`Total tracks in playlist: ${total}`);
            }
            
            // Filter out null tracks and add to collection
            const validTracks = response.data.items
                .filter(item => item && item.track && item.track.id)
                .map(item => item.track);
            
            allTracks.push(...validTracks);
            offset += limit;
            
        } while (offset < total);
        
        console.log(`✓ Successfully retrieved ${allTracks.length} tracks`);
        return allTracks;
        
    } catch (error) {
        if (error.response) {
            throw new Error(`Track retrieval failed: ${error.response.status} - ${error.response.data.error?.message || 'Unknown error'}`);
        } else {
            throw new Error(`Network error during track retrieval: ${error.message}`);
        }
    }
}

/**
 * Format track data for CSV export with Turkish locale
 * @param {Array} tracks - Array of track objects from Spotify API
 * @returns {Array} Array of formatted track data objects
 */
function formatTracksForCsv(tracks) {
    const { getLocaleConfig } = require('./config');
    const localeConfig = getLocaleConfig();
    
    return tracks.map(track => {
        // Extract basic track information
        const trackName = track.name || 'Unknown Track';
        const artistName = track.artists && track.artists.length > 0 
            ? track.artists.map(artist => artist.name).join(', ')
            : 'Unknown Artist';
        const albumName = track.album?.name || 'Unknown Album';
        
        // Extract and format album year
        let albumYear = '';
        if (track.album?.release_date) {
            const releaseDate = new Date(track.album.release_date);
            if (!isNaN(releaseDate.getTime())) {
                albumYear = releaseDate.getFullYear().toString();
            }
        }
        
        // Format track duration from milliseconds to MM:SS format
        let trackDuration = '';
        if (track.duration_ms) {
            const totalSeconds = Math.floor(track.duration_ms / 1000);
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            trackDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        
        // Format track popularity (0-100) with Turkish locale
        const trackPopularity = track.popularity !== undefined 
            ? track.popularity.toLocaleString(localeConfig.locale, localeConfig.numberOptions)
            : '';
        
        // Spotify Track ID for future playlist creation
        const spotifyTrackId = track.id || '';
        
        return {
            'Track Name': trackName,
            'Artist Name': artistName,
            'Album Name': albumName,
            'Album Year': albumYear,
            'Track Duration': trackDuration,
            'Track Popularity': trackPopularity,
            'Spotify Track ID': spotifyTrackId
        };
    });
}

/**
 * Search for tracks by name and artist using Spotify API
 * @param {Object} apiClient - Authenticated Spotify API client
 * @param {string} trackName - Name of the track to search for
 * @param {string} artistName - Name of the artist
 * @returns {Promise<Array>} Array of matching track objects with album information
 * @throws {Error} If search fails
 */
async function searchTracksByNameAndArtist(apiClient, trackName, artistName) {
    try {
        console.log(`Searching for track: "${trackName}" by artist: "${artistName}"...`);
        
        // Build search query - track name and artist name
        const searchQuery = `track:"${trackName}" artist:"${artistName}"`;
        
        // Search for tracks using Spotify API
        const response = await apiClient.get('/search', {
            params: {
                q: searchQuery,
                type: 'track',
                limit: 50 // Get up to 50 results
            }
        });
        
        const tracks = response.data.tracks.items;
        
        if (!tracks || tracks.length === 0) {
            console.log('No tracks found with the specified criteria');
            return [];
        }
        
        // Filter tracks that match our criteria
        const matchingTracks = tracks.filter(track => {
            // Check if track name matches (case-insensitive)
            const trackNameMatches = track.name && 
                track.name.toLowerCase().includes(trackName.toLowerCase());
            
            // Check if any of the track's artists match the specified artist
            const artistMatches = track.artists && track.artists.some(artist => 
                artist.name && 
                artist.name.toLowerCase().includes(artistName.toLowerCase())
            );
            
            return trackNameMatches && artistMatches;
        });
        
        console.log(`Found ${matchingTracks.length} matching track(s)`);
        
        return matchingTracks;
        
    } catch (error) {
        if (error.response) {
            throw new Error(`Track search failed: ${error.response.status} - ${error.response.data.error?.message || 'Unknown error'}`);
        } else {
            throw new Error(`Network error during track search: ${error.message}`);
        }
    }
}

/**
 * Format album information from track data
 * @param {Array} tracks - Array of track objects from Spotify API
 * @returns {Array} Array of formatted album information
 */
function formatAlbumInformation(tracks) {
    const { getLocaleConfig } = require('./config');
    const localeConfig = getLocaleConfig();
    
    return tracks.map(track => {
        // Extract album information
        const albumName = track.album?.name || 'Unknown Album';
        const albumType = track.album?.album_type || 'Unknown';
        
        // Format release date
        let releaseDate = 'Unknown';
        let releaseYear = 0; // For sorting
        
        if (track.album?.release_date) {
            const date = new Date(track.album.release_date);
            if (!isNaN(date.getTime())) {
                releaseDate = date.toLocaleDateString(localeConfig.locale, localeConfig.dateOptions);
                releaseYear = date.getFullYear();
            }
        }
        
        // Get all artists for this track
        const trackArtists = track.artists ? 
            track.artists.map(artist => artist.name).join(', ') : 
            'Unknown Artist';
        
        return {
            trackName: track.name || 'Unknown Track',
            albumName: albumName,
            releaseDate: releaseDate,
            releaseYear: releaseYear, // For sorting
            albumType: albumType.charAt(0).toUpperCase() + albumType.slice(1), // Capitalize
            trackArtists: trackArtists,
            albumId: track.album?.id || '',
            trackId: track.id || ''
        };
    });
}

/**
 * Sort album information by release year (oldest first)
 * @param {Array} albumInfo - Array of formatted album information
 * @returns {Array} Sorted array of album information
 */
function sortAlbumsByReleaseYear(albumInfo) {
    return albumInfo.sort((a, b) => {
        // Sort by release year, then by album name
        if (a.releaseYear !== b.releaseYear) {
            return a.releaseYear - b.releaseYear;
        }
        return a.albumName.localeCompare(b.albumName);
    });
}

/**
 * Get formatted album information for a track with release year filtering
 * @param {Object} apiClient - Authenticated Spotify API client
 * @param {string} trackName - Name of the track
 * @param {string} artistName - Name of the artist
 * @param {string} [albumTypeFilter] - Optional album type filter (e.g., "album", "single", "compilation")
 * @param {number} [beforeYear] - Optional filter to only include albums released before this year
 * @returns {Promise<Array>} Array of formatted and sorted album information
 */
async function getTrackAlbumInformation(apiClient, trackName, artistName, albumTypeFilter = null, beforeYear = null) {
    const tracks = await searchTracksByNameAndArtist(apiClient, trackName, artistName);
    let albumInfo = formatAlbumInformation(tracks);
    
    // Apply album type filter if specified
    if (albumTypeFilter) {
        albumInfo = albumInfo.filter(info => 
            info.albumType.toLowerCase() === albumTypeFilter.toLowerCase()
        );
    }
    
    // Apply release year filter if specified (before the given year)
    if (beforeYear && typeof beforeYear === 'number') {
        albumInfo = albumInfo.filter(info => 
            info.releaseYear > 0 && info.releaseYear < beforeYear
        );
    }
    
    return sortAlbumsByReleaseYear(albumInfo);
}

/**
 * Generate Spotify authorization URL for user login
 * @param {string} clientId - Spotify client ID
 * @param {string} redirectUri - OAuth redirect URI
 * @param {Array} scopes - Array of required scopes
 * @param {string} state - Random state string for security
 * @returns {string} Authorization URL
 */
function generateAuthorizationUrl(clientId, redirectUri, scopes, state) {
    const scopeString = scopes.join(' ');
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        scope: scopeString,
        redirect_uri: redirectUri,
        state: state
    });
    
    return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 * @param {string} code - Authorization code from OAuth callback
 * @param {string} redirectUri - OAuth redirect URI
 * @returns {Promise<Object>} Token response with access_token and refresh_token
 * @throws {Error} If token exchange fails
 */
async function exchangeCodeForToken(code, redirectUri) {
    const config = loadSpotifyConfig();
    
    const tokenData = new URLSearchParams();
    tokenData.append('grant_type', 'authorization_code');
    tokenData.append('code', code);
    tokenData.append('redirect_uri', redirectUri);
    
    const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
    
    try {
        console.log('Exchanging authorization code for access token...');
        
        const response = await axios.post(config.authUrl, tokenData, {
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        
        if (response.data.access_token) {
            console.log('✓ Successfully obtained user access token');
            return response.data;
        } else {
            throw new Error('No access token received from Spotify');
        }
        
    } catch (error) {
        if (error.response) {
            throw new Error(`Token exchange failed: ${error.response.status} - ${error.response.data.error_description || error.response.data.error}`);
        } else {
            throw new Error(`Network error during token exchange: ${error.message}`);
        }
    }
}

/**
 * Get current user's Spotify profile
 * @param {Object} apiClient - Authenticated Spotify API client
 * @returns {Promise<Object>} User profile information
 * @throws {Error} If profile fetch fails
 */
async function getCurrentUserProfile(apiClient) {
    try {
        const response = await apiClient.get('/me');
        return response.data;
    } catch (error) {
        if (error.response) {
            throw new Error(`Failed to get user profile: ${error.response.status} - ${error.response.data.error?.message || 'Unknown error'}`);
        } else {
            throw new Error(`Network error getting user profile: ${error.message}`);
        }
    }
}

/**
 * Create a new playlist for the user
 * @param {Object} apiClient - Authenticated Spotify API client
 * @param {string} userId - User's Spotify ID
 * @param {string} playlistName - Name for the new playlist
 * @param {boolean} isPublic - Whether the playlist should be public
 * @returns {Promise<Object>} Created playlist information
 * @throws {Error} If playlist creation fails
 */
async function createPlaylist(apiClient, userId, playlistName, isPublic = true) {
    try {
        console.log(`Creating ${isPublic ? 'public' : 'private'} playlist: "${playlistName}"...`);
        
        const playlistData = {
            name: playlistName,
            public: isPublic,
            collaborative: false,
            description: `Created via Spotify Suite - ${new Date().toLocaleDateString()}`
        };
        
        const response = await apiClient.post(`/users/${userId}/playlists`, playlistData);
        
        console.log('✓ Playlist created successfully');
        return response.data;
        
    } catch (error) {
        if (error.response) {
            throw new Error(`Playlist creation failed: ${error.response.status} - ${error.response.data.error?.message || 'Unknown error'}`);
        } else {
            throw new Error(`Network error during playlist creation: ${error.message}`);
        }
    }
}

/**
 * Add tracks to a playlist in batches
 * @param {Object} apiClient - Authenticated Spotify API client
 * @param {string} playlistId - ID of the playlist to add tracks to
 * @param {Array} trackIds - Array of Spotify track IDs
 * @returns {Promise<Object>} Results with successful and failed tracks
 * @throws {Error} If adding tracks fails
 */
async function addTracksToPlaylist(apiClient, playlistId, trackIds) {
    try {
        console.log(`Adding ${trackIds.length} tracks to playlist...`);
        
        const validTrackIds = trackIds.filter(id => id && typeof id === 'string' && id.trim() !== '');
        const skippedCount = trackIds.length - validTrackIds.length;
        
        if (validTrackIds.length === 0) {
            return { successful: 0, failed: trackIds.length, skipped: skippedCount };
        }
        
        let successful = 0;
        let failed = 0;
        
        // Add tracks in batches of 100 (Spotify API limit)
        const batchSize = 100;
        
        for (let i = 0; i < validTrackIds.length; i += batchSize) {
            const batch = validTrackIds.slice(i, i + batchSize);
            const trackUris = batch.map(id => `spotify:track:${id}`);
            
            try {
                await apiClient.post(`/playlists/${playlistId}/tracks`, {
                    uris: trackUris
                });
                
                successful += batch.length;
                console.log(`✓ Added batch ${Math.floor(i / batchSize) + 1}: ${batch.length} tracks`);
                
            } catch (batchError) {
                console.warn(`⚠️  Failed to add batch ${Math.floor(i / batchSize) + 1}: ${batch.length} tracks`);
                failed += batch.length;
            }
            
            // Small delay between batches to avoid rate limiting
            if (i + batchSize < validTrackIds.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        return { successful, failed, skipped: skippedCount };
        
    } catch (error) {
        throw new Error(`Failed to add tracks to playlist: ${error.message}`);
    }
}

/**
 * Display playlist options and get user selection
 * @param {Array} playlists - Array of playlist objects
 * @returns {Promise<Object>} Selected playlist object
 */
async function selectPlaylistFromList(playlists) {
    if (playlists.length === 0) {
        throw new Error('No playlists found with the specified name');
    }
    
    if (playlists.length === 1) {
        const playlist = playlists[0];
        const ownerName = playlist.owner?.display_name || 'Unknown';
        const trackCount = playlist.tracks?.total || 0;
        console.log(`Using playlist: "${playlist.name}" by ${ownerName} (${trackCount} tracks)`);
        return playlist;
    }
    
    // Multiple playlists found - show options
    console.log('\nMultiple playlists found with that name:');
    console.log('');
    
    playlists.forEach((playlist, index) => {
        const ownerName = playlist.owner?.display_name || 'Unknown';
        const trackCount = playlist.tracks?.total || 0;
        const description = playlist.description || 'No description';
        const isPublic = playlist.public ? 'Yes' : 'No';
        const followers = playlist.followers?.total || 0;
        
        console.log(`${index + 1}. "${playlist.name}" by ${ownerName}`);
        console.log(`   Tracks: ${trackCount} | Description: ${description}`);
        console.log(`   Public: ${isPublic} | Followers: ${followers}`);
        console.log('');
    });
    
    return await promptUserSelection(playlists);
}

/**
 * Prompt user to select a playlist from multiple options
 * @param {Array} playlists - Array of playlist objects
 * @returns {Promise<Object>} Selected playlist object
 */
async function promptUserSelection(playlists) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve, reject) => {
        rl.question(`Please select a playlist (1-${playlists.length}): `, (answer) => {
            rl.close();
            
            const selection = parseInt(answer.trim());
            
            if (isNaN(selection) || selection < 1 || selection > playlists.length) {
                reject(new Error(`Invalid selection. Please enter a number between 1 and ${playlists.length}`));
                return;
            }
            
            const selectedPlaylist = playlists[selection - 1];
            const ownerName = selectedPlaylist.owner?.display_name || 'Unknown';
            console.log(`Selected: "${selectedPlaylist.name}" by ${ownerName}`);
            resolve(selectedPlaylist);
        });
    });
}

/**
 * Get playlist by URL using Spotify API
 * @param {Object} apiClient - Authenticated Spotify API client
 * @param {string} url - Spotify playlist URL
 * @returns {Promise<Object>} Playlist object
 * @throws {Error} If URL is invalid or playlist fetch fails
 */
async function getPlaylistByUrl(apiClient, url) {
    const playlistId = extractPlaylistIdFromUrl(url);
    return await getPlaylistById(apiClient, playlistId);
}

/**
 * Get formatted track data from playlist
 * @param {Object} apiClient - Authenticated Spotify API client
 * @param {string} playlistId - Spotify playlist ID
 * @returns {Promise<Array>} Array of formatted track data for CSV export
 */
async function getFormattedPlaylistTracks(apiClient, playlistId) {
    const tracks = await getPlaylistTracks(apiClient, playlistId);
    return formatTracksForCsv(tracks);
}

/**
 * Find the earliest album for a track before a given year
 * @param {Object} apiClient - Authenticated Spotify API client
 * @param {string} trackName - Name of the track
 * @param {string} artistName - Name of the artist
 * @param {number} beforeYear - Only include albums released before this year
 * @returns {Promise<Object|null>} First (earliest) album information or null if none found
 */
async function findEarliestAlbumBeforeYear(apiClient, trackName, artistName, beforeYear) {
    const albumInfo = await getTrackAlbumInformation(
        apiClient, 
        trackName, 
        artistName, 
        'album',      // Only regular albums
        beforeYear    // Only before given year
    );
    
    // Return the first (earliest) album or null if none found
    return albumInfo.length > 0 ? albumInfo[0] : null;
}

module.exports = {
    getAccessToken,
    createSpotifyApiClient,
    searchPlaylistsByName,
    selectPlaylistFromList,
    getPlaylistById,
    getPlaylistByUrl,
    extractPlaylistIdFromUrl,
    getPlaylistTracks,
    formatTracksForCsv,
    getFormattedPlaylistTracks,
    searchTracksByNameAndArtist,
    formatAlbumInformation,
    sortAlbumsByReleaseYear,
    getTrackAlbumInformation,
    findEarliestAlbumBeforeYear,
    generateAuthorizationUrl,
    exchangeCodeForToken,
    getCurrentUserProfile,
    createPlaylist,
    addTracksToPlaylist
};