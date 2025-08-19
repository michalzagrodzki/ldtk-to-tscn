/**
 * Tileset mapping utilities for LDtk to TSCN conversion
 */

class TilesetMapper {
    constructor() {
        // Initialize tileset mappings based on analysis of existing files
        this.tilesetMappings = new Map();
        this.setupSunnyLandMapping();

        // Godot 4.x TileMap tile_data flag bits (3rd int, format=2):
        // - Lower 16 bits: alternative ID (we use atlasY)
        // - Bit 28: horizontal flip
        // - Bit 29: vertical flip
        // - Bit 30: transpose (rare; not emitted by LDtk)
        // Reference: observed in the provided "God Placement" TSCN output.
        this.ALT_MASK = 0x0000ffff;
        this.BIT_FLIP_H = 1 << 28;
        this.BIT_FLIP_V = 1 << 29;
        this.BIT_TRANSPOSE = 1 << 30;
    }

    /**
     * Setup mapping for SunnyLand_by_Ansimuz tileset
     * Based on the TestLevel_00_A.ldtk analysis
     */
    setupSunnyLandMapping() {
        // SunnyLand tileset configuration
        const sunnyLandConfig = {
            identifier: "SunnyLand_by_Ansimuz",
            uid: 2,
            tileGridSize: 16,
            pxWid: 368,
            pxHei: 336,
            __cWid: 23,  // Column count: 368/16 = 23
            __cHei: 21   // Row count: 336/16 = 21
        };

        this.tilesetMappings.set("SunnyLand_by_Ansimuz", sunnyLandConfig);
        this.tilesetMappings.set(2, sunnyLandConfig); // Map by UID as well
    }

    /**
     * Convert LDtk source pixel coordinates to Godot TileMap source integer.
     * For Godot 4.3 TileMap (format=2), we keep using the convention already
     * present in the good sample TSCNs: source = atlasX * 65536, alt = atlasY.
     */
    ldtkSourceToGodotSource(srcX, _srcY, tilesetUid) {
        const tileset = this.tilesetMappings.get(tilesetUid) || this.tilesetMappings.get("SunnyLand_by_Ansimuz");

        if (!tileset) {
            Utils.log(`Unknown tileset UID: ${tilesetUid}`, 'warning');
            return 0;
        }

        const tileGridSize = tileset.tileGridSize || 16;
        const atlasX = Math.floor(srcX / tileGridSize);
        // Godot-compatible source encoding used in existing converted files
        return atlasX * 65536;
    }

    // Legacy helper removed: we now map sources generically (atlasX*65536)

    // Removed bespoke SunnyLand atlas mapping; generic mapping is sufficient.

    /**
     * Compute alternative integer for TileMap:
     * - Lower 16 bits store alternative index. In our atlas mapping, this is atlasY.
     * - High bits encode transforms, if any: flipH, flipV, transpose.
     */
    getAlternativeTileId(flipFlags, _atlasX, atlasY) {
        let alt = Math.max(0, atlasY) & this.ALT_MASK;

        if (flipFlags && flipFlags.flipH) alt |= this.BIT_FLIP_H;
        if (flipFlags && flipFlags.flipV) alt |= this.BIT_FLIP_V;
        // LDtk doesn't provide transpose; if needed, we could infer rotations.
        // if (flipFlags.transpose) alt |= this.BIT_TRANSPOSE;

        return alt;
    }

    /**
     * Convert LDtk flip flags to Godot 4.3 tile transformations
     * Note: Godot 4.3 handles transformations differently than earlier versions
     */
    convertFlipFlags(ldtkFlipFlags) {
        // In Godot 4.3, transformations are typically handled through the alternative tile system
        // For basic implementation, we'll return standard values
        return {
            flipH: ldtkFlipFlags.flipH,
            flipV: ldtkFlipFlags.flipV,
            transpose: false  // LDtk doesn't have transpose, but Godot supports it
        };
    }

