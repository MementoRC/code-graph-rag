/**
 * Dynamic Dashboard Enhancement
 * Adds real-time updates and interactive features to the static Eleventy dashboard
 */

class DynamicDashboard {
  constructor() {
    this.updateInterval = 30000; // 30 seconds
    this.websocket = null;
    this.charts = {};
    this.filters = {
      dateRange: '30d',
      author: 'all',
      changeType: 'all'
    };
    
    this.init();
  }

  async init() {
    console.log('🚀 Initializing Dynamic Dashboard...');
    
    // Initialize components
    await this.setupRealTimeUpdates();
    this.setupInteractiveFilters();
    this.setupAdvancedVisualizations();
    this.setupUserPreferences();
    
    // Start periodic updates as fallback
    this.startPeriodicUpdates();
    
    console.log('✅ Dynamic Dashboard initialized');
  }

  /**
   * Real-time Updates Implementation
   */
  async setupRealTimeUpdates() {
    // Try WebSocket first, fallback to Server-Sent Events, then polling
    try {
      await this.initWebSocket();
    } catch (error) {
      console.log('WebSocket unavailable, trying Server-Sent Events...');
      try {
        await this.initServerSentEvents();
      } catch (sseError) {
        console.log('SSE unavailable, using polling fallback');
        this.initPolling();
      }
    }
  }

