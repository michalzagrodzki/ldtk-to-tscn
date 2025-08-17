/**
 * File handling utilities for LDtk file processing
 */

class FileHandler {
    constructor() {
        this.maxFileSize = 50 * 1024 * 1024; // 50MB limit
        this.supportedTypes = ['.ldtk'];
    }

    /**
     * Load and validate LDtk file
     */
    async loadFile(file) {
        try {
            // Validate file
            const validation = this.validateFile(file);
            if (!validation.isValid) {
                throw new Error(validation.error);
            }

            Utils.log(`Loading file: ${file.name} (${Utils.formatFileSize(file.size)})`);

            // Read file content
            const content = await this.readFileContent(file);
            
            Utils.log('File content loaded successfully');
            return content;

        } catch (error) {
            Utils.log(`File loading failed: ${error.message}`, 'error');
            throw error;
        }
    }

    /**
     * Validate file before processing
     */
    validateFile(file) {
        if (!file) {
            return { isValid: false, error: 'No file provided' };
        }

        // Check file size
        if (file.size > this.maxFileSize) {
            return { 
                isValid: false, 
                error: `File too large: ${Utils.formatFileSize(file.size)}. Maximum size: ${Utils.formatFileSize(this.maxFileSize)}` 
            };
        }

        // Check file extension
        const extension = this.getFileExtension(file.name);
        if (!this.supportedTypes.includes(extension)) {
            return { 
                isValid: false, 
                error: `Unsupported file type: ${extension}. Supported types: ${this.supportedTypes.join(', ')}` 
            };
        }

        return { isValid: true };
    }

    /**
     * Read file content as text
     */
    readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    const content = event.target.result;
                    resolve(content);
                } catch (error) {
                    reject(new Error(`Failed to read file content: ${error.message}`));
                }
            };

            reader.onerror = () => {
                reject(new Error('File reading failed'));
            };

            reader.onprogress = (event) => {
                if (event.lengthComputable) {
                    const progress = Math.round((event.loaded / event.total) * 100);
                    Utils.log(`Reading file: ${progress}%`);
                }
            };

            reader.readAsText(file);
        });
    }

    /**
     * Get file extension
     */
    getFileExtension(filename) {
        return filename.toLowerCase().substring(filename.lastIndexOf('.'));
    }

    /**
     * Generate safe filename
     */
    generateSafeFilename(originalName, suffix = '') {
        // Remove extension
        const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
        
        // Sanitize filename
        const safeName = nameWithoutExt.replace(/[^a-zA-Z0-9_-]/g, '_');
        
        // Add suffix and new extension
        return `${safeName}${suffix}.tscn`;
    }

    /**
     * Validate LDtk file content structure
     */
    validateLDtkContent(content) {
        try {
            const data = JSON.parse(content);
            
            // Basic structure validation
            if (!data.__header__) {
                return { isValid: false, error: 'Missing LDtk header' };
            }

            if (data.__header__.fileType !== 'LDtk Project JSON') {
                return { isValid: false, error: 'Not a valid LDtk project file' };
            }

            if (!data.levels || !Array.isArray(data.levels)) {
                return { isValid: false, error: 'Missing or invalid levels data' };
            }

            if (data.levels.length === 0) {
                return { isValid: false, error: 'No levels found in the file' };
            }

            if (!data.defs || !data.defs.tilesets) {
                return { isValid: false, error: 'Missing tileset definitions' };
            }

            // Check for supported tilesets
            const supportedTilesets = data.defs.tilesets.filter(tileset => 
                tileset.identifier === 'SunnyLand_by_Ansimuz'
            );

            if (supportedTilesets.length === 0) {
                return { 
                    isValid: false, 
                    error: 'No supported tilesets found. This converter currently supports: SunnyLand_by_Ansimuz' 
                };
            }

            return { isValid: true, data: data };

        } catch (error) {
            return { isValid: false, error: `Invalid JSON: ${error.message}` };
        }
    }

    /**
     * Extract file metadata
     */
    extractFileMetadata(file, ldtkData) {
        const metadata = {
            filename: file.name,
            fileSize: Utils.formatFileSize(file.size),
            lastModified: new Date(file.lastModified).toLocaleString(),
            ldtkVersion: ldtkData.__header__.appVersion || 'Unknown',
            levelCount: ldtkData.levels ? ldtkData.levels.length : 0,
            tilesetCount: ldtkData.defs && ldtkData.defs.tilesets ? ldtkData.defs.tilesets.length : 0,
            worldLayout: ldtkData.worldLayout || 'Unknown'
        };

        return metadata;
    }

    /**
     * Check file compatibility
     */
    checkCompatibility(ldtkData) {
        const issues = [];
        const warnings = [];

        // Check LDtk version compatibility
        if (ldtkData.__header__.appVersion) {
            const version = ldtkData.__header__.appVersion;
            const major = parseInt(version.split('.')[0]);
            
            if (major < 1) {
                warnings.push(`Old LDtk version detected (${version}). Some features may not work correctly.`);
            }
        }

        // Check for unsupported features
        if (ldtkData.externalLevels) {
            issues.push('External levels are not supported');
        }

        // Check tileset compatibility
        if (ldtkData.defs && ldtkData.defs.tilesets) {
            const unsupportedTilesets = ldtkData.defs.tilesets.filter(tileset => 
                tileset.identifier !== 'SunnyLand_by_Ansimuz' && tileset.identifier !== 'Internal_Icons'
            );

            if (unsupportedTilesets.length > 0) {
                const names = unsupportedTilesets.map(t => t.identifier).join(', ');
                warnings.push(`Unsupported tilesets will be skipped: ${names}`);
            }
        }

        return {
            compatible: issues.length === 0,
            issues: issues,
            warnings: warnings
        };
    }

    /**
     * Create backup of original file data
     */
    createBackup(filename, content) {
        const backupKey = `ldtk2tscn_backup_${Date.now()}`;
        const backupData = {
            filename: filename,
            content: content,
            timestamp: new Date().toISOString()
        };

        try {
            localStorage.setItem(backupKey, JSON.stringify(backupData));
            Utils.log(`Backup created: ${backupKey}`);
            return backupKey;
        } catch (error) {
            Utils.log(`Failed to create backup: ${error.message}`, 'warning');
            return null;
        }
    }

    /**
     * Clear old backups to save space
     */
    clearOldBackups() {
        try {
            const keys = Object.keys(localStorage);
            const backupKeys = keys.filter(key => key.startsWith('ldtk2tscn_backup_'));
            
            // Keep only the 5 most recent backups
            if (backupKeys.length > 5) {
                const sorted = backupKeys.sort();
                const toDelete = sorted.slice(0, -5);
                
                toDelete.forEach(key => {
                    localStorage.removeItem(key);
                });

                Utils.log(`Cleared ${toDelete.length} old backups`);
            }
        } catch (error) {
            Utils.log(`Failed to clear old backups: ${error.message}`, 'warning');
        }
    }
}

// Export for use in other modules
window.FileHandler = FileHandler;