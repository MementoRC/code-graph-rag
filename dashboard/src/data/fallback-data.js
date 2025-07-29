#!/usr/bin/env node

/**
 * Fallback Data Generator for Upstream Analysis Dashboard
 * Generates sample data when git/GitHub API access is limited
 */

import fs from 'fs/promises';
import path from 'path';
import { format, subDays } from 'date-fns';

const DATA_DIR = path.join(process.cwd(), 'src', '_data');

class FallbackDataGenerator {
  constructor() {
    this.now = new Date();
  }

  async ensureDataDir() {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }

  generateGitStats() {
    // Generate sample git statistics
    const commitsByDate = {};
    const commitsByAuthor = {
      'Alice Developer': 15,
      'Bob Maintainer': 12,
      'Charlie Contributor': 8,
      'Diana Engineer': 10
    };
    
    // Generate commits for last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = format(subDays(this.now, i), 'yyyy-MM-dd');
      const commitCount = Math.floor(Math.random() * 4); // 0-3 commits per day
      if (commitCount > 0) {
        commitsByDate[date] = Array.from({ length: commitCount }, (_, index) => ({
          hash: `abc${i}${index}${Math.random().toString(36).substr(2, 6)}`,
          message: this.generateCommitMessage(),
          author_name: Object.keys(commitsByAuthor)[Math.floor(Math.random() * 4)],
          date: subDays(this.now, i).toISOString()
        }));
      }
    }

