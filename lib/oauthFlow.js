/**
 * OAuth Flow Module
 * Handles Spotify user authentication with automatic browser opening
 */

const http = require('http');
const { URL } = require('url');
const { exec } = require('child_process');
const crypto = require('crypto');

const { 
    generateAuthorizationUrl, 
    exchangeCodeForToken,
    createSpotifyApiClient 
} = require('./spotify');

const { loadSpotifyConfig } = require('./config');

/**
 * Open URL in the default browser
 * @param {string} url - URL to open
 */
function openBrowser(url) {
    const platform = process.platform;
    let command;
    
    switch (platform) {
        case 'darwin':  // macOS
            command = `open "${url}"`;
            break;
        case 'win32':   // Windows
            command = `start "" "${url}"`;
            break;
        default:        // Linux and others
            command = `xdg-open "${url}"`;
            break;
    }
    
    exec(command, (error) => {
        if (error) {
            console.warn('⚠️  Could not automatically open browser. Please copy the URL manually.');
        }
    });
}

/**
 * Generate a random state string for OAuth security
 * @returns {string} Random state string
 */
function generateState() {
    return crypto.randomBytes(16).toString('hex');
}

/**
 * Start local server to handle OAuth callback
 * @param {string} redirectUri - OAuth redirect URI
 * @returns {Promise<string>} Authorization code from callback
 */
function startCallbackServer(redirectUri) {
    return new Promise((resolve, reject) => {
        const url = new URL(redirectUri);
        const port = parseInt(url.port) || 8888;
        
        const server = http.createServer((req, res) => {
            const reqUrl = new URL(req.url, redirectUri);
            
            if (reqUrl.pathname === url.pathname) {
                const code = reqUrl.searchParams.get('code');
                const error = reqUrl.searchParams.get('error');
                const state = reqUrl.searchParams.get('state');
                
                if (error) {
                    res.writeHead(400, { 'Content-Type': 'text/html' });
                    res.end(`
                        <html>
                            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                                <h1 style="color: #e74c3c;">❌ Authorization Failed</h1>
                                <p>Error: ${error}</p>
                                <p>You can close this tab and try again.</p>
                            </body>
                        </html>
                    `);
                    server.close();
                    reject(new Error(`OAuth error: ${error}`));
                    return;
                }
                
                if (code) {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`
                        <html>
                            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                                <h1 style="color: #27ae60;">✅ Authorization Successful!</h1>
                                <p>You can now close this tab and return to the terminal.</p>
                                <p>Creating your playlist...</p>
                            </body>
                        </html>
                    `);
                    server.close();
                    resolve(code);
                } else {
                    res.writeHead(400, { 'Content-Type': 'text/html' });
                    res.end(`
                        <html>
                            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
                                <h1 style="color: #e74c3c;">❌ Invalid Request</h1>
                                <p>No authorization code received.</p>
                                <p>You can close this tab and try again.</p>
                            </body>
                        </html>
                    `);
                    server.close();
                    reject(new Error('No authorization code received'));
                }
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Not Found');
            }
        });
        
        server.listen(port, 'localhost', () => {
            console.log(`📡 OAuth callback server started on ${redirectUri}`);
        });
        
        server.on('error', (error) => {
            reject(new Error(`Failed to start callback server: ${error.message}`));
        });
        
        // Timeout after 5 minutes
        setTimeout(() => {
            server.close();
            reject(new Error('OAuth timeout - please try again'));
        }, 5 * 60 * 1000);
    });
}

/**
 * Perform complete OAuth flow for user authentication
 * @param {Array} scopes - Required Spotify scopes
 * @returns {Promise<Object>} Authenticated API client
 * @throws {Error} If OAuth flow fails
 */
async function performOAuthFlow(scopes) {
    const config = loadSpotifyConfig();
    const redirectUri = 'http://localhost:8888/callback';
    const state = generateState();
    
    try {
        console.log('🔐 Starting Spotify OAuth authentication...');
        
        // Generate authorization URL
        const authUrl = generateAuthorizationUrl(config.clientId, redirectUri, scopes, state);
        
        console.log('🌐 Opening browser for Spotify login...');
        console.log('📋 If browser doesn\'t open automatically, copy this URL:');
        console.log(`   ${authUrl}`);
        console.log('');
        
        // Start callback server and open browser
        const serverPromise = startCallbackServer(redirectUri);
        openBrowser(authUrl);
        
        // Wait for authorization code
        console.log('⏳ Waiting for authorization (this will timeout in 5 minutes)...');
        const authCode = await serverPromise;
        
        // Exchange code for token
        const tokenData = await exchangeCodeForToken(authCode, redirectUri);
        
        // Create authenticated API client
        const apiClient = createSpotifyApiClient(tokenData.access_token);
        
        console.log('✅ OAuth authentication completed successfully!');
        return apiClient;
        
    } catch (error) {
        throw new Error(`OAuth authentication failed: ${error.message}`);
    }
}

module.exports = {
    performOAuthFlow,
    generateState,
    openBrowser
};