# 🎵 Spotify Suite

A comprehensive command-line toolkit for Spotify playlist management, track analysis, and playlist creation. Export playlists to CSV, find original album releases, and create new playlists from CSV data.

[![GitHub release (latest by date)](https://img.shields.io/github/v/release/eomacan/SpotifySuite)](https://github.com/eomacan/SpotifySuite/releases)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ Features

- **🎵 Playlist Export**: Export Spotify playlists to CSV files compatible with Google Sheets
- **🔍 Track Analysis**: Find original album releases for tracks
- **📄 Batch Processing**: Process multiple tracks from CSV files
- **🎨 Playlist Creation**: Create new Spotify playlists from CSV data
- **🌍 Turkish Locale**: Full support for Turkish locale formatting
- **🔐 OAuth Authentication**: Secure user authentication for playlist creation

## 🚀 Installation

### Global Installation (Recommended)
```bash
npm install -g spotify-suite
```

### Local Installation
```bash
npm install spotify-suite
```

## ⚙️ Setup

### 1. Spotify API Credentials
Create a Spotify app at [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)

Set environment variables:
```bash
export SPOTIFY_CLIENT_ID="your_client_id"
export SPOTIFY_CLIENT_SECRET="your_client_secret"
```

### 2. OAuth Setup (for playlist creation)
Add the following redirect URI to your Spotify app:
```
http://localhost:8888/callback
```

## 🛠️ Usage

### Export Playlist to CSV
```bash
# Export by playlist name
spotify-export -n "Today's Top Hits"

# Export by playlist URL
spotify-export -u "https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd"

# Export by playlist ID  
spotify-export -i "37i9dQZF1DX0XUsuxWHRQd"
```

### Find Track Albums
```bash
# Single track lookup
spotify-find-albums "Shape of You" "Ed Sheeran"

# Batch process CSV file
spotify-find-albums-csv input.csv output.csv
```

### Create Playlist from CSV
```bash
# Create public playlist
spotify-create-playlist tracks.csv "My New Playlist"

# Create private playlist
spotify-create-playlist tracks.csv "Secret Playlist" --private
```

## 📋 CSV Format

All CSV files use semicolon (`;`) as delimiter for Turkish locale compatibility:

### Export Output Format
```csv
Track Name;Artist Name;Album Name;Album Year;Track Duration;Track Popularity;Spotify Track ID
Shape of You;Ed Sheeran;÷ (Divide);2017;3:53;87;7qiZfU4dY1lWllzX7mPBI3
```

### Album Finder Input Format
```csv
Track Name;Artist Name;Release Year;Spotify Track ID
Shape of You;Ed Sheeran;2017;7qiZfU4dY1lWllzX7mPBI3
```

### Album Finder Output Format
```csv
Track Name;Artist Name;Release Year;Spotify Track ID;New Track Name;New Album Name;New Album Release Year;New Track Spotify ID
Shape of You;Ed Sheeran;2017;7qiZfU4dY1lWllzX7mPBI3;Shape of You;+ (Plus);2011;def456
```

## 📖 Commands

### `spotify-export`
Export Spotify playlists to CSV format.

**Options:**
- `-n, --name <name> [owner]` - Search by playlist name (with optional owner)
- `-u, --url <url>` - Use playlist URL
- `-i, --id <id>` - Use playlist ID
- `-h, --help` - Show help

**Examples:**
```bash
spotify-export -n "My Playlist"
spotify-export -n "Art Pop" "username"  
spotify-export -u "https://open.spotify.com/playlist/ID"
spotify-export -i "playlist_id"
```

### `spotify-find-albums`
Find all albums containing a specific track.

**Usage:**
```bash
spotify-find-albums "Track Name" "Artist Name"
```

**Examples:**
```bash
spotify-find-albums "Yesterday" "The Beatles"
spotify-find-albums "Billie Jean" "Michael Jackson"
```

### `spotify-find-albums-csv`
Batch process CSV file to find earliest albums released before given years.

**Usage:**
```bash
spotify-find-albums-csv input.csv output.csv
```

**Features:**
- Finds albums released **before** the specified year
- Returns chronologically earliest album
- Preserves all input records (empty columns if no album found)

### `spotify-create-playlist`
Create Spotify playlist from CSV track data.

**Usage:**
```bash
spotify-create-playlist input.csv "Playlist Name" [--private]
```

**Features:**
- OAuth authentication with automatic browser opening
- Public playlists by default (use `--private` for private)
- Batch track addition with progress reporting
- Comprehensive error handling and reporting

## 🔧 Development

### Local Development
```bash
git clone https://github.com/spotify-suite/spotify-suite.git
cd spotify-suite
npm install
npm run test-config
```

### Testing
```bash
# Test configuration
npm run test-config

# Test Spotify authentication
npm run test-spotify
```

### NPM Scripts
- `npm run export` - Run playlist export
- `npm run find-albums` - Run single track album finder
- `npm run find-albums-csv` - Run CSV batch processor
- `npm run create-playlist` - Run playlist creator

## 🐛 Troubleshooting

### Authentication Issues
- Verify `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` are set
- Check redirect URI is added to your Spotify app
- Ensure your Spotify app has the required scopes

### Playlist Search Issues
- Some playlists may not appear in name search due to Spotify's indexing
- Use URL or ID search methods as fallback
- Private playlists require user authentication

### CSV Import Issues
- Use semicolon (`;`) as delimiter
- Ensure proper column headers
- Check encoding is UTF-8

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

- 📚 [Documentation](https://github.com/spotify-suite/spotify-suite#readme)
- 🐛 [Issue Tracker](https://github.com/spotify-suite/spotify-suite/issues)
- 💬 [Discussions](https://github.com/spotify-suite/spotify-suite/discussions)

## 🙏 Acknowledgments

- [Spotify Web API](https://developer.spotify.com/documentation/web-api/) for the excellent API
- Node.js community for the amazing packages
- Contributors and users who make this project better

---

Made with ❤️ for music lovers and data enthusiasts.