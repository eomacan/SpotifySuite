#!/usr/bin/env node

/**
 * Test script for CSV export functionality
 * 
 * Usage:
 *   node testCsvExport.js -n "playlist_name" [owner]
 *   node testCsvExport.js -u "https://open.spotify.com/playlist/ID"
 *   node testCsvExport.js -i "playlist_id"
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

const { 
    exportTracksToCSV, 
    validateTrackData 
} = require('./csvExport');

/**
 * Display usage information
 */
function showUsage() {
    console.log('Usage:');
    console.log('  node testCsvExport.js -n "playlist_name" [owner]');
    console.log('  node testCsvExport.js -u "https://open.spotify.com/playlist/ID"');
    console.log('  node testCsvExport.js -i "playlist_id"');
    console.log('');
    console.log('Examples:');
    console.log('  node testCsvExport.js -n "Today\'s Top Hits"');
    console.log('  node testCsvExport.js -u "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"');
    console.log('  node testCsvExport.js -i "37i9dQZF1DXcBWIGoYBM5M"');
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
 * Main test function
 */
async function testCsvExport() {
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
    
    console.log('Testing CSV Export Module...\n');
    
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
        
        // Get track data
        console.log('\n4. Retrieving track data...');
        const trackData = await getFormattedPlaylistTracks(apiClient, playlist.id);
        console.log('✓ Track data retrieved successfully');
        
        // Validate track data
        console.log('\n5. Validating track data structure...');
        const validation = validateTrackData(trackData);
        
        if (!validation.valid) {
            throw new Error(`Track data validation failed: ${validation.error}`);
        }
        
        console.log('✓ Track data validation passed');
        console.log(`- Total tracks: ${validation.trackCount}`);
        console.log(`- Columns per track: ${validation.columnsCount}`);
        
        if (validation.tracksWithoutId > 0) {
            console.log(`- Warning: ${validation.tracksWithoutId} tracks missing Spotify ID`);
        }
        
        // Export to CSV
        console.log('\n6. Exporting to CSV...');
        const exportResult = await exportTracksToCSV(trackData, playlist.name);
        
        console.log('✓ CSV export successful!');
        console.log('Export details:');
        console.log(`- Filename: ${exportResult.filename}`);
        console.log(`- Full path: ${exportResult.fullPath}`);
        console.log(`- Tracks exported: ${exportResult.trackCount}`);
        
        // Test file conflict handling
        console.log('\n7. Testing filename conflict handling...');
        const exportResult2 = await exportTracksToCSV(trackData, playlist.name);
        console.log(`✓ Second export created with unique filename: ${exportResult2.filename}`);
        
    } catch (error) {
        console.log('✗ CSV export test failed:', error.message);
        return false;
    }
    
    console.log('\n✓ CSV export module test completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Open the CSV file in Google Sheets to verify import compatibility');
    console.log('2. Check Turkish locale formatting (numbers with comma decimal separator)');
    console.log('3. Verify all track data is correctly formatted and complete');
    
    return true;
}

// Run the test
testCsvExport().catch(console.error);