    /**
     * Handle tiles that need rotation but can't be rotated in Godot
     * Try to find pre-rotated versions in the tileset or log warnings
     */
    handleRotatedTile(atlasX, atlasY, flipFlags) {
        // Check if this tile has rotation/flip flags
        if (flipFlags.flipH || flipFlags.flipV) {
            // For corner tiles and certain special tiles, Godot might not support rotation
            // We need to either:
            // 1. Find a pre-rotated version in the tileset
            // 2. Use the unrotated version and log a warning
            
            const rotationKey = `${atlasX}:${atlasY}:${flipFlags.flipH ? 'H' : ''}${flipFlags.flipV ? 'V' : ''}`;
            
            // Check if we have a mapping for rotated versions
            const rotatedMappings = this.getRotatedTileMappings();
            
            if (rotatedMappings.has(rotationKey)) {
                return rotatedMappings.get(rotationKey);
            } else {
                Utils.log(`Warning: Tile at atlas(${atlasX},${atlasY}) with flip flags (H:${flipFlags.flipH}, V:${flipFlags.flipV}) not encoded; using unrotated version.`, 'warning');
                return { atlasX, atlasY, flipH: false, flipV: false };
            }
        }

        return { atlasX, atlasY, flipH: false, flipV: false };
    }

    /**
     * Get mappings for tiles that have pre-rotated versions in the tileset
     */
    getRotatedTileMappings() {
        const rotatedMappings = new Map();
        
        // Based on analysis of the SunnyLand tileset, some tiles have pre-rotated versions
        // This needs to be populated based on the specific tileset structure
        
        // For now, return empty map - tiles will use unrotated versions
        // TODO: Analyze tileset to find pre-rotated tile variants
        
        return rotatedMappings;
    }

    /**
     * Get tileset resource path for TSCN
     */
    getTilesetResourcePath(tilesetIdentifier) {
        const tilesetPaths = {
            "SunnyLand_by_Ansimuz": "res://Tiles/SunnyLandTileset.tres",
            "ClassicAutoTiles": "res://Tiles/ClassicAutoTiles.tres"
        };
        
        return tilesetPaths[tilesetIdentifier] || "res://Tiles/TilesDefault.tres";
    }

    /**
     * Get texture resource path for tileset
     */
    getTextureResourcePath(tilesetIdentifier) {
        const texturePaths = {
            "SunnyLand_by_Ansimuz": "res://Tiles/SunnyLand_by_Ansimuz-extended.png",
            "ClassicAutoTiles": "res://Tiles/ClassicAutoTiles.png"
        };
        
        return texturePaths[tilesetIdentifier] || "res://Tiles/Green.png";
    }

    /**
     * Generate Godot tile data array from LDtk grid tiles
     */
    generateGodotTileData(gridTiles, tilesetUid) {
        const tileData = [];
        
        for (const tile of gridTiles) {
            const gridPos = Utils.pixelToGrid(tile.px);
            const position = Utils.gridToGodotPosition(gridPos[0], gridPos[1]);
            const source = this.ldtkSourceToGodotSource(tile.src[0], tile.src[1], tilesetUid);
            
            // Calculate atlas coordinates for alternative ID
            const tileset = this.tilesetMappings.get(tilesetUid) || this.tilesetMappings.get("SunnyLand_by_Ansimuz");
            const tileGridSize = tileset ? tileset.tileGridSize : 16;
            const atlasX = Math.floor(tile.src[0] / tileGridSize);
            const atlasY = Math.floor(tile.src[1] / tileGridSize);
            
            const alternative = this.getAlternativeTileId(Utils.extractFlipFlags(tile.f), atlasX, atlasY);
            
            // Add the triplet: position, source, alternative
            tileData.push(position, source, alternative);
        }
        
        return tileData;
    }

    /**
     * Validate tileset compatibility
     */
    validateTileset(tilesetData) {
        const supportedTilesets = ["SunnyLand_by_Ansimuz"];
        
        if (!supportedTilesets.includes(tilesetData.identifier)) {
            return {
                isValid: false,
                message: `Unsupported tileset: ${tilesetData.identifier}. Supported tilesets: ${supportedTilesets.join(', ')}`
            };
        }
        
        return { isValid: true };
    }

    /**
     * Get layer configuration for different layer types
     */
    getLayerConfig(layerIdentifier) {
        const layerConfigs = {
            'Bg_textures_baked': {
                name: 'Background',
                zIndex: 0,
                modulate: 'Color(1, 1, 1, 1)'
            },
            'Wall_shadows_baked': {
                name: 'WallShadows',
                zIndex: 1,
                modulate: 'Color(1, 1, 1, 0.17)'  // Semi-transparent
            },
            'Collisions_baked': {
                name: 'Collisions',
                zIndex: 2,
                modulate: 'Color(1, 1, 1, 1)'
            }
        };
        
        return layerConfigs[layerIdentifier] || {
            name: layerIdentifier,
            zIndex: 0,
            modulate: 'Color(1, 1, 1, 1)'
        };
    }
}

// Export for use in other modules
window.TilesetMapper = TilesetMapper;
