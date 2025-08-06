#!/usr/bin/env node

/**
 * Upstream Change Analysis Script
 * 
 * Analyzes commits between upstream syncs and generates notifications
 * based on configurable significance rules and categorization.
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const yaml = require('js-yaml');

// GitHub API client (if @octokit/rest is available)
let Octokit;
try {
  const { Octokit: OctokitRest } = require('@octokit/rest');
  Octokit = OctokitRest;
} catch (error) {
  console.warn('⚠️ @octokit/rest not installed, using git commands only');
}

// Import the classification system
const { ChangeClassifier } = require('./classify-changes');

class UpstreamAnalyzer {
  constructor() {
    this.config = null;
    this.octokit = null;
    this.repoPath = process.cwd();
    this.classifier = null;
  }

  /**
   * Initialize the analyzer with configuration
   */
  async initialize() {
    console.log('🔧 Initializing upstream analyzer...');
    
    // Load configuration
    const configPath = path.join(this.repoPath, '.github/upstream-analysis/config.yml');
    try {
      const configFile = await fs.readFile(configPath, 'utf8');
      this.config = yaml.load(configFile);
      console.log('✅ Configuration loaded');
    } catch (error) {
      console.error('❌ Failed to load configuration:', error.message);
      process.exit(1);
    }

    // Initialize GitHub API client if available
    if (Octokit && process.env.GITHUB_TOKEN) {
      this.octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN,
        request: {
          timeout: (this.config.performance?.api_timeout || 30) * 1000
        }
      });
      console.log('✅ GitHub API client initialized');
    } else {
      console.log('ℹ️ GitHub API client not available (missing token or octokit)');
    }

    // Initialize classification system
    this.classifier = new ChangeClassifier();
    await this.classifier.initialize();
    console.log('✅ Classification system initialized');
  }

  /**
   * Get commits between two references
   */
  async getCommitsBetween(fromRef, toRef) {
    console.log(`📊 Analyzing commits from ${fromRef} to ${toRef}...`);
    
    try {
      // Get commit list using git
      const gitCmd = `git log --pretty=format:"%H|%s|%an|%ae|%ad|%P" --date=iso ${fromRef}..${toRef}`;
      const output = execSync(gitCmd, { encoding: 'utf8', cwd: this.repoPath });
      
      if (!output.trim()) {
        console.log('ℹ️ No commits found in range');
        return [];
      }

      const commits = output.trim().split('\n').map(line => {
        const [hash, subject, author, email, date, parents] = line.split('|');
        return {
          hash,
          subject: subject || '',
          author: author || '',
          email: email || '',
          date: new Date(date),
          parents: parents ? parents.split(' ') : [],
          isMerge: parents && parents.split(' ').length > 1
        };
      });

      console.log(`📈 Found ${commits.length} commits`);
      return commits.slice(0, this.config.detection?.max_commits || 100);
    } catch (error) {
      console.error('❌ Failed to get commits:', error.message);
      return [];
    }
  }

  /**
   * Get files changed in a commit
   */
  async getCommitFiles(commitHash) {
    try {
      const gitCmd = `git show --name-status --pretty=format: ${commitHash}`;
      const output = execSync(gitCmd, { encoding: 'utf8', cwd: this.repoPath });
      
      const files = output.trim().split('\n')
        .filter(line => line.trim())
        .map(line => {
          const [status, ...pathParts] = line.split('\t');
          return {
            status: status.charAt(0), // M, A, D, etc.
            path: pathParts.join('\t'),
            name: path.basename(pathParts.join('\t'))
          };
        });

      return files;
    } catch (error) {
      console.warn(`⚠️ Failed to get files for commit ${commitHash}:`, error.message);
      return [];
    }
  }

  /**
   * Calculate significance score for a file
   */
  calculateFileSignificance(file) {
    const { significant_files, ignore_files } = this.config.significance;
    
    // Check if file should be ignored
    const isIgnored = ignore_files.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
      return regex.test(file.path) || regex.test(file.name);
    });
    
    if (isIgnored) return 0;
    
    // Check if file is significant
    const isSignificant = significant_files.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '.*').replace(/\?/g, '.'));
      return regex.test(file.path) || regex.test(file.name);
    });
    
    if (isSignificant) {
      // Higher score for deleted files (potential breaking changes)
      return file.status === 'D' ? 3 : 2;
    }
    
    return 1; // Default significance for unmatched files
  }

  /**
   * Categorize and score a commit
   */
  categorizeCommit(commit) {
    const subject = commit.subject.toLowerCase();
    const categories = this.config.categories;
    
    let bestMatch = { category: 'other', weight: 1, color: '#6c757d' };
    let maxMatches = 0;
    
    // Find best matching category
    for (const [categoryName, categoryConfig] of Object.entries(categories)) {
      const matches = categoryConfig.keywords.filter(keyword => 
        subject.includes(keyword.toLowerCase())
      ).length;
      
      if (matches > maxMatches) {
        maxMatches = matches;
        bestMatch = {
          category: categoryName,
          weight: categoryConfig.weight,
          color: categoryConfig.color
        };
      }
    }
    
    // Apply significance keyword modifiers
    const { significant_keywords, low_significance_keywords } = this.config.significance;
    
    let significanceMultiplier = 1;
    
    // Check for significant keywords
    const hasSignificant = significant_keywords.some(keyword => 
      subject.includes(keyword.toLowerCase())
    );
    if (hasSignificant) significanceMultiplier *= 1.5;
    
    // Check for low significance keywords
    const hasLowSignificance = low_significance_keywords.some(keyword => 
      subject.includes(keyword.toLowerCase())
    );
    if (hasLowSignificance) significanceMultiplier *= 0.5;
    
    return {
      ...bestMatch,
      significance: Math.round(bestMatch.weight * significanceMultiplier),
      hasSignificantKeywords: hasSignificant,
      hasLowSignificanceKeywords: hasLowSignificance
    };
  }

  /**
   * Analyze a single commit
   */
  async analyzeCommit(commit) {
    console.log(`🔍 Analyzing commit ${commit.hash.substring(0, 8)}: ${commit.subject}`);
    
    // Get files changed in this commit
    const files = await this.getCommitFiles(commit.hash);
    
    // Calculate file significance
    const fileSignificance = files.reduce((total, file) => {
      return total + this.calculateFileSignificance(file);
    }, 0);
    
    // Categorize commit (legacy method)
    const category = this.categorizeCommit(commit);
    
    // Advanced classification using the classification system
    let advancedClassification = null;
    if (this.classifier) {
      try {
        advancedClassification = this.classifier.classifyCommit({
          ...commit,
          files
        });
      } catch (error) {
        console.warn(`⚠️ Advanced classification failed for ${commit.hash}:`, error.message);
      }
    }
    
    // Use advanced classification if available, otherwise fall back to legacy
    const finalCategory = advancedClassification ? advancedClassification.category : category.category;
    const finalSignificance = advancedClassification ? 
      Math.max(advancedClassification.confidence * 10 + fileSignificance, 1) :
      Math.max(category.significance + fileSignificance, 1);
    
    return {
      ...commit,
      files,
      category: finalCategory,
      categoryColor: category.color,
      significance: finalSignificance,
      fileCount: files.length,
      // Legacy analysis
      analysis: {
        hasSignificantKeywords: category.hasSignificantKeywords,
        hasLowSignificanceKeywords: category.hasLowSignificanceKeywords,
        fileSignificance,
        categorySignificance: category.significance
      },
      // Advanced classification results
      classification: advancedClassification || {
        category: finalCategory,
        confidence: 0.5,
        relevance: 0.5,
        reasoning: ['Legacy classification used'],
        metadata: {
          hasFiles: files.length > 0,
          fileCount: files.length,
          fallback: true
        }
      }
    };
  }

  /**
   * Generate analysis summary
   */
  generateSummary(analyzedCommits) {
    const totalSignificance = analyzedCommits.reduce((sum, commit) => sum + commit.significance, 0);
    const totalFiles = analyzedCommits.reduce((sum, commit) => sum + commit.fileCount, 0);
    
    // Categorize commits
    const categories = {};
    analyzedCommits.forEach(commit => {
      if (!categories[commit.category]) {
        categories[commit.category] = {
          count: 0,
          significance: 0,
          commits: []
        };
      }
      categories[commit.category].count++;
      categories[commit.category].significance += commit.significance;
      categories[commit.category].commits.push(commit);
    });
    
    // Sort commits by significance
    const sortedCommits = [...analyzedCommits].sort((a, b) => b.significance - a.significance);
    
    // Determine change level
    let changeLevel = 'minor';
    if (totalSignificance >= this.config.thresholds.critical_change_threshold) {
      changeLevel = 'critical';
    } else if (totalSignificance >= this.config.thresholds.major_change_threshold) {
      changeLevel = 'major';
    } else if (totalSignificance >= this.config.thresholds.notification_threshold) {
      changeLevel = 'moderate';
    }
    
    return {
      totalCommits: analyzedCommits.length,
      totalSignificance,
      totalFiles,
      changeLevel,
      categories,
      topCommits: sortedCommits.slice(0, this.config.thresholds?.max_commits_summary || 10),
      shouldNotify: totalSignificance >= this.config.thresholds.notification_threshold,
      analysisDate: new Date().toISOString(),
      timespan: {
        from: analyzedCommits[analyzedCommits.length - 1]?.date,
        to: analyzedCommits[0]?.date
      }
    };
  }

  /**
   * Create GitHub issue for analysis
   */
  async createGitHubIssue(summary) {
    if (!this.octokit || !this.config.notifications.github_issues.enabled) {
      console.log('ℹ️ GitHub issues disabled or not available');
      return null;
    }
    
    const { min_significance_score, labels, title_template, assignees } = this.config.notifications.github_issues;
    
    if (summary.totalSignificance < min_significance_score) {
      console.log(`ℹ️ Significance score ${summary.totalSignificance} below threshold ${min_significance_score}`);
      return null;
    }
    
    // Generate issue content
    const title = title_template
      .replace('{commit_count}', summary.totalCommits)
      .replace('{date}', new Date().toISOString().split('T')[0]);
    
    const body = this.generateIssueBody(summary);
    
    try {
      // Extract repo info from git remote
      const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8', cwd: this.repoPath }).trim();
      const repoMatch = remoteUrl.match(/github\.com[/:](.*?)\/(.*)\.git/);
      
      if (!repoMatch) {
        console.error('❌ Could not parse GitHub repository from remote URL');
        return null;
      }
      
      const [, owner, repo] = repoMatch;
      
      const issue = await this.octokit.rest.issues.create({
        owner,
        repo,
        title,
        body,
        labels,
        assignees
      });
      
      console.log(`✅ Created GitHub issue: ${issue.data.html_url}`);
      return issue.data;
    } catch (error) {
      console.error('❌ Failed to create GitHub issue:', error.message);
      return null;
    }
  }

  /**
   * Send Slack notification
   */
  async sendSlackNotification(summary) {
    const { slack } = this.config.notifications;
    
    if (!slack.enabled || !process.env.SLACK_WEBHOOK_URL) {
      console.log('ℹ️ Slack notifications disabled or webhook URL not configured');
      return null;
    }
    
    if (summary.totalSignificance < slack.min_significance_score) {
      console.log(`ℹ️ Significance score ${summary.totalSignificance} below Slack threshold ${slack.min_significance_score}`);
      return null;
    }
    
    const payload = {
      channel: slack.channel,
      username: slack.username,
      icon_emoji: slack.icon_emoji,
      text: `🔄 Upstream changes detected (${summary.changeLevel} level)`,
      attachments: [{
        color: this.getChangeLevelColor(summary.changeLevel),
        title: `${summary.totalCommits} commits analyzed`,
        fields: [
          {
            title: 'Significance Score',
            value: summary.totalSignificance.toString(),
            short: true
          },
          {
            title: 'Files Changed',
            value: summary.totalFiles.toString(),
            short: true
          },
          {
            title: 'Top Categories',
            value: Object.entries(summary.categories)
              .sort(([,a], [,b]) => b.significance - a.significance)
              .slice(0, 3)
              .map(([cat, data]) => `${cat}: ${data.count}`)
              .join(', '),
            short: false
          }
        ],
        footer: 'Upstream Analysis Bot',
        ts: Math.floor(Date.now() / 1000)
      }]
    };
    
    try {
      const response = await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (response.ok) {
        console.log('✅ Slack notification sent successfully');
        return true;
      } else {
        console.error('❌ Failed to send Slack notification:', response.statusText);
        return false;
      }
    } catch (error) {
      console.error('❌ Failed to send Slack notification:', error.message);
      return false;
    }
  }

  /**
   * Generate GitHub issue body
   */
  generateIssueBody(summary) {
    const lines = [
      '# Upstream Analysis Report',
      '',
      `**Analysis Date**: ${new Date().toLocaleString()}`,
      `**Change Level**: ${summary.changeLevel.toUpperCase()} (${summary.totalSignificance} significance)`,
      `**Commits Analyzed**: ${summary.totalCommits}`,
      `**Files Changed**: ${summary.totalFiles}`,
      '',
      '## Summary by Category',
      ''
    ];
    
    // Add category breakdown
    Object.entries(summary.categories)
      .sort(([,a], [,b]) => b.significance - a.significance)
      .forEach(([category, data]) => {
        lines.push(`- **${category}**: ${data.count} commits (${data.significance} significance)`);
      });
    
    lines.push('', '## Top Significant Commits', '');
    
    // Add top commits
    summary.topCommits.slice(0, 10).forEach(commit => {
      const shortHash = commit.hash.substring(0, 8);
      lines.push(`- \`${shortHash}\` **[${commit.category}]** ${commit.subject} (${commit.significance})`);
    });
    
    if (summary.topCommits.length > 10) {
      lines.push(`- ... and ${summary.topCommits.length - 10} more commits`);
    }
    
    lines.push(
      '',
      '## Review Actions',
      '',
      '- [ ] Review significant commits for breaking changes',
      '- [ ] Check for new features to evaluate',
      '- [ ] Assess security updates',
      '- [ ] Plan integration timeline',
      '',
      '---',
      `*Generated by Upstream Analysis Bot - ${summary.analysisDate}*`
    );
    
    return lines.join('\n');
  }

  /**
   * Get color for change level
   */
  getChangeLevelColor(level) {
    const colors = {
      critical: '#dc3545',
      major: '#fd7e14', 
      moderate: '#ffc107',
      minor: '#28a745'
    };
    return colors[level] || '#6c757d';
  }

  /**
   * Main analysis function
   */
  async analyzeChanges(fromRef, toRef) {
    console.log(`🚀 Starting upstream analysis: ${fromRef} → ${toRef}`);
    
    await this.initialize();
    
    // Get commits in range
    const commits = await this.getCommitsBetween(fromRef, toRef);
    
    if (commits.length === 0) {
      console.log('ℹ️ No commits to analyze');
      return { success: true, summary: null };
    }
    
    // Analyze each commit
    const analyzedCommits = [];
    for (const commit of commits) {
      try {
        const analyzed = await this.analyzeCommit(commit);
        analyzedCommits.push(analyzed);
        
        // Add delay to avoid overwhelming the system
        if (this.config.performance?.api_delay) {
          await new Promise(resolve => setTimeout(resolve, this.config.performance.api_delay));
        }
      } catch (error) {
        console.warn(`⚠️ Failed to analyze commit ${commit.hash}:`, error.message);
      }
    }
    
    // Generate summary
    const summary = this.generateSummary(analyzedCommits);
    
    console.log(`📊 Analysis Complete:`);
    console.log(`   • Commits: ${summary.totalCommits}`);
    console.log(`   • Significance: ${summary.totalSignificance}`);
    console.log(`   • Change Level: ${summary.changeLevel}`);
    console.log(`   • Should Notify: ${summary.shouldNotify ? 'Yes' : 'No'}`);
    
    // Send notifications if needed
    const notifications = {};
    if (summary.shouldNotify) {
      console.log('📤 Sending notifications...');
      
      notifications.github = await this.createGitHubIssue(summary);
      notifications.slack = await this.sendSlackNotification(summary);
    }
    
    return {
      success: true,
      summary,
      notifications,
      analyzedCommits
    };
  }
}

