#!/usr/bin/env node

/**
 * Spotify Track Album Finder - CSV Batch Processor
 * Find earliest albums for tracks from CSV file
 * 
 * Usage:
 *   node findTrackAlbumsCSV.js input.csv output.csv
 * 
 * Requirements:
 *   - SPOTIFY_CLIENT_ID environment variable
 *   - SPOTIFY_CLIENT_SECRET environment variable
 */

const { 
    getAccessToken, 
    createSpotifyApiClient,
    findEarliestAlbumBeforeYear
} = require('../lib/spotify');

const {
    readCSVFile,
    validateInputCSV,
    writeEnhancedCSV,
    createEnhancedRecord
} = require('../lib/csvProcessor');

/**
 * Display application header
 */
function showHeader() {
    console.log('='.repeat(70));
    console.log('🔍📄  Spotify Track Album Finder - CSV Batch Processor');
    console.log('      Find earliest albums for tracks from CSV file');
    console.log('='.repeat(70));
}

/**
 * Display usage information
 */
function showUsage() {
    console.log('\nUsage:');
    console.log('  node findTrackAlbumsCSV.js input.csv output.csv');
    console.log('');
    console.log('Input CSV Format:');
    console.log('  Required columns: Track Name, Artist Name, Release Year, Spotify Track ID');
    console.log('  Delimiter: ; (semicolon for Turkish locale)');
    console.log('');
    console.log('Processing:');
    console.log('  - Finds earliest album released BEFORE the given Release Year');
    console.log('  - Only includes regular albums (not singles or compilations)');
    console.log('  - Skips tracks where no earlier album is found');
    console.log('');
    console.log('Output CSV Format:');
    console.log('  Original columns + New Track Name, New Album Name,');
    console.log('  New Album Release Year, New Track Spotify ID');
    console.log('');
    console.log('Examples:');
    console.log('  node findTrackAlbumsCSV.js tracks.csv enhanced_tracks.csv');
    console.log('  node findTrackAlbumsCSV.js my_playlist.csv original_albums.csv');
    console.log('');
    console.log('Environment Variables Required:');
    console.log('  SPOTIFY_CLIENT_ID      Your Spotify app client ID');
    console.log('  SPOTIFY_CLIENT_SECRET  Your Spotify app client secret');
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
            message: 'Both input and output file paths are required' 
        };
    }
    
    if (args[0] === '-h' || args[0] === '--help') {
        return { mode: 'help' };
    }
    
    return {
        mode: 'process',
        inputFile: args[0],
        outputFile: args[1]
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
 * Process a single track record
 * @param {Object} apiClient - Authenticated Spotify API client
 * @param {Object} record - Input CSV record
 * @param {number} index - Record index for progress
 * @param {number} total - Total records for progress
 * @returns {Promise<Object>} Enhanced record (always returns a record)
 */
async function processTrackRecord(apiClient, record, index, total) {
    try {
        const trackName = record['Track Name'];
        const artistName = record['Artist Name'];
        const releaseYear = parseInt(record['Release Year']);
        
        if (!trackName || !artistName || isNaN(releaseYear)) {
            console.warn(`⚠️  (${index + 1}/${total}) Invalid data - including with empty new fields`);
            return createEnhancedRecord(record, null);
        }
        
        console.log(`🔍 (${index + 1}/${total}) Searching "${trackName}" by "${artistName}" before ${releaseYear}...`);
        
        // Find earliest album before the given year
        const albumInfo = await findEarliestAlbumBeforeYear(
            apiClient,
            trackName,
            artistName,
            releaseYear
        );
        
        if (albumInfo) {
            console.log(`✅ Found: "${albumInfo.albumName}" (${albumInfo.releaseYear})`);
        } else {
            console.log(`❌ No earlier album found - keeping original record`);
        }
        
        return createEnhancedRecord(record, albumInfo);
        
    } catch (error) {
        console.warn(`⚠️  Error processing record ${index + 1}: ${error.message} - keeping original record`);
        return createEnhancedRecord(record, null);
    }
}

/**
 * Process all records with rate limiting
 * @param {Object} apiClient - Authenticated Spotify API client
 * @param {Array} records - Input CSV records
 * @returns {Promise<Array>} Array of enhanced records
 */
async function processAllRecords(apiClient, records) {
    const enhancedRecords = [];
    let processedCount = 0;
    let foundCount = 0;
    
    console.log(`\n📥 Processing ${records.length} track records...`);
    console.log('='.repeat(50));
    
    for (let i = 0; i < records.length; i++) {
        const record = records[i];
        
        // Process the record (always returns a record)
        const enhancedRecord = await processTrackRecord(apiClient, record, i, records.length);
        
        processedCount++;
        enhancedRecords.push(enhancedRecord);
        
        // Count successful album finds
        if (enhancedRecord['New Album Name']) {
            foundCount++;
        }
        
        // Add small delay to avoid hitting rate limits
        if (i < records.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Progress update every 10 records
        if ((i + 1) % 10 === 0 || i === records.length - 1) {
            console.log(`📊 Progress: ${processedCount}/${records.length} processed, ${foundCount} albums found`);
        }
    }
    
    return enhancedRecords;
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
        console.log('\n📄 Reading input CSV file...');
        const inputRecords = readCSVFile(parsed.inputFile);
        
        const validation = validateInputCSV(inputRecords);
        if (!validation.valid) {
            throw new Error(`Invalid input CSV: ${validation.error}`);
        }
        
        console.log(`✅ Input validation passed: ${validation.recordCount} records`);
        if (validation.invalidYears > 0) {
            console.warn(`⚠️  ${validation.invalidYears} records have invalid years`);
        }
        
        // Step 2: Authenticate with Spotify
        console.log('\n🔐 Authenticating with Spotify...');
        const accessToken = await getAccessToken();
        const apiClient = createSpotifyApiClient(accessToken);
        
        // Step 3: Process all records
        const enhancedRecords = await processAllRecords(apiClient, inputRecords);
        
        // Step 4: Write output CSV (always has same number of records as input)
        console.log('\n📄 Writing enhanced CSV file...');
        const writeResult = await writeEnhancedCSV(enhancedRecords, parsed.outputFile);
        
        // Success summary
        console.log('\n🎉 Batch processing completed successfully!');
        console.log('📊 Summary:');
        console.log(`   Input records: ${inputRecords.length}`);
        console.log(`   Output records: ${enhancedRecords.length}`);
        console.log(`   Albums found: ${enhancedRecords.filter(r => r['New Album Name']).length}`);
        console.log(`   Success rate: ${((enhancedRecords.filter(r => r['New Album Name']).length / inputRecords.length) * 100).toFixed(1)}%`);
        console.log(`   Output file: ${writeResult.filename}`);
        
        console.log('\n💡 Next steps:');
        console.log('1. Open the output CSV file to review results');
        console.log('2. Rows with empty new columns had no earlier albums found');
        console.log('3. Use the "New Track Spotify ID" for playlist creation where available');
        console.log('4. The enhanced data shows original album information where found');
        
    } catch (error) {
        console.error(`\n❌ Processing failed: ${error.message}`);
        
        // Provide helpful hints based on error type
        if (error.message.includes('authentication')) {
            console.error('\n💡 Check your Spotify API credentials');
        } else if (error.message.includes('not found')) {
            console.error('\n💡 Check the input file path');
        } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
            console.error('\n💡 Check your internet connection');
        }
        
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n👋 Processing cancelled by user');
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