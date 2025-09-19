#!/usr/bin/env node

/**
 * Spotify Playlist Exporter
 * Export Spotify playlist to CSV file for Google Sheets import
 * 
 * Usage:
 *   node exportPlaylist.js -n "playlist_name" [owner]
 *   node exportPlaylist.js -u "https://open.spotify.com/playlist/ID"
 *   node exportPlaylist.js -i "playlist_id"
 * 
 * Requirements:
 *   - SPOTIFY_CLIENT_ID environment variable
 *   - SPOTIFY_CLIENT_SECRET environment variable
 */

const { 
    getAccessToken, 
    createSpotifyApiClient, 
    searchPlaylistsByName, 
    selectPlaylistFromList,
    getPlaylistById,
    getPlaylistByUrl,
    getFormattedPlaylistTracks
} = require('../lib/spotify');

const { 
    exportTracksToCSV, 
    validateTrackData 
} = require('../lib/csvExport');

/**
 * Display application header
 */
function showHeader() {
    console.log('='.repeat(60));
    console.log('🎵  Spotify Playlist Exporter to CSV');
    console.log('    Export your playlists for Google Sheets');
    console.log('='.repeat(60));
}

/**
 * Display usage information
 */
function showUsage() {
    console.log('\nUsage:');
    console.log('  node exportPlaylist.js -n "playlist_name" [owner]');
    console.log('  node exportPlaylist.js -u "https://open.spotify.com/playlist/ID"');
    console.log('  node exportPlaylist.js -i "playlist_id"');
    console.log('');
    console.log('Search Modes:');
    console.log('  -n    Search by playlist name (with optional owner)');
    console.log('  -u    Use playlist URL');
    console.log('  -i    Use playlist ID');
    console.log('');
    console.log('Examples:');
    console.log('  node exportPlaylist.js -n "Today\'s Top Hits"');
    console.log('  node exportPlaylist.js -n "My Playlist" "my_username"');
    console.log('  node exportPlaylist.js -u "https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd"');
    console.log('  node exportPlaylist.js -i "37i9dQZF1DX0XUsuxWHRQd"');
    console.log('');
    console.log('Environment Variables Required:');
    console.log('  SPOTIFY_CLIENT_ID      Your Spotify app client ID');
    console.log('  SPOTIFY_CLIENT_SECRET  Your Spotify app client secret');
    console.log('');
    console.log('Output:');
    console.log('  Creates CSV file: "playlist_name.csv" in current directory');
    console.log('  File format: Compatible with Google Sheets (Turkish locale)');
    console.log('  Columns: Track Name, Artist Name, Album Name, Album Year,');
    console.log('           Track Duration, Track Popularity, Spotify Track ID');
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
        case '--name':
            if (args.length < 2) {
                return { mode: 'error', message: 'Name search requires playlist name' };
            }
            return {
                mode: 'name',
                playlistName: args[1],
                owner: args[2] || null
            };
            
        case '-u':
        case '--url':
            if (args.length < 2) {
                return { mode: 'error', message: 'URL search requires playlist URL' };
            }
            return {
                mode: 'url',
                url: args[1]
            };
            
        case '-i':
        case '--id':
            if (args.length < 2) {
                return { mode: 'error', message: 'ID search requires playlist ID' };
            }
            return {
                mode: 'id',
                playlistId: args[1]
            };
            
        case '-h':
        case '--help':
            return { mode: 'help' };
            
        default:
            return { mode: 'error', message: `Unknown option: ${mode}. Use -h for help.` };
    }
}

/**
 * Check environment variables
 * @returns {boolean} True if all required variables are set
 */
function checkEnvironment() {
    const required = ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'];
    const missing = required.filter(envVar => !process.env[envVar]);
    
    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach(envVar => console.error(`   ${envVar}`));
        console.error('\nPlease set your Spotify API credentials:');
        console.error('   export SPOTIFY_CLIENT_ID="your_client_id"');
        console.error('   export SPOTIFY_CLIENT_SECRET="your_client_secret"');
        console.error('\nGet your credentials at: https://developer.spotify.com/dashboard');
        return false;
    }
    
    return true;
}

/**
 * Get playlist based on search mode
 * @param {Object} apiClient - Authenticated Spotify API client
 * @param {Object} parsed - Parsed command line arguments
 * @returns {Promise<Object>} Playlist object
 */