// Main execution
async function main() {
  const analyzer = new UpstreamAnalyzer();
  
  // Get arguments from command line or environment
  const fromRef = process.argv[2] || process.env.FROM_REF || 'HEAD~1';
  const toRef = process.argv[3] || process.env.TO_REF || 'HEAD';
  
  try {
    const result = await analyzer.analyzeChanges(fromRef, toRef);
    
    // Output results for GitHub Actions
    if (process.env.GITHUB_OUTPUT) {
      const output = [
        `analysis_success=${result.success}`,
        `has_changes=${result.summary ? 'true' : 'false'}`,
        `total_commits=${result.summary?.totalCommits || 0}`,
        `significance_score=${result.summary?.totalSignificance || 0}`,
        `change_level=${result.summary?.changeLevel || 'none'}`,
        `should_notify=${result.summary?.shouldNotify || false}`,
        `github_issue_created=${result.notifications?.github ? 'true' : 'false'}`,
        `slack_sent=${result.notifications?.slack ? 'true' : 'false'}`
      ].join('\n');
      
      await fs.appendFile(process.env.GITHUB_OUTPUT, output + '\n');
    }
    
    // Output JSON summary if requested
    if (process.argv.includes('--json')) {
      console.log(JSON.stringify(result, null, 2));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('💥 Analysis failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { UpstreamAnalyzer };