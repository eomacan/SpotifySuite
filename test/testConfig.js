#!/usr/bin/env node

/**
 * Test script for configuration module
 * Run with: node testConfig.js
 */

const { loadSpotifyConfig, getLocaleConfig } = require('./config');

function testConfiguration() {
    console.log('Testing Configuration Module...\n');
    
    try {
        // Test Spotify configuration loading
        console.log('1. Testing Spotify API configuration:');
        const spotifyConfig = loadSpotifyConfig();
        
        console.log('✓ Client ID loaded:', spotifyConfig.clientId ? 'Yes' : 'No');
        console.log('✓ Client Secret loaded:', spotifyConfig.clientSecret ? 'Yes' : 'No');
        console.log('✓ Auth URL:', spotifyConfig.authUrl);
        console.log('✓ API Base URL:', spotifyConfig.apiBaseUrl);
        
    } catch (error) {
        console.log('✗ Configuration Error:', error.message);
        console.log('\nMake sure to set your environment variables:');
        console.log('export SPOTIFY_CLIENT_ID="your_client_id"');
        console.log('export SPOTIFY_CLIENT_SECRET="your_client_secret"');
        return false;
    }
    
    console.log('\n2. Testing Turkish locale configuration:');
    const localeConfig = getLocaleConfig();
    
    console.log('✓ Locale:', localeConfig.locale);
    console.log('✓ Date options:', JSON.stringify(localeConfig.dateOptions));
    console.log('✓ Number options:', JSON.stringify(localeConfig.numberOptions));
    
    // Test Turkish number formatting
    const testNumber = 1234.56;
    const formattedNumber = testNumber.toLocaleString(localeConfig.locale, localeConfig.numberOptions);
    console.log('✓ Number formatting test:', testNumber, '->', formattedNumber);
    
    // Test Turkish date formatting
    const testDate = new Date();
    const formattedDate = testDate.toLocaleDateString(localeConfig.locale, localeConfig.dateOptions);
    console.log('✓ Date formatting test:', testDate.toISOString().split('T')[0], '->', formattedDate);
    
    console.log('\n✓ Configuration module test completed successfully!');
    return true;
}

// Run the test
testConfiguration();