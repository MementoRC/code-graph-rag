#!/usr/bin/env node

/**
 * Post-Session Processing Script
 *
 * Automates the finalization of analysis sessions including:
 * - Documentation completion
 * - GitHub issue creation for extraction candidates
 * - Dashboard updates
 * - Session archival
 */

const fs = require('fs').promises;
const path = require('path');
const { Octokit } = require('@octokit/rest');
const { program } = require('commander');
const yaml = require('js-yaml');

class PostSessionProcessor {
  constructor() {
    this.config = null;
    this.octokit = null;
    this.sessionData = null;
  }

  /**
   * Initialize the post-session processor
   */
  async initialize() {
    console.log('🔧 Initializing post-session processor...');

    // Load configuration
    const configPath = path.join(__dirname, 'config.yml');
    try {
      const configFile = await fs.readFile(configPath, 'utf8');
      this.config = yaml.load(configFile);
    } catch (error) {
      console.error('❌ Failed to load configuration:', error.message);
      process.exit(1);
    }

    // Initialize GitHub client if token is available
    if (process.env.GITHUB_TOKEN) {
      this.octokit = new Octokit({
        auth: process.env.GITHUB_TOKEN
      });
      console.log('✅ GitHub client initialized');
    } else {
      console.warn('⚠️ GITHUB_TOKEN not found - GitHub integrations will be skipped');
    }

    console.log('✅ Post-session processor initialized');
  }

  /**
   * Process a completed analysis session
   */
  async processSession(sessionReportPath) {
    try {
      console.log('📂 Loading session report...');

      // Load session final report
      const reportData = await fs.readFile(sessionReportPath, 'utf8');
      this.sessionData = JSON.parse(reportData);

      console.log(`✅ Loaded session: ${this.sessionData.sessionMetadata.sessionId}`);
      console.log(`   • Decisions: ${this.sessionData.decisionsCount}`);
      console.log(`   • Action Items: ${this.sessionData.actionItemsCount}`);
      console.log(`   • Extraction Candidates: ${this.sessionData.extractionCandidates.length}`);

      // Process each component
      await this.finalizeDocumentation();
      await this.createIssuesForExtractionCandidates();
      await this.updateDashboard();
      await this.archiveSession();

      console.log('🎉 Post-session processing completed successfully!');

    } catch (error) {
      console.error('💥 Post-session processing failed:', error.message);
      throw error;
    }
  }

  /**
   * Finalize the analysis documentation
   */
  async finalizeDocumentation() {
    console.log('📝 Finalizing documentation...');

    const sessionId = this.sessionData.sessionMetadata.sessionId;
    const branchDate = this.sessionData.sessionMetadata.branchDate || this.sessionData.sessionMetadata.sessionDate;

    // Create finalized analysis document
    const finalDoc = this.generateFinalAnalysisDocument();

    // Save finalized document
    const finalDocPath = path.join(__dirname, '..', 'analysis-sessions', `${sessionId}-final-analysis.md`);
    await fs.writeFile(finalDocPath, finalDoc);

    // Create session summary
    const summary = this.generateSessionSummary();
    const summaryPath = path.join(__dirname, '..', 'analysis-sessions', `${sessionId}-summary.md`);
    await fs.writeFile(summaryPath, summary);

    console.log('✅ Documentation finalized');
    console.log(`   • Final analysis: ${finalDocPath}`);
    console.log(`   • Session summary: ${summaryPath}`);
  }