  async initWebSocket() {
    // WebSocket implementation for real-time updates
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${location.host}/ws/dashboard`;
    
    this.websocket = new WebSocket(wsUrl);
    
    this.websocket.onopen = () => {
      console.log('🔗 WebSocket connected');
      this.updateConnectionStatus('connected');
    };
    
    this.websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleRealTimeUpdate(data);
    };
    
    this.websocket.onclose = () => {
      console.log('📡 WebSocket disconnected, attempting reconnect...');
      this.updateConnectionStatus('disconnected');
      setTimeout(() => this.initWebSocket(), 5000);
    };
  }

  async initServerSentEvents() {
    const eventSource = new EventSource('/api/dashboard/events');
    
    eventSource.onopen = () => {
      console.log('📡 Server-Sent Events connected');
      this.updateConnectionStatus('connected');
    };
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleRealTimeUpdate(data);
    };
    
    eventSource.onerror = () => {
      console.log('❌ SSE connection error');
      this.updateConnectionStatus('error');
    };
  }

  initPolling() {
    console.log('📊 Using polling for updates');
    this.updateConnectionStatus('polling');
    
    setInterval(async () => {
      try {
        const response = await fetch('/api/dashboard/data');
        const data = await response.json();
        this.handleRealTimeUpdate(data);
      } catch (error) {
        console.error('Polling update failed:', error);
      }
    }, this.updateInterval);
  }

  handleRealTimeUpdate(data) {
    console.log('🔄 Received real-time update:', data.type);
    
    switch (data.type) {
      case 'commit':
        this.updateCommitActivity(data.payload);
        break;
      case 'extraction':
        this.updateExtractionStatus(data.payload);
        break;
      case 'analysis':
        this.updateAnalysisMetrics(data.payload);
        break;
      case 'upstream':
        this.updateUpstreamActivity(data.payload);
        break;
      default:
        console.log('Unknown update type:', data.type);
    }
    
    // Update last updated timestamp
    this.updateTimestamp(data.timestamp || new Date().toISOString());
  }

  /**
   * Interactive Filtering System
   */
  setupInteractiveFilters() {
    // Date range filter
    const dateRangePicker = document.getElementById('dateRangePicker');
    if (dateRangePicker) {
      dateRangePicker.addEventListener('change', (e) => {
        this.filters.dateRange = e.target.value;
        this.applyFilters();
      });
    }

    // Author filter
    const authorFilter = document.getElementById('authorFilter');
    if (authorFilter) {
      authorFilter.addEventListener('change', (e) => {
        this.filters.author = e.target.value;
        this.applyFilters();
      });
    }

    // Change type filter
    const changeTypeFilter = document.getElementById('changeTypeFilter');
    if (changeTypeFilter) {
      changeTypeFilter.addEventListener('change', (e) => {
        this.filters.changeType = e.target.value;
        this.applyFilters();
      });
    }

    // Search functionality
    const searchInput = document.getElementById('dashboardSearch');
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.performSearch(e.target.value);
        }, 300);
      });
    }
  }

  async applyFilters() {
    console.log('🔍 Applying filters:', this.filters);
    
    try {
      const params = new URLSearchParams(this.filters);
      const response = await fetch(`/api/dashboard/filtered-data?${params}`);
      const filteredData = await response.json();
      
      this.updateDashboardWithFilters(filteredData);
    } catch (error) {
      console.error('Filter application failed:', error);
      // Fallback to client-side filtering
      this.applyClientSideFilters();
    }
  }

  applyClientSideFilters() {
    // Client-side filtering implementation for offline capability
    const commitElements = document.querySelectorAll('.commit-item');
    const extractionElements = document.querySelectorAll('.extraction-item');
    
    commitElements.forEach(element => {
      const shouldShow = this.matchesFilters(element);
      element.style.display = shouldShow ? 'block' : 'none';
    });
    
    extractionElements.forEach(element => {
      const shouldShow = this.matchesFilters(element);
      element.style.display = shouldShow ? 'block' : 'none';
    });
  }

  matchesFilters(element) {
    // Filter matching logic
    const dateFilter = this.filters.dateRange;
    const authorFilter = this.filters.author;
    const typeFilter = this.filters.changeType;
    
    // Check date range
    if (dateFilter !== 'all') {
      const elementDate = element.dataset.date;
      if (!this.isWithinDateRange(elementDate, dateFilter)) {
        return false;
      }
    }
    
    // Check author
    if (authorFilter !== 'all') {
      const elementAuthor = element.dataset.author;
      if (elementAuthor !== authorFilter) {
        return false;
      }
    }
    
    // Check change type
    if (typeFilter !== 'all') {
      const elementType = element.dataset.type;
      if (elementType !== typeFilter) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Advanced Visualizations with D3.js
   */
  setupAdvancedVisualizations() {
    // Initialize D3.js visualizations
    this.initCommitNetworkGraph();
    this.initChangeHeatmap();
    this.initTimeSeriesAnalysis();
    this.initTeamMetrics();
  }

  async initCommitNetworkGraph() {
    const container = document.getElementById('commitNetworkGraph');
    if (!container) return;
    
    try {
      // Load D3.js if not already loaded
      if (typeof d3 === 'undefined') {
        await this.loadScript('https://d3js.org/d3.v7.min.js');
      }
      
      const width = container.clientWidth;
      const height = 400;
      
      const svg = d3.select(container)
        .append('svg')
        .attr('width', width)
        .attr('height', height);
      
      // Fetch commit network data
      const response = await fetch('/api/dashboard/commit-network');
      const networkData = await response.json();
      
      this.renderCommitNetwork(svg, networkData, width, height);
    } catch (error) {
      console.error('Failed to initialize commit network graph:', error);
    }
  }

  renderCommitNetwork(svg, data, width, height) {
    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.links).id(d => d.id))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));
    
    const link = svg.append('g')
      .selectAll('line')
      .data(data.links)
      .enter().append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.value));
    
    const node = svg.append('g')
      .selectAll('circle')
      .data(data.nodes)
      .enter().append('circle')
      .attr('r', 8)
      .attr('fill', d => this.getAuthorColor(d.author))
      .call(d3.drag()
        .on('start', this.dragstarted.bind(this))
        .on('drag', this.dragged.bind(this))
        .on('end', this.dragended.bind(this)));
    
    node.append('title')
      .text(d => `${d.id}: ${d.message}`);
    
    simulation.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
      
      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);
    });
  }

  async initChangeHeatmap() {
    const container = document.getElementById('changeHeatmap');
    if (!container) return;
    
    try {
      const response = await fetch('/api/dashboard/change-heatmap');
      const heatmapData = await response.json();
      
      this.renderChangeHeatmap(container, heatmapData);
    } catch (error) {
      console.error('Failed to initialize change heatmap:', error);
    }
  }

  renderChangeHeatmap(container, data) {
    const width = container.clientWidth;
    const height = 300;
    const cellSize = 20;
    
    const svg = d3.select(container)
      .append('svg')
      .attr('width', width)
      .attr('height', height);
    
    const colorScale = d3.scaleSequential(d3.interpolateReds)
      .domain([0, d3.max(data, d => d.changes)]);
    
    svg.selectAll('rect')
      .data(data)
      .enter().append('rect')
      .attr('x', d => d.x * cellSize)
      .attr('y', d => d.y * cellSize)
      .attr('width', cellSize - 1)
      .attr('height', cellSize - 1)
      .attr('fill', d => colorScale(d.changes))
      .append('title')
      .text(d => `${d.file}: ${d.changes} changes`);
  }

  /**
   * User Preferences and Personalization
   */
  setupUserPreferences() {
    // Load saved preferences
    this.loadUserPreferences();
    
    // Setup preference controls
    this.setupThemeToggle();
    this.setupLayoutOptions();
    this.setupNotificationSettings();
  }

  loadUserPreferences() {
    const saved = localStorage.getItem('dashboardPreferences');
    if (saved) {
      const preferences = JSON.parse(saved);
      this.applyPreferences(preferences);
    }
  }

  saveUserPreferences(preferences) {
    localStorage.setItem('dashboardPreferences', JSON.stringify(preferences));
  }

  setupThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const isDark = document.body.classList.contains('dark-theme');
        this.saveUserPreferences({ ...this.getUserPreferences(), theme: isDark ? 'dark' : 'light' });
      });
    }
  }

  /**
   * Performance Optimization and Caching
   */
  startPeriodicUpdates() {
    // Implement intelligent update scheduling
    setInterval(() => {
      if (document.visibilityState === 'visible') {
        this.fetchLatestData();
      }
    }, this.updateInterval);
    
    // Listen for visibility changes to pause/resume updates
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.fetchLatestData();
      }
    });
  }

  async fetchLatestData() {
    try {
      const response = await fetch('/api/dashboard/latest');
      const data = await response.json();
      
      // Cache the data
      this.cacheData('latest', data);
      
      // Update UI with new data
      this.updateDashboardData(data);
    } catch (error) {
      console.error('Failed to fetch latest data:', error);
      
      // Use cached data as fallback
      const cachedData = this.getCachedData('latest');
      if (cachedData) {
        this.updateDashboardData(cachedData);
      }
    }
  }

  cacheData(key, data) {
    const cacheEntry = {
      data,
      timestamp: Date.now(),
      expires: Date.now() + (5 * 60 * 1000) // 5 minutes
    };
    localStorage.setItem(`dashboard_cache_${key}`, JSON.stringify(cacheEntry));
  }

  getCachedData(key) {
    const cached = localStorage.getItem(`dashboard_cache_${key}`);
    if (!cached) return null;
    
    const entry = JSON.parse(cached);
    if (Date.now() > entry.expires) {
      localStorage.removeItem(`dashboard_cache_${key}`);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Utility Methods
   */
  async loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  updateConnectionStatus(status) {
    const indicator = document.querySelector('.status-indicator');
    if (indicator) {
      indicator.className = `status-indicator ${status}`;
      indicator.textContent = status === 'connected' ? 'Live' : 
                             status === 'polling' ? 'Polling' : 'Offline';
    }
  }

  updateTimestamp(timestamp) {
    const elements = document.querySelectorAll('.last-updated');
    elements.forEach(element => {
      element.textContent = `Updated: ${new Date(timestamp).toLocaleString()}`;
    });
  }

  isWithinDateRange(date, range) {
    const now = new Date();
    const targetDate = new Date(date);
    
    switch (range) {
      case '1d':
        return (now - targetDate) <= (24 * 60 * 60 * 1000);
      case '7d':
        return (now - targetDate) <= (7 * 24 * 60 * 60 * 1000);
      case '30d':
        return (now - targetDate) <= (30 * 24 * 60 * 60 * 1000);
      default:
        return true;
    }
  }

  getAuthorColor(author) {
    // Generate consistent colors for authors
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
    const hash = author.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) & 0xffffffff, 0);
    return colors[Math.abs(hash) % colors.length];
  }

  // D3.js drag handlers
  dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }
}

// Initialize dashboard when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.dynamicDashboard = new DynamicDashboard();
  });
} else {
  window.dynamicDashboard = new DynamicDashboard();
}