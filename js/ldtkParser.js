/**
 * LDtk file parser for extracting level and tile data
 */

class LDtkParser {
    constructor() {
        this.data = null;
        this.tilesetMapper = new TilesetMapper();
    }

    /**
     * Parse LDtk file content
     */
    parseFile(fileContent) {
        const parseResult = Utils.parseJSON(fileContent);
        
        if (!parseResult.success) {
            throw new Error(`Invalid JSON: ${parseResult.error}`);
        }
        
        this.data = parseResult.data;
        
        // Validate LDtk file structure
        const validation = Utils.validateLDtkFile(this.data);
        if (!validation.isValid) {
            throw new Error(`Invalid LDtk file: ${validation.errors.join(', ')}`);
        }
        
        Utils.log('LDtk file parsed successfully');
        return this.data;
    }

    /**
     * Get available levels from the LDtk file
     */
    getLevels() {
        if (!this.data || !this.data.levels) {
            return [];
        }
        
        return this.data.levels.map(level => ({
            identifier: level.identifier,
            iid: level.iid,
            uid: level.uid,
            worldX: level.worldX,
            worldY: level.worldY,
            pxWid: level.pxWid,
            pxHei: level.pxHei,
            layerCount: level.layerInstances ? level.layerInstances.length : 0
        }));
    }

    /**
     * Get level by identifier
     */
    getLevel(identifier) {
        if (!this.data || !this.data.levels) {
            return null;
        }
        
        return this.data.levels.find(level => level.identifier === identifier);
    }

    /**
     * Extract tile layers from a level
     */
    getTileLayers(levelIdentifier) {
        const level = this.getLevel(levelIdentifier);
        if (!level || !level.layerInstances) {
            return [];
        }
        
        // Filter for the specific layers we're interested in
        const targetLayers = ['Collisions_baked', 'Wall_shadows_baked', 'Bg_textures_baked'];
        
        return level.layerInstances
            .filter(layer => targetLayers.includes(layer.__identifier))
            .map(layer => ({
                identifier: layer.__identifier,
                type: layer.__type,
                gridSize: layer.__gridSize,
                opacity: layer.__opacity,
                tilesetDefUid: layer.__tilesetDefUid,
                gridTiles: layer.gridTiles || [],
                autoLayerTiles: layer.autoLayerTiles || [],
                visible: layer.visible !== false
            }));
    }

    /**
     * Get tileset definitions
     */
    getTilesets() {
        if (!this.data || !this.data.defs || !this.data.defs.tilesets) {
            return [];
        }
        
        return this.data.defs.tilesets.map(tileset => ({
            identifier: tileset.identifier,
            uid: tileset.uid,
            relPath: tileset.relPath,
            pxWid: tileset.pxWid,
            pxHei: tileset.pxHei,
            tileGridSize: tileset.tileGridSize,
            __cWid: tileset.__cWid,
            __cHei: tileset.__cHei
        }));
    }

    /**
     * Get tileset by UID
     */
    getTilesetByUid(uid) {
        const tilesets = this.getTilesets();
        return tilesets.find(tileset => tileset.uid === uid);
    }

    /**
     * Process grid tiles for conversion
     */
    processGridTiles(gridTiles, tilesetUid) {
        if (!gridTiles || gridTiles.length === 0) {
            return [];
        }
        
        const processedTiles = [];
        
        for (const tile of gridTiles) {
            // Validate tile structure
            if (!tile.px || !tile.src || tile.f === undefined) {
                Utils.log(`Invalid tile data: ${JSON.stringify(tile)}`, 'warning');
                continue;
            }
            
            const processedTile = {
                // Position in pixels [x, y]
                px: tile.px,
                // Source coordinates in tileset [x, y]
                src: tile.src,
                // Flip flags (0=none, 1=flipH, 2=flipV, 3=both)
                f: tile.f,
                // Grid position (calculated)
                gridPos: Utils.pixelToGrid(tile.px),
                // Flip flags parsed
                flipFlags: Utils.extractFlipFlags(tile.f),
                // Tile ID in tileset (if available)
                tileId: tile.t || null,
                // Additional data
                d: tile.d || [],
                // Alpha/opacity
                a: tile.a || 1
            };
            
            processedTiles.push(processedTile);
        }
        
        // Sort tiles by position for consistent output
        processedTiles.sort((a, b) => {
            if (a.gridPos[1] !== b.gridPos[1]) {
                return a.gridPos[1] - b.gridPos[1]; // Sort by Y first
            }
            return a.gridPos[0] - b.gridPos[0]; // Then by X
        });
        
        return processedTiles;
    }

