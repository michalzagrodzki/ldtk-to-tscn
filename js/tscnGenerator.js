/**
 * TSCN file generator for Godot 4.3 compatible tilemaps
 */

class TSCNGenerator {
    constructor() {
        this.tilesetMapper = new TilesetMapper();
        this.resourceCounter = 1;
    }

    /**
     * Generate complete TSCN file from conversion data
     */
    generateTSCN(conversionData, options = {}) {
        const level = conversionData.level;
        const layers = conversionData.layers;
        
        if (!layers || layers.length === 0) {
            throw new Error('No layers to convert');
        }
        
        Utils.log(`Generating TSCN for level: ${level.identifier}`);
        
        // Build TSCN structure
        const tscnContent = this.buildTSCNStructure(level, layers);
        
        Utils.log('TSCN generation completed');
        return tscnContent;
    }

    /**
     * Build the complete TSCN file structure
     */
    buildTSCNStructure(level, layers) {
        const resources = [];
        const nodes = [];
        
        // Generate header
        const header = this.generateHeader(layers);
        
        // Generate external resources (tilesets, textures)
        const externalResources = this.generateExternalResources(layers);
        
        // Generate root node
        const rootNode = this.generateRootNode(level);
        nodes.push(rootNode);
        
        // Generate background texture if needed
        const backgroundNode = this.generateBackgroundNode(level);
        if (backgroundNode) {
            nodes.push(backgroundNode);
        }
        
        // Generate TileMap nodes for each layer
        for (let i = 0; i < layers.length; i++) {
            const layer = layers[i];
            const tileMapNode = this.generateTileMapNode(layer, i);
            nodes.push(tileMapNode);
        }
        
        // Combine all parts
        const parts = [
            header,
            '',
            ...externalResources,
            '',
            ...nodes
        ];
        
        return parts.join('\n');
    }


    /**
     * Generate TSCN header with load steps
     */
    generateHeader(layers) {
        // Calculate load steps: header + external resources + nodes
        const uniqueTilesets = new Set(layers.map(layer => layer.tileset.identifier));
        const loadSteps = uniqueTilesets.size * 2 + 1; // Tileset + texture per unique tileset + scene uid
        
        const uid = `uid://b${Utils.generateUID()}`;
        
        return `[gd_scene load_steps=${loadSteps} format=3 uid="${uid}"]`;
    }

    /**
     * Generate external resource declarations
     */
    generateExternalResources(layers) {
        const resources = [];
        const processedTilesets = new Set();
        let resourceId = 1;
        
        for (const layer of layers) {
            const tileset = layer.tileset;
            
            if (processedTilesets.has(tileset.identifier)) {
                continue;
            }
            
            processedTilesets.add(tileset.identifier);
            
            // Add texture resource
            const textureId = `${resourceId}_texture`;
            const texturePath = this.tilesetMapper.getTextureResourcePath(tileset.identifier);
            resources.push(`[ext_resource type="Texture2D" uid="uid://b${Utils.generateUID()}" path="${texturePath}" id="${textureId}"]`);
            
            // Add tileset resource
            const tilesetId = `${resourceId}_tileset`;
            const tilesetPath = this.tilesetMapper.getTilesetResourcePath(tileset.identifier);
            resources.push(`[ext_resource type="TileSet" uid="uid://d${Utils.generateUID()}" path="${tilesetPath}" id="${tilesetId}"]`);
            
            resourceId++;
        }
        
        return resources;
    }

    /**
     * Generate root node
     */
    generateRootNode(level) {
        const nodeName = this.sanitizeNodeName(level.identifier);
        return `[node name="${nodeName}" type="Node2D"]`;
    }

    /**
     * Generate background texture node if needed
     */
    generateBackgroundNode(level) {
        // For now, we'll skip the background texture
        // This can be added later if needed
        return null;
    }

    /**
     * Generate TileMap node for a layer
     */
    generateTileMapNode(layer, layerIndex) {
        const config = layer.config;
        const nodeName = config.name || layer.identifier;
        const sanitizedName = this.sanitizeNodeName(nodeName);
        
        const tileData = this.generateTileData(layer);
        const parentPath = layerIndex === 0 ? '.' : '.';
        
        const nodeLines = [
            `[node name="${sanitizedName}" type="TileMap" parent="${parentPath}"]`,
            'texture_filter = 1',
            `tile_set = ExtResource("1_tileset")`, // Reference to first tileset
            'format = 2'
        ];
        
        // Add layer-specific properties
        if (config.modulate && config.modulate !== 'Color(1, 1, 1, 1)') {
            nodeLines.push(`modulate = ${config.modulate}`);
        }
        
        if (config.zIndex !== 0) {
            nodeLines.push(`z_index = ${config.zIndex}`);
        }
        
        // Add tile data
        if (tileData.length > 0) {
            nodeLines.push(`layer_0/tile_data = PackedInt32Array(${tileData.join(', ')})`);
        }
        
        return nodeLines.join('\n');
    }


