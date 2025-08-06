#!/usr/bin/env node

/**
 * Classification System Test Suite
 * 
 * Tests the automated change classification system with various scenarios
 */

const fs = require('fs').promises;
const path = require('path');
const { ChangeClassifier } = require('./classify-changes');

class ClassificationTester {
  constructor() {
    this.classifier = null;
    this.testResults = [];
    this.trainingData = [];
  }

  /**
   * Initialize the test environment
   */
  async initialize() {
    console.log('🧪 Initializing classification test suite...');
    
    // Initialize classifier
    this.classifier = new ChangeClassifier();
    await this.classifier.initialize();
    
    // Load training data for testing
    try {
      const trainingFile = await fs.readFile(
        path.join(__dirname, 'training-data.json'), 
        'utf8'
      );
      this.trainingData = JSON.parse(trainingFile);
      console.log(`✅ Loaded ${this.trainingData.length} training examples`);
    } catch (error) {
      console.warn('⚠️ Could not load training data:', error.message);
      this.trainingData = this.createTestData();
    }
    
    console.log('✅ Classification test suite initialized');
  }

  /**
   * Create test data if training data not available
   */
  createTestData() {
    return [
      {
        commitHash: 'test001',
        subject: 'feat: add new authentication system',
        author: 'Test Developer',
        files: [
          { path: 'src/auth/login.py', status: 'A' },
          { path: 'tests/test_auth.py', status: 'A' }
        ],
        expectedCategory: 'feature',
        confidence: 0.9,
        relevance: 0.8
      },
      {
        commitHash: 'test002',
        subject: 'fix: resolve memory leak in parser',
        author: 'Bug Fixer',
        files: [
          { path: 'src/parser.py', status: 'M' }
        ],
        expectedCategory: 'bugfix',
        confidence: 0.85,
        relevance: 0.9
      },
      {
        commitHash: 'test003',
        subject: 'docs: update README installation guide',
        author: 'Doc Writer',
        files: [
          { path: 'README.md', status: 'M' }
        ],
        expectedCategory: 'documentation',
        confidence: 0.9,
        relevance: 0.4
      }
    ];
  }

  /**
   * Test basic classification functionality
   */
  async testBasicClassification() {
    console.log('\n📋 Test 1: Basic Classification');
    
    let passed = 0;
    let total = 0;
    
    for (const testCase of this.trainingData.slice(0, 10)) {
      total++;
      
      const commit = {
        hash: testCase.commitHash,
        subject: testCase.subject,
        author: testCase.author,
        email: 'test@example.com',
        date: new Date(),
        files: testCase.files
      };
      
      try {
        const classification = this.classifier.classifyCommit(commit);
        const isCorrect = classification.category === testCase.expectedCategory;
        
        if (isCorrect) {
          passed++;
          console.log(`✅ ${testCase.commitHash}: ${classification.category} (confidence: ${classification.confidence.toFixed(2)})`);
        } else {
          console.log(`❌ ${testCase.commitHash}: expected ${testCase.expectedCategory}, got ${classification.category} (confidence: ${classification.confidence.toFixed(2)})`);
        }
        
        this.testResults.push({
          test: 'basic_classification',
          commitHash: testCase.commitHash,
          expected: testCase.expectedCategory,
          actual: classification.category,
          confidence: classification.confidence,
          relevance: classification.relevance,
          correct: isCorrect
        });
        
      } catch (error) {
        console.log(`💥 ${testCase.commitHash}: Error - ${error.message}`);
        this.testResults.push({
          test: 'basic_classification',
          commitHash: testCase.commitHash,
          expected: testCase.expectedCategory,
          actual: 'error',
          error: error.message,
          correct: false
        });
      }
    }
    
    const accuracy = total > 0 ? (passed / total) * 100 : 0;
    console.log(`📊 Basic Classification Accuracy: ${accuracy.toFixed(1)}% (${passed}/${total})`);
    
    return { passed, total, accuracy };
  }

