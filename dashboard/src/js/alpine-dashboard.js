/**
 * Alpine.js Dashboard Components
 * Enhanced client-side interactivity using Alpine.js for filtering, sorting, and state management
 */

// Main Dashboard Alpine Component
document.addEventListener('alpine:init', () => {
    Alpine.data('dashboardApp', () => ({
        // Component State
        filters: {
            dateRange: '30d',
            author: 'all',
            changeType: 'all',
            search: ''
        },

        settings: {
            theme: 'light',
            autoRefresh: true,
            compactMode: false,
            showAnimations: true
        },

        data: {
            commits: [],
            upstreamActivity: [],
            filteredCommits: [],
            stats: {}
        },

        ui: {
            loading: false,
            lastUpdated: new Date(),
            showSettings: false,
            showKeyboardHints: false
        },

        // Initialization
        init() {
            console.log('🚀 Alpine Dashboard Component Initialized');

            // Load user settings
            this.loadSettings();

            // Apply initial theme
            this.applyTheme();

            // Set up periodic refresh
            this.initAutoRefresh();

            // Load initial data
            this.loadData();

            // Set up keyboard shortcuts
            this.initKeyboardShortcuts();
        },

        // ==================== SETTINGS MANAGEMENT ====================

        loadSettings() {
            try {
                const saved = localStorage.getItem('alpine-dashboard-settings');
                if (saved) {
                    this.settings = { ...this.settings, ...JSON.parse(saved) };
                }
            } catch (error) {
                console.warn('Failed to load Alpine settings:', error);
            }
        },

        saveSettings() {
            try {
                localStorage.setItem('alpine-dashboard-settings', JSON.stringify(this.settings));
            } catch (error) {
                console.warn('Failed to save Alpine settings:', error);
            }
        },

        // ==================== THEME MANAGEMENT ====================

        toggleTheme() {
            this.settings.theme = this.settings.theme === 'light' ? 'dark' : 'light';
            this.applyTheme();
            this.saveSettings();

            // Notify dynamic dashboard of theme change
            if (window.dynamicDashboard) {
                window.dynamicDashboard.updateChartsTheme(this.settings.theme === 'dark');
            }
        },

        applyTheme() {
            if (this.settings.theme === 'dark') {
                document.body.classList.add('dark-theme');
            } else {
                document.body.classList.remove('dark-theme');
            }
        },

        // ==================== DATA MANAGEMENT ====================

        async loadData() {
            this.ui.loading = true;

            try {
                // Load data from the same endpoints as the dynamic dashboard
                const responses = await Promise.allSettled([
                    fetch('/_data/git-stats.json'),
                    fetch('/_data/upstream-activity.json'),
                    fetch('/_data/github-data.json')
                ]);

                responses.forEach((response, index) => {
                    if (response.status === 'fulfilled' && response.value.ok) {
                        response.value.json().then(data => {
                            switch (index) {
                                case 0: this.data.gitStats = data; break;
                                case 1: this.data.upstreamActivity = data; break;
                                case 2: this.data.githubData = data; break;
                            }
                            this.processData();
                        });
                    }
                });

                this.ui.lastUpdated = new Date();

            } catch (error) {
                console.error('Failed to load data:', error);
            } finally {
                this.ui.loading = false;
            }
        },

        processData() {
            // Process and prepare data for filtering
            this.data.commits = this.extractCommits();
            this.applyFilters();
            this.updateStats();
        },

        extractCommits() {
            const commits = [];

            // Extract from git stats
            if (this.data.gitStats?.commits?.recent) {
                commits.push(...this.data.gitStats.commits.recent.map(commit => ({
                    ...commit,
                    source: 'local'
                })));
            }

            // Extract from upstream activity
            if (this.data.upstreamActivity?.commits?.recent) {
                commits.push(...this.data.upstreamActivity.commits.recent.map(commit => ({
                    ...commit,
                    source: 'upstream'
                })));
            }

            return commits.sort((a, b) => new Date(b.date) - new Date(a.date));
        },

        // ==================== FILTERING AND SEARCH ====================

        applyFilters() {
            let filtered = [...this.data.commits];

            // Date range filter
            if (this.filters.dateRange !== 'all') {
                const days = parseInt(this.filters.dateRange.replace('d', ''));
                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - days);

                filtered = filtered.filter(commit =>
                    new Date(commit.date) >= cutoff
                );
            }

            // Author filter
            if (this.filters.author !== 'all') {
                filtered = filtered.filter(commit =>
                    commit.author?.toLowerCase().includes(this.filters.author.toLowerCase())
                );
            }

            // Change type filter
            if (this.filters.changeType !== 'all') {
                filtered = filtered.filter(commit =>
                    this.classifyCommitType(commit.message) === this.filters.changeType
                );
            }

            // Search filter
            if (this.filters.search) {
                const searchTerm = this.filters.search.toLowerCase();
                filtered = filtered.filter(commit =>
                    commit.message?.toLowerCase().includes(searchTerm) ||
                    commit.author?.toLowerCase().includes(searchTerm)
                );
            }

            this.data.filteredCommits = filtered;
            this.updateStats();
        },

        classifyCommitType(message) {
            if (!message) return 'other';

            const msg = message.toLowerCase();
            if (msg.includes('feat') || msg.includes('feature')) return 'feature';
            if (msg.includes('fix') || msg.includes('bug')) return 'fix';
            if (msg.includes('doc')) return 'docs';
            if (msg.includes('refactor')) return 'refactor';
            if (msg.includes('test')) return 'test';
            return 'other';
        },

        updateStats() {
            this.data.stats = {
                totalCommits: this.data.filteredCommits.length,
                localCommits: this.data.filteredCommits.filter(c => c.source === 'local').length,
                upstreamCommits: this.data.filteredCommits.filter(c => c.source === 'upstream').length,
                uniqueAuthors: new Set(this.data.filteredCommits.map(c => c.author)).size
            };
        },

        // ==================== UI INTERACTIONS ====================

        clearFilters() {
            this.filters = {
                dateRange: '30d',
                author: 'all',
                changeType: 'all',
                search: ''
            };
            this.applyFilters();
        },

        exportData() {
            const exportData = {
                filters: this.filters,
                stats: this.data.stats,
                commits: this.data.filteredCommits,
                exported: new Date().toISOString()
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        async refreshData() {
            this.ui.loading = true;
            await this.loadData();

            // Notify dynamic dashboard to refresh as well
            if (window.dynamicDashboard) {
                await window.dynamicDashboard.refreshData();
            }
        },

        toggleSettings() {
            this.ui.showSettings = !this.ui.showSettings;
        },

        toggleCompactMode() {
            this.settings.compactMode = !this.settings.compactMode;

            if (this.settings.compactMode) {
                document.body.classList.add('compact-mode');
            } else {
                document.body.classList.remove('compact-mode');
            }

            this.saveSettings();
        },

        toggleAutoRefresh() {
            this.settings.autoRefresh = !this.settings.autoRefresh;
            this.saveSettings();

            if (this.settings.autoRefresh) {
                this.initAutoRefresh();
            } else {
                this.clearAutoRefresh();
            }
        },

        // ==================== AUTO REFRESH ====================

        initAutoRefresh() {
            if (!this.settings.autoRefresh) return;

            this.clearAutoRefresh();
            this.refreshInterval = setInterval(() => {
                this.refreshData();
            }, 300000); // 5 minutes
        },

        clearAutoRefresh() {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
                this.refreshInterval = null;
            }
        },

        // ==================== KEYBOARD SHORTCUTS ====================

        initKeyboardShortcuts() {
            document.addEventListener('keydown', (e) => {
                // Only handle when not in input fields
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
                            this.toggleTheme();
                        }
                        break;
                    case 'c':
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            this.clearFilters();
                        }
                        break;
                    case 's':
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            this.toggleSettings();
                        }
                        break;
                    case 'e':
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            this.exportData();
                        }
                        break;
                    case '?':
                        e.preventDefault();
                        this.ui.showKeyboardHints = !this.ui.showKeyboardHints;
                        break;
                }
            });
        },

        // ==================== UTILITY METHODS ====================

        formatDate(date) {
            return new Date(date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        },

        formatRelativeTime(date) {
            const now = new Date();
            const diffMs = now - new Date(date);
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffMins < 1) return 'just now';
            if (diffMins < 60) return `${diffMins}m ago`;
            if (diffHours < 24) return `${diffHours}h ago`;
            if (diffDays < 7) return `${diffDays}d ago`;
            return this.formatDate(date);
        },

        getCommitTypeColor(type) {
            const colors = {
                feature: 'bg-green-100 text-green-800',
                fix: 'bg-red-100 text-red-800',
                docs: 'bg-blue-100 text-blue-800',
                refactor: 'bg-yellow-100 text-yellow-800',
                test: 'bg-purple-100 text-purple-800',
                other: 'bg-gray-100 text-gray-800'
            };
            return colors[type] || colors.other;
        },

        // ==================== COMPUTED PROPERTIES ====================

        get filteredCommitsByType() {
            const types = {};
            this.data.filteredCommits.forEach(commit => {
                const type = this.classifyCommitType(commit.message);
                types[type] = (types[type] || 0) + 1;
            });
            return types;
        },

        get topAuthors() {
            const authors = {};
            this.data.filteredCommits.forEach(commit => {
                if (commit.author) {
                    authors[commit.author] = (authors[commit.author] || 0) + 1;
                }
            });

            return Object.entries(authors)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5)
                .map(([author, count]) => ({ author, count }));
        },

        get recentActivity() {
            return this.data.filteredCommits.slice(0, 8);
        },

        get isFiltered() {
            return this.filters.dateRange !== '30d' ||
                   this.filters.author !== 'all' ||
                   this.filters.changeType !== 'all' ||
                   this.filters.search !== '';
        }
    }));

    // Additional Alpine components can be registered here
    Alpine.data('commitCard', (commit) => ({
        commit,
        expanded: false,

        toggleExpanded() {
            this.expanded = !this.expanded;
        },

        get commitType() {
            return this.classifyCommitType(this.commit.message);
        },

        classifyCommitType(message) {
            if (!message) return 'other';

            const msg = message.toLowerCase();
            if (msg.includes('feat') || msg.includes('feature')) return 'feature';
            if (msg.includes('fix') || msg.includes('bug')) return 'fix';
            if (msg.includes('doc')) return 'docs';
            if (msg.includes('refactor')) return 'refactor';
            if (msg.includes('test')) return 'test';
            return 'other';
        }
    }));
});

// Global Alpine utilities
window.Alpine = window.Alpine || {};
window.Alpine.dashboardUtils = {
    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    },

    truncateText(text, maxLength = 50) {
        if (!text || text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    getInitials(name) {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }
};
