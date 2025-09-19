/**
 * CSV Export Module
 * Handles CSV file generation with Turkish locale and filename conflict resolution
 */

const createCSVWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const path = require('path');

/**
 * Sanitize filename by removing/replacing invalid characters
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename safe for filesystem
 */
function sanitizeFilename(filename) {
    // Remove or replace invalid characters for filesystem
    return filename
        .replace(/[<>:"/\\|?*]/g, '_')  // Replace invalid chars with underscore
        .replace(/\s+/g, '_')          // Replace spaces with underscore
        .replace(/_{2,}/g, '_')        // Replace multiple underscores with single
        .replace(/^_+|_+$/g, '')       // Remove leading/trailing underscores
        .substring(0, 100);            // Limit length to 100 chars
}

/**
 * Generate unique filename with copy numbering if file exists
 * @param {string} baseFilename - Base filename without extension
 * @param {string} extension - File extension (e.g., '.csv')
 * @param {string} directory - Directory path (default: current directory)
 * @returns {string} Unique filename that doesn't exist
 */
function generateUniqueFilename(baseFilename, extension = '.csv', directory = '.') {
    const sanitizedBase = sanitizeFilename(baseFilename);
    let filename = sanitizedBase + extension;
    let fullPath = path.join(directory, filename);
    let counter = 1;
    
    // Check if file exists and increment counter until we find unique name
    while (fs.existsSync(fullPath)) {
        filename = `${sanitizedBase}_${counter}${extension}`;
        fullPath = path.join(directory, filename);
        counter++;
    }
    
    return { filename, fullPath };
}

/**
 * Create CSV writer with Turkish locale settings
 * @param {string} filePath - Full path to CSV file
 * @param {Array} trackData - Array of track data objects
 * @returns {Object} Configured CSV writer instance
 */
function createCSVWriterWithLocale(filePath, trackData) {
    if (!trackData || trackData.length === 0) {
        throw new Error('No track data provided for CSV export');
    }
    
    // Get column headers from first track object
    const headers = Object.keys(trackData[0]).map(key => ({
        id: key,
        title: key
    }));
    
    return createCSVWriter({
        path: filePath,
        header: headers,
        encoding: 'utf8',
        // Use Turkish locale-compatible settings
        fieldDelimiter: ';',  // Excel/Google Sheets Turkish locale uses semicolon
        recordDelimiter: '\r\n'  // Windows line endings for compatibility
    });
}

/**
 * Export track data to CSV file
 * @param {Array} trackData - Array of formatted track data objects
 * @param {string} playlistName - Name of the playlist (used for filename)
 * @param {string} [directory='.'] - Directory to save CSV file
 * @returns {Promise<Object>} Object with filename and full path of created file
 * @throws {Error} If export fails
 */
async function exportTracksToCSV(trackData, playlistName, directory = '.') {
    try {
        if (!trackData || trackData.length === 0) {
            throw new Error('No track data to export');
        }
        
        if (!playlistName) {
            throw new Error('Playlist name is required for filename generation');
        }
        
        console.log(`Preparing CSV export for playlist: "${playlistName}"...`);
        
        // Generate unique filename
        const { filename, fullPath } = generateUniqueFilename(playlistName, '.csv', directory);
        
        console.log(`Creating CSV file: ${filename}`);
        
        // Create CSV writer with Turkish locale settings
        const CSVWriter = createCSVWriterWithLocale(fullPath, trackData);
        
        // Write data to CSV file
        await CSVWriter.writeRecords(trackData);
        
        console.log(`✓ Successfully exported ${trackData.length} tracks to: ${filename}`);
        console.log(`File location: ${path.resolve(fullPath)}`);
        
        return {
            filename: filename,
            fullPath: path.resolve(fullPath),
            trackCount: trackData.length
        };
        
    } catch (error) {
        throw new Error(`CSV export failed: ${error.message}`);
    }
}

/**
 * Validate track data structure before export
 * @param {Array} trackData - Array of track data objects
 * @returns {Object} Validation result with status and details
 */
function validateTrackData(trackData) {
    if (!Array.isArray(trackData)) {
        return { valid: false, error: 'Track data must be an array' };
    }
    
    if (trackData.length === 0) {
        return { valid: false, error: 'Track data array is empty' };
    }
    
    // Check required columns
    const requiredColumns = [
        'Track Name', 'Artist Name', 'Album Name', 
        'Album Year', 'Track Duration', 'Track Popularity', 
        'Spotify Track ID'
    ];
    
    const firstTrack = trackData[0];
    const availableColumns = Object.keys(firstTrack);
    const missingColumns = requiredColumns.filter(col => !availableColumns.includes(col));
    
    if (missingColumns.length > 0) {
        return { 
            valid: false, 
            error: `Missing required columns: ${missingColumns.join(', ')}` 
        };
    }
    
    // Check for empty Spotify Track IDs (critical for second script)
    const tracksWithoutId = trackData.filter(track => !track['Spotify Track ID']);
    
    if (tracksWithoutId.length > 0) {
        console.log(`Warning: ${tracksWithoutId.length} tracks missing Spotify Track ID`);
    }
    
    return { 
        valid: true, 
        trackCount: trackData.length,
        columnsCount: availableColumns.length,
        tracksWithoutId: tracksWithoutId.length
    };
}

module.exports = {
    exportTracksToCSV,
    validateTrackData,
    sanitizeFilename,
    generateUniqueFilename
};