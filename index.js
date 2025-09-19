#!/usr/bin/env node

/**
 * Spotify Suite - Main Entry Point
 * Command-line interface for the complete Spotify toolkit
 */

const packageJson = require('./package.json');

/**
 * Display main help and available commands
 */
function showMainHelp() {
    console.log('🎵 Spotify Suite v' + packageJson.version);
    console.log('Complete toolkit for Spotify playlist management\n');
    
    console.log('📋 Available Commands:');
    console.log('');
    
    console.log('🎵 PLAYLIST EXPORT:');
    console.log('  spotify-export              Export playlists to CSV');
    console.log('  spotify-export -n "name"     Export by playlist name');
    console.log('  spotify-export -u "url"      Export by playlist URL');
    console.log('  spotify-export -i "id"       Export by playlist ID');
    console.log('');
    
    console.log('🔍 TRACK ANALYSIS:');
    console.log('  spotify-find-albums          Find albums for single track');
    console.log('  spotify-find-albums-csv      Batch process CSV files');
    console.log('');
    
    console.log('🎨 PLAYLIST CREATION:');
    console.log('  spotify-create-playlist      Create playlists from CSV');
    console.log('');
    
    console.log('🛠️  UTILITIES:');
    console.log('  npm run test-config          Test configuration');
    console.log('  npm run test-spotify         Test Spotify connection');
    console.log('');
    
    console.log('📚 Help & Documentation:');
    console.log('  spotify-export --help        Show export help');
    console.log('  spotify-find-albums --help   Show album finder help');
    console.log('  spotify-create-playlist -h   Show playlist creator help');
    console.log('');
    
    console.log('🌐 Online Resources:');
    console.log('  README:  https://github.com/spotify-suite/spotify-suite#readme');
    console.log('  Issues:  https://github.com/spotify-suite/spotify-suite/issues');
    console.log('  NPM:     https://www.npmjs.com/package/spotify-suite');
    console.log('');
    
    console.log('⚙️  Setup Required:');
    console.log('  Set environment variables:');
    console.log('    export SPOTIFY_CLIENT_ID="your_client_id"');
    console.log('    export SPOTIFY_CLIENT_SECRET="your_client_secret"');
    console.log('');
    console.log('  Get credentials: https://developer.spotify.com/dashboard');
    console.log('');
    
    console.log('💡 Quick Examples:');
    console.log('  spotify-export -n "Today\'s Top Hits"');
    console.log('  spotify-find-albums "Yesterday" "The Beatles"');
    console.log('  spotify-find-albums-csv input.csv output.csv');
    console.log('  spotify-create-playlist tracks.csv "My New Playlist"');
}

/**
 * Check if environment is properly configured
 */
function checkEnvironment() {
    const required = ['SPOTIFY_CLIENT_ID', 'SPOTIFY_CLIENT_SECRET'];
    const missing = required.filter(envVar => !process.env[envVar]);
    
    if (missing.length > 0) {
        console.log('⚠️  Environment Setup Required:');
        console.log('');
        missing.forEach(envVar => console.log(`   Missing: ${envVar}`));
        console.log('');
        console.log('🔧 Setup Instructions:');
        console.log('   1. Visit: https://developer.spotify.com/dashboard');
        console.log('   2. Create a Spotify app');
        console.log('   3. Copy your credentials and run:');
        console.log('      export SPOTIFY_CLIENT_ID="your_client_id"');
        console.log('      export SPOTIFY_CLIENT_SECRET="your_client_secret"');
        console.log('');
        return false;
    }
    
    console.log('✅ Environment configured correctly');
    return true;
}

/**
 * Display version information
 */
function showVersion() {
    console.log(`Spotify Suite v${packageJson.version}`);
    console.log(`Node.js ${process.version}`);
    console.log(`Platform: ${process.platform} ${process.arch}`);
}

/**
 * Main function
 */
function main() {
    const args = process.argv.slice(2);
    
    // Handle command line arguments
    if (args.length === 0) {
        showMainHelp();
        return;
    }
    
    const command = args[0];
    
    switch (command) {
        case '-h':
        case '--help':
        case 'help':
            showMainHelp();
            break;
            
        case '-v':
        case '--version':
        case 'version':
            showVersion();
            break;
            
        case 'check':
        case 'check-env':
            console.log('🔍 Checking environment setup...\n');
            const isConfigured = checkEnvironment();
            process.exit(isConfigured ? 0 : 1);
            break;
            
        case 'commands':
            console.log('📋 Available Commands:\n');
            console.log('Global commands (after npm install -g spotify-suite):');
            console.log('  spotify-export');
            console.log('  spotify-find-albums');
            console.log('  spotify-find-albums-csv');
            console.log('  spotify-create-playlist');
            console.log('\nLocal commands (in project directory):');
            console.log('  npm run export');
            console.log('  npm run find-albums');
            console.log('  npm run find-albums-csv');
            console.log('  npm run create-playlist');
            break;
            
        default:
            console.log(`❌ Unknown command: ${command}`);
            console.log('Use "spotify-suite --help" for available commands');
            process.exit(1);
    }
}

// Export for programmatic use
module.exports = {
    showMainHelp,
    showVersion,
    checkEnvironment
};

// Run if called directly
if (require.main === module) {
    main();
}