  /**
   * Test relevance scoring
   */
  async testRelevanceScoring() {
    console.log('\n📋 Test 2: Relevance Scoring');
    
    const testCases = [
      {
        name: 'High Relevance (Core RAG functionality)',
        commit: {
          hash: 'rel001',
          subject: 'feat: improve graph query performance',
          files: [
            { path: 'src/graph_loader.py', status: 'M' },
            { path: 'src/services/graph_service.py', status: 'M' }
          ]
        },
        expectedRelevance: 'high'
      },
      {
        name: 'Medium Relevance (Related functionality)',
        commit: {
          hash: 'rel002', 
          subject: 'fix: resolve parsing edge case',
          files: [
            { path: 'src/parser_loader.py', status: 'M' }
          ]
        },
        expectedRelevance: 'medium'
      },
      {
        name: 'Low Relevance (Documentation)',
        commit: {
          hash: 'rel003',
          subject: 'docs: update contributing guidelines',
          files: [
            { path: 'CONTRIBUTING.md', status: 'M' }
          ]
        },
        expectedRelevance: 'low'
      }
    ];
    
    let passed = 0;
    const total = testCases.length;
    
    for (const testCase of testCases) {
      try {
        const classification = this.classifier.classifyCommit(testCase.commit);
        
        let actualRelevance = 'low';
        if (classification.relevance >= 0.7) {
          actualRelevance = 'high';
        } else if (classification.relevance >= 0.4) {
          actualRelevance = 'medium';
        }
        
        const isCorrect = actualRelevance === testCase.expectedRelevance;
        
        if (isCorrect) {
          passed++;
          console.log(`✅ ${testCase.name}: ${actualRelevance} relevance (${classification.relevance.toFixed(2)})`);
        } else {
          console.log(`❌ ${testCase.name}: expected ${testCase.expectedRelevance}, got ${actualRelevance} (${classification.relevance.toFixed(2)})`);
        }
        
      } catch (error) {
        console.log(`💥 ${testCase.name}: Error - ${error.message}`);
      }
    }
    
    const accuracy = total > 0 ? (passed / total) * 100 : 0;
    console.log(`📊 Relevance Scoring Accuracy: ${accuracy.toFixed(1)}% (${passed}/${total})`);
    
    return { passed, total, accuracy };
  }

  /**
   * Test edge cases and robustness
   */
  async testEdgeCases() {
    console.log('\n📋 Test 3: Edge Cases and Robustness');
    
    const edgeCases = [
      {
        name: 'Empty commit message',
        commit: {
          hash: 'edge001',
          subject: '',
          files: [{ path: 'src/test.py', status: 'M' }]
        }
      },
      {
        name: 'No files changed',
        commit: {
          hash: 'edge002',
          subject: 'fix: some bug',
          files: []
        }
      },
      {
        name: 'Very long commit message',
        commit: {
          hash: 'edge003',
          subject: 'feat: ' + 'a'.repeat(500),
          files: [{ path: 'src/feature.py', status: 'A' }]
        }
      },
      {
        name: 'Mixed categories in subject',
        commit: {
          hash: 'edge004',
          subject: 'feat: fix bug by adding new security feature',
          files: [{ path: 'src/security.py', status: 'A' }]
        }
      },
      {
        name: 'Special characters in subject',
        commit: {
          hash: 'edge005',
          subject: 'fix: handle unicode characters 你好世界 in parsing',
          files: [{ path: 'src/parser.py', status: 'M' }]
        }
      }
    ];
    
    let passed = 0;
    const total = edgeCases.length;
    
    for (const testCase of edgeCases) {
      try {
        const classification = this.classifier.classifyCommit(testCase.commit);
        
        // For edge cases, we just check that classification doesn't crash
        // and returns reasonable values
        const isValid = (
          classification.category &&
          typeof classification.confidence === 'number' &&
          classification.confidence >= 0 &&
          classification.confidence <= 1 &&
          typeof classification.relevance === 'number' &&
          classification.relevance >= 0 &&
          classification.relevance <= 1
        );
        
        if (isValid) {
          passed++;
          console.log(`✅ ${testCase.name}: ${classification.category} (confidence: ${classification.confidence.toFixed(2)}, relevance: ${classification.relevance.toFixed(2)})`);
        } else {
          console.log(`❌ ${testCase.name}: Invalid classification result`);
        }
        
      } catch (error) {
        console.log(`💥 ${testCase.name}: Error - ${error.message}`);
      }
    }
    
    const robustness = total > 0 ? (passed / total) * 100 : 0;
    console.log(`📊 Edge Case Robustness: ${robustness.toFixed(1)}% (${passed}/${total})`);
    
    return { passed, total, robustness };
  }

