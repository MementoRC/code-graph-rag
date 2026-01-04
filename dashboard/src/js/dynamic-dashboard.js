/**
 * Dynamic Dashboard Enhancements
 * Advanced interactive features for the Eleventy-based upstream analysis dashboard
 */

class DynamicDashboard {
    constructor() {
        this.charts = {};
        this.data = {};
        this.settings = this.loadSettings();
        this.filters = {
            dateRange: '30d',
            author: 'all',
            changeType: 'all',
            search: ''
        };

        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        console.log('🚀 Initializing Dynamic Dashboard...');

        // Load initial data
        await this.loadData();

        // Initialize components
        this.initThemeToggle();
        this.initFilters();
        this.initSearch();
        this.initAdvancedCharts();
        this.initRealTimeUpdates();
        this.initKeyboardShortcuts();

        // Apply user settings
        this.applySettings();

        console.log('✅ Dynamic Dashboard initialized');
    }

    // ==================== DATA MANAGEMENT ====================

    async loadData() {
        try {
            // Load data from the same sources as the static build
            const dataFiles = [
                'git-stats.json',
                'github-data.json',
                'upstream-activity.json',
                'analysis-docs.json'
            ];

            for (const file of dataFiles) {
                try {
                    const response = await fetch(`/_data/${file}`);
                    if (response.ok) {
                        const data = await response.json();
                        const key = file.replace('.json', '').replace('-', '_');
                        this.data[key] = data;
                    }
                } catch (err) {
                    console.warn(`Failed to load ${file}:`, err);
                    // Use fallback data structure
                    this.data[file.replace('.json', '').replace('-', '_')] = {};
                }
            }

            console.log('📊 Data loaded:', Object.keys(this.data));
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
        }
    }

    // ==================== SETTINGS MANAGEMENT ====================

    loadSettings() {
        try {
            const saved = localStorage.getItem('dashboard-settings');
            return saved ? JSON.parse(saved) : {
                theme: 'light',
                autoRefresh: true,
                refreshInterval: 300000, // 5 minutes
                compactMode: false,
                showAnimations: true,
                defaultDateRange: '30d'
            };
        } catch (error) {
            console.warn('Failed to load settings:', error);
            return {};
        }
    }

    saveSettings() {
        try {
            localStorage.setItem('dashboard-settings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Failed to save settings:', error);
        }
    }

    applySettings() {
        // Apply theme
        if (this.settings.theme === 'dark') {
            document.body.classList.add('dark-theme');
        }

        // Apply default date range
        if (this.settings.defaultDateRange) {
            this.filters.dateRange = this.settings.defaultDateRange;
            const dateRangePicker = document.getElementById('dateRangePicker');
            if (dateRangePicker) {
                dateRangePicker.value = this.settings.defaultDateRange;
            }
        }

        // Apply compact mode
        if (this.settings.compactMode) {
            document.body.classList.add('compact-mode');
        }
    }

    // ==================== THEME TOGGLE ====================

    initThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;

        themeToggle.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('dark-theme');
            this.settings.theme = isDark ? 'dark' : 'light';
            themeToggle.innerHTML = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
            this.saveSettings();

