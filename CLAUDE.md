# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Start development server (serves static files on port 9901)
npm start
# or
npm run dev

# Start with live reload (if supported)
npm run dev

# Serve files (same as npm start)
npm run serve

# Build check (no build process needed)
npm run build
```

## Project Overview

A client-side web application that converts LDtk level data to Godot 4.3 TSCN tilemap format. The app processes LDtk gridTiles and generates compatible TSCN files with proper tilemap structure.

### Core Architecture

**Module Structure (load order matters):**
1. `utils.js` - Common utilities and helpers for file operations and data conversion
2. `tilesetMapper.js` - Tileset mapping between LDtk and Godot formats
3. `ldtkParser.js` - LDtk file parsing and data extraction engine
4. `tscnGenerator.js` - TSCN format generation logic for Godot 4.3
5. `uiManager.js` - UI interactions and visual feedback
6. `fileHandler.js` - File loading, validation, and processing
7. `main.js` - Main controller class and initialization

**Main Application Flow:**
1. User uploads .ldtk file
2. LDtk parser extracts level and tileset data
3. User selects level and conversion options
4. TSCN generator creates Godot 4.3 compatible tilemap structure
5. Result is downloaded as .tscn file

### Key Classes and Responsibilities

- **LDtkTSCNConverter** (`main.js`) - Main controller coordinating all modules
- **LDtkParser** (`ldtkParser.js`) - Parses LDtk JSON and extracts gridTiles data
- **TSCNGenerator** (`tscnGenerator.js`) - Generates Godot 4.3 TSCN tilemap structure
- **TilesetMapper** (`tilesetMapper.js`) - Maps LDtk tileset coordinates to Godot source IDs
- **UIManager** (`uiManager.js`) - Handles UI state, file selection, progress, results
- **FileHandler** (`fileHandler.js`) - File operations, validation, drag & drop
- **Utils** (`utils.js`) - Common utilities for JSON, downloads, coordinate conversion

### LDtk Format Details

The app expects LDtk files containing:
- **gridTiles**: Array of tile instances with px (position), src (source), f (flip flags)
- **Target Layers**: 'Collisions_baked', 'Wall_shadows_baked', 'Bg_textures_baked'
- **Supported Tileset**: 'SunnyLand_by_Ansimuz' (others will be skipped with warnings)

**GridTile Structure**: 
```json
{ "px": [x,y], "src": [src_x,src_y], "f": flip_flags, "t": tile_id, "d": [data], "a": alpha }
```

### Godot 4.3 TSCN Generation

- Creates separate TileMap nodes for each layer with proper parent structure
- Generates `layer_0/tile_data = PackedInt32Array(position, source, alternative, ...)`
- **Position Encoding**: Uses Godot's `y * 65536 + x` encoding for tile positions
- **Source Values**: Maps LDtk src coordinates to Godot atlas source IDs
- **Alternative Tiles**: Uses alternative tile ID (typically 1) for Godot 4.3 compatibility
- **Layer Properties**: Sets modulate, z_index, and other layer-specific properties

### Tileset Mapping

The TilesetMapper performs:
- **Accurate LDtk to Godot mapping**: Based on analysis of SunnyLand.tres and manual conversion
- **Source ID conversion**: Maps LDtk source coordinates to correct Godot 4.3 source IDs
- **Alternative ID calculation**: Determines proper alternative tile IDs based on atlas position
- **Rotation handling**: Manages tiles that cannot be rotated in Godot, with warnings for unsupported transformations
- **Flip flag interpretation**: (0=none, 1=flipH, 2=flipV, 3=both) with fallback for unsupported rotations
- **Layer configuration mapping**: (opacity, z-index, names)
- **Resource path generation**: For tilesets and textures

### Conversion Process

1. **File Loading**: Validates .ldtk files, checks size limits (50MB)
2. **Level Selection**: Presents available levels with metadata
3. **Layer Filtering**: User selects which layers to include
4. **Data Processing**: Converts gridTiles to Godot tile_data format
5. **TSCN Generation**: Creates complete TSCN structure with proper node hierarchy
6. **Download**: Provides generated .tscn file for download

### File Constraints

- LDtk files: Must contain valid JSON with proper LDtk structure
- Supported tilesets: Currently only 'SunnyLand_by_Ansimuz'
- File size limit: 50MB
- Supported layers: Collisions_baked, Wall_shadows_baked, Bg_textures_baked

### Development Notes

- Pure client-side processing (no server required)
- Static file serving only - no build process
- Uses ES6 classes with manual dependency loading
- Coordinate conversion from LDtk pixel coordinates to Godot grid positions
- Script loading order in index.html is critical for proper initialization
- Error handling and progress feedback throughout conversion process
- Local storage backup system for loaded files

### Target Level Focus

The application specifically targets the level "ConvertedRoom_202508151927" from TestLevel_00_A.ldtk, but works with any level that uses the supported tileset structure.