  /**
   * Test batch classification performance
   */
  async testBatchClassification() {
    console.log('\n📋 Test 4: Batch Classification Performance');
    
    const batchSize = Math.min(20, this.trainingData.length);
    const commits = this.trainingData.slice(0, batchSize).map(data => ({
      hash: data.commitHash,
      subject: data.subject,
      author: data.author,
      email: 'test@example.com',
      date: new Date(),
      files: data.files
    }));
    
    try {
      const startTime = Date.now();
      const result = this.classifier.classifyCommits(commits);
      const endTime = Date.now();
      
      const processingTime = endTime - startTime;
      const avgTimePerCommit = processingTime / commits.length;
      
      console.log(`✅ Classified ${commits.length} commits in ${processingTime}ms`);
      console.log(`📊 Average time per commit: ${avgTimePerCommit.toFixed(2)}ms`);
      console.log(`📈 Statistics:`, {
        totalCommits: result.stats.totalCommits,
        averageConfidence: result.stats.averageConfidence.toFixed(3),
        averageRelevance: result.stats.averageRelevance.toFixed(3),
        categoryCount: Object.keys(result.stats.categoryCount).length
      });
      
      return {
        success: true,
        processingTime,
        avgTimePerCommit,
        stats: result.stats
      };
      
    } catch (error) {
      console.log(`💥 Batch classification failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test feedback mechanism
   */
  async testFeedbackMechanism() {
    console.log('\n📋 Test 5: Feedback Mechanism');
    
    try {
      // Add some feedback samples
      this.classifier.addFeedback('test001', 'feature', 'feature', 0.9);
      this.classifier.addFeedback('test002', 'bugfix', 'feature', 0.7);
      this.classifier.addFeedback('test003', 'documentation', 'documentation', 0.8);
      
      // Get accuracy metrics
      const metrics = this.classifier.getAccuracyMetrics();
      
      console.log(`✅ Feedback mechanism working`);
      console.log(`📊 Accuracy: ${(metrics.accuracy * 100).toFixed(1)}%`);
      console.log(`📈 Total feedback: ${metrics.totalFeedback}`);
      console.log(`📋 Category accuracy:`, metrics.categoryAccuracy);
      
      return { success: true, metrics };
      
    } catch (error) {
      console.log(`💥 Feedback mechanism failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Run all classification tests
   */
  async runAllTests() {
    console.log('🚀 Starting comprehensive classification tests...\n');
    
    const results = {
      basicClassification: await this.testBasicClassification(),
      relevanceScoring: await this.testRelevanceScoring(),
      edgeCases: await this.testEdgeCases(),
      batchPerformance: await this.testBatchClassification(),
      feedbackMechanism: await this.testFeedbackMechanism()
    };
    
    // Calculate overall results
    const totalTests = results.basicClassification.total + 
                      results.relevanceScoring.total + 
                      results.edgeCases.total;
    const totalPassed = results.basicClassification.passed + 
                       results.relevanceScoring.passed + 
                       results.edgeCases.passed;
    
    const overallAccuracy = totalTests > 0 ? (totalPassed / totalTests) * 100 : 0;
    
    console.log('\n🎉 Classification Tests Complete!');
    console.log('=' * 50);
    console.log(`📊 Overall Test Results:`);
    console.log(`   • Total Tests: ${totalTests}`);
    console.log(`   • Tests Passed: ${totalPassed}`);
    console.log(`   • Overall Accuracy: ${overallAccuracy.toFixed(1)}%`);
    console.log(`   • Basic Classification: ${results.basicClassification.accuracy.toFixed(1)}%`);
    console.log(`   • Relevance Scoring: ${results.relevanceScoring.accuracy.toFixed(1)}%`);
    console.log(`   • Edge Case Robustness: ${results.edgeCases.robustness.toFixed(1)}%`);
    console.log(`   • Batch Performance: ${results.batchPerformance.success ? '✅ Pass' : '❌ Fail'}`);
    console.log(`   • Feedback Mechanism: ${results.feedbackMechanism.success ? '✅ Pass' : '❌ Fail'}`);
    
    // Save detailed results
    const detailedResults = {
      timestamp: new Date().toISOString(),
      overallAccuracy,
      totalTests,
      totalPassed,
      results,
      testResults: this.testResults
    };
    
    try {
      await fs.writeFile(
        path.join(__dirname, 'classification-test-results.json'),
        JSON.stringify(detailedResults, null, 2)
      );
      console.log('\n📁 Detailed results saved to classification-test-results.json');
    } catch (error) {
      console.warn('⚠️ Could not save test results:', error.message);
    }
    
    return detailedResults;
  }
}

// Run tests if called directly
async function main() {
  const tester = new ClassificationTester();
  
  try {
    await tester.initialize();
    const results = await tester.runAllTests();
    
    // Exit with appropriate code
    const success = results.overallAccuracy >= 70; // 70% threshold for success
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('💥 Test suite failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { ClassificationTester };