  /**
   * Generate the final analysis document
   */
  generateFinalAnalysisDocument() {
    const session = this.sessionData.sessionMetadata;
    const summary = this.sessionData.summary;

    let doc = `# Final Analysis Report: ${session.sessionId}\n\n`;

    // Session metadata
    doc += `## 📋 Session Information\n\n`;
    doc += `- **Session ID**: \`${session.sessionId}\`\n`;
    doc += `- **Date**: ${session.sessionDate}\n`;
    doc += `- **Type**: ${session.sessionType}\n`;
    doc += `- **Focus Area**: ${session.focusArea}\n`;
    doc += `- **Completed**: ${this.sessionData.completedAt}\n`;
    doc += `- **Total Commits Analyzed**: ${summary.totalCommits}\n\n`;

    // Decisions summary
    doc += `## 🎯 Decisions Made\n\n`;
    if (this.sessionData.decisions.length === 0) {
      doc += `No decisions recorded.\n\n`;
    } else {
      this.sessionData.decisions.forEach((decision, index) => {
        doc += `### Decision ${index + 1}: ${decision.type}\n`;
        doc += `- **Decision**: ${decision.decision}\n`;
        if (decision.reasoning) {
          doc += `- **Reasoning**: ${decision.reasoning}\n`;
        }
        doc += `- **Timestamp**: ${decision.timestamp}\n\n`;
      });
    }

    // Extraction candidates
    doc += `## ⭐ Extraction Candidates\n\n`;
    if (this.sessionData.extractionCandidates.length === 0) {
      doc += `No extraction candidates identified.\n\n`;
    } else {
      const priorityGroups = {
        high: this.sessionData.extractionCandidates.filter(e => e.decision.priority === 'high'),
        medium: this.sessionData.extractionCandidates.filter(e => e.decision.priority === 'medium'),
        low: this.sessionData.extractionCandidates.filter(e => e.decision.priority === 'low')
      };

      Object.entries(priorityGroups).forEach(([priority, candidates]) => {
        if (candidates.length > 0) {
          doc += `### ${priority.charAt(0).toUpperCase() + priority.slice(1)} Priority (${candidates.length})\n\n`;
          candidates.forEach(candidate => {
            const decision = candidate.decision;
            doc += `- **${decision.hash.substring(0, 8)}**: ${decision.subject}\n`;
            doc += `  - **Reason**: ${decision.reason}\n`;
            doc += `  - **Identified**: ${decision.timestamp}\n\n`;
          });
        }
      });
    }

    // Action items
    doc += `## 📋 Action Items\n\n`;
    if (this.sessionData.actionItems.length === 0) {
      doc += `No action items created.\n\n`;
    } else {
      this.sessionData.actionItems.forEach((item, index) => {
        doc += `### ${index + 1}. ${item.description}\n`;
        doc += `- **Type**: ${item.type}\n`;
        doc += `- **Assignee**: ${item.assignee}\n`;
        doc += `- **Due Date**: ${item.dueDate}\n`;
        doc += `- **Status**: ${item.status}\n`;
        doc += `- **Created**: ${item.timestamp}\n\n`;
      });
    }

    // Session notes
    doc += `## 📝 Session Notes\n\n`;
    if (this.sessionData.notes.length === 0) {
      doc += `No notes recorded.\n\n`;
    } else {
      this.sessionData.notes.forEach((note, index) => {
        if (note.type) {
          doc += `### ${note.type.charAt(0).toUpperCase() + note.type.slice(1)}\n`;
          doc += `${note.content}\n`;
          doc += `*${note.timestamp}*\n\n`;
        } else if (note.hash) {
          doc += `### Commit Note: ${note.hash.substring(0, 8)}\n`;
          doc += `**${note.subject}**\n`;
          doc += `${note.note}\n`;
          doc += `*${note.timestamp}*\n\n`;
        }
      });
    }

    doc += `## 📊 Session Statistics\n\n`;
    doc += `- **Total Analysis Time**: Session duration varies\n`;
    doc += `- **Decisions Made**: ${this.sessionData.decisionsCount}\n`;
    doc += `- **Action Items Created**: ${this.sessionData.actionItemsCount}\n`;
    doc += `- **Notes Recorded**: ${this.sessionData.notesCount}\n`;
    doc += `- **High-Priority Extractions**: ${this.sessionData.extractionCandidates.filter(e => e.decision.priority === 'high').length}\n\n`;

    doc += `---\n*Analysis completed with Analysis Session Automation*`;

    return doc;
  }

  /**
   * Generate session summary
   */
  generateSessionSummary() {
    const session = this.sessionData.sessionMetadata;
    const extractionsByPriority = {
      high: this.sessionData.extractionCandidates.filter(e => e.decision.priority === 'high').length,
      medium: this.sessionData.extractionCandidates.filter(e => e.decision.priority === 'medium').length,
      low: this.sessionData.extractionCandidates.filter(e => e.decision.priority === 'low').length
    };

    let summary = `# Analysis Session Summary\n\n`;
    summary += `**Session**: ${session.sessionId} (${session.sessionType})\n`;
    summary += `**Date**: ${session.sessionDate}\n`;
    summary += `**Focus**: ${session.focusArea}\n\n`;

    summary += `## Key Outcomes\n`;
    summary += `- 📊 **${this.sessionData.summary.totalCommits} commits** analyzed\n`;
    summary += `- 🎯 **${this.sessionData.decisionsCount} decisions** made\n`;
    summary += `- ⭐ **${this.sessionData.extractionCandidates.length} extractions** identified\n`;
    summary += `- 📋 **${this.sessionData.actionItemsCount} action items** created\n\n`;

    summary += `## Extraction Priority Breakdown\n`;
    summary += `- 🔴 High: ${extractionsByPriority.high}\n`;
    summary += `- 🟡 Medium: ${extractionsByPriority.medium}\n`;
    summary += `- 🟢 Low: ${extractionsByPriority.low}\n\n`;

    if (this.sessionData.actionItems.length > 0) {
      summary += `## Next Steps\n`;
      this.sessionData.actionItems.slice(0, 5).forEach((item, index) => {
        summary += `${index + 1}. ${item.description} (${item.assignee})\n`;
      });
      if (this.sessionData.actionItems.length > 5) {
        summary += `... and ${this.sessionData.actionItems.length - 5} more action items\n`;
      }
    }

    return summary;
  }

