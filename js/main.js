/**
 * Main application controller for LDtk to TSCN conversion
 */

class LDtkTSCNConverter {
    constructor() {
        this.parser = new LDtkParser();
        this.generator = new TSCNGenerator();
        this.fileHandler = new FileHandler();
        this.ui = new UIManager();
        
        this.currentFile = null;
        this.currentData = null;
        
        this.initialize();
    }

    /**
     * Initialize the application
     */
    initialize() {
        Utils.log('Initializing LDtk to TSCN Converter');
        
        // Make this instance available globally for UI callbacks
        window.app = this;
        
        // Clear old backups on startup
        this.fileHandler.clearOldBackups();
        
        Utils.log('Application initialized successfully');
    }

    /**
     * Load and process LDtk file
     */
    async loadFile(file) {
        try {
            this.ui.showProgress('Loading file...');
            
            // Load file content
            const content = await this.fileHandler.loadFile(file);
            this.ui.updateProgress(25, 'Validating file...');
            
            // Validate LDtk content
            const validation = this.fileHandler.validateLDtkContent(content);
            if (!validation.isValid) {
                throw new Error(validation.error);
            }
            
            this.ui.updateProgress(50, 'Parsing LDtk data...');
            
            // Parse LDtk data
            this.currentData = this.parser.parseFile(content);
            this.currentFile = file;
            
            this.ui.updateProgress(75, 'Extracting levels...');
            
            // Get available levels
            const levels = this.parser.getLevels();
            
            this.ui.updateProgress(100, 'File loaded successfully!');
            
            // Update UI
            setTimeout(() => {
                this.ui.hideProgress();
                this.ui.onFileLoaded(levels);
            }, 500);
            
            // Create backup
            this.fileHandler.createBackup(file.name, content);
            
            // Check compatibility and show warnings
            const compatibility = this.fileHandler.checkCompatibility(this.currentData);
            if (compatibility.warnings.length > 0) {
                compatibility.warnings.forEach(warning => {
                    Utils.log(warning, 'warning');
                });
            }
            
            Utils.log(`Loaded ${levels.length} levels from ${file.name}`);
            
        } catch (error) {
            this.ui.showError(error.message);
            this.currentFile = null;
            this.currentData = null;
        }
    }

    /**
     * Get level statistics
     */
    getLevelStats(levelIdentifier) {
        if (!this.parser) {
            return null;
        }
        
        return this.parser.getLevelStats(levelIdentifier);
    }

    /**
     * Convert level to TSCN format
     */
    async convertLevel(levelIdentifier, options = {}) {
        try {
            if (!this.currentData) {
                throw new Error('No LDtk file loaded');
            }

            this.ui.showProgress('Converting level...');
            
            // Convert level data
            this.ui.updateProgress(20, 'Processing level data...');
            const conversionData = this.parser.convertLevel(levelIdentifier, options);
            
            this.ui.updateProgress(40, 'Validating conversion data...');
            
            // Validate conversion data
            const validation = this.generator.validateConversionData(conversionData);
            if (!validation.isValid) {
                throw new Error(`Conversion validation failed: ${validation.errors.join(', ')}`);
            }
            
            this.ui.updateProgress(60, 'Generating TSCN content...');
            
            // Generate TSCN content
            const tscnContent = this.generator.generateTSCN(conversionData, options);
            
            this.ui.updateProgress(80, 'Creating preview...');
            
            // Generate preview information
            const preview = this.generator.generatePreview(conversionData);
            
            this.ui.updateProgress(100, 'Conversion completed!');
            
            // Show results
            setTimeout(() => {
                this.ui.hideProgress();
                this.ui.showResults(preview, tscnContent);
            }, 500);
            
            Utils.log(`Successfully converted level: ${levelIdentifier}`);
            
        } catch (error) {
            this.ui.showError(error.message);
        }
    }

    /**
     * Get available levels
     */
    getLevels() {
        if (!this.parser) {
            return [];
        }
        
        return this.parser.getLevels();
    }

    /**
     * Reset the application state
     */
    reset() {
        this.currentFile = null;
        this.currentData = null;
        this.parser = new LDtkParser();
        this.ui.reset();
        
        Utils.log('Application reset');
    }

    /**
     * Get application status
     */
    getStatus() {
        return {
            fileLoaded: !!this.currentFile,
            fileName: this.currentFile ? this.currentFile.name : null,
            levelCount: this.currentData ? this.parser.getLevels().length : 0,
            ready: !!this.currentData
        };
    }

    /**
     * Export conversion settings
     */
    exportSettings() {
        const settings = {
            version: '1.0.0',
            timestamp: new Date().toISOString(),
            fileInfo: this.currentFile ? {
                name: this.currentFile.name,
                size: this.currentFile.size,
                lastModified: this.currentFile.lastModified
            } : null,
            conversionOptions: this.ui.getConversionOptions()
        };
        
        return settings;
    }

    /**
     * Handle application errors
     */
    handleError(error, context = 'Application') {
        const message = `${context}: ${error.message}`;
        Utils.log(message, 'error');
        this.ui.showError(message);
        
        // Log additional error details for debugging
        if (error.stack) {
            Utils.log(error.stack, 'error');
        }
    }

    /**
     * Perform application cleanup
     */
    cleanup() {
        // Clear any running processes
        this.ui.hideProgress();
        
        // Clear temporary data
        this.currentFile = null;
        this.currentData = null;
        
        Utils.log('Application cleanup completed');
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.converter = new LDtkTSCNConverter();
        Utils.log('LDtk to TSCN Converter ready');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        
        // Show basic error message if UI is not available
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'background: #f8d7da; color: #721c24; padding: 20px; margin: 20px; border-radius: 5px; text-align: center;';
        errorDiv.textContent = `Application initialization failed: ${error.message}`;
        document.body.insertBefore(errorDiv, document.body.firstChild);
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.converter) {
        window.converter.cleanup();
    }
});

// Export for debugging purposes
window.LDtkTSCNConverter = LDtkTSCNConverter;