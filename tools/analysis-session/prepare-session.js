#!/usr/bin/env node

/**
 * Upstream Analysis Session Preparation Script
 * 
 * This script automates the preparation of upstream analysis sessions by:
 * - Analyzing changes since the last session
 * - Creating analysis branch
 * - Generating pre-populated session documents
 * - Setting up session artifacts
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';
import { Octokit } from '@octokit/rest';
import yaml from 'js-yaml';
import chalk from 'chalk';
import ora from 'ora';
import simpleGit from 'simple-git';
import { format } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class SessionPreparation {
  constructor(options = {}) {
    this.options = {
      force: false,
      lookbackDays: 7,
      configPath: join(__dirname, 'config.yml'),
      ...options
    };
    
    this.config = this.loadConfig();
    this.git = simpleGit();
    this.octokit = options.githubToken ? new Octokit({ auth: options.githubToken }) : null;
    
    this.sessionData = {
      id: null,
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HHmm'),
      branch: null,
      hasChanges: false,
      commitCount: 0,
      lastSessionDate: null,
      significant: false
    };
  }

  loadConfig() {
    try {
      const configContent = readFileSync(this.options.configPath, 'utf8');
      return yaml.load(configContent);
    } catch (error) {
      console.error(chalk.red(`Failed to load config: ${error.message}`));
      process.exit(1);
    }
  }

  async initialize() {
    const spinner = ora('Initializing session preparation').start();
    
    try {
      // Generate session ID and branch name
      this.sessionData.id = `session-${this.sessionData.date}-${this.sessionData.time}`;
      this.sessionData.branch = `${this.config.github.branch_prefix || 'analysis'}/${this.sessionData.date}-session`;
      
      // Set up Git configuration
      await this.git.addConfig('user.name', 'Analysis Session Bot');
      await this.git.addConfig('user.email', 'analysis-session-bot@users.noreply.github.com');
      
      spinner.succeed('Session preparation initialized');
      
      console.log(chalk.blue('📋 Session Information:'));
      console.log(`   Session ID: ${this.sessionData.id}`);
      console.log(`   Date: ${this.sessionData.date}`);
      console.log(`   Branch: ${this.sessionData.branch}`);
      
    } catch (error) {
      spinner.fail(`Initialization failed: ${error.message}`);
      throw error;
    }
  }

  async setupUpstreamRemote() {
    const spinner = ora('Setting up upstream remote').start();
    
    try {
      const remotes = await this.git.getRemotes();
      const hasUpstream = remotes.some(remote => remote.name === 'upstream');
      
      if (!hasUpstream) {
        await this.git.addRemote('upstream', 'https://github.com/vitali87/code-graph-rag.git');
        spinner.text = 'Added upstream remote';
      }
      
      await this.git.fetch('upstream');
      await this.git.fetch('origin');
      
      spinner.succeed('Upstream remote configured and fetched');
    } catch (error) {
      spinner.fail(`Failed to setup upstream: ${error.message}`);
      throw error;
    }
  }

  async analyzeChanges() {
    const spinner = ora('Analyzing upstream changes').start();
    
    try {
      // Find last analysis session
      const branches = await this.git.branch(['-r', '--list', 'origin/analysis/*']);
      const analysisBranches = branches.all
        .filter(branch => branch.includes('origin/analysis/'))
        .map(branch => branch.replace('origin/', ''))
        .sort();
      
      let lastSessionCommit = null;
      if (analysisBranches.length > 0) {
        const lastBranch = analysisBranches[analysisBranches.length - 1];
        this.sessionData.lastSessionDate = lastBranch.match(/\\d{4}-\\d{2}-\\d{2}/)?.[0] || 'unknown';
        
        try {
          lastSessionCommit = await this.git.revparse([`origin/${lastBranch}`]);
          spinner.text = `Found last session: ${this.sessionData.lastSessionDate}`;
        } catch (error) {
          console.warn(chalk.yellow(`Warning: Could not resolve last session commit: ${error.message}`));
        }
      } else {
        this.sessionData.lastSessionDate = 'never';
        spinner.text = 'No previous analysis sessions found';
      }
      
      // Get current upstream commit
      const currentUpstream = await this.git.revparse(['upstream/main']);
      
      if (lastSessionCommit && lastSessionCommit === currentUpstream) {
        this.sessionData.hasChanges = false;
        this.sessionData.commitCount = 0;
        
        if (!this.options.force) {
          spinner.succeed('No changes since last session');
          return false;
        } else {
          spinner.warn('No changes found, but forced session enabled');
        }
      } else {
        // Count commits since last session
        if (lastSessionCommit) {
          const commitLog = await this.git.log({
            from: lastSessionCommit,
            to: 'upstream/main'
          });
          this.sessionData.commitCount = commitLog.total;
        } else {
          // First session - count all commits
          const commitLog = await this.git.log(['upstream/main']);
          this.sessionData.commitCount = Math.min(commitLog.total, 50); // Cap for first session
        }
        
        this.sessionData.hasChanges = true;
        this.sessionData.significant = this.sessionData.commitCount >= this.config.analysis.high_significance_threshold;
        
        spinner.succeed(`Found ${this.sessionData.commitCount} new commits`);
      }
      
      console.log(chalk.blue('📊 Change Analysis:'));
      console.log(`   New commits: ${this.sessionData.commitCount}`);
      console.log(`   Since: ${this.sessionData.lastSessionDate}`);
      console.log(`   Significant: ${this.sessionData.significant ? 'Yes' : 'No'}`);
      
      return true;
      
    } catch (error) {
      spinner.fail(`Change analysis failed: ${error.message}`);
      throw error;
    }
  }

  async createAnalysisBranch() {
    if (!this.sessionData.hasChanges && !this.options.force) {
      return false;
    }
    
    const spinner = ora(`Creating analysis branch: ${this.sessionData.branch}`).start();
    
    try {
      // Create branch from upstream/main
      await this.git.checkoutBranch(this.sessionData.branch, 'upstream/main');
      
      // Push the new branch
      await this.git.push('origin', this.sessionData.branch);
      
      spinner.succeed('Analysis branch created and pushed');
      return true;
      
    } catch (error) {
      spinner.fail(`Failed to create branch: ${error.message}`);
      throw error;
    }
  }

  async generateSessionDocument() {
    const spinner = ora('Generating session document').start();
    
    try {
      // Create session notes directory if it doesn't exist
      const sessionDir = __dirname;
      if (!existsSync(sessionDir)) {
        mkdirSync(sessionDir, { recursive: true });
      }
      
      const sessionTemplate = this.createSessionTemplate();
      const sessionNotesPath = join(sessionDir, 'session-notes.md');
      
      writeFileSync(sessionNotesPath, sessionTemplate, 'utf8');
      
      spinner.succeed(`Session document generated: ${sessionNotesPath}`);
      
      // Also generate change summary JSON for automation
      const changeSummary = {
        sessionId: this.sessionData.id,
        date: this.sessionData.date,
        branch: this.sessionData.branch,
        analysis: {
          commitCount: this.sessionData.commitCount,
          lastSessionDate: this.sessionData.lastSessionDate,
          hasSignificantChanges: this.sessionData.significant,
          lookbackDays: this.options.lookbackDays
        },
        generated: new Date().toISOString()
      };
      
      writeFileSync(join(sessionDir, 'change-summary.json'), JSON.stringify(changeSummary, null, 2));
      
      return sessionNotesPath;
      
    } catch (error) {
      spinner.fail(`Document generation failed: ${error.message}`);
      throw error;
    }
  }

  createSessionTemplate() {
    const now = new Date().toISOString();
    
    return `# Upstream Analysis Session - ${this.sessionData.date}

**Session ID**: ${this.sessionData.id}
**Date**: ${this.sessionData.date}
**Branch**: \`${this.sessionData.branch}\`
**Generated**: ${now}

---

## 📊 Change Summary

- **Commits to Analyze**: ${this.sessionData.commitCount}
- **Since Last Session**: ${this.sessionData.lastSessionDate}
- **Significant Changes**: ${this.sessionData.significant ? '✅ Yes' : '❌ No'}
- **Analysis Period**: ${this.options.lookbackDays} days

## 🔍 Quick Assessment

### High-Priority Changes
<!-- Fill during manual analysis -->
- [ ] Change 1: [Description]
- [ ] Change 2: [Description]
- [ ] Change 3: [Description]

### Medium-Priority Changes
<!-- Fill during manual analysis -->
- [ ] Change 1: [Description]
- [ ] Change 2: [Description]

### Low-Priority Changes
<!-- Fill during manual analysis -->
- [ ] Change 1: [Description]
- [ ] Change 2: [Description]

## 🎯 Extraction Candidates

### Features Worth Extracting
<!-- Use decision framework for evaluation -->

#### Feature 1: [Name]
- **Innovation Value**: [0-10]
- **Performance Impact**: [0-10]
- **Code Quality**: [0-10]
- **User Experience**: [0-10]
- **Security Enhancement**: [0-10]
- **Technical Debt Reduction**: [0-10]
- **Strategic Alignment**: [0-10]
- **Effort Estimate**: [XS/S/M/L/XL]
- **Priority**: [High/Medium/Low/Rejected]
- **Decision**: [Approve/Defer/Reject]

#### Feature 2: [Name]
[Same structure as Feature 1]

## 📋 Action Items

### Immediate Actions
- [ ] Review automated analysis
- [ ] Conduct team analysis session
- [ ] Apply decision framework to candidates
- [ ] Create extraction issues for approved features

### Follow-up Actions
- [ ] Schedule implementation of approved extractions
- [ ] Update extraction workflow based on session learnings
- [ ] Document any process improvements

## 📝 Session Notes

### Team Discussion
<!-- Fill during session -->

### Decisions Made
<!-- Fill during session -->

### Process Improvements
<!-- Fill during session -->

---

## 🛠️ Technical Details

### Git Information
- **Upstream Remote**: https://github.com/vitali87/code-graph-rag.git
- **Analysis Branch**: ${this.sessionData.branch}
- **Last Session**: ${this.sessionData.lastSessionDate}
- **Commit Range**: ${this.sessionData.lastSessionDate !== 'never' ? 'last-session..upstream/main' : 'recent commits'}

### Next Steps
1. **Manual Review**: Use \`cd tools/analysis-session && npm run cli\` for interactive analysis
2. **Issue Creation**: Create GitHub issues for approved extractions
3. **Session Finalization**: Use \`npm run finalize\` to complete session processing

---

*Generated automatically by Analysis Session Automation*
*Session Template Version: 1.0*
*Framework: Feature Extraction Decision Framework*
`;
  }

  async setGitHubOutputs() {
    // Set GitHub Actions outputs if running in CI
    if (process.env.GITHUB_OUTPUT) {
      const outputs = [
        `session_created=${this.sessionData.hasChanges || this.options.force}`,
        `session_branch=${this.sessionData.branch}`,
        `commit_count=${this.sessionData.commitCount}`,
        `has_significant_changes=${this.sessionData.significant}`
      ];
      
      const outputContent = outputs.join('\\n') + '\\n';
      writeFileSync(process.env.GITHUB_OUTPUT, outputContent, { flag: 'a' });
      
      console.log(chalk.green('📤 GitHub Actions outputs set'));
    }
  }

  async run() {
    try {
      console.log(chalk.bold.blue('🚀 Starting Analysis Session Preparation\\n'));
      
      await this.initialize();
      await this.setupUpstreamRemote();
      
      const hasChanges = await this.analyzeChanges();
      
      if (!hasChanges && !this.options.force) {
        console.log(chalk.yellow('\\n⏭️  No changes detected, skipping session creation'));
        await this.setGitHubOutputs();
        return;
      }
      
      await this.createAnalysisBranch();
      await this.generateSessionDocument();
      await this.setGitHubOutputs();
      
      console.log(chalk.bold.green('\\n✅ Session preparation completed successfully!'));
      console.log(chalk.blue('\\n🎯 Next Steps:'));
      console.log('   1. Review session notes: tools/analysis-session/session-notes.md');
      console.log('   2. Start interactive analysis: npm run cli');
      console.log(`   3. Switch to analysis branch: git checkout ${this.sessionData.branch}`);
      
    } catch (error) {
      console.error(chalk.red(`\\n❌ Session preparation failed: ${error.message}`));
      process.exit(1);
    }
  }
}

// CLI Setup
const program = new Command();

program
  .name('prepare-session')
  .description('Prepare upstream analysis session')
  .option('--force', 'Force session creation even if no changes', false)
  .option('--lookback-days <days>', 'Days to look back for changes', '7')
  .option('--github-token <token>', 'GitHub API token')
  .option('--repository <repo>', 'GitHub repository (owner/repo)')
  .option('--config <path>', 'Config file path')
  .action(async (options) => {
    const preparation = new SessionPreparation({
      force: options.force,
      lookbackDays: parseInt(options.lookbackDays),
      githubToken: options.githubToken || process.env.GITHUB_TOKEN,
      repository: options.repository || process.env.GITHUB_REPOSITORY,
      configPath: options.config
    });
    
    await preparation.run();
  });

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export default SessionPreparation;