    return {
      lastUpdated: this.now.toISOString(),
      repository: {
        status: 'feat-upstream-analysis-strategy',
        ahead: 0,
        behind: 0,
        modified: 2,
        created: 1,
        deleted: 0
      },
      commits: {
        total: 45,
        last7Days: 8,
        last30Days: 25,
        byDate: commitsByDate,
        byAuthor: commitsByAuthor,
        byType: {
          feature: 12,
          fix: 8,
          docs: 5,
          refactor: 7,
          test: 6,
          other: 7
        }
      },
      branches: {
        all: [
          { name: 'main', current: false },
          { name: 'feat-upstream-analysis-strategy', current: true },
          { name: 'upstream-mirror', current: false },
          { name: 'feature/dashboard-setup', current: false }
        ],
        total: 4
      },
      remotes: [
        { name: 'origin', refs: { fetch: 'https://github.com/MementoRC/code-graph-rag.git' } },
        { name: 'upstream', refs: { fetch: 'https://github.com/vitali87/code-graph-rag.git' } }
      ]
    };
  }

  generateAnalysisDocs() {
    return {
      lastUpdated: this.now.toISOString(),
      sessions: [
        {
          filename: '2025-07-25-weekly-analysis.md',
          date: '2025-07-25',
          title: 'Weekly Upstream Analysis - July 25, 2025',
          summary: 'Reviewed recent commits, identified 3 potential extractions',
          participants: ['Alice Developer', 'Bob Maintainer'],
          decisions: [
            'Implement new graph optimization algorithm',
            'Extract enhanced query interface',
            'Skip complex configuration changes for now'
          ],
          actionItems: [
            'Alice: Create extraction branch for graph optimization',
            'Bob: Research query interface compatibility',
            'Team: Schedule follow-up session for next week'
          ]
        },
        {
          filename: '2025-07-20-emergency-review.md',
          date: '2025-07-20',
          title: 'Emergency Security Update Review',
          summary: 'Urgent review of security-related upstream changes',
          participants: ['Bob Maintainer', 'Diana Engineer'],
          decisions: [
            'Extract security patches immediately',
            'Update dependency versions'
          ],
          actionItems: [
            'Diana: Apply security patches',
            'Bob: Test updated dependencies'
          ]
        }
      ],
      extractions: [
        {
          filename: 'graph-optimization-v2.md',
          title: 'Graph Optimization Algorithm v2',
          status: 'in-progress',
          priority: 'high',
          upstreamSource: 'commit abc123def456',
          estimatedEffort: '3-5 days'
        },
        {
          filename: 'query-interface-enhancement.md',
          title: 'Enhanced Query Interface',
          status: 'planned',
          priority: 'medium',
          upstreamSource: 'PR #456',
          estimatedEffort: '1-2 weeks'
        },
        {
          filename: 'memory-optimization.md',
          title: 'Memory Usage Optimization',
          status: 'completed',
          priority: 'high',
          upstreamSource: 'commits def789ghi012',
          estimatedEffort: '1 week'
        }
      ],
      templates: [
        'analysis-session.md',
        'extraction-candidate.md',
        'quick-summary.md'
      ]
    };
  }

  generateGitHubData() {
    return {
      lastUpdated: this.now.toISOString(),
      repository: {
        name: 'MementoRC/code-graph-rag',
        description: 'Enhanced code graph RAG with upstream analysis',
        stars: 42,
        forks: 8,
        openIssues: 15,
        defaultBranch: 'main',
        createdAt: '2024-01-15T10:30:00Z',
        updatedAt: this.now.toISOString(),
        language: 'Python',
        size: 1024
      },
      upstream: {
        name: 'vitali87/code-graph-rag',
        description: 'Original code graph RAG implementation',
        stars: 156,
        forks: 23,
        updatedAt: subDays(this.now, 2).toISOString(),
        language: 'Python'
      },
      extractions: {
        issues: 8,
        pullRequests: 3,
        completed: 5,
        inProgress: 3,
        recentActivity: [
          {
            title: 'Extract: Graph Optimization Algorithm v2',
            state: 'open',
            createdAt: subDays(this.now, 3).toISOString(),
            updatedAt: subDays(this.now, 1).toISOString(),
            url: 'https://github.com/MementoRC/code-graph-rag/issues/42',
            labels: ['upstream-extraction', 'enhancement', 'high-priority']
          },
          {
            title: 'Extract: Enhanced Query Interface',
            state: 'open',
            createdAt: subDays(this.now, 5).toISOString(),
            updatedAt: subDays(this.now, 2).toISOString(),
            url: 'https://github.com/MementoRC/code-graph-rag/issues/41',
            labels: ['upstream-extraction', 'feature']
          },
          {
            title: 'Completed: Memory Usage Optimization',
            state: 'closed',
            createdAt: subDays(this.now, 14).toISOString(),
            updatedAt: subDays(this.now, 7).toISOString(),
            url: 'https://github.com/MementoRC/code-graph-rag/issues/38',
            labels: ['upstream-extraction', 'optimization', 'completed']
          }
        ]
      }
    };
  }

  generateUpstreamActivity() {
    const commitsByDate = {};
    
    // Generate upstream commits for last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = format(subDays(this.now, i), 'yyyy-MM-dd');
      commitsByDate[date] = Math.floor(Math.random() * 5); // 0-4 commits per day
    }

    return {
      lastUpdated: this.now.toISOString(),
      commits: {
        total: 67,
        byDate: commitsByDate,
        byAuthor: {
          'vitali87': 25,
          'upstream-contributor-1': 18,
          'upstream-contributor-2': 12,
          'community-dev': 8,
          'bot-user': 4
        },
        recent: [
          {
            sha: 'abc123def456',
            message: 'Optimize graph traversal performance',
            author: 'vitali87',
            date: subDays(this.now, 1).toISOString(),
            url: 'https://github.com/vitali87/code-graph-rag/commit/abc123def456'
          },
          {
            sha: 'def456ghi789',
            message: 'Add support for new query types',
            author: 'upstream-contributor-1',
            date: subDays(this.now, 2).toISOString(),
            url: 'https://github.com/vitali87/code-graph-rag/commit/def456ghi789'
          },
          {
            sha: 'ghi789jkl012',
            message: 'Fix memory leak in graph construction',
            author: 'vitali87',
            date: subDays(this.now, 3).toISOString(),
            url: 'https://github.com/vitali87/code-graph-rag/commit/ghi789jkl012'
          },
          {
            sha: 'jkl012mno345',
            message: 'Update documentation for new features',
            author: 'upstream-contributor-2',
            date: subDays(this.now, 4).toISOString(),
            url: 'https://github.com/vitali87/code-graph-rag/commit/jkl012mno345'
          },
          {
            sha: 'mno345pqr678',
            message: 'Add unit tests for optimization module',
            author: 'community-dev',
            date: subDays(this.now, 5).toISOString(),
            url: 'https://github.com/vitali87/code-graph-rag/commit/mno345pqr678'
          }
        ]
      },
      contributors: [
        {
          login: 'vitali87',
          contributions: 45,
          avatarUrl: 'https://github.com/vitali87.png',
          profileUrl: 'https://github.com/vitali87'
        },
        {
          login: 'upstream-contributor-1',
          contributions: 23,
          avatarUrl: 'https://github.com/upstream-contributor-1.png',
          profileUrl: 'https://github.com/upstream-contributor-1'
        },
        {
          login: 'upstream-contributor-2',
          contributions: 18,
          avatarUrl: 'https://github.com/upstream-contributor-2.png',
          profileUrl: 'https://github.com/upstream-contributor-2'
        },
        {
          login: 'community-dev',
          contributions: 12,
          avatarUrl: 'https://github.com/community-dev.png',
          profileUrl: 'https://github.com/community-dev'
        }
      ],
      releases: [
        {
          name: 'v2.1.0 - Performance Improvements',
          tagName: 'v2.1.0',
          publishedAt: subDays(this.now, 10).toISOString(),
          url: 'https://github.com/vitali87/code-graph-rag/releases/tag/v2.1.0',
          prerelease: false,
          draft: false
        },
        {
          name: 'v2.0.3 - Bug Fixes',
          tagName: 'v2.0.3',
          publishedAt: subDays(this.now, 25).toISOString(),
          url: 'https://github.com/vitali87/code-graph-rag/releases/tag/v2.0.3',
          prerelease: false,
          draft: false
        }
      ]
    };
  }

  generateCommitMessage() {
    const types = ['feat', 'fix', 'docs', 'refactor', 'test', 'chore'];
    const subjects = [
      'improve graph traversal algorithm',
      'add new query interface',
      'fix memory leak in parser',
      'update documentation',
      'optimize database queries',
      'add unit tests',
      'refactor code structure',
      'enhance error handling',
      'improve performance',
      'fix edge case bug'
    ];
    
    const type = types[Math.floor(Math.random() * types.length)];
    const subject = subjects[Math.floor(Math.random() * subjects.length)];
    return `${type}: ${subject}`;
  }

  async run() {
    console.log('🎯 Generating fallback data for dashboard...');
    
    await this.ensureDataDir();
    
    const gitStats = this.generateGitStats();
    const analysisDocs = this.generateAnalysisDocs();
    const githubData = this.generateGitHubData();
    const upstreamActivity = this.generateUpstreamActivity();

    // Write all data files
    await Promise.all([
      fs.writeFile(
        path.join(DATA_DIR, 'git-stats.json'),
        JSON.stringify(gitStats, null, 2)
      ),
      fs.writeFile(
        path.join(DATA_DIR, 'analysis-docs.json'),
        JSON.stringify(analysisDocs, null, 2)
      ),
      fs.writeFile(
        path.join(DATA_DIR, 'github-data.json'),
        JSON.stringify(githubData, null, 2)
      ),
      fs.writeFile(
        path.join(DATA_DIR, 'upstream-activity.json'),
        JSON.stringify(upstreamActivity, null, 2)
      )
    ]);

    // Generate summary
    const summary = {
      lastUpdated: this.now.toISOString(),
      collections: {
        gitStats: 'success',
        analysisDocs: 'success',
        githubData: 'success',
        upstreamActivity: 'success'
      },
      errors: [],
      dataSource: 'fallback'
    };

    await fs.writeFile(
      path.join(DATA_DIR, 'collection-summary.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log('✅ Fallback data generated successfully');
    console.log('📊 Data files created:');
    console.log('  - git-stats.json');
    console.log('  - analysis-docs.json');
    console.log('  - github-data.json');
    console.log('  - upstream-activity.json');
    console.log('  - collection-summary.json');
    
    return summary;
  }
}

// Run fallback data generation if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const generator = new FallbackDataGenerator();
  generator.run().catch(console.error);
}

export default FallbackDataGenerator;