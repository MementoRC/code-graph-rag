#!/usr/bin/env node

/**
 * Data Collection Script for Upstream Analysis Dashboard
 * 
 * This script collects data from various sources:
 * - Git history and statistics
 * - Analysis documentation
 * - GitHub issues and PRs related to extractions
 * - Upstream repository metrics
 */

import { simpleGit } from 'simple-git';
import { Octokit } from '@octokit/rest';
import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { format, parseISO, subDays, subWeeks, subMonths } from 'date-fns';

const DATA_DIR = path.join(process.cwd(), 'src', '_data');
const ANALYSIS_DIR = path.join('..', 'docs', 'upstream-analysis');
const REPO_ROOT = path.join('..');

class DataCollector {
  constructor() {
    this.git = simpleGit(REPO_ROOT);
    this.octokit = process.env.GITHUB_TOKEN ? new Octokit({
      auth: process.env.GITHUB_TOKEN,
    }) : null;
    
    this.repoOwner = 'MementoRC';
    this.repoName = 'code-graph-rag';
    this.upstreamOwner = 'vitali87';
    this.upstreamRepo = 'code-graph-rag';
  }

  async ensureDataDir() {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }

  async collectGitStatistics() {
    console.log('📊 Collecting Git statistics...');
    
    try {
      const log = await this.git.log(['--all', '--since=3 months ago']);
      const status = await this.git.status();
      const branches = await this.git.branch(['-a']);
      const remotes = await this.git.getRemotes(true);

      // Group commits by date for timeline
      const commitsByDate = {};
      const commitsByAuthor = {};
      const commitsByType = {
        feature: 0,
        fix: 0,
        docs: 0,
        refactor: 0,
        test: 0,
        other: 0
      };

      log.all.forEach(commit => {
        const date = format(parseISO(commit.date), 'yyyy-MM-dd');
        const author = commit.author_name;
        
        // Group by date
        if (!commitsByDate[date]) {
          commitsByDate[date] = [];
        }
        commitsByDate[date].push(commit);

        // Group by author
        if (!commitsByAuthor[author]) {
          commitsByAuthor[author] = 0;
        }
        commitsByAuthor[author]++;

        // Categorize by commit message
        const message = commit.message.toLowerCase();
        if (message.includes('feat') || message.includes('feature')) {
          commitsByType.feature++;
        } else if (message.includes('fix') || message.includes('bug')) {
          commitsByType.fix++;
        } else if (message.includes('doc')) {
          commitsByType.docs++;
        } else if (message.includes('refactor')) {
          commitsByType.refactor++;
        } else if (message.includes('test')) {
          commitsByType.test++;
        } else {
          commitsByType.other++;
        }
      });

      // Calculate activity metrics
      const now = new Date();
      const last7Days = log.all.filter(commit => 
        parseISO(commit.date) > subDays(now, 7)
      ).length;
      const last30Days = log.all.filter(commit => 
        parseISO(commit.date) > subDays(now, 30)
      ).length;

      const gitStats = {
        lastUpdated: new Date().toISOString(),
        repository: {
          status: status.current,
          ahead: status.ahead,
          behind: status.behind,
          modified: status.modified.length,
          created: status.created.length,
          deleted: status.deleted.length
        },
        commits: {
          total: log.all.length,
          last7Days,
          last30Days,
          byDate: commitsByDate,
          byAuthor: commitsByAuthor,
          byType: commitsByType
        },
        branches: {
          all: branches.all.map(b => ({
            name: b,
            current: b === branches.current
          })),
          total: branches.all.length
        },
        remotes: remotes.map(remote => ({
          name: remote.name,
          refs: remote.refs
        }))
      };

      await fs.writeFile(
        path.join(DATA_DIR, 'git-stats.json'),
        JSON.stringify(gitStats, null, 2)
      );

      console.log('✅ Git statistics collected');
      return gitStats;
    } catch (error) {
      console.error('❌ Error collecting Git statistics:', error.message);
      return null;
    }
  }

