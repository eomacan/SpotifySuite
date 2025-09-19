#!/usr/bin/env node

/**
 * Spotify Playlist Creator from CSV
 * Create Spotify playlist from CSV file with track information
 * 
 * Usage:
 *   node createPlaylistFromCSV.js input.csv "Playlist Name"
 *   node createPlaylistFromCSV.js input.csv "Playlist Name" --private
 * 
 * Requirements:
 *   - SPOTIFY_CLIENT_ID environment variable
 *   - SPOTIFY_CLIENT_SECRET environment variable
 */

const { 
    getCurrentUserProfile,
    createPlaylist,
    addTracksToPlaylist
} = require('./spotify');

const { performOAuthFlow } = require('./oauthFlow');

const {
    readCSVFile,
    validateInputCSV
} = require('./csvProcessor');

/**
 * Display application header
 */
function showHeader() {
    console.log('='.repeat(70));
    console.log('🎵📄  Spotify Playlist Creator from CSV');
    console.log('      Create playlists from your CSV track data');
    console.log('='.repeat(70));
}

/**
 * Display usage information
 */
function showUsage() {
    console.log('\nUsage:');
    console.log('  node createPlaylistFromCSV.js input.csv "Playlist Name"');
    console.log('  node createPlaylistFromCSV.js input.csv "Playlist Name" --private');
    console.log('');
    console.log('Input CSV Format:');
    console.log('  Required columns: Track Name, Artist Name, Release Year, Spotify Track ID');
    console.log('  Delimiter: ; (semicolon for Turkish locale)');
    console.log('');
    console.log('Options:');
    console.log('  --private    Create a private playlist (default: public)');
    console.log('');
    console.log('Examples:');
    console.log('  node createPlaylistFromCSV.js my_tracks.csv "My Awesome Playlist"');
    console.log('  node createPlaylistFromCSV.js favorites.csv "Secret Favorites" --private');
    console.log('');
    console.log('Authentication:');
    console.log('  - Requires user login (OAuth) to create playlists');
    console.log('  - Will automatically open browser for Spotify authorization');
    console.log('  - Needs playlist creation permissions');
    console.log('');
    console.log('Environment Variables Required:');
    console.log('  SPOTIFY_CLIENT_ID      Your Spotify app client ID');
    console.log('  SPOTIFY_CLIENT_SECRET  Your Spotify app client secret');
    console.log('');
    console.log('Note: Only tracks with valid Spotify Track IDs will be added.');
    console.log('      Invalid or missing IDs will be skipped and reported.');
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
            message: 'Both CSV file and playlist name are required' 
        };
    }
    
    if (args[0] === '-h' || args[0] === '--help') {
        return { mode: 'help' };
    }
    
    const isPrivate = args.includes('--private');
    
    return {
        mode: 'create',
        inputFile: args[0],
        playlistName: args[1],
        isPrivate: isPrivate
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
        console.error('\n⚠️  Important: Add "http://localhost:8888/callback" to your app\'s redirect URIs');
        return false;
    }
    
    return true;
}

/**
 * Extract Spotify Track IDs from CSV records
 * @param {Array} records - CSV records
 * @returns {Object} Object with valid track IDs and validation info
 */
function extractTrackIds(records) {
    const trackIds = [];
    const invalidRecords = [];
    
    records.forEach((record, index) => {
        const trackId = record['Spotify Track ID'];
        const trackName = record['Track Name'];
        const artistName = record['Artist Name'];
        
        if (trackId && typeof trackId === 'string' && trackId.trim() !== '') {
            trackIds.push(trackId.trim());
        } else {
            invalidRecords.push({
                index: index + 1,
                trackName: trackName || 'Unknown',
                artistName: artistName || 'Unknown',
                reason: 'Missing or invalid Spotify Track ID'
            });
        }
    });
    
    return {
        trackIds,
        invalidRecords,
        totalRecords: records.length,
        validCount: trackIds.length,
        invalidCount: invalidRecords.length
    };
}

/**
 * Display track validation results
 * @param {Object} validation - Track validation results
 */
