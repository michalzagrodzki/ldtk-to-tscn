# LDtk to TSCN Converter

A web-based application that converts LDtk level data to Godot 4.3 TSCN tilemap format.

## Features

- Convert LDtk levels to Godot 4.3 compatible TSCN files
- Multiple TileMap nodes for organized layer structure
- Support for SunnyLand_by_Ansimuz tileset
- Process multiple layers: Collisions_baked, Wall_shadows_baked, Bg_textures_baked
- Preserve tile positioning and transformations
- Client-side processing - no server required
- Drag & drop file interface

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```

3. Open http://localhost:9901 in your browser

4. Upload your .ldtk file and select a level to convert

## Usage

1. **Upload File**: Select or drag & drop a .ldtk file
2. **Choose Level**: Select the level you want to convert from the dropdown
3. **Configure Options**: Choose which layers to include in the conversion
4. **Convert**: Click "Convert to TSCN" to generate the file
5. **Download**: Download the generated .tscn file

## Supported Features

- **Tilesets**: SunnyLand_by_Ansimuz
- **Layers**: Collisions_baked, Wall_shadows_baked, Bg_textures_baked
- **Tile Properties**: Position, source coordinates, flip transformations
- **Godot Version**: 4.3 compatible TileMap structure

## Technical Details

The application processes LDtk gridTiles and converts them to Godot's tile_data format:
- LDtk pixel coordinates → Godot grid positions
- LDtk source coordinates → Godot atlas source IDs  
- LDtk flip flags → Godot transformation handling
- Layer opacity and visibility preserved

**Output Format**:
- Creates separate TileMap nodes for each layer with proper parent structure

## File Structure

```
ldtk2tscn/
├── index.html          # Main application interface
├── css/
│   └── styles.css      # Application styling
├── js/
│   ├── main.js         # Main application controller
│   ├── ldtkParser.js   # LDtk file parsing
│   ├── tscnGenerator.js # TSCN file generation
│   ├── tilesetMapper.js # Tileset coordinate mapping
│   ├── uiManager.js    # User interface management
│   ├── fileHandler.js  # File operations
│   └── utils.js        # Utility functions
└── package.json        # Node.js dependencies
```

## Development

The application is built with vanilla JavaScript ES6 classes and requires no build process. Simply serve the static files and the app is ready to use.

For development with live reload:
```bash
npm run dev
```