    /**
     * Convert LDtk level to conversion data structure
     */
    convertLevel(levelIdentifier, options = {}) {
        const level = this.getLevel(levelIdentifier);
        if (!level) {
            throw new Error(`Level not found: ${levelIdentifier}`);
        }
        
        const tileLayers = this.getTileLayers(levelIdentifier);
        const tilesets = this.getTilesets();
        
        // Filter layers based on options
        const filteredLayers = tileLayers.filter(layer => {
            switch (layer.identifier) {
                case 'Collisions_baked':
                    return options.includeCollisions !== false;
                case 'Wall_shadows_baked':
                    return options.includeShadows !== false;
                case 'Bg_textures_baked':
                    return options.includeBackground !== false;
                default:
                    return false;
            }
        });
        
        const conversionData = {
            level: {
                identifier: level.identifier,
                iid: level.iid,
                uid: level.uid,
                worldX: level.worldX,
                worldY: level.worldY,
                pxWid: level.pxWid,
                pxHei: level.pxHei,
                gridWid: Math.ceil(level.pxWid / 16),
                gridHei: Math.ceil(level.pxHei / 16)
            },
            layers: [],
            tilesets: tilesets
        };
        
        // Process each layer
        for (const layer of filteredLayers) {
            const tileset = this.getTilesetByUid(layer.tilesetDefUid);
            
            if (!tileset) {
                Utils.log(`Tileset not found for layer ${layer.identifier} (UID: ${layer.tilesetDefUid})`, 'warning');
                continue;
            }
            
            // Validate tileset compatibility
            const validation = this.tilesetMapper.validateTileset(tileset);
            if (!validation.isValid) {
                Utils.log(`Skipping layer ${layer.identifier}: ${validation.message}`, 'warning');
                continue;
            }
            
            const processedTiles = this.processGridTiles(layer.gridTiles, layer.tilesetDefUid);
            
            const layerData = {
                identifier: layer.identifier,
                type: layer.type,
                gridSize: layer.gridSize,
                opacity: layer.opacity,
                visible: layer.visible,
                tileset: tileset,
                tiles: processedTiles,
                tileCount: processedTiles.length,
                config: this.tilesetMapper.getLayerConfig(layer.identifier)
            };
            
            conversionData.layers.push(layerData);
        }
        
        Utils.log(`Converted level ${levelIdentifier} with ${conversionData.layers.length} layers`);
        return conversionData;
    }

    /**
     * Get level statistics
     */
    getLevelStats(levelIdentifier) {
        const level = this.getLevel(levelIdentifier);
        if (!level) {
            return null;
        }
        
        const tileLayers = this.getTileLayers(levelIdentifier);
        
        let totalTiles = 0;
        const layerStats = {};
        
        for (const layer of tileLayers) {
            const tileCount = layer.gridTiles ? layer.gridTiles.length : 0;
            totalTiles += tileCount;
            layerStats[layer.identifier] = {
                tileCount,
                opacity: layer.opacity,
                visible: layer.visible
            };
        }
        
        return {
            identifier: level.identifier,
            dimensions: `${level.pxWid}x${level.pxHei}px`,
            gridDimensions: `${Math.ceil(level.pxWid / 16)}x${Math.ceil(level.pxHei / 16)}`,
            totalTiles,
            layerCount: tileLayers.length,
            layers: layerStats
        };
    }
}

// Export for use in other modules
window.LDtkParser = LDtkParser;