function displayTrackValidation(validation) {
    console.log('🔍 Track validation results:');
    console.log(`   Total tracks in CSV: ${validation.totalRecords}`);
    console.log(`   Valid Spotify Track IDs: ${validation.validCount}`);
    console.log(`   Invalid/missing IDs: ${validation.invalidCount}`);
    
    if (validation.invalidCount > 0) {
        console.log('\n⚠️  Tracks with invalid/missing Spotify Track IDs:');
        validation.invalidRecords.forEach(record => {
            console.log(`   Row ${record.index}: "${record.trackName}" by "${record.artistName}"`);
        });
        console.log('   These tracks will be skipped during playlist creation.');
    }
    
    console.log('');
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
        // Step 1: Read and validate input CSV
        console.log('\n📄 Reading CSV file...');
        const csvRecords = readCSVFile(parsed.inputFile);
        
        const csvValidation = validateInputCSV(csvRecords);
        if (!csvValidation.valid) {
            throw new Error(`Invalid CSV format: ${csvValidation.error}`);
        }
        
        console.log(`✅ CSV validation passed: ${csvValidation.recordCount} records`);
        
        // Step 2: Extract and validate track IDs
        console.log('\n🎵 Validating track data...');
        const trackValidation = extractTrackIds(csvRecords);
        
        displayTrackValidation(trackValidation);
        
        if (trackValidation.validCount === 0) {
            console.error('❌ No valid Spotify Track IDs found in CSV file');
            console.error('💡 Make sure your CSV has a "Spotify Track ID" column with valid track IDs');
            process.exit(1);
        }
        
        // Step 3: Authenticate user with OAuth
        const scopes = ['playlist-modify-public', 'playlist-modify-private'];
        const apiClient = await performOAuthFlow(scopes);
        
        // Step 4: Get user profile
        console.log('\n👤 Getting user profile...');
        const userProfile = await getCurrentUserProfile(apiClient);
        console.log(`✅ Logged in as: ${userProfile.display_name} (${userProfile.id})`);
        
        // Step 5: Create playlist
        console.log('\n🎵 Creating playlist...');
        const playlist = await createPlaylist(
            apiClient, 
            userProfile.id, 
            parsed.playlistName, 
            !parsed.isPrivate
        );
        
        console.log(`✅ Playlist created: "${playlist.name}"`);
        console.log(`   ID: ${playlist.id}`);
        console.log(`   URL: ${playlist.external_urls.spotify}`);
        console.log(`   Visibility: ${playlist.public ? 'Public' : 'Private'}`);
        
        // Step 6: Add tracks to playlist
        console.log('\n📥 Adding tracks to playlist...');
        const addResult = await addTracksToPlaylist(apiClient, playlist.id, trackValidation.trackIds);
        
        // Success summary
        console.log('\n🎉 Playlist creation completed!');
        console.log('📊 Summary:');
        console.log(`   Playlist: "${playlist.name}"`);
        console.log(`   Total tracks in CSV: ${trackValidation.totalRecords}`);
        console.log(`   Successfully added: ${addResult.successful}`);
        console.log(`   Failed to add: ${addResult.failed}`);
        console.log(`   Skipped (invalid ID): ${addResult.skipped}`);
        console.log(`   Playlist URL: ${playlist.external_urls.spotify}`);
        
        if (addResult.failed > 0) {
            console.log('\n⚠️  Some tracks failed to be added. This could be due to:');
            console.log('   - Tracks not available in your region');
            console.log('   - Invalid or expired Spotify Track IDs');
            console.log('   - Temporary API issues');
        }
        
        console.log('\n🎵 Your playlist is ready! You can find it in your Spotify library.');
        
    } catch (error) {
        console.error(`\n❌ Playlist creation failed: ${error.message}`);
        
        // Provide helpful hints based on error type
        if (error.message.includes('OAuth') || error.message.includes('authentication')) {
            console.error('\n💡 Authentication tips:');
            console.error('   - Make sure you approve the authorization in your browser');
            console.error('   - Check that your Spotify app has the redirect URI: http://localhost:8888/callback');
            console.error('   - Verify your client ID and secret are correct');
        } else if (error.message.includes('not found')) {
            console.error('\n💡 Check the CSV file path and format');
        } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
            console.error('\n💡 Check your internet connection');
        }
        
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Playlist creation cancelled by user');
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