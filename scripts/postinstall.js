#!/usr/bin/env node

/**
 * Post-installation script for Spotify Suite
 * Displays setup instructions and welcome message
 */

const packageJson = require('../package.json');

console.log('\n' + '='.repeat(60));
console.log('🎉  Welcome to Spotify Suite v' + packageJson.version + '!');
console.log('='.repeat(60));

console.log('\n📋 Next Steps:');
console.log('\n1. 🔑 Set up Spotify API credentials:');
console.log('   • Visit: https://developer.spotify.com/dashboard');
console.log('   • Create a new app');
console.log('   • Copy your Client ID and Client Secret');
console.log('   • Set environment variables:');
console.log('     export SPOTIFY_CLIENT_ID="your_client_id"');
console.log('     export SPOTIFY_CLIENT_SECRET="your_client_secret"');

console.log('\n2. 🔐 For playlist creation (optional):');
console.log('   • Add redirect URI to your Spotify app:');
console.log('     http://localhost:8888/callback');

console.log('\n3. ✅ Test your setup:');
console.log('   spotify-export --help');
console.log('   spotify-find-albums "Yesterday" "The Beatles"');

console.log('\n🎵 Available Commands:');
console.log('   spotify-export           Export playlists to CSV');
console.log('   spotify-find-albums       Find albums for single track');
console.log('   spotify-find-albums-csv   Batch process CSV files');
console.log('   spotify-create-playlist   Create playlists from CSV');

console.log('\n📚 Documentation:');
console.log('   README: https://github.com/spotify-suite/spotify-suite#readme');
console.log('   Issues: https://github.com/spotify-suite/spotify-suite/issues');

console.log('\n💡 Quick Start:');
console.log('   1. Export a playlist:');
console.log('      spotify-export -n "Today\'s Top Hits"');
console.log('   2. Find original albums:');
console.log('      spotify-find-albums-csv exported.csv originals.csv');
console.log('   3. Create new playlist:');
console.log('      spotify-create-playlist originals.csv "Original Albums"');

console.log('\n' + '='.repeat(60));
console.log('🎶 Happy music managing! 🎶');
console.log('='.repeat(60) + '\n');

// Check Node.js version
const nodeVersion = process.version;
const requiredVersion = packageJson.engines.node;

if (nodeVersion.localeCompare('v18.0.0', undefined, { numeric: true, sensitivity: 'base' }) < 0) {
    console.warn(`⚠️  Warning: Node.js ${requiredVersion} is recommended. You're using ${nodeVersion}`);
    console.warn('   Some features may not work properly with older versions.\n');
}