            // Update charts for theme change
            this.updateChartsTheme(isDark);
        });

        // Set initial button state
        const isDark = this.settings.theme === 'dark';
        themeToggle.innerHTML = isDark ? '☀️ Light Mode' : '🌙 Dark Mode';
    }

    updateChartsTheme(isDark) {
        const textColor = isDark ? '#e2e8f0' : '#374151';
        const gridColor = isDark ? '#4a5568' : '#e5e7eb';

        Object.values(this.charts).forEach(chart => {
            if (chart && chart.options) {
                // Update scale colors
                if (chart.options.scales) {
                    Object.values(chart.options.scales).forEach(scale => {
                        if (scale.ticks) scale.ticks.color = textColor;
                        if (scale.grid) scale.grid.color = gridColor;
                    });
                }

                // Update legend colors
                if (chart.options.plugins && chart.options.plugins.legend) {
                    chart.options.plugins.legend.labels = {
                        ...chart.options.plugins.legend.labels,
                        color: textColor
                    };
                }

                chart.update();
            }
        });
    }

    // ==================== FILTERS AND SEARCH ====================

    initFilters() {
        const filterElements = [
            'dateRangePicker',
            'authorFilter',
            'changeTypeFilter'
        ];

        filterElements.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.addEventListener('change', (e) => {
                    const filterType = id.replace('Filter', '').replace('Picker', '');
                    this.filters[filterType.replace('dateRange', 'dateRange')] = e.target.value;
                    this.applyFilters();
                });
            }
        });
    }

    initSearch() {
        const searchInput = document.getElementById('dashboardSearch');
        if (!searchInput) return;

        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.filters.search = e.target.value.toLowerCase();
                this.applyFilters();
            }, 300);
        });
    }

    applyFilters() {
        console.log('🔍 Applying filters:', this.filters);

        // Filter and update charts
        this.updateCharts();

        // Filter recent activity list
        this.filterRecentActivity();

        // Update metrics based on filters
        this.updateFilteredMetrics();
    }

    filterRecentActivity() {
        const activityContainer = document.querySelector('.space-y-4');
        if (!activityContainer) return;

        const activities = activityContainer.querySelectorAll('.flex.items-center.space-x-3');

        activities.forEach(activity => {
            const messageEl = activity.querySelector('.text-sm.font-medium');
            const authorEl = activity.querySelector('.text-sm.text-gray-500');

            if (!messageEl || !authorEl) return;

            const message = messageEl.textContent.toLowerCase();
            const authorText = authorEl.textContent.toLowerCase();

            let visible = true;

            // Apply search filter
            if (this.filters.search &&
                !message.includes(this.filters.search) &&
                !authorText.includes(this.filters.search)) {
                visible = false;
            }

            // Apply author filter
            if (this.filters.author !== 'all' &&
                !authorText.includes(this.filters.author.toLowerCase())) {
                visible = false;
            }

            activity.style.display = visible ? 'flex' : 'none';
        });
    }

    // ==================== ADVANCED CHART FEATURES ====================

    initAdvancedCharts() {
        this.initCommitNetworkGraph();
        this.initChangeHeatmap();
        this.enhanceExistingCharts();
    }

    enhanceExistingCharts() {
        // Add click handlers and zoom functionality to existing charts
        const commitChart = Chart.getChart('commitActivityChart');
        const typesChart = Chart.getChart('changeTypesChart');

        if (commitChart) {
            this.charts.commitActivity = commitChart;
            this.addChartInteractivity(commitChart, 'commit');
        }

        if (typesChart) {
            this.charts.changeTypes = typesChart;
            this.addChartInteractivity(typesChart, 'types');
        }
    }

    addChartInteractivity(chart, type) {
        // Add zoom plugin if available
        if (Chart.Zoom) {
            chart.options.plugins.zoom = {
                zoom: {
                    wheel: { enabled: true },
                    pinch: { enabled: true },
                    mode: 'x',
                },
                pan: {
                    enabled: true,
                    mode: 'x',
                }
            };
        }

        // Add click handler for drill-down
        chart.options.onClick = (event, elements) => {
            if (elements && elements.length > 0) {
                this.handleChartClick(type, elements[0], chart);
            }
        };

        // Enhanced tooltips
        chart.options.plugins.tooltip = {
            ...chart.options.plugins.tooltip,
            callbacks: {
                afterLabel: (context) => {
                    return this.getEnhancedTooltipInfo(type, context);
                }
            }
        };

        chart.update();
    }

    handleChartClick(chartType, element, chart) {
        console.log(`🖱️ Chart clicked: ${chartType}`, element);

        if (chartType === 'commit') {
            // Show commits for selected day
            const dataIndex = element.index;
            const dataset = chart.data.datasets[element.datasetIndex];
            const label = chart.data.labels[dataIndex];

            this.showCommitDetails(label, dataset.label);
        } else if (chartType === 'types') {
            // Filter by change type
            const dataIndex = element.index;
            const label = chart.data.labels[dataIndex];
            this.filterByChangeType(label);
        }
    }

    getEnhancedTooltipInfo(chartType, context) {
        if (chartType === 'commit') {
            return `Click to view commit details`;
        } else if (chartType === 'types') {
            return `Click to filter by this type`;
        }
        return '';
    }

    initCommitNetworkGraph() {
        const container = document.getElementById('commitNetworkGraph');
        if (!container) return;

        // Create a simple network visualization using D3.js-like approach
        container.innerHTML = `
            <div class="network-controls mb-4">
                <button class="btn btn-sm btn-secondary mr-2" onclick="window.dynamicDashboard.zoomNetworkIn()">🔍 Zoom In</button>
                <button class="btn btn-sm btn-secondary mr-2" onclick="window.dynamicDashboard.zoomNetworkOut()">🔍 Zoom Out</button>
                <button class="btn btn-sm btn-secondary" onclick="window.dynamicDashboard.resetNetwork()">🔄 Reset</button>
            </div>
            <svg id="networkSvg" width="100%" height="200" viewBox="0 0 600 200">
                <!-- Network nodes and connections will be generated here -->
            </svg>
        `;

        this.renderNetworkGraph();
    }

    renderNetworkGraph() {
        const svg = document.getElementById('networkSvg');
        if (!svg) return;

        // Generate sample network data based on git stats
        const nodes = this.generateNetworkNodes();
        const links = this.generateNetworkLinks(nodes);

        // Clear existing content
        svg.innerHTML = '';

        // Render links
        links.forEach(link => {
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', link.source.x);
            line.setAttribute('y1', link.source.y);
            line.setAttribute('x2', link.target.x);
            line.setAttribute('y2', link.target.y);
            line.setAttribute('stroke', '#e5e7eb');
            line.setAttribute('stroke-width', '2');
            svg.appendChild(line);
        });

        // Render nodes
        nodes.forEach(node => {
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', node.x);
            circle.setAttribute('cy', node.y);
            circle.setAttribute('r', node.size);
            circle.setAttribute('fill', node.color);
            circle.setAttribute('stroke', '#ffffff');
            circle.setAttribute('stroke-width', '2');
            circle.style.cursor = 'pointer';

            // Add tooltip
            circle.innerHTML = `<title>${node.label}</title>`;

            // Add click handler
            circle.addEventListener('click', () => {
                this.showNodeDetails(node);
            });

            svg.appendChild(circle);
        });
    }

    generateNetworkNodes() {
        const nodes = [];
        const authors = Object.keys(this.data.git_stats?.commits?.byAuthor || {});

        authors.slice(0, 8).forEach((author, i) => {
            const commits = this.data.git_stats.commits.byAuthor[author] || 0;
            nodes.push({
                id: `author-${i}`,
                label: author,
                x: 100 + (i % 4) * 150,
                y: 50 + Math.floor(i / 4) * 100,
                size: Math.max(5, Math.min(20, commits * 2)),
                color: this.getAuthorColor(i),
                commits: commits
            });
        });

        return nodes;
    }

    generateNetworkLinks(nodes) {
        const links = [];
        // Create connections between nodes (simplified)
        for (let i = 0; i < nodes.length - 1; i++) {
            if (Math.random() > 0.6) { // 40% chance of connection
                links.push({
                    source: nodes[i],
                    target: nodes[i + 1]
                });
            }
        }
        return links;
    }

    getAuthorColor(index) {
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'];
        return colors[index % colors.length];
    }

    initChangeHeatmap() {
        const container = document.getElementById('changeHeatmap');
        if (!container) return;

        container.innerHTML = `
            <div class="heatmap-container">
                <div class="heatmap-legend mb-2">
                    <span class="text-xs text-gray-500">Low</span>
                    <div class="heatmap-scale mx-2"></div>
                    <span class="text-xs text-gray-500">High</span>
                </div>
                <div id="heatmapGrid" class="heatmap-grid"></div>
            </div>
        `;

        this.renderChangeHeatmap();
    }

    renderChangeHeatmap() {
        const grid = document.getElementById('heatmapGrid');
        if (!grid) return;

        // Generate heatmap data (weeks x days)
        const weeks = 12;
        const days = 7;
        const heatmapData = [];

        for (let week = 0; week < weeks; week++) {
            for (let day = 0; day < days; day++) {
                const intensity = Math.random();
                heatmapData.push({
                    week,
                    day,
                    intensity,
                    date: this.getDateForHeatmap(week, day),
                    commits: Math.floor(intensity * 10)
                });
            }
        }

        // Render heatmap squares
        grid.innerHTML = heatmapData.map(cell => `
            <div class="heatmap-cell"
                 style="opacity: ${0.1 + cell.intensity * 0.9}; background-color: #10b981;"
                 title="${cell.date}: ${cell.commits} commits"
                 onclick="window.dynamicDashboard.showHeatmapDetails('${cell.date}', ${cell.commits})">
            </div>
        `).join('');
    }

    getDateForHeatmap(week, day) {
        const today = new Date();
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() - (week * 7 + day));
        return targetDate.toISOString().split('T')[0];
    }

    // ==================== REAL-TIME UPDATES ====================

    initRealTimeUpdates() {
        if (!this.settings.autoRefresh) return;

        // Set up periodic data refresh
        setInterval(() => {
            this.refreshData();
        }, this.settings.refreshInterval);

        // Update status indicator
        this.updateStatusIndicator(true);
    }

    async refreshData() {
        console.log('🔄 Refreshing dashboard data...');

        try {
            await this.loadData();
            this.updateCharts();
            this.updateMetrics();
            this.updateLastRefreshTime();

            // Flash the status indicator
            this.flashStatusIndicator();

        } catch (error) {
            console.error('Failed to refresh data:', error);
            this.updateStatusIndicator(false);
        }
    }

    updateStatusIndicator(isLive) {
        const indicator = document.querySelector('.status-indicator');
        const statusText = document.querySelector('.last-updated');

        if (indicator) {
            indicator.className = isLive
                ? 'w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse status-indicator'
                : 'w-2 h-2 bg-red-400 rounded-full mr-2 status-indicator';
        }

        if (statusText) {
            statusText.textContent = isLive ? 'Live' : 'Offline';
        }
    }

    flashStatusIndicator() {
        const indicator = document.querySelector('.status-indicator');
        if (indicator) {
            indicator.classList.add('animate-ping');
            setTimeout(() => {
                indicator.classList.remove('animate-ping');
            }, 1000);
        }
    }

    updateLastRefreshTime() {
        const timeElements = document.querySelectorAll('[data-refresh-time]');
        const now = new Date().toLocaleTimeString();
        timeElements.forEach(el => {
            el.setAttribute('title', `Last updated: ${now}`);
        });
    }

    // ==================== KEYBOARD SHORTCUTS ====================

    initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when not in input fields
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.key) {
                case 'r':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        this.refreshData();
                    }
                    break;
                case 't':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        document.getElementById('themeToggle')?.click();
                    }
                    break;
                case '/':
                    e.preventDefault();
                    document.getElementById('dashboardSearch')?.focus();
                    break;
                case 'f':
                    if (e.ctrlKey || e.metaKey) {
                        e.preventDefault();
                        document.getElementById('dateRangePicker')?.focus();
                    }
                    break;
            }
        });

        // Add keyboard shortcut hints
        this.addKeyboardHints();
    }

    addKeyboardHints() {
        const hintsContainer = document.createElement('div');
        hintsContainer.className = 'keyboard-hints fixed bottom-4 right-4 bg-gray-800 text-white p-2 rounded-lg text-xs opacity-0 hover:opacity-100 transition-opacity';
        hintsContainer.innerHTML = `
            <div class="font-semibold mb-1">Keyboard Shortcuts:</div>
            <div>Ctrl+R: Refresh data</div>
            <div>Ctrl+T: Toggle theme</div>
            <div>/: Focus search</div>
            <div>Ctrl+F: Focus filters</div>
        `;

        document.body.appendChild(hintsContainer);
    }

    // ==================== UTILITY METHODS ====================

    updateCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.update === 'function') {
                chart.update();
            }
        });
    }

    updateMetrics() {
        // Update metric cards with filtered data
        // This would integrate with the existing metric display logic
        console.log('📊 Updating metrics with filtered data');
    }

    updateFilteredMetrics() {
        // Calculate and display metrics based on current filters
        console.log('🔢 Updating filtered metrics');
    }

    showCommitDetails(date, dataset) {
        console.log(`📅 Showing commit details for ${date} (${dataset})`);
        // Implementation for showing detailed commit information
    }

    filterByChangeType(type) {
        console.log(`🏷️ Filtering by change type: ${type}`);
        // Update filters and refresh display
    }

    showNodeDetails(node) {
        console.log(`👤 Showing details for node:`, node);
        // Show author/contributor details
    }

    showHeatmapDetails(date, commits) {
        console.log(`📊 Heatmap details for ${date}: ${commits} commits`);
        // Show detailed activity for selected date
    }

    // Network graph controls
    zoomNetworkIn() {
        console.log('🔍 Zooming network in');
    }

    zoomNetworkOut() {
        console.log('🔍 Zooming network out');
    }

    resetNetwork() {
        console.log('🔄 Resetting network view');
        this.renderNetworkGraph();
    }
}

// Initialize dashboard when script loads
window.dynamicDashboard = new DynamicDashboard();

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DynamicDashboard;
}
