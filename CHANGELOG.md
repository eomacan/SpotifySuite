# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-19

### Added
- **Playlist Export Tool** (`spotify-export`)
  - Export Spotify playlists to CSV format
  - Multiple search modes: name, URL, ID
  - Support for playlist name + owner search
  - Turkish locale CSV formatting
  - Automatic filename conflict resolution
  - Pagination handling for large playlists

- **Track Album Finder** (`spotify-find-albums`)
  - Single track album lookup
  - Find all albums containing a specific track
  - Chronological ordering by release year
  - Filter by album type (albums only)

- **CSV Album Batch Processor** (`spotify-find-albums-csv`)
  - Batch process CSV files to find original albums
  - Find earliest albums released before specified years
  - Progress tracking and rate limiting
  - Complete data preservation (all input records in output)
  - Turkish locale CSV input/output support

- **Playlist Creator** (`spotify-create-playlist`)
  - Create Spotify playlists from CSV data
  - OAuth authentication with automatic browser opening
  - Public/private playlist options
  - Batch track addition with error handling
  - Cross-platform browser opening (macOS, Windows, Linux)
  - Comprehensive success/failure reporting

- **Core Infrastructure**
  - Modular architecture with reusable components
  - Unified Spotify API client
  - Turkish locale configuration
  - Professional CLI interfaces
  - Comprehensive error handling
  - Environment variable validation

### Features
- **Multi-platform Support**: Windows, macOS, Linux
- **Turkish Locale**: Full CSV formatting compatibility
- **OAuth Flow**: Complete user authentication system
- **Rate Limiting**: API call optimization and rate limiting
- **Progress Tracking**: Real-time progress for batch operations
- **Error Resilience**: Graceful error handling and recovery
- **Professional CLI**: Rich help systems and usage examples

### Technical
- **Node.js**: Minimum version 18.0.0
- **Dependencies**: axios, csv-writer, csv-parse
- **Architecture**: Modular design with shared components
- **Testing**: Comprehensive test suite included
- **Documentation**: Complete README with examples

## [Unreleased]

### Planned Features
- Web UI interface
- Playlist synchronization tools
- Advanced filtering options
- Spotify Connect integration
- Playlist analytics and statistics
- Bulk playlist operations

---

**Note**: This project follows semantic versioning. Breaking changes will increment the major version, new features increment minor version, and bug fixes increment patch version.