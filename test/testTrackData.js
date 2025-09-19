#!/usr/bin/env node

/**
 * Test script for track data retrieval functionality
 * 
 * Usage:
 *   node testTrackData.js -n "playlist_name" [owner]
 *   node testTrackData.js -u "https://open.spotify.com/playlist/ID"
 *   node testTrackData.js -i "playlist_id"
 */

const { 
    getAccessToken, 
    createSpotifyApiClient, 
    searchPlaylistsByName, 
    selectPlaylistFromList,
    getPlaylistById,
    getPlaylistByUrl,
    getFormattedPlaylistTracks
} = require('./spotify');

/**
 * Display usage information
 */
function showUsage() {
    console.log('Usage:');
    console.log('  node testTrackData.js -n "playlist_name" [owner]');
    console.log('  node testTrackData.js -u "https://open.spotify.com/playlist/ID"');
    console.log('  node testTrackData.js -i "playlist_id"');
    console.log('');
    console.log('Examples:');
    console.log('  node testTrackData.js -n "Today\'s Top Hits"');
    console.log('  node testTrackData.js -u "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"');
    console.log('  node testTrackData.js -i "37i9dQZF1DXcBWIGoYBM5M"');
}

/**
 * Parse command line arguments
 * @returns {Object} Parsed arguments object
 */
function parseArguments() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        return { mode: 'help' };
    }
    
    const mode = args[0];
    
    switch (mode) {
        case '-n':
            if (args.length < 2) {
                return { mode: 'error', message: 'Name search requires playlist name' };
            }
            return {
                mode: 'name',
                playlistName: args[1],
                owner: args[2] || null
            };
            
        case '-u':
            if (args.length < 2) {
                return { mode: 'error', message: 'URL search requires playlist URL' };
            }
            return {
                mode: 'url',
                url: args[1]
            };
            
        case '-i':
            if (args.length < 2) {
                return { mode: 'error', message: 'ID search requires playlist ID' };
            }
            return {
                mode: 'id',
                playlistId: args[1]
            };
            
        default:
            return { mode: 'error', message: `Unknown mode: ${mode}` };
    }
}

/**
 * Get playlist based on search mode
 * @param {Object} apiClient - Authenticated Spotify API client
 * @param {Object} parsed - Parsed command line arguments
 * @returns {Promise<Object>} Playlist object
 */
async function getPlaylist(apiClient, parsed) {
    let playlist;
    
    switch (parsed.mode) {
        case 'name':
            console.log('\n2. Searching for playlist by name...');
            const playlists = await searchPlaylistsByName(apiClient, parsed.playlistName, parsed.owner);
            
            if (playlists.length === 0) {
                throw new Error(`No playlists found with name "${parsed.playlistName}"${parsed.owner ? ` by owner "${parsed.owner}"` : ''}`);
            }
            
            console.log('\n3. Selecting playlist...');
            playlist = await selectPlaylistFromList(playlists);
            break;
            
        case 'url':
            console.log('\n2. Fetching playlist by URL...');
            playlist = await getPlaylistByUrl(apiClient, parsed.url);
            break;
            
        case 'id':
            console.log('\n2. Fetching playlist by ID...');
            playlist = await getPlaylistById(apiClient, parsed.playlistId);
            break;
    }
    
    return playlist;
}

/**
 * Display sample track data
 * @param {Array} trackData - Formatted track data array
 * @param {number} sampleCount - Number of sample tracks to display
 */
function displaySampleTracks(trackData, sampleCount = 3) {
    console.log(`\nSample tracks (showing first ${Math.min(sampleCount, trackData.length)} of ${trackData.length}):`);
    console.log('='.repeat(80));
    
    trackData.slice(0, sampleCount).forEach((track, index) => {
        console.log(`\n${index + 1}. Track Name: ${track['Track Name']}`);
        console.log(`   Artist: ${track['Artist Name']}`);
        console.log(`   Album: ${track['Album Name']} (${track['Album Year']})`);
        console.log(`   Duration: ${track['Track Duration']}`);
        console.log(`   Popularity: ${track['Track Popularity']}`);
        console.log(`   Spotify ID: ${track['Spotify Track ID']}`);
    });
    
    if (trackData.length > sampleCount) {
        console.log(`\n... and ${trackData.length - sampleCount} more tracks`);
    }
}

/**
 * Main test function
 */
async function testTrackData() {
    const parsed = parseArguments();
    
    if (parsed.mode === 'help') {
        showUsage();
        return true;
    }
    
    if (parsed.mode === 'error') {
        console.log('Error:', parsed.message);
        console.log('');
        showUsage();
        return false;
    }
    
    console.log('Testing Track Data Retrieval Module...\n');
    
    try {
        // Get authenticated API client
        console.log('1. Getting Spotify authentication...');
        const accessToken = await getAccessToken();
        const apiClient = createSpotifyApiClient(accessToken);
        console.log('✓ Authentication successful');
        
        // Get playlist
        const playlist = await getPlaylist(apiClient, parsed);
        
        const ownerName = playlist.owner?.display_name || 'Unknown';
        const trackCount = playlist.tracks?.total || 0;
        console.log(`✓ Using playlist: "${playlist.name}" by ${ownerName} (${trackCount} tracks)`);
        
        // Test track data retrieval
        console.log('\n4. Retrieving and formatting track data...');
        const trackData = await getFormattedPlaylistTracks(apiClient, playlist.id);
        
        console.log('✓ Track data retrieval successful!');
        console.log('Track data format verification:');
        console.log('- Total tracks processed:', trackData.length);
        console.log('- Data fields per track:', Object.keys(trackData[0] || {}).length);
        console.log('- Expected columns:', 'Track Name, Artist Name, Album Name, Album Year, Track Duration, Track Popularity, Spotify Track ID');
        
        // Display sample tracks
        if (trackData.length > 0) {
            displaySampleTracks(trackData);
            
            // Verify Turkish locale formatting
            console.log('\n✓ Turkish locale formatting verification:');
            const sampleTrack = trackData[0];
            console.log('- Popularity format:', typeof sampleTrack['Track Popularity'], '→', sampleTrack['Track Popularity']);
            console.log('- Duration format:', typeof sampleTrack['Track Duration'], '→', sampleTrack['Track Duration']);
        }
        
    } catch (error) {
        console.log('✗ Track data test failed:', error.message);
        return false;
    }
    
    console.log('\n✓ Track data retrieval module test completed successfully!');
    return true;
}

// Run the test
testTrackData().catch(console.error);