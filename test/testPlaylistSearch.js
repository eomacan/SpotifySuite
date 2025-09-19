#!/usr/bin/env node

/**
 * Test script for playlist search functionality
 * Supports multiple search modes: name, URL, and ID
 * 
 * Usage:
 *   node testPlaylistSearch.js -n "playlist_name" [owner]
 *   node testPlaylistSearch.js -u "https://open.spotify.com/playlist/ID"
 *   node testPlaylistSearch.js -i "playlist_id"
 */

const { 
    getAccessToken, 
    createSpotifyApiClient, 
    searchPlaylistsByName, 
    selectPlaylistFromList,
    getPlaylistById,
    getPlaylistByUrl
} = require('./spotify');

/**
 * Display usage information
 */
function showUsage() {
    console.log('Usage:');
    console.log('  node testPlaylistSearch.js -n "playlist_name" [owner]');
    console.log('  node testPlaylistSearch.js -u "https://open.spotify.com/playlist/ID"');
    console.log('  node testPlaylistSearch.js -i "playlist_id"');
    console.log('');
    console.log('Examples:');
    console.log('  node testPlaylistSearch.js -n "Today\'s Top Hits"');
    console.log('  node testPlaylistSearch.js -n "Art Pop" "yourusername"');
    console.log('  node testPlaylistSearch.js -u "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M"');
    console.log('  node testPlaylistSearch.js -i "37i9dQZF1DXcBWIGoYBM5M"');
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
 * Search for playlist using name mode
 * @param {Object} apiClient - Authenticated Spotify API client
 * @param {string} playlistName - Name of the playlist
 * @param {string|null} owner - Optional owner username
 * @returns {Promise<Object>} Selected playlist
 */
async function searchByName(apiClient, playlistName, owner) {
    console.log('\n2. Testing playlist search by name...');
    const playlists = await searchPlaylistsByName(apiClient, playlistName, owner);
    
    if (playlists.length === 0) {
        throw new Error(`No playlists found with name "${playlistName}"${owner ? ` by owner "${owner}"` : ''}`);
    }
    
    console.log('\n3. Testing playlist selection...');
    return await selectPlaylistFromList(playlists);
}

/**
 * Get playlist using URL mode
 * @param {Object} apiClient - Authenticated Spotify API client
 * @param {string} url - Playlist URL
 * @returns {Promise<Object>} Playlist object
 */
async function getByUrl(apiClient, url) {
    console.log('\n2. Testing playlist fetch by URL...');
    const playlist = await getPlaylistByUrl(apiClient, url);
    
    const ownerName = playlist.owner?.display_name || 'Unknown';
    const trackCount = playlist.tracks?.total || 0;
    console.log(`✓ Using playlist: "${playlist.name}" by ${ownerName} (${trackCount} tracks)`);
    
    return playlist;
}

/**
 * Get playlist using ID mode
 * @param {Object} apiClient - Authenticated Spotify API client
 * @param {string} playlistId - Playlist ID
 * @returns {Promise<Object>} Playlist object
 */
async function getById(apiClient, playlistId) {
    console.log('\n2. Testing playlist fetch by ID...');
    const playlist = await getPlaylistById(apiClient, playlistId);
    
    const ownerName = playlist.owner?.display_name || 'Unknown';
    const trackCount = playlist.tracks?.total || 0;
    console.log(`✓ Using playlist: "${playlist.name}" by ${ownerName} (${trackCount} tracks)`);
    
    return playlist;
}

/**
 * Main test function
 */
async function testPlaylistSearch() {
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
    
    console.log('Testing Playlist Search Module...\n');
    
    try {
        // Get authenticated API client
        console.log('1. Getting Spotify authentication...');
        const accessToken = await getAccessToken();
        const apiClient = createSpotifyApiClient(accessToken);
        console.log('✓ Authentication successful');
        
        let selectedPlaylist;
        
        // Execute based on search mode
        switch (parsed.mode) {
            case 'name':
                selectedPlaylist = await searchByName(apiClient, parsed.playlistName, parsed.owner);
                break;
                
            case 'url':
                selectedPlaylist = await getByUrl(apiClient, parsed.url);
                break;
                
            case 'id':
                selectedPlaylist = await getById(apiClient, parsed.playlistId);
                break;
        }
        
        // Display results
        console.log('\n✓ Playlist access successful!');
        console.log('Selected playlist details:');
        console.log('- ID:', selectedPlaylist.id);
        console.log('- Name:', selectedPlaylist.name);
        console.log('- Owner:', selectedPlaylist.owner?.display_name || 'Unknown');
        console.log('- Tracks:', selectedPlaylist.tracks?.total || 0);
        console.log('- Public:', selectedPlaylist.public);
        console.log('- URL: https://open.spotify.com/playlist/' + selectedPlaylist.id);
        
    } catch (error) {
        console.log('✗ Playlist search test failed:', error.message);
        return false;
    }
    
    console.log('\n✓ Playlist search module test completed successfully!');
    return true;
}

// Run the test
testPlaylistSearch().catch(console.error);