  /**
   * Create GitHub issues for extraction candidates
   */
  async createIssuesForExtractionCandidates() {
    if (!this.octokit) {
      console.log('⚠️ Skipping GitHub issue creation - no token available');
      return;
    }

    console.log('🎫 Creating GitHub issues for extraction candidates...');

    const highPriorityExtractions = this.sessionData.extractionCandidates
      .filter(e => e.decision.priority === 'high');

    if (highPriorityExtractions.length === 0) {
      console.log('ℹ️ No high-priority extraction candidates found');
      return;
    }

    const createdIssues = [];

    for (const extraction of highPriorityExtractions) {
      try {
        const decision = extraction.decision;
        const issueTitle = `[Extraction] ${decision.subject}`;
        const issueBody = this.generateExtractionIssueBody(decision);

        // Create the issue (would need repo owner/name from config)
        const issue = await this.octokit.rest.issues.create({
          owner: process.env.GITHUB_REPOSITORY_OWNER || 'owner', // Configure as needed
          repo: process.env.GITHUB_REPOSITORY_NAME || 'repo',     // Configure as needed
          title: issueTitle,
          body: issueBody,
          labels: ['upstream-extraction', 'high-priority']
        });

        createdIssues.push({
          number: issue.data.number,
          title: issueTitle,
          url: issue.data.html_url,
          commitHash: decision.hash
        });

        console.log(`✅ Created issue #${issue.data.number}: ${decision.hash.substring(0, 8)}`);

      } catch (error) {
        console.error(`❌ Failed to create issue for ${decision.hash}:`, error.message);
      }
    }

    // Save issue tracking data
    if (createdIssues.length > 0) {
      const issueTrackingPath = path.join(__dirname, '..', 'analysis-sessions',
        `${this.sessionData.sessionMetadata.sessionId}-issues.json`);
      await fs.writeFile(issueTrackingPath, JSON.stringify(createdIssues, null, 2));
    }

    console.log(`✅ Created ${createdIssues.length} GitHub issues`);
  }

  /**
   * Generate issue body for extraction candidate
   */
  generateExtractionIssueBody(decision) {
    let body = `## Upstream Extraction Candidate\n\n`;

    body += `**Commit**: \`${decision.hash}\`\n`;
    body += `**Subject**: ${decision.subject}\n`;
    body += `**Priority**: ${decision.priority}\n`;
    body += `**Session**: ${this.sessionData.sessionMetadata.sessionId}\n\n`;

    body += `### Analysis\n`;
    body += `${decision.reason}\n\n`;

    body += `### Implementation Tasks\n`;
    body += `- [ ] Review upstream commit in detail\n`;
    body += `- [ ] Assess compatibility with local codebase\n`;
    body += `- [ ] Plan implementation approach\n`;
    body += `- [ ] Create implementation branch\n`;
    body += `- [ ] Implement changes\n`;
    body += `- [ ] Test thoroughly\n`;
    body += `- [ ] Document changes\n`;
    body += `- [ ] Create pull request\n\n`;

    body += `### Links\n`;
    body += `- [Upstream Commit](https://github.com/vitali87/code-graph-rag/commit/${decision.hash})\n`;
    body += `- [Analysis Session](${this.getSessionDocumentUrl()})\n\n`;

    body += `---\n`;
    body += `*Created automatically from analysis session ${this.sessionData.sessionMetadata.sessionId}*`;

    return body;
  }

  /**
   * Get URL for session document
   */
  getSessionDocumentUrl() {
    // This would need to be configured based on the actual repository structure
    const sessionId = this.sessionData.sessionMetadata.sessionId;
    return `https://github.com/owner/repo/blob/analysis/${sessionId}/.github/analysis-sessions/${sessionId}-final-analysis.md`;
  }