async function getPlaylist(apiClient, parsed) {
    let playlist;
    
    try {
        switch (parsed.mode) {
            case 'name':
                console.log(`🔍 Searching for playlist: "${parsed.playlistName}"${parsed.owner ? ` by ${parsed.owner}` : ''}...`);
                const playlists = await searchPlaylistsByName(apiClient, parsed.playlistName, parsed.owner);
                
                if (playlists.length === 0) {
                    console.error(`❌ No playlists found with name "${parsed.playlistName}"${parsed.owner ? ` by owner "${parsed.owner}"` : ''}`);
                    console.error('\n💡 Try using URL or ID mode if name search fails:');
                    console.error('   node exportPlaylist.js -u "playlist_url"');
                    throw new Error('Playlist not found');
                }
                
                playlist = await selectPlaylistFromList(playlists);
                break;
                
            case 'url':
                console.log('🔍 Fetching playlist from URL...');
                playlist = await getPlaylistByUrl(apiClient, parsed.url);
                break;
                
            case 'id':
                console.log('🔍 Fetching playlist by ID...');
                playlist = await getPlaylistById(apiClient, parsed.playlistId);
                break;
        }
        
        return playlist;
        
    } catch (error) {
        if (error.message.includes('not found') || error.message.includes('404')) {
            console.error('❌ Playlist not found or not accessible');
            console.error('   Make sure the playlist exists and is public');
        }
        throw error;
    }
}

/**
 * Main export function
 */
async function main() {
    showHeader();
    
    // Parse command line arguments
    const parsed = parseArguments();
    
    if (parsed.mode === 'help') {
        showUsage();
        process.exit(0);
    }
    
    if (parsed.mode === 'error') {
        console.error(`❌ ${parsed.message}`);
        showUsage();
        process.exit(1);
    }
    
    // Check environment variables
    if (!checkEnvironment()) {
        process.exit(1);
    }
    
    try {
        // Step 1: Authenticate with Spotify
        console.log('\n🔐 Authenticating with Spotify...');
        const accessToken = await getAccessToken();
        const apiClient = createSpotifyApiClient(accessToken);
        
        // Step 2: Get playlist
        const playlist = await getPlaylist(apiClient, parsed);
        
        const ownerName = playlist.owner?.display_name || 'Unknown';
        const trackCount = playlist.tracks?.total || 0;
        console.log(`\n✅ Found playlist: "${playlist.name}"`);
        console.log(`   Owner: ${ownerName}`);
        console.log(`   Tracks: ${trackCount}`);
        console.log(`   Public: ${playlist.public ? 'Yes' : 'No'}`);
        
        if (trackCount === 0) {
            console.warn('⚠️  This playlist is empty - no tracks to export');
            process.exit(0);
        }
        
        // Step 3: Retrieve track data
        console.log('\n📥 Retrieving track information...');
        const trackData = await getFormattedPlaylistTracks(apiClient, playlist.id);
        
        // Step 4: Validate data
        console.log('🔍 Validating track data...');
        const validation = validateTrackData(trackData);
        
        if (!validation.valid) {
            throw new Error(`Data validation failed: ${validation.error}`);
        }
        
        console.log(`✅ Retrieved ${validation.trackCount} tracks successfully`);
        
        if (validation.tracksWithoutId > 0) {
            console.warn(`⚠️  Warning: ${validation.tracksWithoutId} tracks missing Spotify ID`);
        }
        
        // Step 5: Export to CSV
        console.log('\n📄 Exporting to CSV...');
        const exportResult = await exportTracksToCSV(trackData, playlist.name);
        
        // Success message
        console.log('\n🎉 Export completed successfully!');
        console.log('📁 File details:');
        console.log(`   Filename: ${exportResult.filename}`);
        console.log(`   Location: ${exportResult.fullPath}`);
        console.log(`   Tracks: ${exportResult.trackCount}`);
        
        console.log('\n📊 Next steps:');
        console.log('1. Open Google Sheets');
        console.log('2. File → Import → Upload → Select your CSV file');
        console.log('3. Choose "Detect automatically" for separator type');
        console.log('4. Your playlist data is ready for editing!');
        
        console.log('\n💡 Tip: Keep the "Spotify Track ID" column intact');
        console.log('   You\'ll need it to create new playlists from your edited data');
        
    } catch (error) {
        console.error(`\n❌ Export failed: ${error.message}`);
        
        // Provide helpful hints based on error type
        if (error.message.includes('authentication')) {
            console.error('\n💡 Check your Spotify API credentials');
        } else if (error.message.includes('not found')) {
            console.error('\n💡 Try using a different search method or check the playlist URL/ID');
        } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
            console.error('\n💡 Check your internet connection');
        }
        
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Export cancelled by user');
    process.exit(0);
});

process.on('unhandledRejection', (error) => {
    console.error('\n❌ Unexpected error:', error.message);
    process.exit(1);
});

// Run the application
if (require.main === module) {
    main();
}