    /**
     * Generate tile data array for a layer
     */
    generateTileData(layer) {
        if (!layer.tiles || layer.tiles.length === 0) {
            return [];
        }
        
        const tileData = [];
        
        for (const tile of layer.tiles) {
            const gridPos = tile.gridPos;
            const position = Utils.gridToGodotPosition(gridPos[0], gridPos[1]);
            
            // Calculate atlas coordinates
            const tileGridSize = layer.tileset.tileGridSize || 16;
            const atlasX = Math.floor(tile.src[0] / tileGridSize);
            const atlasY = Math.floor(tile.src[1] / tileGridSize);
            
            // Handle rotation/flip transformations
            const rotatedTile = this.tilesetMapper.handleRotatedTile(atlasX, atlasY, tile.flipFlags);
            
            // Get source coordinates (using potentially adjusted atlas coordinates)
            const source = this.tilesetMapper.ldtkSourceToGodotSource(
                rotatedTile.atlasX * tileGridSize, 
                rotatedTile.atlasY * tileGridSize, 
                layer.tileset.uid
            );
            
            // Get alternative tile ID
            const alternative = this.tilesetMapper.getAlternativeTileId(tile.flipFlags, rotatedTile.atlasX, rotatedTile.atlasY);
            
            // Add the triplet: position, source, alternative
            tileData.push(position, source, alternative);
        }
        
        return tileData;
    }

    /**
     * Sanitize node names for Godot
     */
    sanitizeNodeName(name) {
        // Remove invalid characters and ensure it starts with a letter or underscore
        let sanitized = name.replace(/[^a-zA-Z0-9_]/g, '_');
        
        if (!/^[a-zA-Z_]/.test(sanitized)) {
            sanitized = '_' + sanitized;
        }
        
        return sanitized;
    }

    /**
     * Generate preview information about the conversion
     */
    generatePreview(conversionData) {
        const level = conversionData.level;
        const layers = conversionData.layers;
        
        let totalTiles = 0;
        const layerInfo = [];
        
        for (const layer of layers) {
            const tileCount = layer.tiles ? layer.tiles.length : 0;
            totalTiles += tileCount;
            
            layerInfo.push({
                name: layer.identifier,
                tileCount: tileCount,
                opacity: layer.opacity,
                visible: layer.visible,
                tileset: layer.tileset.identifier
            });
        }
        
        return {
            levelName: level.identifier,
            dimensions: `${level.pxWid}x${level.pxHei}px (${level.gridWid}x${level.gridHei} tiles)`,
            totalTiles: totalTiles,
            layerCount: layers.length,
            layers: layerInfo,
            estimatedFileSize: this.estimateFileSize(totalTiles, layers.length)
        };
    }

    /**
     * Estimate TSCN file size
     */
    estimateFileSize(totalTiles, layerCount) {
        // Rough estimation based on TSCN structure
        const headerSize = 200; // Header and external resources
        const nodeSize = 150 * layerCount; // Each TileMap node
        const tileDataSize = totalTiles * 15; // Each tile triplet in text format
        
        const estimatedBytes = headerSize + nodeSize + tileDataSize;
        return Utils.formatFileSize(estimatedBytes);
    }

    /**
     * Validate conversion data before generating TSCN
     */
    validateConversionData(conversionData) {
        const errors = [];
        
        if (!conversionData.level) {
            errors.push('Missing level data');
        }
        
        if (!conversionData.layers || conversionData.layers.length === 0) {
            errors.push('No layers to convert');
        }
        
        // Check each layer
        if (conversionData.layers) {
            for (const layer of conversionData.layers) {
                if (!layer.tileset) {
                    errors.push(`Layer ${layer.identifier} missing tileset data`);
                }
                
                if (!layer.tiles) {
                    errors.push(`Layer ${layer.identifier} missing tile data`);
                }
            }
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Generate filename for the TSCN file
     */
    generateFilename(levelIdentifier) {
        const sanitized = levelIdentifier.replace(/[^a-zA-Z0-9_-]/g, '_');
        return `${sanitized}.tscn`;
    }
}

// Export for use in other modules
window.TSCNGenerator = TSCNGenerator;