  /**
   * Update dashboard with session results
   */
  async updateDashboard() {
    console.log('📊 Updating dashboard...');

    // Create dashboard update data
    const dashboardUpdate = {
      sessionId: this.sessionData.sessionMetadata.sessionId,
      sessionDate: this.sessionData.sessionMetadata.sessionDate,
      sessionType: this.sessionData.sessionMetadata.sessionType,
      focusArea: this.sessionData.sessionMetadata.focusArea,
      completedAt: this.sessionData.completedAt,
      metrics: {
        commitsAnalyzed: this.sessionData.summary.totalCommits,
        decisionsCount: this.sessionData.decisionsCount,
        actionItemsCount: this.sessionData.actionItemsCount,
        extractionCandidates: this.sessionData.extractionCandidates.length,
        highPriorityExtractions: this.sessionData.extractionCandidates.filter(e => e.decision.priority === 'high').length
      },
      extractionBreakdown: {
        high: this.sessionData.extractionCandidates.filter(e => e.decision.priority === 'high').length,
        medium: this.sessionData.extractionCandidates.filter(e => e.decision.priority === 'medium').length,
        low: this.sessionData.extractionCandidates.filter(e => e.decision.priority === 'low').length
      }
    };

    // Save dashboard update
    const dashboardPath = path.join(__dirname, '..', 'analysis-sessions', 'dashboard-updates.json');

    let dashboardData = [];
    try {
      const existingData = await fs.readFile(dashboardPath, 'utf8');
      dashboardData = JSON.parse(existingData);
    } catch (error) {
      // File doesn't exist yet, start with empty array
    }

    dashboardData.push(dashboardUpdate);

    // Keep only the last 50 sessions
    if (dashboardData.length > 50) {
      dashboardData = dashboardData.slice(-50);
    }

    await fs.writeFile(dashboardPath, JSON.stringify(dashboardData, null, 2));

    console.log('✅ Dashboard updated');
  }

  /**
   * Archive session data
   */
  async archiveSession() {
    console.log('📦 Archiving session...');

    const sessionId = this.sessionData.sessionMetadata.sessionId;
    const archiveDir = path.join(__dirname, '..', 'analysis-sessions', 'archive');

    // Ensure archive directory exists
    await fs.mkdir(archiveDir, { recursive: true });

    // Create archive package
    const archiveData = {
      sessionMetadata: this.sessionData.sessionMetadata,
      summary: this.sessionData.summary,
      decisions: this.sessionData.decisions,
      actionItems: this.sessionData.actionItems,
      notes: this.sessionData.notes,
      extractionCandidates: this.sessionData.extractionCandidates,
      completedAt: this.sessionData.completedAt,
      archivedAt: new Date().toISOString()
    };

    const archivePath = path.join(archiveDir, `${sessionId}-archive.json`);
    await fs.writeFile(archivePath, JSON.stringify(archiveData, null, 2));

    console.log(`✅ Session archived: ${archivePath}`);
  }
}

/**
 * CLI Interface
 */
async function setupCLI() {
  program
    .name('post-session')
    .description('Post-session processing automation')
    .version('1.0.0');

  program
    .command('process')
    .description('Process a completed analysis session')
    .argument('<session-report>', 'Path to session final report JSON file')
    .action(async (sessionReportPath) => {
      const processor = new PostSessionProcessor();
      await processor.initialize();
      await processor.processSession(sessionReportPath);
    });

  program
    .command('create-issues')
    .description('Create GitHub issues for extraction candidates only')
    .argument('<session-report>', 'Path to session final report JSON file')
    .action(async (sessionReportPath) => {
      const processor = new PostSessionProcessor();
      await processor.initialize();

      const reportData = await fs.readFile(sessionReportPath, 'utf8');
      processor.sessionData = JSON.parse(reportData);

      await processor.createIssuesForExtractionCandidates();
    });

  program
    .command('update-dashboard')
    .description('Update dashboard with session results only')
    .argument('<session-report>', 'Path to session final report JSON file')
    .action(async (sessionReportPath) => {
      const processor = new PostSessionProcessor();
      await processor.initialize();

      const reportData = await fs.readFile(sessionReportPath, 'utf8');
      processor.sessionData = JSON.parse(reportData);

      await processor.updateDashboard();
    });

  program.parse();
}

// Run CLI if called directly
if (require.main === module) {
  setupCLI();
}

module.exports = { PostSessionProcessor };
