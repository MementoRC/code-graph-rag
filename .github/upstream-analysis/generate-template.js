#!/usr/bin/env node

/**
 * Template Generation Script
 * 
 * Generates analysis session documentation from templates with upstream data
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const handlebars = require('handlebars');
const { program } = require('commander');
const yaml = require('js-yaml');

// Import the analyzer for data generation
const { UpstreamAnalyzer } = require('./analyze-changes');

class TemplateGenerator {
  constructor() {
    this.templatesDir = path.join(__dirname, 'templates');
    this.outputDir = path.join(__dirname, 'sessions');
    this.config = null;
    this.analyzer = null;
  }

  /**
   * Initialize the template generator
   */
  async initialize() {
    console.log('🔧 Initializing template generator...');
    
    // Load configuration
    const configPath = path.join(__dirname, 'config.yml');
    try {
      const configFile = await fs.readFile(configPath, 'utf8');
      this.config = yaml.load(configFile);
    } catch (error) {
      console.error('❌ Failed to load configuration:', error.message);
      process.exit(1);
    }

    // Initialize analyzer
    this.analyzer = new UpstreamAnalyzer();
    await this.analyzer.initialize();

    // Ensure output directory exists
    await fs.mkdir(this.outputDir, { recursive: true });

    // Register handlebars helpers
    this.registerHelpers();

    console.log('✅ Template generator initialized');
  }

  /**
   * Register Handlebars helpers
   */
  registerHelpers() {
    // Equality helper
    handlebars.registerHelper('eq', function(a, b) {
      return a === b;
    });

    // Date formatting helper
    handlebars.registerHelper('formatDate', function(date) {
      return new Date(date).toISOString().split('T')[0];
    });

    // Capitalize helper
    handlebars.registerHelper('capitalize', function(str) {
      return str.charAt(0).toUpperCase() + str.slice(1);
    });

    // JSON helper for debugging
    handlebars.registerHelper('json', function(context) {
      return JSON.stringify(context, null, 2);
    });

    // Truncate helper
    handlebars.registerHelper('truncate', function(str, length) {
      if (str && str.length > length) {
        return str.substring(0, length) + '...';
      }
      return str;
    });

    console.log('📝 Handlebars helpers registered');
  }

  /**
   * Create a new analysis branch
   */
  async createAnalysisBranch(branchDate) {
    const branchName = `analysis/${branchDate}`;
    
    try {
      console.log(`🌿 Creating analysis branch: ${branchName}`);
      
      // Ensure we're starting from the right base
      execSync('git fetch upstream', { cwd: process.cwd() });
      execSync('git checkout upstream-mirror', { cwd: process.cwd() });
      
      // Create and checkout the analysis branch
      execSync(`git checkout -b ${branchName}`, { cwd: process.cwd() });
      
      console.log(`✅ Analysis branch created: ${branchName}`);
      return branchName;
    } catch (error) {
      console.error(`❌ Failed to create analysis branch: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get upstream analysis data
   */
  async getAnalysisData(fromRef, toRef) {
    console.log('📊 Gathering analysis data...');
    
    try {
      const result = await this.analyzer.analyzeChanges(fromRef, toRef);
      
      if (!result.success) {
        throw new Error('Analysis failed');
      }

      return result;
    } catch (error) {
      console.error('❌ Failed to get analysis data:', error.message);
      throw error;
    }
  }

  /**
   * Enhance analysis data with additional context
   */
  enhanceAnalysisData(analysisData, options = {}) {
    const { summary, analyzedCommits } = analysisData;
    const now = new Date();
    const branchDate = options.branchDate || now.toISOString().split('T')[0];
    
    // Get repository URLs (assuming GitHub)
    let repoUrl = 'https://github.com/vitali87/code-graph-rag';
    let localRepoUrl = 'https://github.com/MementoRC/code-graph-rag';
    
    try {
      const remoteOrigin = execSync('git remote get-url origin', { 
        encoding: 'utf8', 
        cwd: process.cwd() 
      }).trim();
      const match = remoteOrigin.match(/github\.com[/:](.*?)\/(.*)\.git/);
      if (match) {
        localRepoUrl = `https://github.com/${match[1]}/${match[2]}`;
      }
    } catch (error) {
      console.warn('⚠️ Could not determine local repository URL');
    }

    // Enhanced data structure
    const enhancedData = {
      // Session metadata
      sessionDate: now.toISOString().split('T')[0],
      branchDate,
      sessionTime: now.toTimeString().split(' ')[0],
      leadAnalyst: options.leadAnalyst || 'TBD',
      participants: options.participants || ['TBD'],
      sessionDuration: options.duration || 'TBD',
      
      // Repository info
      repoUrl,
      localRepoUrl,
      upstreamCommit: options.toRef || 'HEAD',
      previousCommit: options.fromRef || 'HEAD~1',
      
      // Analysis data
      totalCommits: summary.totalCommits,
      totalFiles: summary.totalFiles,
      significanceScore: summary.totalSignificance,
      changeLevel: summary.changeLevel,
      categories: summary.categories,
      
      // Enhanced commits data
      topCommits: summary.topCommits.slice(0, 10).map(commit => ({
        hash: commit.hash.substring(0, 8),
        subject: commit.subject,
        category: commit.category,
        significance: commit.significance,
        author: commit.author,
        date: commit.date,
        fileCount: commit.fileCount
      })),
      
      // Category analysis
      categoryAnalysis: Object.entries(summary.categories).map(([category, data]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        count: data.count,
        significance: data.significance,
        description: this.getCategoryDescription(category),
        keyCommits: data.commits.slice(0, 3).map(commit => ({
          hash: commit.hash.substring(0, 8),
          subject: commit.subject,
          author: commit.author,
          fileCount: commit.fileCount,
          impact: this.assessCommitImpact(commit),
          filesChanged: commit.files ? commit.files.slice(0, 5) : [],
          notes: ''
        }))
      })),
      
      // Template placeholders for manual completion
      highImpactAreas: this.generatePlaceholderImpactAreas('high'),
      mediumImpactAreas: this.generatePlaceholderImpactAreas('medium'),
      lowImpactAreas: this.generatePlaceholderImpactAreas('low'),
      
      // Extraction candidates based on significance
      highPriorityExtractions: this.generateExtractionCandidates(analyzedCommits, 'high'),
      mediumPriorityExtractions: this.generateExtractionCandidates(analyzedCommits, 'medium'),
      lowPriorityExtractions: this.generateExtractionCandidates(analyzedCommits, 'low'),
      
      // Placeholder sections
      immediateActions: [],
      deferredDecisions: [],
      rejectedExtractions: [],
      developmentTasks: [],
      researchTasks: [],
      testingTasks: [],
      documentationTasks: [],
      
      // Reference data
      documentationLinks: [
        {
          title: 'Upstream Analysis Strategy',
          url: `${localRepoUrl}/blob/main/docs/upstream-analysis-strategy.md`,
          description: 'Overall strategy document'
        }
      ],
      
      // Session objectives (placeholder)
      sessionObjectives: [
        {
          objective: 'Analyze all significant upstream changes',
          completed: false,
          status: 'In Progress'
        },
        {
          objective: 'Identify high-priority extraction candidates',
          completed: false,
          status: 'Pending'
        }
      ],
      
      // Quality gates
      qualityGates: {
        completeCoverage: false,
        consensusReached: false,
        actionItemsAssigned: false,
        risksIdentified: false,
        documentationComplete: false
      },
      
      // Follow-up
      followupMilestones: [],
      nextReviewDate: 'TBD',
      progressCheckDate: 'TBD',
      integrationReviewDate: 'TBD',
      
      // Meta
      completionTime: now.toISOString(),
      generationTime: now.toISOString(),
      templateVersion: '1.0.0',
      
      // Process notes (placeholder)
      positives: ['Template generated successfully'],
      improvements: ['Manual completion required'],
      processRefinements: []
    };

    return enhancedData;
  }

  /**
   * Get description for a category
   */
  getCategoryDescription(category) {
    const descriptions = {
      feature: 'New functionality and enhancements',
      bugfix: 'Bug fixes and corrections',
      security: 'Security-related changes and vulnerabilities',
      performance: 'Performance improvements and optimizations',
      breaking: 'Breaking changes requiring attention',
      refactor: 'Code restructuring and improvements',
      config: 'Configuration and setup changes',
      docs: 'Documentation updates',
      test: 'Testing improvements and additions'
    };
    
    return descriptions[category] || 'Miscellaneous changes';
  }

  /**
   * Assess commit impact
   */
  assessCommitImpact(commit) {
    if (commit.significance >= 8) return 'High';
    if (commit.significance >= 5) return 'Medium';
    return 'Low';
  }

  /**
   * Generate placeholder impact areas
   */
  generatePlaceholderImpactAreas(level) {
    return [
      {
        area: `${level.charAt(0).toUpperCase() + level.slice(1)} Impact Area (TBD)`,
        description: 'Description needed - analyze during session',
        components: ['TBD'],
        riskLevel: level,
        mitigation: 'To be determined',
        considerations: 'To be analyzed'
      }
    ];
  }

  /**
   * Generate extraction candidates based on commits
   */
  generateExtractionCandidates(commits, priority) {
    const priorityRanges = {
      high: { min: 8, max: 10 },
      medium: { min: 5, max: 7 },
      low: { min: 1, max: 4 }
    };
    
    const range = priorityRanges[priority];
    const candidates = commits
      .filter(commit => commit.significance >= range.min && commit.significance <= range.max)
      .slice(0, priority === 'high' ? 3 : 2)
      .map(commit => ({
        title: `Extract: ${commit.subject}`,
        significance: commit.significance,
        commits: [{ hash: commit.hash.substring(0, 8) }],
        description: `${commit.category} change: ${commit.subject}`,
        localBenefit: 'To be determined during analysis',
        effort: 'TBD',
        dependencies: null,
        risks: 'To be assessed',
        integrationStrategy: 'To be planned'
      }));
    
    return candidates;
  }

  /**
   * Generate template from analysis data
   */
  async generateFromTemplate(templateName, data, outputName) {
    console.log(`📝 Generating ${outputName} from ${templateName}...`);
    
    try {
      // Read template file
      const templatePath = path.join(this.templatesDir, `${templateName}.md`);
      const templateContent = await fs.readFile(templatePath, 'utf8');
      
      // Compile template
      const template = handlebars.compile(templateContent);
      
      // Generate content
      const content = template(data);
      
      // Write output file
      const outputPath = path.join(this.outputDir, `${outputName}.md`);
      await fs.writeFile(outputPath, content);
      
      console.log(`✅ Generated: ${outputPath}`);
      return outputPath;
    } catch (error) {
      console.error(`❌ Failed to generate ${outputName}:`, error.message);
      throw error;
    }
  }

  /**
   * Generate all templates for an analysis session
   */
  async generateSession(fromRef, toRef, options = {}) {
    console.log('🚀 Starting session template generation...');
    
    try {
      // Get analysis data
      const analysisData = await this.getAnalysisData(fromRef, toRef);
      
      // Create branch date
      const branchDate = options.branchDate || new Date().toISOString().split('T')[0];
      
      // Create analysis branch if requested
      if (options.createBranch) {
        await this.createAnalysisBranch(branchDate);
      }
      
      // Enhance data with template context
      const templateData = this.enhanceAnalysisData(analysisData, {
        ...options,
        branchDate,
        fromRef,
        toRef
      });
      
      // Generate templates
      const outputs = {};
      
      // Full analysis session
      outputs.fullAnalysis = await this.generateFromTemplate(
        'analysis-session',
        templateData,
        `analysis-session-${branchDate}`
      );
      
      // Quick summary
      outputs.quickSummary = await this.generateFromTemplate(
        'quick-summary',
        templateData,
        `quick-summary-${branchDate}`
      );
      
      console.log('🎉 Session templates generated successfully!');
      
      return {
        success: true,
        branchDate,
        outputs,
        analysisData: templateData
      };
      
    } catch (error) {
      console.error('💥 Session generation failed:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * CLI Interface
 */
async function setupCLI() {
  program
    .name('generate-template')
    .description('Generate upstream analysis session templates')
    .version('1.0.0');

  program
    .command('session')
    .description('Generate analysis session templates')
    .argument('<from-ref>', 'Starting commit reference')
    .argument('<to-ref>', 'Ending commit reference')
    .option('-b, --branch', 'Create analysis branch')
    .option('-d, --date <date>', 'Branch date (YYYY-MM-DD)')
    .option('-l, --lead <name>', 'Lead analyst name')
    .option('-p, --participants <names>', 'Comma-separated participant names')
    .option('--duration <time>', 'Session duration')
    .option('--json', 'Output JSON result')
    .action(async (fromRef, toRef, options) => {
      const generator = new TemplateGenerator();
      await generator.initialize();
      
      const sessionOptions = {
        createBranch: options.branch,
        branchDate: options.date,
        leadAnalyst: options.lead,
        participants: options.participants ? options.participants.split(',') : undefined,
        duration: options.duration
      };
      
      const result = await generator.generateSession(fromRef, toRef, sessionOptions);
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else if (result.success) {
        console.log('\n📋 Generation Summary:');
        console.log(`   • Branch Date: ${result.branchDate}`);
        console.log(`   • Full Analysis: ${result.outputs.fullAnalysis}`);
        console.log(`   • Quick Summary: ${result.outputs.quickSummary}`);
        console.log(`   • Significance Score: ${result.analysisData.significanceScore}`);
        console.log(`   • Change Level: ${result.analysisData.changeLevel}`);
      } else {
        console.error('❌ Generation failed:', result.error);
        process.exit(1);
      }
    });

  program
    .command('list-templates')
    .description('List available templates')
    .action(async () => {
      const generator = new TemplateGenerator();
      try {
        const files = await fs.readdir(generator.templatesDir);
        const templates = files.filter(f => f.endsWith('.md'));
        
        console.log('📝 Available Templates:');
        templates.forEach(template => {
          console.log(`   • ${template.replace('.md', '')}`);
        });
      } catch (error) {
        console.error('❌ Failed to list templates:', error.message);
      }
    });

  program.parse();
}

// Run CLI if called directly
if (require.main === module) {
  setupCLI();
}

module.exports = { TemplateGenerator };