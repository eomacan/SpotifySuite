/**
 * CSV Processing Module
 * Handles reading and writing CSV files for track album lookup
 */

const fs = require('fs');
const { parse } = require('csv-parse/sync');
const createCSVWriter = require('csv-writer').createObjectCsvWriter;

/**
 * Read and parse CSV file
 * @param {string} filePath - Path to the CSV file
 * @returns {Array} Array of parsed CSV records
 * @throws {Error} If file cannot be read or parsed
 */
function readCSVFile(filePath) {
    try {
        console.log(`Reading CSV file: ${filePath}...`);
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        
        const fileContent = fs.readFileSync(filePath, 'utf8');
        
        // Parse CSV with Turkish locale support
        const records = parse(fileContent, {
            columns: true,           // First row as headers
            skip_empty_lines: true,  // Skip empty lines
            delimiter: ';',          // Turkish locale uses semicolon
            trim: true              // Trim whitespace
        });
        
        console.log(`✓ Successfully read ${records.length} records from CSV`);
        return records;
        
    } catch (error) {
        throw new Error(`Failed to read CSV file: ${error.message}`);
    }
}

/**
 * Validate input CSV structure
 * @param {Array} records - Array of CSV records
 * @returns {Object} Validation result
 */
function validateInputCSV(records) {
    if (!Array.isArray(records) || records.length === 0) {
        return { valid: false, error: 'CSV file is empty or invalid' };
    }
    
    const requiredColumns = ['Track Name', 'Artist Name', 'Release Year', 'Spotify Track ID'];
    const firstRecord = records[0];
    const availableColumns = Object.keys(firstRecord);
    
    const missingColumns = requiredColumns.filter(col => !availableColumns.includes(col));
    
    if (missingColumns.length > 0) {
        return {
            valid: false,
            error: `Missing required columns: ${missingColumns.join(', ')}`
        };
    }
    
    // Validate Release Year format
    const invalidYears = records.filter(record => {
        const year = parseInt(record['Release Year']);
        return isNaN(year) || year < 1900 || year > new Date().getFullYear() + 1;
    });
    
    if (invalidYears.length > 0) {
        console.warn(`⚠️  Warning: ${invalidYears.length} records have invalid release years`);
    }
    
    return {
        valid: true,
        recordCount: records.length,
        invalidYears: invalidYears.length
    };
}

/**
 * Write enhanced data to CSV file
 * @param {Array} data - Array of enhanced track data
 * @param {string} outputPath - Path for output CSV file
 * @returns {Promise<Object>} Write result with filename and record count
 * @throws {Error} If write fails
 */
async function writeEnhancedCSV(data, outputPath) {
    try {
        if (!data || data.length === 0) {
            throw new Error('No data to write to CSV');
        }
        
        console.log(`Writing enhanced CSV: ${outputPath}...`);
        
        // Define headers for output CSV
        const headers = [
            { id: 'Track Name', title: 'Track Name' },
            { id: 'Artist Name', title: 'Artist Name' },
            { id: 'Release Year', title: 'Release Year' },
            { id: 'Spotify Track ID', title: 'Spotify Track ID' },
            { id: 'New Track Name', title: 'New Track Name' },
            { id: 'New Album Name', title: 'New Album Name' },
            { id: 'New Album Release Year', title: 'New Album Release Year' },
            { id: 'New Track Spotify ID', title: 'New Track Spotify ID' }
        ];
        
        const csvWriter = createCSVWriter({
            path: outputPath,
            header: headers,
            encoding: 'utf8',
            fieldDelimiter: ';',     // Turkish locale
            recordDelimiter: '\r\n'  // Windows line endings
        });
        
        await csvWriter.writeRecords(data);
        
        console.log(`✓ Successfully wrote ${data.length} records to: ${outputPath}`);
        
        return {
            filename: outputPath,
            recordCount: data.length
        };
        
    } catch (error) {
        throw new Error(`Failed to write CSV file: ${error.message}`);
    }
}

/**
 * Process input record to create enhanced output record
 * @param {Object} inputRecord - Original CSV record
 * @param {Object|null} albumInfo - Found album information or null
 * @returns {Object} Enhanced record (always returns a record, with empty fields if no album found)
 */
function createEnhancedRecord(inputRecord, albumInfo) {
    // Always create output record with original data
    const enhancedRecord = {
        'Track Name': inputRecord['Track Name'],
        'Artist Name': inputRecord['Artist Name'],
        'Release Year': inputRecord['Release Year'],
        'Spotify Track ID': inputRecord['Spotify Track ID']
    };
    
    // Add new columns - empty if no album found
    if (albumInfo) {
        enhancedRecord['New Track Name'] = albumInfo.trackName;
        enhancedRecord['New Album Name'] = albumInfo.albumName;
        enhancedRecord['New Album Release Year'] = albumInfo.releaseYear.toString();
        enhancedRecord['New Track Spotify ID'] = albumInfo.trackId;
    } else {
        enhancedRecord['New Track Name'] = '';
        enhancedRecord['New Album Name'] = '';
        enhancedRecord['New Album Release Year'] = '';
        enhancedRecord['New Track Spotify ID'] = '';
    }
    
    return enhancedRecord;
}

module.exports = {
    readCSVFile,
    validateInputCSV,
    writeEnhancedCSV,
    createEnhancedRecord
};