/**
 * Dynamic Data for Dashboard
 * Simulates API endpoints and real-time data sources
 */

const { format, subDays } = require('date-fns');

// Mock API responses for dynamic features
module.exports = function() {
  const now = new Date();

  return {
    // Commit network data for D3.js visualization
    commitNetwork: {
      nodes: [
        { id: 'abc123', message: 'feat: add graph optimization', author: 'vitali87', x: 100, y: 100 },
        { id: 'def456', message: 'fix: memory leak in parser', author: 'contributor1', x: 200, y: 150 },
        { id: 'ghi789', message: 'docs: update API reference', author: 'contributor2', x: 150, y: 200 },
        { id: 'jkl012', message: 'refactor: clean up utils', author: 'vitali87', x: 250, y: 120 },
        { id: 'mno345', message: 'test: add integration tests', author: 'contributor1', x: 180, y: 80 }
      ],
      links: [
        { source: 'abc123', target: 'def456', value: 2 },
        { source: 'def456', target: 'ghi789', value: 1 },
        { source: 'ghi789', target: 'jkl012', value: 3 },
        { source: 'jkl012', target: 'mno345', value: 1 },
        { source: 'abc123', target: 'mno345', value: 2 }
      ]
    },

    // Change heatmap data
    changeHeatmap: generateHeatmapData(),

    // Real-time update simulation
    updates: {
      lastUpdate: now.toISOString(),
      frequency: 30000, // 30 seconds
      types: ['commit', 'extraction', 'analysis', 'upstream']
    },

    // User preferences
    preferences: {
      theme: 'light',
      dateRange: '30d',
      notifications: true,
      autoRefresh: true
    },

    // Performance metrics
    performance: {
      loadTime: Math.floor(Math.random() * 500) + 100,
      cacheHitRate: 0.85,
      apiResponseTime: Math.floor(Math.random() * 200) + 50
    }
  };
};

function generateHeatmapData() {
  const files = [
    'src/main.py', 'src/utils.py', 'src/graph.py', 'src/parser.py',
    'tests/test_main.py', 'tests/test_utils.py', 'docs/README.md',
    'config/settings.py', 'scripts/build.py', 'requirements.txt'
  ];

  const data = [];

  files.forEach((file, fileIndex) => {
    const days = 30;
    for (let day = 0; day < days; day++) {
      data.push({
        file,
        x: day,
        y: fileIndex,
        changes: Math.floor(Math.random() * 10),
        date: format(subDays(new Date(), days - day), 'yyyy-MM-dd')
      });
    }
  });

  return data;
}
