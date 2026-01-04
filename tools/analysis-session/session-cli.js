#!/usr/bin/env node

/**
 * Interactive CLI for Analysis Session Facilitation
 *
 * This script provides an interactive command-line interface for:
 * - Navigating through upstream changes
 * - Applying the decision framework
 * - Recording decisions and action items
 * - Managing the analysis session workflow
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import simpleGit from 'simple-git';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class AnalysisSessionCLI {
  constructor(options = {}) {
    this.options = {
      configPath: join(__dirname, 'config.yml'),
      sessionNotesPath: join(__dirname, 'session-notes.md'),
      ...options
    };

    this.config = this.loadConfig();
    this.git = simpleGit();
    this.session = {
      decisions: [],
      actionItems: [],
      extractionCandidates: [],
      notes: []
    };

    this.currentCommitIndex = 0;
    this.commits = [];
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
    console.log(chalk.bold.blue('🔍 Analysis Session Interactive CLI\\n'));

    // Load session metadata if available
    if (existsSync(join(__dirname, 'change-summary.json'))) {
      const summaryContent = readFileSync(join(__dirname, 'change-summary.json'), 'utf8');
      this.sessionMetadata = JSON.parse(summaryContent);

      console.log(chalk.blue('📋 Session Information:'));
      console.log(`   Session ID: ${this.sessionMetadata.sessionId}`);
      console.log(`   Date: ${this.sessionMetadata.date}`);
      console.log(`   Branch: ${this.sessionMetadata.branch}`);
      console.log(`   Commits to Analyze: ${this.sessionMetadata.analysis.commitCount}`);
      console.log('');
    }

    await this.loadCommits();
  }

  async loadCommits() {
    try {
      // Determine commit range
      let fromRef = 'upstream/main~10'; // Default fallback

      if (this.sessionMetadata?.analysis?.lastSessionDate !== 'never') {
        // Try to find the exact last session commit
        try {
          const branches = await this.git.branch(['-r', '--list', 'origin/analysis/*']);
          const lastBranch = branches.all
            .filter(branch => branch.includes('origin/analysis/'))
            .sort()
            .pop();

          if (lastBranch) {
            fromRef = lastBranch.replace('origin/', '');
          }
        } catch (error) {
          console.warn(chalk.yellow(`Warning: Could not determine exact commit range: ${error.message}`));
        }
      }

      // Get commit log
      const log = await this.git.log({
        from: fromRef,
        to: 'upstream/main',
        maxCount: this.config.cli?.max_commit_display || 20
      });

      this.commits = log.all.map((commit, index) => ({
        index: index + 1,
        hash: commit.hash.substring(0, 8),
        fullHash: commit.hash,
        message: commit.message,
        author: commit.author_name,
        date: commit.date,
        analyzed: false,
        category: null,
        priority: null,
        extractionCandidate: false
      }));

      console.log(chalk.green(`📦 Loaded ${this.commits.length} commits for analysis\\n`));

    } catch (error) {
      console.error(chalk.red(`Failed to load commits: ${error.message}`));
      process.exit(1);
    }
  }

  async showMainMenu() {
    const choices = [
      { name: '🔍 Analyze Commits', value: 'analyze' },
      { name: '📊 View Analysis Summary', value: 'summary' },
      { name: '🎯 Manage Extraction Candidates', value: 'candidates' },
      { name: '📝 Add Session Notes', value: 'notes' },
      { name: '✅ Review and Finalize', value: 'finalize' },
      { name: '💾 Save Progress', value: 'save' },
      { name: '🚪 Exit', value: 'exit' }
    ];

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'What would you like to do?',
      choices
    }]);

    switch (action) {
      case 'analyze':
        await this.analyzeCommits();
        break;
      case 'summary':
        await this.showSummary();
        break;
      case 'candidates':
        await this.manageCandidates();
        break;
      case 'notes':
        await this.addNotes();
        break;
      case 'finalize':
        await this.finalizeSession();
        break;
      case 'save':
        await this.saveProgress();
        break;
      case 'exit':
        await this.exitSession();
        return;
    }

    // Return to main menu
    await this.showMainMenu();
  }

  async analyzeCommits() {
    const unanalyzedCommits = this.commits.filter(c => !c.analyzed);

    if (unanalyzedCommits.length === 0) {
      console.log(chalk.green('✅ All commits have been analyzed!'));
      await this.promptContinue();
      return;
    }

    console.log(chalk.blue(`\\n📦 ${unanalyzedCommits.length} commits remaining to analyze\\n`));

    const { mode } = await inquirer.prompt([{
      type: 'list',
      name: 'mode',
      message: 'How would you like to analyze commits?',
      choices: [
        { name: '🔄 Interactive (one by one)', value: 'interactive' },
        { name: '📋 Batch categorization', value: 'batch' },
        { name: '🔍 Search specific commits', value: 'search' },
        { name: '🔙 Back to main menu', value: 'back' }
      ]
    }]);

    switch (mode) {
      case 'interactive':
        await this.interactiveAnalysis();
        break;
      case 'batch':
        await this.batchAnalysis();
        break;
      case 'search':
        await this.searchCommits();
        break;
      case 'back':
        return;
    }
  }

  async interactiveAnalysis() {
    const unanalyzed = this.commits.filter(c => !c.analyzed);

    for (const commit of unanalyzed) {
      await this.analyzeCommit(commit);

      const { continue: shouldContinue } = await inquirer.prompt([{
        type: 'confirm',
        name: 'continue',
        message: 'Continue with next commit?',
        default: true
      }]);

      if (!shouldContinue) break;
    }
  }

  async analyzeCommit(commit) {
    console.log(chalk.cyan(`\\n${'='.repeat(60)}`));
    console.log(chalk.bold(`📦 Commit ${commit.index}/${this.commits.length}`));
    console.log(chalk.cyan(`${'='.repeat(60)}`));
    console.log(`Hash: ${chalk.yellow(commit.hash)}`);
    console.log(`Author: ${commit.author}`);
    console.log(`Date: ${commit.date}`);
    console.log(`Message: ${chalk.white(commit.message)}`);

    // Show diff if requested
    const { showDiff } = await inquirer.prompt([{
      type: 'confirm',
      name: 'showDiff',
      message: 'Show commit diff?',
      default: false
    }]);

    if (showDiff) {
      try {
        const diff = await this.git.show([commit.fullHash, '--stat']);
        console.log(chalk.gray('\\nDiff Summary:'));
        console.log(diff);
      } catch (error) {
        console.log(chalk.red(`Could not show diff: ${error.message}`));
      }
    }

    // Categorize commit
    const { category } = await inquirer.prompt([{
      type: 'list',
      name: 'category',
      message: 'Categorize this commit:',
      choices: [
        { name: '🚀 Feature - New functionality', value: 'feature' },
        { name: '🐛 Bug Fix - Fixes an issue', value: 'bugfix' },
        { name: '🔧 Refactor - Code improvement', value: 'refactor' },
        { name: '📚 Documentation - Docs update', value: 'documentation' },
        { name: '🔒 Security - Security improvement', value: 'security' },
        { name: '⚡ Performance - Performance enhancement', value: 'performance' },
        { name: '🏗️ Build - Build system changes', value: 'build' },
        { name: '🧪 Test - Test-related changes', value: 'test' },
        { name: '❓ Other - Miscellaneous', value: 'other' },
        { name: '⏭️ Skip - Skip this commit', value: 'skip' }
      ]
    }]);

    if (category === 'skip') {
      commit.analyzed = true;
      commit.category = 'skipped';
      return;
    }

    // Assess priority
    const { priority } = await inquirer.prompt([{
      type: 'list',
      name: 'priority',
      message: 'What is the priority/significance?',
      choices: [
        { name: '🔴 High - Very significant change', value: 'high' },
        { name: '🟡 Medium - Moderately significant', value: 'medium' },
        { name: '🟢 Low - Minor change', value: 'low' },
        { name: '⚪ None - Not significant', value: 'none' }
      ]
    }]);

    commit.analyzed = true;
    commit.category = category;
    commit.priority = priority;

    // Check if it should be an extraction candidate
    if (priority === 'high' || (priority === 'medium' && ['feature', 'performance', 'security'].includes(category))) {
      const { isCandidate } = await inquirer.prompt([{
        type: 'confirm',
        name: 'isCandidate',
        message: 'Mark as extraction candidate?',
        default: true
      }]);

      if (isCandidate) {
        commit.extractionCandidate = true;
        await this.createExtractionCandidate(commit);
      }
    }

    console.log(chalk.green(`✅ Commit ${commit.hash} analyzed and categorized as ${category}/${priority}`));
  }

  async createExtractionCandidate(commit) {
    console.log(chalk.blue('\\n🎯 Creating Extraction Candidate\\n'));

    const { featureName } = await inquirer.prompt([{
      type: 'input',
      name: 'featureName',
      message: 'Feature name for extraction:',
      default: commit.message.split('\\n')[0].substring(0, 50)
    }]);

    // Apply decision framework
    console.log(chalk.yellow('\\nApplying Feature Extraction Decision Framework...\\n'));

    const criteria = [
      'innovation',
      'performance',
      'code_quality',
      'user_experience',
      'security',
      'tech_debt',
      'strategic_alignment'
    ];

    const scores = {};
    for (const criterion of criteria) {
      const { score } = await inquirer.prompt([{
        type: 'number',
        name: 'score',
        message: `${criterion.replace('_', ' ').toUpperCase()} (0-10):`,
        default: 5,
        validate: (input) => input >= 0 && input <= 10 || 'Score must be between 0 and 10'
      }]);
      scores[criterion] = score;
    }

    // Calculate weighted score
    const weights = this.config.weights;
    let weightedScore = 0;
    for (const [criterion, score] of Object.entries(scores)) {
      weightedScore += (score * (weights[criterion] || 0)) / 100;
    }

    const { effort } = await inquirer.prompt([{
      type: 'list',
      name: 'effort',
      message: 'Implementation effort estimate:',
      choices: [
        { name: 'XS (1-2 days)', value: 'XS' },
        { name: 'S (3-5 days)', value: 'S' },
        { name: 'M (1-2 weeks)', value: 'M' },
        { name: 'L (2-4 weeks)', value: 'L' },
        { name: 'XL (1+ months)', value: 'XL' }
      ]
    }]);

    // Calculate priority and ROI
    const effortCost = this.config.effort_cost[effort] || 1;
    const roi = weightedScore / effortCost;

    let priority = 'low';
    if (weightedScore >= 8 && ['XS', 'S'].includes(effort)) {
      priority = 'high';
    } else if (weightedScore >= 5 && weightedScore < 8 && effort === 'M') {
      priority = 'medium';
    }

    const candidate = {
      id: `EXT-${Date.now()}`,
      name: featureName,
      commit: commit.hash,
      commitMessage: commit.message,
      category: commit.category,
      scores,
      weightedScore: Math.round(weightedScore * 100) / 100,
      effort,
      effortCost,
      roi: Math.round(roi * 100) / 100,
      priority,
      decision: priority === 'high' ? 'approve' : 'review',
      createdAt: new Date().toISOString()
    };

    this.session.extractionCandidates.push(candidate);

    console.log(chalk.green(`\\n✅ Extraction candidate created:`));
    console.log(`   Name: ${candidate.name}`);
    console.log(`   Value Score: ${candidate.weightedScore}/10`);
    console.log(`   Effort: ${effort} (${effortCost})`);
    console.log(`   ROI: ${candidate.roi}`);
    console.log(`   Priority: ${chalk[priority === 'high' ? 'green' : priority === 'medium' ? 'yellow' : 'red'](priority.toUpperCase())}`);
    console.log(`   Recommendation: ${candidate.decision.toUpperCase()}`);
  }

  async showSummary() {
    const analyzed = this.commits.filter(c => c.analyzed);
    const byCategory = analyzed.reduce((acc, commit) => {
      acc[commit.category] = (acc[commit.category] || 0) + 1;
      return acc;
    }, {});

    const byPriority = analyzed.reduce((acc, commit) => {
      acc[commit.priority] = (acc[commit.priority] || 0) + 1;
      return acc;
    }, {});

    console.log(chalk.bold.blue('\\n📊 Analysis Summary\\n'));

    console.log(chalk.yellow('Progress:'));
    console.log(`   Analyzed: ${analyzed.length}/${this.commits.length} commits`);
    console.log(`   Remaining: ${this.commits.length - analyzed.length}`);

    console.log(chalk.yellow('\\nBy Category:'));
    Object.entries(byCategory).forEach(([category, count]) => {
      console.log(`   ${category}: ${count}`);
    });

    console.log(chalk.yellow('\\nBy Priority:'));
    Object.entries(byPriority).forEach(([priority, count]) => {
      const color = priority === 'high' ? 'red' : priority === 'medium' ? 'yellow' : 'green';
      console.log(`   ${chalk[color](priority)}: ${count}`);
    });

    console.log(chalk.yellow('\\nExtraction Candidates:'));
    console.log(`   Total: ${this.session.extractionCandidates.length}`);

    const candidatesByPriority = this.session.extractionCandidates.reduce((acc, candidate) => {
      acc[candidate.priority] = (acc[candidate.priority] || 0) + 1;
      return acc;
    }, {});

    Object.entries(candidatesByPriority).forEach(([priority, count]) => {
      const color = priority === 'high' ? 'red' : priority === 'medium' ? 'yellow' : 'green';
      console.log(`   ${chalk[color](priority)}: ${count}`);
    });

    await this.promptContinue();
  }

  async saveProgress() {
    const progressData = {
      sessionMetadata: this.sessionMetadata,
      commits: this.commits,
      session: this.session,
      savedAt: new Date().toISOString()
    };

    const progressPath = join(__dirname, 'session-progress.json');
    writeFileSync(progressPath, JSON.stringify(progressData, null, 2));

    console.log(chalk.green(`\\n💾 Progress saved to: ${progressPath}`));
    await this.promptContinue();
  }

  async exitSession() {
    const { saveBeforeExit } = await inquirer.prompt([{
      type: 'confirm',
      name: 'saveBeforeExit',
      message: 'Save progress before exiting?',
      default: true
    }]);

    if (saveBeforeExit) {
      await this.saveProgress();
    }

    console.log(chalk.blue('\\n👋 Thank you for using Analysis Session CLI!'));
    console.log(chalk.gray('   Run "npm run finalize" to complete the session when ready.'));
    process.exit(0);
  }

  async promptContinue() {
    await inquirer.prompt([{
      type: 'input',
      name: 'continue',
      message: 'Press Enter to continue...'
    }]);
  }

  async run() {
    try {
      await this.initialize();
      await this.showMainMenu();
    } catch (error) {
      console.error(chalk.red(`\\n❌ Session CLI failed: ${error.message}`));
      process.exit(1);
    }
  }
}

// CLI Setup
const program = new Command();

program
  .name('session-cli')
  .description('Interactive CLI for analysis session facilitation')
  .option('--config <path>', 'Config file path')
  .option('--session-notes <path>', 'Session notes file path')
  .action(async (options) => {
    const cli = new AnalysisSessionCLI({
      configPath: options.config,
      sessionNotesPath: options.sessionNotes
    });

    await cli.run();
  });

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  program.parse();
}

export default AnalysisSessionCLI;
