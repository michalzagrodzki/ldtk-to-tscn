/**
 * Utility functions for LDtk to TSCN conversion
 */

class Utils {
    /**
     * Download content as file
     */
    static downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    /**
     * Parse JSON safely with error handling
     */
    static parseJSON(jsonString) {
        try {
            return { success: true, data: JSON.parse(jsonString) };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Format file size for display
     */
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Validate LDtk file structure
     */
    static validateLDtkFile(data) {
        const errors = [];
        
        if (!data.__header__ || data.__header__.fileType !== "LDtk Project JSON") {
            errors.push("Invalid LDtk file: Missing or incorrect header");
        }
        
        if (!data.levels || !Array.isArray(data.levels)) {
            errors.push("Invalid LDtk file: Missing levels array");
        }
        
        if (!data.defs || !data.defs.tilesets || !Array.isArray(data.defs.tilesets)) {
            errors.push("Invalid LDtk file: Missing tileset definitions");
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    /**
     * Get unique ID for resources
     */
    static generateUID() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Convert LDtk pixel coordinates to Godot grid coordinates
     */
    static pixelToGrid(px, gridSize = 16) {
        return [Math.floor(px[0] / gridSize), Math.floor(px[1] / gridSize)];
    }

    /**
     * Convert grid coordinates to Godot position encoding (y * 65536 + x)
     */
    static gridToGodotPosition(gridX, gridY) {
        return gridY * 65536 + gridX;
    }

    /**
     * Extract flip transformation from LDtk 'f' value
     */
    static extractFlipFlags(f) {
        return {
            flipH: (f & 1) !== 0,  // Bit 0: horizontal flip
            flipV: (f & 2) !== 0   // Bit 1: vertical flip
        };
    }

    /**
     * Convert LDtk layer identifier to Godot layer index
     */
    static getLayerIndex(identifier) {
        const layerMapping = {
            'Bg_textures_baked': 0,      // Background layer (bottom)
            'Wall_shadows_baked': 1,     // Shadows layer (middle)
            'Collisions_baked': 2        // Collision layer (top)
        };
        return layerMapping[identifier] || 0;
    }

    /**
     * Format progress percentage
     */
    static formatProgress(current, total) {
        return Math.round((current / total) * 100);
    }

    /**
     * Log with timestamp
     */
    static log(message, type = 'info') {
        const timestamp = new Date().toLocaleTimeString();
        const prefix = `[${timestamp}] [${type.toUpperCase()}]`;
        console.log(`${prefix} ${message}`);
    }

    /**
     * Escape special characters for TSCN format
     */
    static escapeTSCNString(str) {
        return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    }

    /**
     * Create progress callback for async operations
     */
    static createProgressCallback(onProgress) {
        let current = 0;
        return (total) => {
            current++;
            if (onProgress) {
                onProgress(current, total);
            }
        };
    }

    /**
     * Debounce function for UI updates
     */
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Export for use in other modules
window.Utils = Utils;