  async collectAnalysisDocumentation() {
    console.log('📚 Collecting analysis documentation...');
    
    try {
      const analysisData = {
        lastUpdated: new Date().toISOString(),
        sessions: [],
        extractions: [],
        templates: []
      };

      // Scan for analysis sessions
      try {
        const sessionsDir = path.join(REPO_ROOT, 'docs', 'upstream-analysis', 'sessions');
        const sessions = await fs.readdir(sessionsDir).catch(() => []);
        
        for (const sessionFile of sessions.filter(f => f.endsWith('.md'))) {
          const content = await fs.readFile(path.join(sessionsDir, sessionFile), 'utf-8');
          const lines = content.split('\\n');
          
          // Extract session metadata from markdown
          const session = {
            filename: sessionFile,
            date: sessionFile.match(/\\d{4}-\\d{2}-\\d{2}/)?.[0] || 'unknown',
            title: lines.find(l => l.startsWith('# '))?.substring(2) || sessionFile,
            summary: lines.find(l => l.includes('Summary:'))?.split('Summary:')[1]?.trim() || '',
            participants: this.extractParticipants(content),
            decisions: this.extractDecisions(content),
            actionItems: this.extractActionItems(content)
          };
          
          analysisData.sessions.push(session);
        }
      } catch (error) {
        console.log('ℹ️ No analysis sessions found');
      }

      // Scan for extraction documentation
      try {
        const extractionDir = path.join(REPO_ROOT, 'docs', 'upstream-analysis', 'extraction');
        const extractions = await fs.readdir(extractionDir).catch(() => []);
        
        for (const extractionFile of extractions.filter(f => f.endsWith('.md'))) {
          const content = await fs.readFile(path.join(extractionDir, extractionFile), 'utf-8');
          
          const extraction = {
            filename: extractionFile,
            title: content.match(/^# (.+)$/m)?.[1] || extractionFile,
            status: this.extractStatus(content),
            priority: this.extractPriority(content),
            upstreamSource: this.extractUpstreamSource(content),
            estimatedEffort: this.extractEffort(content)
          };
          
          analysisData.extractions.push(extraction);
        }
      } catch (error) {
        console.log('ℹ️ No extraction documentation found');
      }

      await fs.writeFile(
        path.join(DATA_DIR, 'analysis-docs.json'),
        JSON.stringify(analysisData, null, 2)
      );

      console.log('✅ Analysis documentation collected');
      return analysisData;
    } catch (error) {
      console.error('❌ Error collecting analysis documentation:', error.message);
      return null;
    }
  }

  async collectGitHubData() {
    if (!this.octokit) {
      console.log('⚠️ No GitHub token provided, skipping GitHub data collection');
      return null;
    }

    console.log('🐙 Collecting GitHub data...');
    
    try {
      // Get repository information
      const { data: repo } = await this.octokit.rest.repos.get({
        owner: this.repoOwner,
        repo: this.repoName,
      });

      // Get upstream repository information
      let upstreamRepo = null;
      try {
        const { data: upstream } = await this.octokit.rest.repos.get({
          owner: this.upstreamOwner,
          repo: this.upstreamRepo,
        });
        upstreamRepo = upstream;
      } catch (error) {
        console.log('ℹ️ Could not fetch upstream repository data');
      }

      // Get issues related to extractions
      const { data: issues } = await this.octokit.rest.issues.listForRepo({
        owner: this.repoOwner,
        repo: this.repoName,
        labels: 'upstream-extraction',
        state: 'all',
        per_page: 100
      });

      // Get pull requests related to extractions
      const { data: pulls } = await this.octokit.rest.pulls.list({
        owner: this.repoOwner,
        repo: this.repoName,
        state: 'all',
        per_page: 100
      });

      const extractionPulls = pulls.filter(pr => 
        pr.title.toLowerCase().includes('extraction') ||
        pr.head.ref.startsWith('feature/extracted-')
      );

      const githubData = {
        lastUpdated: new Date().toISOString(),
        repository: {
          name: repo.full_name,
          description: repo.description,
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          openIssues: repo.open_issues_count,
          defaultBranch: repo.default_branch,
          createdAt: repo.created_at,
          updatedAt: repo.updated_at,
          language: repo.language,
          size: repo.size
        },
        upstream: upstreamRepo ? {
          name: upstreamRepo.full_name,
          description: upstreamRepo.description,
          stars: upstreamRepo.stargazers_count,
          forks: upstreamRepo.forks_count,
          updatedAt: upstreamRepo.updated_at,
          language: upstreamRepo.language
        } : null,
        extractions: {
          issues: issues.length,
          pullRequests: extractionPulls.length,
          completed: issues.filter(i => i.state === 'closed').length,
          inProgress: issues.filter(i => i.state === 'open').length,
          recentActivity: issues.slice(0, 10).map(issue => ({
            title: issue.title,
            state: issue.state,
            createdAt: issue.created_at,
            updatedAt: issue.updated_at,
            url: issue.html_url,
            labels: issue.labels.map(l => l.name)
          }))
        }
      };

      await fs.writeFile(
        path.join(DATA_DIR, 'github-data.json'),
        JSON.stringify(githubData, null, 2)
      );

      console.log('✅ GitHub data collected');
      return githubData;
    } catch (error) {
      console.error('❌ Error collecting GitHub data:', error.message);
      return null;
    }
  }

  async collectUpstreamActivity() {
    if (!this.octokit) {
      console.log('⚠️ No GitHub token provided, skipping upstream activity collection');
      return null;
    }

    console.log('🔄 Collecting upstream activity...');
    
    try {
      // Get recent commits from upstream
      const { data: commits } = await this.octokit.rest.repos.listCommits({
        owner: this.upstreamOwner,
        repo: this.upstreamRepo,
        since: subMonths(new Date(), 3).toISOString(),
        per_page: 100
      });

      // Get contributors
      const { data: contributors } = await this.octokit.rest.repos.listContributors({
        owner: this.upstreamOwner,
        repo: this.upstreamRepo,
        per_page: 50
      });

      // Get recent releases
      const { data: releases } = await this.octokit.rest.repos.listReleases({
        owner: this.upstreamOwner,
        repo: this.upstreamRepo,
        per_page: 10
      });

      // Process commits by date and author
      const commitsByDate = {};
      const commitsByAuthor = {};
      
      commits.forEach(commit => {
        const date = format(parseISO(commit.commit.author.date), 'yyyy-MM-dd');
        const author = commit.commit.author.name;
        
        if (!commitsByDate[date]) {
          commitsByDate[date] = 0;
        }
        commitsByDate[date]++;

        if (!commitsByAuthor[author]) {
          commitsByAuthor[author] = 0;
        }
        commitsByAuthor[author]++;
      });

      const upstreamActivity = {
        lastUpdated: new Date().toISOString(),
        commits: {
          total: commits.length,
          byDate: commitsByDate,
          byAuthor: commitsByAuthor,
          recent: commits.slice(0, 20).map(commit => ({
            sha: commit.sha,
            message: commit.commit.message.split('\\n')[0],
            author: commit.commit.author.name,
            date: commit.commit.author.date,
            url: commit.html_url
          }))
        },
        contributors: contributors.slice(0, 10).map(contributor => ({
          login: contributor.login,
          contributions: contributor.contributions,
          avatarUrl: contributor.avatar_url,
          profileUrl: contributor.html_url
        })),
        releases: releases.map(release => ({
          name: release.name,
          tagName: release.tag_name,
          publishedAt: release.published_at,
          url: release.html_url,
          prerelease: release.prerelease,
          draft: release.draft
        }))
      };

      await fs.writeFile(
        path.join(DATA_DIR, 'upstream-activity.json'),
        JSON.stringify(upstreamActivity, null, 2)
      );

      console.log('✅ Upstream activity collected');
      return upstreamActivity;
    } catch (error) {
      console.error('❌ Error collecting upstream activity:', error.message);
      return null;
    }
  }

  // Helper methods for extracting information from markdown content
  extractParticipants(content) {
    const match = content.match(/Participants?:\\s*(.+)/i);
    return match ? match[1].split(',').map(p => p.trim()) : [];
  }

  extractDecisions(content) {
    const decisionsSection = content.match(/## Decisions?[\\s\\S]*?(?=##|$)/i);
    if (!decisionsSection) return [];
    
    return decisionsSection[0]
      .split('\\n')
      .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
      .map(line => line.replace(/^[\s\-*]+/, '').trim())
      .filter(line => line.length > 0);
  }

  extractActionItems(content) {
    const actionSection = content.match(/## Action Items?[\\s\\S]*?(?=##|$)/i);
    if (!actionSection) return [];
    
    return actionSection[0]
      .split('\\n')
      .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
      .map(line => line.replace(/^[\s\-*]+/, '').trim())
      .filter(line => line.length > 0);
  }

  extractStatus(content) {
    const statusMatch = content.match(/Status:\\s*([^\\n]+)/i);
    return statusMatch ? statusMatch[1].trim() : 'unknown';
  }

  extractPriority(content) {
    const priorityMatch = content.match(/Priority:\\s*([^\\n]+)/i);
    return priorityMatch ? priorityMatch[1].trim() : 'medium';
  }

  extractUpstreamSource(content) {
    const sourceMatch = content.match(/Upstream Source:\\s*([^\\n]+)/i);
    return sourceMatch ? sourceMatch[1].trim() : '';
  }

  extractEffort(content) {
    const effortMatch = content.match(/Effort:\\s*([^\\n]+)/i);
    return effortMatch ? effortMatch[1].trim() : '';
  }

  async run() {
    console.log('🚀 Starting data collection for Upstream Analysis Dashboard\\n');
    
    await this.ensureDataDir();
    
    const results = await Promise.allSettled([
      this.collectGitStatistics(),
      this.collectAnalysisDocumentation(),
      this.collectGitHubData(),
      this.collectUpstreamActivity()
    ]);

    // Generate summary
    const summary = {
      lastUpdated: new Date().toISOString(),
      collections: {
        gitStats: results[0].status === 'fulfilled' ? 'success' : 'failed',
        analysisDocs: results[1].status === 'fulfilled' ? 'success' : 'failed',
        githubData: results[2].status === 'fulfilled' ? 'success' : 'failed',
        upstreamActivity: results[3].status === 'fulfilled' ? 'success' : 'failed'
      },
      errors: results
        .filter(result => result.status === 'rejected')
        .map(result => result.reason?.message || 'Unknown error')
    };

    await fs.writeFile(
      path.join(DATA_DIR, 'collection-summary.json'),
      JSON.stringify(summary, null, 2)
    );

    console.log('\\n📊 Data collection completed!');
    console.log('Summary:', summary);
    
    return summary;
  }
}

// Run data collection if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const collector = new DataCollector();
  collector.run().catch(console.error);
}