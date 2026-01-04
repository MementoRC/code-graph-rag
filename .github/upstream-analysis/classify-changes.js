#!/usr/bin/env node

/**
 * Automated Change Classification System
 *
 * Intelligently classifies upstream changes by type and relevance to local codebase
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

// Optional NLP dependencies (graceful degradation if not available)
let natural, compromise;
try {
  natural = require('natural');
} catch (error) {
  console.warn('⚠️ Natural.js not available, using basic text analysis');
}

try {
  compromise = require('compromise');
} catch (error) {
  console.warn('⚠️ Compromise not available, using basic NLP');
}

class ChangeClassifier {
  constructor() {
    this.config = null;
    this.classificationRules = null;
    this.relevanceScorers = null;
    this.trainingData = [];
    this.feedbackData = [];
  }

  /**
   * Initialize the classifier with configuration and rules
   */
  async initialize() {
    console.log('🔧 Initializing change classifier...');

    // Load main configuration
    const configPath = path.join(__dirname, 'config.yml');
    try {
      const configFile = await fs.readFile(configPath, 'utf8');
      this.config = yaml.load(configFile);
    } catch (error) {
      console.error('❌ Failed to load configuration:', error.message);
      process.exit(1);
    }

    // Load classification configuration
    await this.loadClassificationConfig();

    // Initialize NLP components if available
    if (natural) {
      this.initializeNLP();
    }

    // Load training data if available
    await this.loadTrainingData();

    console.log('✅ Change classifier initialized');
  }

  /**
   * Load classification-specific configuration
   */
  async loadClassificationConfig() {
    const classificationConfigPath = path.join(__dirname, 'classification-config.yml');

    try {
      const configFile = await fs.readFile(classificationConfigPath, 'utf8');
      const classificationConfig = yaml.load(configFile);

      this.classificationRules = classificationConfig.classification_rules;
      this.relevanceScorers = classificationConfig.relevance_scoring;

      console.log('✅ Classification configuration loaded');
    } catch (error) {
      console.warn('⚠️ Classification config not found, using defaults');
      this.createDefaultClassificationConfig();
    }
  }

  /**
   * Create default classification configuration
   */
  createDefaultClassificationConfig() {
    this.classificationRules = {
      feature: {
        keywords: ['feat', 'feature', 'add', 'new', 'implement', 'introduce'],
        file_patterns: ['*.py', '*.js', '*.ts', '*.rs', '*.go'],
        negative_keywords: ['fix', 'bug', 'remove', 'delete'],
        weight: 1.0,
        confidence_threshold: 0.6
      },
      bugfix: {
        keywords: ['fix', 'bug', 'patch', 'resolve', 'correct', 'repair'],
        file_patterns: ['*.py', '*.js', '*.ts', '*.rs', '*.go'],
        negative_keywords: ['feat', 'feature', 'add'],
        weight: 1.0,
        confidence_threshold: 0.7
      },
      security: {
        keywords: ['security', 'vulnerability', 'cve', 'exploit', 'patch', 'auth'],
        file_patterns: ['*auth*', '*security*', '*.py', '*.js'],
        negative_keywords: [],
        weight: 1.5,
        confidence_threshold: 0.5
      },
      performance: {
        keywords: ['perf', 'performance', 'optimize', 'speed', 'fast', 'cache'],
        file_patterns: ['*.py', '*.js', '*.ts', '*.rs', '*.go'],
        negative_keywords: [],
        weight: 1.2,
        confidence_threshold: 0.6
      },
      refactor: {
        keywords: ['refactor', 'restructure', 'reorganize', 'cleanup', 'simplify'],
        file_patterns: ['*.py', '*.js', '*.ts', '*.rs', '*.go'],
        negative_keywords: ['feat', 'feature', 'fix', 'bug'],
        weight: 0.8,
        confidence_threshold: 0.6
      },
      documentation: {
        keywords: ['docs', 'documentation', 'readme', 'comment', 'docstring'],
        file_patterns: ['*.md', '*.rst', '*.txt', 'docs/**'],
        negative_keywords: [],
        weight: 0.5,
        confidence_threshold: 0.4
      },
      build: {
        keywords: ['build', 'ci', 'deploy', 'release', 'workflow', 'action'],
        file_patterns: ['.github/**', '*.yml', '*.yaml', 'Dockerfile', '*.toml'],
        negative_keywords: [],
        weight: 0.6,
        confidence_threshold: 0.5
      },
      test: {
        keywords: ['test', 'testing', 'spec', 'unittest', 'pytest'],
        file_patterns: ['test_*.py', '*_test.py', 'tests/**', '*.test.js'],
        negative_keywords: [],
        weight: 0.7,
        confidence_threshold: 0.6
      }
    };

    this.relevanceScorers = {
      file_overlap: {
        weight: 0.4,
        local_extensions: ['.py', '.js', '.ts', '.md', '.yml'],
        core_directories: ['src/', 'codebase_rag/', 'tests/']
      },
      functionality_impact: {
        weight: 0.3,
        core_keywords: ['graph', 'query', 'parse', 'rag', 'database', 'api'],
        impact_multiplier: 1.5
      },
      roadmap_alignment: {
        weight: 0.3,
        priority_keywords: ['performance', 'security', 'api', 'ui'],
        alignment_bonus: 1.2
      }
    };
  }

  /**
   * Initialize NLP components
   */
  initializeNLP() {
    if (!natural) return;

    // Initialize stemmer for keyword matching
    this.stemmer = natural.PorterStemmer;

    // Initialize tokenizer
    this.tokenizer = new natural.WordTokenizer();

    // Initialize sentiment analyzer (for change impact assessment)
    if (natural.SentimentAnalyzer && natural.PorterStemmer) {
      this.sentimentAnalyzer = new natural.SentimentAnalyzer('English',
        natural.PorterStemmer, 'afinn');
    }

    console.log('✅ NLP components initialized');
  }

  /**
   * Load training data for improved classification
   */
  async loadTrainingData() {
    const trainingDataPath = path.join(__dirname, 'training-data.json');

    try {
      const trainingFile = await fs.readFile(trainingDataPath, 'utf8');
      this.trainingData = JSON.parse(trainingFile);
      console.log(`✅ Loaded ${this.trainingData.length} training examples`);
    } catch (error) {
      console.log('ℹ️ No training data found, starting with rule-based classification');
      this.trainingData = [];
    }
  }

  /**
   * Classify a single commit
   */
  classifyCommit(commit) {
    console.log(`🔍 Classifying commit: ${commit.hash.substring(0, 8)} - ${commit.subject}`);

    const classifications = {};
    let bestMatch = { category: 'other', confidence: 0.0, scores: {} };

    // Analyze each category
    for (const [category, rules] of Object.entries(this.classificationRules)) {
      const classification = this.analyzeCommitForCategory(commit, category, rules);
      classifications[category] = classification;

      if (classification.confidence > bestMatch.confidence &&
          classification.confidence >= rules.confidence_threshold) {
        bestMatch = {
          category,
          confidence: classification.confidence,
          scores: classification.scores,
          reasons: classification.reasons
        };
      }
    }

    // Calculate relevance score
    const relevanceScore = this.calculateRelevanceScore(commit, bestMatch.category);

    return {
      category: bestMatch.category,
      confidence: bestMatch.confidence,
      relevance: relevanceScore,
      allScores: classifications,
      reasoning: bestMatch.reasons || [],
      metadata: {
        hasFiles: commit.files && commit.files.length > 0,
        fileCount: commit.files ? commit.files.length : 0,
        subjectLength: commit.subject.length,
        authorDomain: this.extractAuthorDomain(commit.email || ''),
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Analyze commit for a specific category
   */
  analyzeCommitForCategory(commit, category, rules) {
    const scores = {
      keyword: 0,
      filePattern: 0,
      negativeKeyword: 0,
      nlp: 0
    };

    const reasons = [];

    // Keyword analysis
    const subjectLower = commit.subject.toLowerCase();
    const keywordMatches = rules.keywords.filter(keyword =>
      subjectLower.includes(keyword.toLowerCase())
    );

    if (keywordMatches.length > 0) {
      scores.keyword = Math.min(keywordMatches.length / rules.keywords.length, 1.0);
      reasons.push(`Keywords: ${keywordMatches.join(', ')}`);
    }

    // Negative keyword penalty
    const negativeMatches = rules.negative_keywords.filter(keyword =>
      subjectLower.includes(keyword.toLowerCase())
    );

    if (negativeMatches.length > 0) {
      scores.negativeKeyword = -0.3 * negativeMatches.length;
      reasons.push(`Negative keywords: ${negativeMatches.join(', ')}`);
    }

    // File pattern analysis
    if (commit.files && commit.files.length > 0) {
      const matchingFiles = commit.files.filter(file =>
        this.matchesFilePatterns(file.path, rules.file_patterns)
      );

      if (matchingFiles.length > 0) {
        scores.filePattern = matchingFiles.length / commit.files.length;
        reasons.push(`File patterns: ${matchingFiles.length}/${commit.files.length} files match`);
      }
    }

    // NLP analysis (if available)
    if (natural && this.tokenizer) {
      scores.nlp = this.performNLPAnalysis(commit.subject, category);
      if (scores.nlp > 0.1) {
        reasons.push(`NLP analysis: ${scores.nlp.toFixed(2)} confidence`);
      }
    }

    // Calculate weighted confidence
    const weights = {
      keyword: 0.4,
      filePattern: 0.3,
      negativeKeyword: 1.0,  // Full penalty
      nlp: 0.3
    };

    const confidence = Math.max(0,
      (scores.keyword * weights.keyword) +
      (scores.filePattern * weights.filePattern) +
      (scores.negativeKeyword * weights.negativeKeyword) +
      (scores.nlp * weights.nlp)
    ) * rules.weight;

    return {
      confidence: Math.min(confidence, 1.0),
      scores,
      reasons
    };
  }

  /**
   * Check if file path matches any of the patterns
   */
  matchesFilePatterns(filePath, patterns) {
    return patterns.some(pattern => {
      // Convert glob pattern to regex
      const regexPattern = pattern
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');

      const regex = new RegExp(regexPattern, 'i');
      return regex.test(filePath);
    });
  }

  /**
   * Perform NLP analysis on commit subject
   */
  performNLPAnalysis(subject, category) {
    if (!natural || !this.tokenizer) return 0;

    try {
      // Tokenize and stem words
      const tokens = this.tokenizer.tokenize(subject.toLowerCase());
      const stemmedTokens = tokens.map(token => this.stemmer.stem(token));

      // Get category keywords and stem them
      const categoryRules = this.classificationRules[category];
      const stemmedKeywords = categoryRules.keywords.map(keyword =>
        this.stemmer.stem(keyword.toLowerCase())
      );

      // Calculate similarity using Jaccard index
      const intersection = stemmedTokens.filter(token =>
        stemmedKeywords.includes(token)
      );

      const union = [...new Set([...stemmedTokens, ...stemmedKeywords])];

      if (union.length === 0) return 0;

      const similarity = intersection.length / union.length;

      // Boost for compromise.js named entity recognition (if available)
      if (compromise) {
        const doc = compromise(subject);
        const entities = doc.match('#Noun').out('array');

        // Check if entities match category context
        const contextBoost = entities.some(entity =>
          categoryRules.keywords.some(keyword =>
            entity.toLowerCase().includes(keyword.toLowerCase())
          )
        ) ? 0.2 : 0;

        return Math.min(similarity + contextBoost, 1.0);
      }

      return similarity;
    } catch (error) {
      console.warn('⚠️ NLP analysis failed:', error.message);
      return 0;
    }
  }

  /**
   * Calculate relevance score to local codebase
   */
  calculateRelevanceScore(commit, category) {
    const scorers = this.relevanceScorers;
    let totalScore = 0;

    // File overlap score
    const fileOverlapScore = this.calculateFileOverlapScore(commit, scorers.file_overlap);
    totalScore += fileOverlapScore * scorers.file_overlap.weight;

    // Functionality impact score
    const functionalityScore = this.calculateFunctionalityImpactScore(commit, scorers.functionality_impact);
    totalScore += functionalityScore * scorers.functionality_impact.weight;

    // Roadmap alignment score
    const roadmapScore = this.calculateRoadmapAlignmentScore(commit, category, scorers.roadmap_alignment);
    totalScore += roadmapScore * scorers.roadmap_alignment.weight;

    return Math.min(totalScore, 1.0);
  }

  /**
   * Calculate file overlap score with local codebase
   */
  calculateFileOverlapScore(commit, config) {
    if (!commit.files || commit.files.length === 0) return 0;

    const relevantFiles = commit.files.filter(file => {
      // Check extension relevance
      const hasRelevantExtension = config.local_extensions.some(ext =>
        file.path.toLowerCase().endsWith(ext)
      );

      // Check directory relevance
      const inCoreDirectory = config.core_directories.some(dir =>
        file.path.toLowerCase().startsWith(dir.toLowerCase())
      );

      return hasRelevantExtension || inCoreDirectory;
    });

    return relevantFiles.length / commit.files.length;
  }

  /**
   * Calculate functionality impact score
   */
  calculateFunctionalityImpactScore(commit, config) {
    const subjectLower = commit.subject.toLowerCase();

    // Check for core functionality keywords
    const coreKeywordMatches = config.core_keywords.filter(keyword =>
      subjectLower.includes(keyword.toLowerCase())
    );

    if (coreKeywordMatches.length === 0) return 0.1; // Baseline relevance

    const baseScore = Math.min(coreKeywordMatches.length / config.core_keywords.length, 1.0);
    return baseScore * config.impact_multiplier;
  }

  /**
   * Calculate roadmap alignment score
   */
  calculateRoadmapAlignmentScore(commit, category, config) {
    const subjectLower = commit.subject.toLowerCase();

    // Check for priority keywords
    const priorityMatches = config.priority_keywords.filter(keyword =>
      subjectLower.includes(keyword.toLowerCase())
    );

    let score = priorityMatches.length > 0 ? 0.8 : 0.3; // Base alignment

    // Category-specific bonuses
    const highPriorityCategories = ['security', 'performance', 'bugfix'];
    if (highPriorityCategories.includes(category)) {
      score *= config.alignment_bonus;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Extract author domain for pattern analysis
   */
  extractAuthorDomain(email) {
    if (!email || !email.includes('@')) return 'unknown';
    return email.split('@')[1].toLowerCase();
  }

  /**
   * Classify multiple commits in batch
   */
  classifyCommits(commits) {
    console.log(`🔍 Classifying ${commits.length} commits...`);

    const classifications = commits.map(commit => ({
      ...commit,
      classification: this.classifyCommit(commit)
    }));

    // Generate batch statistics
    const stats = this.generateClassificationStats(classifications);

    return {
      classifications,
      stats,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate classification statistics
   */
  generateClassificationStats(classifications) {
    const categoryCount = {};
    const confidenceDistribution = {
      high: 0,    // >= 0.8
      medium: 0,  // 0.5 - 0.8
      low: 0      // < 0.5
    };
    const relevanceDistribution = {
      high: 0,    // >= 0.7
      medium: 0,  // 0.4 - 0.7
      low: 0      // < 0.4
    };

    classifications.forEach(({ classification }) => {
      // Category count
      categoryCount[classification.category] = (categoryCount[classification.category] || 0) + 1;

      // Confidence distribution
      if (classification.confidence >= 0.8) {
        confidenceDistribution.high++;
      } else if (classification.confidence >= 0.5) {
        confidenceDistribution.medium++;
      } else {
        confidenceDistribution.low++;
      }

      // Relevance distribution
      if (classification.relevance >= 0.7) {
        relevanceDistribution.high++;
      } else if (classification.relevance >= 0.4) {
        relevanceDistribution.medium++;
      } else {
        relevanceDistribution.low++;
      }
    });

    return {
      totalCommits: classifications.length,
      categoryCount,
      confidenceDistribution,
      relevanceDistribution,
      averageConfidence: classifications.reduce((sum, c) => sum + c.classification.confidence, 0) / classifications.length,
      averageRelevance: classifications.reduce((sum, c) => sum + c.classification.relevance, 0) / classifications.length
    };
  }

  /**
   * Add feedback for classification improvement
   */
  addFeedback(commitHash, expectedCategory, actualCategory, confidence) {
    const feedback = {
      commitHash,
      expectedCategory,
      actualCategory,
      confidence,
      timestamp: new Date().toISOString(),
      correct: expectedCategory === actualCategory
    };

    this.feedbackData.push(feedback);

    // Save feedback for future training
    this.saveFeedback();

    console.log(`📝 Feedback recorded: ${commitHash} - Expected: ${expectedCategory}, Got: ${actualCategory}`);
  }

  /**
   * Save feedback data
   */
  async saveFeedback() {
    try {
      const feedbackPath = path.join(__dirname, 'classification-feedback.json');
      await fs.writeFile(feedbackPath, JSON.stringify(this.feedbackData, null, 2));
    } catch (error) {
      console.warn('⚠️ Failed to save feedback:', error.message);
    }
  }

  /**
   * Get classification accuracy from feedback
   */
  getAccuracyMetrics() {
    if (this.feedbackData.length === 0) {
      return { accuracy: 0, totalFeedback: 0, categoryAccuracy: {} };
    }

    const correct = this.feedbackData.filter(f => f.correct).length;
    const accuracy = correct / this.feedbackData.length;

    // Category-specific accuracy
    const categoryAccuracy = {};
    const categoryGroups = {};

    this.feedbackData.forEach(feedback => {
      if (!categoryGroups[feedback.expectedCategory]) {
        categoryGroups[feedback.expectedCategory] = { total: 0, correct: 0 };
      }
      categoryGroups[feedback.expectedCategory].total++;
      if (feedback.correct) {
        categoryGroups[feedback.expectedCategory].correct++;
      }
    });

    for (const [category, data] of Object.entries(categoryGroups)) {
      categoryAccuracy[category] = data.correct / data.total;
    }

    return {
      accuracy,
      totalFeedback: this.feedbackData.length,
      categoryAccuracy
    };
  }
}

module.exports = { ChangeClassifier };
