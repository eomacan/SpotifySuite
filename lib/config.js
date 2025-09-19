/**
 * Configuration module for Spotify API credentials and settings
 * Handles environment variable loading and validation
 */

/**
 * Load and validate Spotify API credentials from environment variables
 * @returns {Object} Configuration object with API credentials
 * @throws {Error} If required environment variables are missing
 */
function loadSpotifyConfig() {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    
    if (!clientId) {
        throw new Error('SPOTIFY_CLIENT_ID environment variable is required');
    }
    
    if (!clientSecret) {
        throw new Error('SPOTIFY_CLIENT_SECRET environment variable is required');
    }
    
    return {
        clientId,
        clientSecret,
        authUrl: 'https://accounts.spotify.com/api/token',
        apiBaseUrl: 'https://api.spotify.com/v1'
    };
}

/**
 * Get Turkish locale settings for CSV formatting
 * @returns {Object} Locale configuration for Turkish formatting
 */
function getLocaleConfig() {
    return {
        locale: 'tr-TR',
        dateOptions: {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        },
        numberOptions: {
            useGrouping: true,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2
        }
    };
}

module.exports = {
    loadSpotifyConfig,
    getLocaleConfig
};