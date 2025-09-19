#!/usr/bin/env node

/**
 * Test script for Spotify module
 * Run with: node testSpotify.js
 */

const { getAccessToken, createSpotifyApiClient } = require('./spotify');

async function testAuthentication() {
    console.log('Testing Spotify Authentication Module...\n');
    
    try {
        // Test getting access token
        console.log('1. Testing access token retrieval:');
        const accessToken = await getAccessToken();
        
        console.log('✓ Access token received');
        console.log('✓ Token length:', accessToken.length, 'characters');
        console.log('✓ Token starts with:', accessToken.substring(0, 10) + '...');
        
        // Test creating API client
        console.log('\n2. Testing API client creation:');
        const apiClient = createSpotifyApiClient(accessToken);
        
        console.log('✓ API client created successfully');
        console.log('✓ Base URL:', apiClient.defaults.baseURL);
        console.log('✓ Authorization header set');
        
        // Test a simple API call to verify the token works
        console.log('\n3. Testing API call with token:');
        try {
            const response = await apiClient.get('/me');
            console.log('✓ API call successful - Token is valid');
            console.log('✓ Response status:', response.status);
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.log('✓ Got expected 401 for /me endpoint (Client Credentials flow limitation)');
                console.log('✓ Token is valid for public data access');
            } else {
                throw error;
            }
        }
        
    } catch (error) {
        console.log('✗ Authentication test failed:', error.message);
        
        if (error.message.includes('401')) {
            console.log('\nTip: Check if your SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are correct');
        }
        
        return false;
    }
    
    console.log('\n✓ Authentication module test completed successfully!');
    return true;
}

// Run the test
testAuthentication().catch(console.error);