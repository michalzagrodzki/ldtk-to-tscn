/**
 * UI Manager for handling user interface interactions
 */

class UIManager {
    constructor() {
        this.elements = {};
        this.state = {
            fileLoaded: false,
            levelSelected: false,
            converting: false
        };
        
        this.initializeElements();
        this.bindEvents();
    }

    /**
     * Initialize DOM element references
     */
    initializeElements() {
        this.elements = {
            ldtkFile: document.getElementById('ldtk-file'),
            ldtkStatus: document.getElementById('ldtk-status'),
            levelSelector: document.getElementById('level-selector'),
            levelSelect: document.getElementById('level-select'),
            conversionOptions: document.getElementById('conversion-options'),
            includeCollisions: document.getElementById('include-collisions'),
            includeShadows: document.getElementById('include-shadows'),
            includeBackground: document.getElementById('include-background'),
            convertBtn: document.getElementById('convert-btn'),
            progressIndicator: document.getElementById('progress-indicator'),
            progressFill: document.getElementById('progress-fill'),
            progressText: document.getElementById('progress-text'),
            outputSection: document.getElementById('output-section'),
            resultInfo: document.getElementById('result-info'),
            downloadBtn: document.getElementById('download-btn')
        };
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // File input change
        this.elements.ldtkFile.addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files[0]);
        });

        // Level selection change
        this.elements.levelSelect.addEventListener('change', (e) => {
            this.handleLevelSelect(e.target.value);
        });

        // Convert button click
        this.elements.convertBtn.addEventListener('click', () => {
            this.handleConvert();
        });

        // Download button click
        this.elements.downloadBtn.addEventListener('click', () => {
            this.handleDownload();
        });

        // Drag and drop for file input
        this.setupDragAndDrop();
    }

    /**
     * Setup drag and drop functionality
     */
    setupDragAndDrop() {
        const fileInput = this.elements.ldtkFile;
        const container = fileInput.parentElement;

        container.addEventListener('dragover', (e) => {
            e.preventDefault();
            container.classList.add('drag-over');
        });

        container.addEventListener('dragleave', () => {
            container.classList.remove('drag-over');
        });

        container.addEventListener('drop', (e) => {
            e.preventDefault();
            container.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });
    }

    /**
     * Handle file selection
     */
    handleFileSelect(file) {
        if (!file) {
            this.setFileStatus('No file selected', 'default');
            return;
        }

        if (!file.name.toLowerCase().endsWith('.ldtk')) {
            this.setFileStatus('Please select a .ldtk file', 'error');
            return;
        }

        this.setFileStatus(`Loading ${file.name} (${Utils.formatFileSize(file.size)})...`, 'loading');
        
        // Trigger file processing
        if (window.app && window.app.loadFile) {
            window.app.loadFile(file);
        }
    }

    /**
     * Set file status message
     */
    setFileStatus(message, type = 'default') {
        const statusElement = this.elements.ldtkStatus;
        statusElement.textContent = message;
        
        // Remove existing status classes
        statusElement.classList.remove('success', 'error', 'loading');
        
        if (type !== 'default') {
            statusElement.classList.add(type);
        }
    }

    /**
     * Update UI after file is loaded
     */
    onFileLoaded(levels) {
        this.state.fileLoaded = true;
        
        // Update file status
        this.setFileStatus(`File loaded successfully. Found ${levels.length} level(s).`, 'success');
        
        // Populate level selector
        this.populateLevelSelector(levels);
        
        // Show level selector
        this.show(this.elements.levelSelector);
        
        this.updateConvertButton();
    }

    /**
     * Populate level selector dropdown
     */
    populateLevelSelector(levels) {
        const select = this.elements.levelSelect;
        
        // Clear existing options
        select.innerHTML = '<option value="">Choose a level...</option>';
        
        // Add level options
        for (const level of levels) {
            const option = document.createElement('option');
            option.value = level.identifier;
            option.textContent = `${level.identifier} (${level.pxWid}x${level.pxHei}px, ${level.layerCount} layers)`;
            select.appendChild(option);
        }
    }

    /**
     * Handle level selection
     */
    handleLevelSelect(levelIdentifier) {
        this.state.levelSelected = !!levelIdentifier;
        
        if (levelIdentifier) {
            // Show conversion options
            this.show(this.elements.conversionOptions);
            
            // Get level stats and display
            if (window.app && window.app.getLevelStats) {
                const stats = window.app.getLevelStats(levelIdentifier);
                if (stats) {
                    this.displayLevelStats(stats);
                }
            }
        } else {
            // Hide conversion options
            this.hide(this.elements.conversionOptions);
        }
        
        this.updateConvertButton();
    }

    /**
     * Display level statistics
     */
    displayLevelStats(stats) {
        // This could be expanded to show more detailed level information
        Utils.log(`Level stats: ${stats.totalTiles} tiles across ${stats.layerCount} layers`);
    }

    /**
     * Handle convert button click
     */
    handleConvert() {
        if (!this.state.fileLoaded || !this.state.levelSelected || this.state.converting) {
            return;
        }

        const levelIdentifier = this.elements.levelSelect.value;
        const options = this.getConversionOptions();

        // Trigger conversion
        if (window.app && window.app.convertLevel) {
            window.app.convertLevel(levelIdentifier, options);
        }
    }

    /**
     * Get conversion options from UI
     */
    getConversionOptions() {
        return {
            includeCollisions: this.elements.includeCollisions.checked,
            includeShadows: this.elements.includeShadows.checked,
            includeBackground: this.elements.includeBackground.checked
        };
    }

    /**
     * Show conversion progress
     */
    showProgress(message = 'Processing...') {
        this.state.converting = true;
        this.elements.progressText.textContent = message;
        this.updateProgress(0);
        this.show(this.elements.progressIndicator);
        this.updateConvertButton();
    }

    /**
     * Update progress bar
     */
    updateProgress(percentage, message = null) {
        this.elements.progressFill.style.width = `${percentage}%`;
        
        if (message) {
            this.elements.progressText.textContent = message;
        }
    }

    /**
     * Hide progress indicator
     */
    hideProgress() {
        this.state.converting = false;
        this.hide(this.elements.progressIndicator);
        this.updateConvertButton();
    }

    /**
     * Show conversion results
     */
    showResults(preview, tscnContent) {
        // Store TSCN content for download
        this.tscnContent = tscnContent;
        this.filename = preview.levelName;
        
        // Display result information
        const resultHTML = this.formatResultInfo(preview);
        this.elements.resultInfo.innerHTML = resultHTML;
        
        // Show output section
        this.show(this.elements.outputSection);
    }

    /**
     * Format result information HTML
     */
    formatResultInfo(preview) {
        const layerList = preview.layers.map(layer => 
            `<li><strong>${layer.name}</strong>: ${layer.tileCount} tiles (${layer.tileset})</li>`
        ).join('');

        return `
            <div class="result-summary">
                <h4>${preview.levelName}</h4>
                <p><strong>Dimensions:</strong> ${preview.dimensions}</p>
                <p><strong>Total Tiles:</strong> ${preview.totalTiles}</p>
                <p><strong>Layers:</strong> ${preview.layerCount}</p>
                <p><strong>Estimated File Size:</strong> ${preview.estimatedFileSize}</p>
            </div>
            <div class="layer-details">
                <h5>Layer Details:</h5>
                <ul>${layerList}</ul>
            </div>
        `;
    }

    /**
     * Handle download button click
     */
    handleDownload() {
        if (this.tscnContent && this.filename) {
            const filename = `${this.filename}.tscn`;
            Utils.downloadFile(this.tscnContent, filename, 'text/plain');
            Utils.log(`Downloaded: ${filename}`);
        }
    }

    /**
     * Update convert button state
     */
    updateConvertButton() {
        const canConvert = this.state.fileLoaded && this.state.levelSelected && !this.state.converting;
        this.elements.convertBtn.disabled = !canConvert;
        
        if (this.state.converting) {
            this.elements.convertBtn.textContent = 'Converting...';
        } else {
            this.elements.convertBtn.textContent = 'Convert to TSCN';
        }
    }

    /**
     * Show element
     */
    show(element) {
        if (element) {
            element.style.display = 'block';
        }
    }

    /**
     * Hide element
     */
    hide(element) {
        if (element) {
            element.style.display = 'none';
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        this.hideProgress();
        this.setFileStatus(`Error: ${message}`, 'error');
        Utils.log(`Error: ${message}`, 'error');
    }

    /**
     * Reset UI to initial state
     */
    reset() {
        this.state = {
            fileLoaded: false,
            levelSelected: false,
            converting: false
        };
        
        this.elements.ldtkFile.value = '';
        this.elements.levelSelect.value = '';
        this.setFileStatus('No file selected', 'default');
        
        this.hide(this.elements.levelSelector);
        this.hide(this.elements.conversionOptions);
        this.hide(this.elements.progressIndicator);
        this.hide(this.elements.outputSection);
        
        this.updateConvertButton();
    }
}

// Export for use in other modules
window.UIManager = UIManager;