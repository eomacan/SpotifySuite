#!/usr/bin/env node

/**
 * Spotify Track Album Finder
 * Find all albums containing a specific track by a specific artist
 * 
 * Usage:
 *   node findTrackAlbums.js "Track Name" "Artist Name"
 * 
 * Requirements:
 *   - SPOTIFY_CLIENT_ID environment variable
 *   - SPOTIFY_CLIENT_SECRET environment variable
 */

const { 
    getAccessToken, 
    createSpotifyApiClient,
    getTrackAlbumInformation
} = require('./spotify');

/**
 * Display application header
 */
function showHeader() {
    console.log('='.repeat(60));
    console.log('🔍  Spotify Track Album Finder');
    console.log('    Find all albums containing a specific track');
    console.log('='.repeat(60));
}

/**
 * Display usage information
 */
function showUsage() {
    console.log('\nUsage:');
    console.log('  node findTrackAlbums.js "Track Name" "Artist Name"');
    console.log('');
    console.log('Examples:');
    console.log('  node findTrackAlbums.js "Shape of You" "Ed Sheeran"');
    console.log('  node findTrackAlbums.js "Billie Jean" "Michael Jackson"');
    console.log('  node findTrackAlbums.js "Yesterday" "The Beatles"');
    console.log('');
    console.log('Environment Variables Required:');
    console.log('  SPOTIFY_CLIENT_ID      Your Spotify app client ID');
    console.log('  SPOTIFY_CLIENT_SECRET  Your Spotify app client secret');
    console.log('');
    console.log('Output:');
    console.log('  Lists all albums containing the track, ordered by release year');
    console.log('  Shows: Album Name, Release Date, Album Type');
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
    
    if (args.length < 2) {
        return { 
            mode: 'error', 
            message: 'Both track name and artist name are required' 
        };
    }
    
    if (args[0] === '-h' || args[0] === '--help') {
        return { mode: 'help' };
    }
    
    return {
        mode: 'search',
        trackName: args[0],
        artistName: args[1]
    };
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
 * Display album information in a formatted table
 * @param {Array} albumInfo - Array of album information objects
 * @param {string} trackName - Original track name searched
 * @param {string} artistName - Original artist name searched
 */
function displayAlbumResults(albumInfo, trackName, artistName) {
    if (albumInfo.length === 0) {
        console.log(`\n❌ No albums found containing "${trackName}" by "${artistName}"`);
        console.log('\n💡 Try:');
        console.log('   - Check spelling of track and artist names');
        console.log('   - Use partial names (e.g., "Shape" instead of "Shape of You")');
        console.log('   - Try different variations of the artist name');
        return;
    }
    
    console.log(`\n📀 Found ${albumInfo.length} album(s) containing "${trackName}"`);
    console.log('='.repeat(80));
    
    albumInfo.forEach((album, index) => {
        console.log(`\n${index + 1}. ${album.albumName}`);
        console.log(`   Release Date: ${album.releaseDate}`);
        console.log(`   Album Type: ${album.albumType}`);
        console.log(`   Track Artists: ${album.trackArtists}`);
        console.log(`   Track Title: ${album.trackName}`);
    });
    
    console.log('\n' + '='.repeat(80));
    console.log(`📊 Summary: ${albumInfo.length} album(s) found, ordered by release year`);
    
    // Show earliest and latest releases
    if (albumInfo.length > 1) {
        const earliest = albumInfo[0];
        const latest = albumInfo[albumInfo.length - 1];
        
        if (earliest.releaseYear > 0 && latest.releaseYear > 0) {
            console.log(`📅 Release span: ${earliest.releaseYear} - ${latest.releaseYear}`);
        }
    }
}

/**
 * Main function
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
        
        // Step 2: Search for track albums (only regular albums)
        console.log(`\n🔍 Searching for "${parsed.trackName}" by "${parsed.artistName}"...`);
        const albumInfo = await getTrackAlbumInformation(
            apiClient, 
            parsed.trackName, 
            parsed.artistName,
            'album'  // Filter to show only regular albums
        );
        
        // Step 3: Display results
        displayAlbumResults(albumInfo, parsed.trackName, parsed.artistName);
        
    } catch (error) {
        console.error(`\n❌ Search failed: ${error.message}`);
        
        // Provide helpful hints based on error type
        if (error.message.includes('authentication')) {
            console.error('\n💡 Check your Spotify API credentials');
        } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
            console.error('\n💡 Check your internet connection');
        } else if (error.message.includes('search')) {
            console.error('\n💡 Try different search terms or check spelling');
        }
        
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Search cancelled by user');
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