#!/usr/bin/env node

/**
 * Interactive Analysis Session CLI
 *
 * Facilitates live upstream analysis sessions with interactive navigation
 * and collaborative decision tracking.
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const inquirer = require('inquirer');
const chalk = require('chalk');
const { program } = require('commander');
const yaml = require('js-yaml');

// Import existing analyzers
const { UpstreamAnalyzer } = require('./analyze-changes');
const { ChangeClassifier } = require('./classify-changes');

class AnalysisSessionCLI {
  constructor() {
    this.sessionData = null;
    this.currentCommitIndex = 0;
    this.decisions = [];
    this.actionItems = [];
    this.notes = [];
    this.analyzer = null;
    this.classifier = null;
    this.config = null;
  }

  /**
   * Initialize the session CLI
   */
  async initialize() {
    console.log(chalk.blue.bold('🎯 Analysis Session CLI'));
    console.log(chalk.gray('━'.repeat(50)));

    // Load configuration
    const configPath = path.join(__dirname, 'config.yml');
    try {
      const configFile = await fs.readFile(configPath, 'utf8');
      this.config = yaml.load(configFile);
    } catch (error) {
      console.error(chalk.red('❌ Failed to load configuration:'), error.message);
      process.exit(1);
    }

    // Initialize analyzers
    this.analyzer = new UpstreamAnalyzer();
    await this.analyzer.initialize();

    this.classifier = new ChangeClassifier();
    await this.classifier.initialize();

    console.log(chalk.green('✅ CLI initialized successfully'));
  }

  /**
   * Start an interactive analysis session
   */
  async startSession(sessionPath) {
    try {
      // Load session data
      await this.loadSessionData(sessionPath);

      // Display session overview
      await this.displaySessionOverview();

      // Main interaction loop
      let continueSession = true;
      while (continueSession) {
        const action = await this.showMainMenu();
        continueSession = await this.handleAction(action);
      }

      // Finalize session
      await this.finalizeSession();

    } catch (error) {
      console.error(chalk.red('💥 Session failed:'), error.message);
      process.exit(1);
    }
  }

  /**
   * Load session data from generated analysis document
   */
  async loadSessionData(sessionPath) {
    console.log(chalk.blue('📂 Loading session data...'));

    // Load the generated analysis document
    const analysisFile = await fs.readFile(sessionPath, 'utf8');

    // Parse the analysis file to extract metadata and change data
    // This is a simplified parser - in practice, might use frontmatter
    const lines = analysisFile.split('\n');
    const metadata = this.parseSessionMetadata(lines);

    // Load change data using the analyzers
    const analysisData = await this.analyzer.analyzeCommits(
      metadata.fromRef,
      metadata.toRef
    );

    // Classify changes
    const classificationData = await this.classifier.classifyCommits(
      analysisData.commits
    );

    this.sessionData = {
      metadata,
      commits: analysisData.commits,
      summary: analysisData.summary,
      classifications: classificationData
    };

    console.log(chalk.green(`✅ Loaded ${this.sessionData.commits.length} commits for analysis`));
  }

  /**
   * Parse session metadata from analysis document
   */
  parseSessionMetadata(lines) {
    const metadata = {};

    for (let i = 0; i < Math.min(lines.length, 50); i++) {
      const line = lines[i];

      // Parse key metadata fields
      if (line.includes('**Session ID**:')) {
        metadata.sessionId = line.split('`')[1];
      } else if (line.includes('**Date**:')) {
        metadata.sessionDate = line.split('**Date**: ')[1];
      } else if (line.includes('**Type**:')) {
        metadata.sessionType = line.split('**Type**: ')[1];
      } else if (line.includes('**Focus Area**:')) {
        metadata.focusArea = line.split('**Focus Area**: ')[1];
      } else if (line.includes('**Upstream Version**:')) {
        metadata.toRef = line.split('**Upstream Version**: ')[1];
      } else if (line.includes('**Previous Analysis**:')) {
        metadata.fromRef = line.split('**Previous Analysis**: ')[1];
      }
    }

    return metadata;
  }

  /**
   * Display session overview
   */
  async displaySessionOverview() {
    console.clear();
    console.log(chalk.blue.bold('🎯 Analysis Session Overview'));
    console.log(chalk.gray('━'.repeat(50)));
    console.log(chalk.cyan('Session:'), this.sessionData.metadata.sessionId);
    console.log(chalk.cyan('Date:'), this.sessionData.metadata.sessionDate);
    console.log(chalk.cyan('Type:'), this.sessionData.metadata.sessionType);
    console.log(chalk.cyan('Focus:'), this.sessionData.metadata.focusArea);
    console.log(chalk.cyan('Commits:'), this.sessionData.commits.length);
    console.log(chalk.cyan('Significance:'), this.sessionData.summary.totalSignificance);
    console.log();

    // Show commit breakdown by category
    console.log(chalk.yellow.bold('📊 Change Categories:'));
    const categories = {};
    for (const commit of this.sessionData.commits) {
      const classification = this.sessionData.classifications.find(c => c.hash === commit.hash);
      const category = classification?.category || 'unknown';
      categories[category] = (categories[category] || 0) + 1;
    }

    for (const [category, count] of Object.entries(categories)) {
      console.log(chalk.white(`  ${category}: ${count} commits`));
    }
    console.log();
  }

  /**
   * Show main menu and get user choice
   */
  async showMainMenu() {
    const choices = [
      { name: '🔍 Browse commits interactively', value: 'browse' },
      { name: '📊 View change summary', value: 'summary' },
      { name: '🎯 Focus on specific category', value: 'filter' },
      { name: '⭐ Mark extraction candidates', value: 'extract' },
      { name: '📝 Add session notes', value: 'notes' },
      { name: '✅ Record decisions', value: 'decisions' },
      { name: '📋 Add action items', value: 'actions' },
      { name: '💾 Save progress', value: 'save' },
      { name: '🏁 Finalize session', value: 'finalize' }
    ];

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices
      }
    ]);

    return action;
  }

  /**
   * Handle user actions
   */
  async handleAction(action) {
    switch (action) {
      case 'browse':
        await this.browseCommitsInteractively();
        break;
      case 'summary':
        await this.showChangeSummary();
        break;
      case 'filter':
        await this.filterByCategory();
        break;
      case 'extract':
        await this.markExtractionCandidates();
        break;
      case 'notes':
        await this.addSessionNotes();
        break;
      case 'decisions':
        await this.recordDecisions();
        break;
      case 'actions':
        await this.addActionItems();
        break;
      case 'save':
        await this.saveProgress();
        break;
      case 'finalize':
        return false; // Exit the loop
      default:
        console.log(chalk.red('Unknown action'));
    }

    return true; // Continue the session
  }

  /**
   * Browse commits interactively
   */
  async browseCommitsInteractively() {
    console.clear();
    console.log(chalk.blue.bold('🔍 Interactive Commit Browser'));
    console.log(chalk.gray('━'.repeat(50)));

    let currentIndex = this.currentCommitIndex;
    let browsing = true;

    while (browsing) {
      const commit = this.sessionData.commits[currentIndex];
      const classification = this.sessionData.classifications.find(c => c.hash === commit.hash);

      // Display commit details
      console.clear();
      console.log(chalk.blue.bold(`🔍 Commit ${currentIndex + 1}/${this.sessionData.commits.length}`));
      console.log(chalk.gray('━'.repeat(50)));
      console.log(chalk.yellow('Hash:'), commit.hash);
      console.log(chalk.yellow('Subject:'), commit.subject);
      console.log(chalk.yellow('Author:'), commit.author);
      console.log(chalk.yellow('Date:'), commit.date);
      console.log(chalk.yellow('Category:'), classification?.category || 'unknown');
      console.log(chalk.yellow('Relevance:'), classification?.relevanceScore || 'unknown');
      console.log(chalk.yellow('Confidence:'), classification?.confidence || 'unknown');
      console.log();

      if (commit.files && commit.files.length > 0) {
        console.log(chalk.cyan('Files changed:'));
        commit.files.slice(0, 10).forEach(file => {
          console.log(chalk.white(`  ${file}`));
        });
        if (commit.files.length > 10) {
          console.log(chalk.gray(`  ... and ${commit.files.length - 10} more files`));
        }
        console.log();
      }

      const { browseAction } = await inquirer.prompt([
        {
          type: 'list',
          name: 'browseAction',
          message: 'Navigate commits:',
          choices: [
            { name: '➡️  Next commit', value: 'next', disabled: currentIndex >= this.sessionData.commits.length - 1 },
            { name: '⬅️  Previous commit', value: 'prev', disabled: currentIndex <= 0 },
            { name: '📄 Show diff', value: 'diff' },
            { name: '⭐ Mark for extraction', value: 'mark' },
            { name: '📝 Add note', value: 'note' },
            { name: '🔙 Back to main menu', value: 'back' }
          ]
        }
      ]);

      switch (browseAction) {
        case 'next':
          currentIndex++;
          break;
        case 'prev':
          currentIndex--;
          break;
        case 'diff':
          await this.showCommitDiff(commit);
          break;
        case 'mark':
          await this.markCommitForExtraction(commit);
          break;
        case 'note':
          await this.addCommitNote(commit);
          break;
        case 'back':
          browsing = false;
          break;
      }
    }

    this.currentCommitIndex = currentIndex;
  }

  /**
   * Show commit diff
   */
  async showCommitDiff(commit) {
    console.log(chalk.blue('\n📄 Commit Diff:'));
    console.log(chalk.gray('━'.repeat(30)));

    try {
      const diff = execSync(`git show --stat ${commit.hash}`, {
        encoding: 'utf8',
        cwd: process.cwd()
      });
      console.log(diff);
    } catch (error) {
      console.log(chalk.red('❌ Could not show diff:'), error.message);
    }

    await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
  }

  /**
   * Mark commit for extraction
   */
  async markCommitForExtraction(commit) {
    const { priority, reason } = await inquirer.prompt([
      {
        type: 'list',
        name: 'priority',
        message: 'Extraction priority:',
        choices: ['high', 'medium', 'low']
      },
      {
        type: 'input',
        name: 'reason',
        message: 'Reason for extraction:'
      }
    ]);

    const extraction = {
      hash: commit.hash,
      subject: commit.subject,
      priority,
      reason,
      timestamp: new Date().toISOString()
    };

    this.decisions.push({
      type: 'extraction',
      decision: extraction,
      timestamp: new Date().toISOString()
    });

    console.log(chalk.green('✅ Commit marked for extraction'));
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Add note to commit
   */
  async addCommitNote(commit) {
    const { note } = await inquirer.prompt([
      {
        type: 'input',
        name: 'note',
        message: 'Add note:'
      }
    ]);

    this.notes.push({
      hash: commit.hash,
      subject: commit.subject,
      note,
      timestamp: new Date().toISOString()
    });

    console.log(chalk.green('✅ Note added'));
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Show change summary
   */
  async showChangeSummary() {
    console.clear();
    console.log(chalk.blue.bold('📊 Change Summary'));
    console.log(chalk.gray('━'.repeat(50)));

    console.log(chalk.cyan('Total Commits:'), this.sessionData.commits.length);
    console.log(chalk.cyan('Total Files:'), this.sessionData.summary.totalFiles);
    console.log(chalk.cyan('Significance Score:'), this.sessionData.summary.totalSignificance);
    console.log();

    // Show top significant commits
    const sortedCommits = [...this.sessionData.commits]
      .sort((a, b) => (b.significance || 0) - (a.significance || 0));

    console.log(chalk.yellow.bold('🔝 Top 5 Most Significant Commits:'));
    sortedCommits.slice(0, 5).forEach((commit, index) => {
      console.log(chalk.white(`${index + 1}. ${commit.hash.substring(0, 8)} - ${commit.subject}`));
      console.log(chalk.gray(`   Significance: ${commit.significance || 'unknown'}`));
    });

    await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
  }

  /**
   * Filter commits by category
   */
  async filterByCategory() {
    const categories = [...new Set(this.sessionData.classifications.map(c => c.category))];

    const { category } = await inquirer.prompt([
      {
        type: 'list',
        name: 'category',
        message: 'Filter by category:',
        choices: categories
      }
    ]);

    const filteredCommits = this.sessionData.commits.filter(commit => {
      const classification = this.sessionData.classifications.find(c => c.hash === commit.hash);
      return classification?.category === category;
    });

    console.log(chalk.blue(`\n📊 ${category} commits (${filteredCommits.length}):`));
    console.log(chalk.gray('━'.repeat(30)));

    filteredCommits.forEach(commit => {
      console.log(chalk.white(`${commit.hash.substring(0, 8)} - ${commit.subject}`));
    });

    await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
  }

  /**
   * Mark extraction candidates
   */
  async markExtractionCandidates() {
    console.log(chalk.blue.bold('⭐ Mark Extraction Candidates'));
    console.log(chalk.gray('━'.repeat(50)));

    // Show high-relevance commits for quick selection
    const highRelevanceCommits = this.sessionData.commits.filter(commit => {
      const classification = this.sessionData.classifications.find(c => c.hash === commit.hash);
      return classification?.relevanceScore > 0.7;
    });

    if (highRelevanceCommits.length === 0) {
      console.log(chalk.yellow('No high-relevance commits found'));
      await inquirer.prompt([{ type: 'input', name: 'continue', message: 'Press Enter to continue...' }]);
      return;
    }

    const choices = highRelevanceCommits.map(commit => ({
      name: `${commit.hash.substring(0, 8)} - ${commit.subject}`,
      value: commit,
      checked: false
    }));

    const { selectedCommits } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedCommits',
        message: 'Select commits for extraction:',
        choices
      }
    ]);

    for (const commit of selectedCommits) {
      const { priority, reason } = await inquirer.prompt([
        {
          type: 'list',
          name: 'priority',
          message: `Priority for ${commit.hash.substring(0, 8)}:`,
          choices: ['high', 'medium', 'low']
        },
        {
          type: 'input',
          name: 'reason',
          message: 'Reason:'
        }
      ]);

      this.decisions.push({
        type: 'extraction',
        decision: {
          hash: commit.hash,
          subject: commit.subject,
          priority,
          reason,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date().toISOString()
      });
    }

    console.log(chalk.green(`✅ Marked ${selectedCommits.length} commits for extraction`));
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  /**
   * Add session notes
   */
  async addSessionNotes() {
    const { noteType, content } = await inquirer.prompt([
      {
        type: 'list',
        name: 'noteType',
        message: 'Note type:',
        choices: ['general', 'insight', 'concern', 'question', 'reminder']
      },
      {
        type: 'input',
        name: 'content',
        message: 'Note content:'
      }
    ]);

    this.notes.push({
      type: noteType,
      content,
      timestamp: new Date().toISOString()
    });

    console.log(chalk.green('✅ Note added'));
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Record decisions
   */
  async recordDecisions() {
    const { decisionType, decision, reasoning } = await inquirer.prompt([
      {
        type: 'list',
        name: 'decisionType',
        message: 'Decision type:',
        choices: ['extract', 'reject', 'defer', 'research', 'discuss']
      },
      {
        type: 'input',
        name: 'decision',
        message: 'Decision summary:'
      },
      {
        type: 'input',
        name: 'reasoning',
        message: 'Reasoning:'
      }
    ]);

    this.decisions.push({
      type: decisionType,
      decision,
      reasoning,
      timestamp: new Date().toISOString()
    });

    console.log(chalk.green('✅ Decision recorded'));
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Add action items
   */
  async addActionItems() {
    const { actionType, description, assignee, dueDate } = await inquirer.prompt([
      {
        type: 'list',
        name: 'actionType',
        message: 'Action type:',
        choices: ['implementation', 'research', 'testing', 'documentation', 'review']
      },
      {
        type: 'input',
        name: 'description',
        message: 'Action description:'
      },
      {
        type: 'input',
        name: 'assignee',
        message: 'Assignee (optional):'
      },
      {
        type: 'input',
        name: 'dueDate',
        message: 'Due date (YYYY-MM-DD, optional):'
      }
    ]);

    this.actionItems.push({
      type: actionType,
      description,
      assignee: assignee || 'TBD',
      dueDate: dueDate || 'TBD',
      status: 'pending',
      timestamp: new Date().toISOString()
    });

    console.log(chalk.green('✅ Action item added'));
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Save progress
   */
  async saveProgress() {
    const sessionState = {
      metadata: this.sessionData.metadata,
      currentCommitIndex: this.currentCommitIndex,
      decisions: this.decisions,
      actionItems: this.actionItems,
      notes: this.notes,
      lastSaved: new Date().toISOString()
    };

    const saveFile = path.join(__dirname, '..', 'analysis-sessions', `${this.sessionData.metadata.sessionId}-progress.json`);
    await fs.writeFile(saveFile, JSON.stringify(sessionState, null, 2));

    console.log(chalk.green('✅ Progress saved'));
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Finalize session
   */
  async finalizeSession() {
    console.clear();
    console.log(chalk.blue.bold('🏁 Finalizing Analysis Session'));
    console.log(chalk.gray('━'.repeat(50)));

    // Show session summary
    console.log(chalk.cyan('Decisions made:'), this.decisions.length);
    console.log(chalk.cyan('Action items:'), this.actionItems.length);
    console.log(chalk.cyan('Notes added:'), this.notes.length);
    console.log();

    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Finalize session and generate artifacts?'
      }
    ]);

    if (confirm) {
      await this.generateFinalArtifacts();
      console.log(chalk.green.bold('🎉 Session completed successfully!'));
    } else {
      console.log(chalk.yellow('Session not finalized. Use "save progress" to preserve current state.'));
    }
  }

  /**
   * Generate final session artifacts
   */
  async generateFinalArtifacts() {
    console.log(chalk.blue('📄 Generating final artifacts...'));

    const finalReport = {
      sessionMetadata: this.sessionData.metadata,
      summary: {
        totalCommits: this.sessionData.commits.length,
        decisionsCount: this.decisions.length,
        actionItemsCount: this.actionItems.length,
        notesCount: this.notes.length
      },
      decisions: this.decisions,
      actionItems: this.actionItems,
      notes: this.notes,
      extractionCandidates: this.decisions.filter(d => d.type === 'extraction'),
      completedAt: new Date().toISOString()
    };

    // Save final report
    const reportFile = path.join(__dirname, '..', 'analysis-sessions', `${this.sessionData.metadata.sessionId}-final.json`);
    await fs.writeFile(reportFile, JSON.stringify(finalReport, null, 2));

    console.log(chalk.green('✅ Final report saved'));

    // TODO: Create GitHub issues for extraction candidates
    // TODO: Update analysis document with decisions
    // TODO: Generate dashboard update
  }
}

/**
 * CLI Interface
 */
async function setupCLI() {
  program
    .name('session-cli')
    .description('Interactive Analysis Session CLI')
    .version('1.0.0');

  program
    .command('start')
    .description('Start an interactive analysis session')
    .argument('<session-path>', 'Path to analysis session document')
    .action(async (sessionPath) => {
      const cli = new AnalysisSessionCLI();
      await cli.initialize();
      await cli.startSession(sessionPath);
    });

  program
    .command('resume')
    .description('Resume a saved session')
    .argument('<session-id>', 'Session ID to resume')
    .action(async (sessionId) => {
      const progressFile = path.join(__dirname, '..', 'analysis-sessions', `${sessionId}-progress.json`);

      try {
        const progressData = JSON.parse(await fs.readFile(progressFile, 'utf8'));
        console.log(chalk.blue('📂 Resuming saved session...'));
        console.log(chalk.cyan('Last saved:'), progressData.lastSaved);

        // Initialize CLI and load saved state
        const cli = new AnalysisSessionCLI();
        await cli.initialize();

        // Restore state
        cli.currentCommitIndex = progressData.currentCommitIndex;
        cli.decisions = progressData.decisions;
        cli.actionItems = progressData.actionItems;
        cli.notes = progressData.notes;

        // Start session from current state
        await cli.startSession(); // Would need session path resolution

      } catch (error) {
        console.error(chalk.red('❌ Could not resume session:'), error.message);
        process.exit(1);
      }
    });

  program.parse();
}

// Run CLI if called directly
if (require.main === module) {
  setupCLI();
}

module.exports = { AnalysisSessionCLI };
