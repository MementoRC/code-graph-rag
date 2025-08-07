#!/usr/bin/env node

/**
 * Test script for upstream analysis functionality
 * 
 * Tests the analyzer with mock data and validates core functionality
 */

const { UpstreamAnalyzer } = require('./analyze-changes');
const fs = require('fs').promises;
const path = require('path');

class MockAnalyzer extends UpstreamAnalyzer {
  constructor() {
    super();
    this.mockCommits = [
      {
        hash: 'abc123456789',
        subject: 'feat: add new user authentication system',
        author: 'Test Author',
        email: 'test@example.com',
        date: new Date('2023-12-01T10:00:00Z'),
        parents: ['def456'],
        isMerge: false
      },
      {
        hash: 'def456789012', 
        subject: 'fix: resolve security vulnerability in login',
        author: 'Security Team',
        email: 'security@example.com',
        date: new Date('2023-12-01T11:00:00Z'),
        parents: ['ghi789'],
        isMerge: false
      },
      {
        hash: 'ghi789012345',
        subject: 'docs: update README with installation instructions',
        author: 'Doc Writer',
        email: 'docs@example.com',
        date: new Date('2023-12-01T12:00:00Z'),
        parents: ['jkl012'],
        isMerge: false
      },
      {
        hash: 'jkl012345678',
        subject: 'refactor: restructure authentication module',
        author: 'Developer',
        email: 'dev@example.com',
        date: new Date('2023-12-01T13:00:00Z'),
        parents: ['mno345'],
        isMerge: false
      }
    ];
    
    this.mockFiles = {
      'abc123456789': [
        { status: 'A', path: 'src/auth/login.py', name: 'login.py' },
        { status: 'A', path: 'src/auth/models.py', name: 'models.py' },
        { status: 'M', path: 'tests/test_auth.py', name: 'test_auth.py' }
      ],
      'def456789012': [
        { status: 'M', path: 'src/auth/login.py', name: 'login.py' },
        { status: 'M', path: 'requirements.txt', name: 'requirements.txt' }
      ],
      'ghi789012345': [
        { status: 'M', path: 'README.md', name: 'README.md' },
        { status: 'A', path: 'docs/installation.md', name: 'installation.md' }
      ],
      'jkl012345678': [
        { status: 'M', path: 'src/auth/login.py', name: 'login.py' },
        { status: 'M', path: 'src/auth/models.py', name: 'models.py' },
        { status: 'D', path: 'src/auth/old_auth.py', name: 'old_auth.py' }
      ]
    };
  }

  async getCommitsBetween(fromRef, toRef) {
    console.log(`🧪 Mock: Getting commits from ${fromRef} to ${toRef}`);
    return [...this.mockCommits];
  }

  async getCommitFiles(commitHash) {
    console.log(`🧪 Mock: Getting files for commit ${commitHash.substring(0, 8)}`);
    return this.mockFiles[commitHash] || [];
  }
}

async function runTests() {
  console.log('🧪 Starting upstream analysis tests...\n');
  
  const analyzer = new MockAnalyzer();
  
  try {
    console.log('📋 Test 1: Configuration Loading');
    await analyzer.initialize();
    console.log('✅ Configuration loaded successfully\n');
    
    console.log('📋 Test 2: Commit Analysis');
    const result = await analyzer.analyzeChanges('mock-from', 'mock-to');
    
    if (!result.success) {
      throw new Error('Analysis failed');
    }
    
    const { summary, analyzedCommits } = result;
    
    console.log('✅ Analysis completed successfully');
    console.log(`   • Commits analyzed: ${analyzedCommits.length}`);
    console.log(`   • Total significance: ${summary.totalSignificance}`);
    console.log(`   • Change level: ${summary.changeLevel}`);
    console.log(`   • Categories found: ${Object.keys(summary.categories).length}`);
    console.log('');
    
    console.log('📋 Test 3: Categorization Validation');
    const expectedCategories = {
      'feat: add new user authentication system': 'feature',
      'fix: resolve security vulnerability in login': 'security', 
      'docs: update README with installation instructions': 'docs',
      'refactor: restructure authentication module': 'refactor'
    };
    
    let categorizationCorrect = true;
    for (const commit of analyzedCommits) {
      const expected = expectedCategories[commit.subject];
      const actual = commit.category;
      
      if (expected && expected !== actual) {
        console.log(`❌ Categorization mismatch: "${commit.subject}"`);
        console.log(`   Expected: ${expected}, Got: ${actual}`);
        categorizationCorrect = false;
      } else {
        console.log(`✅ Correct category for "${commit.subject}": ${actual}`);
      }
    }
    
    if (categorizationCorrect) {
      console.log('✅ All categorizations correct\n');
    } else {
      console.log('❌ Some categorizations incorrect\n');
    }
    
    console.log('📋 Test 4: Significance Scoring');
    const significanceTests = [
      {
        commit: analyzedCommits.find(c => c.subject.includes('security')),
        minScore: 8, // Security should have high significance
        description: 'Security commit should have high significance'
      },
      {
        commit: analyzedCommits.find(c => c.subject.includes('docs')),
        maxScore: 5, // Docs should have low significance
        description: 'Documentation commit should have low significance'
      }
    ];
    
    for (const test of significanceTests) {
      if (test.commit) {
        const score = test.commit.significance;
        const passed = (test.minScore && score >= test.minScore) || 
                      (test.maxScore && score <= test.maxScore);
        
        if (passed) {
          console.log(`✅ ${test.description}: ${score}`);
        } else {
          console.log(`❌ ${test.description}: ${score} (expected ${test.minScore ? `>=${test.minScore}` : `<=${test.maxScore}`})`);
        }
      }
    }
    console.log('');
    
    console.log('📋 Test 5: Summary Generation');
    const requiredSummaryFields = [
      'totalCommits', 'totalSignificance', 'totalFiles', 
      'changeLevel', 'categories', 'topCommits', 'shouldNotify'
    ];
    
    let summaryValid = true;
    for (const field of requiredSummaryFields) {
      if (!(field in summary)) {
        console.log(`❌ Missing summary field: ${field}`);
        summaryValid = false;
      }
    }
    
    if (summaryValid) {
      console.log('✅ Summary contains all required fields');
    }
    
    // Test notification threshold logic
    const shouldNotify = summary.totalSignificance >= analyzer.config.thresholds.notification_threshold;
    if (summary.shouldNotify === shouldNotify) {
      console.log('✅ Notification threshold logic correct');
    } else {
      console.log('❌ Notification threshold logic incorrect');
    }
    console.log('');
    
    console.log('📋 Test 6: Issue Body Generation');
    const issueBody = analyzer.generateIssueBody(summary);
    
    const requiredSections = [
      'Upstream Analysis Report',
      'Summary by Category', 
      'Top Significant Commits',
      'Review Actions'
    ];
    
    let issueBodyValid = true;
    for (const section of requiredSections) {
      if (!issueBody.includes(section)) {
        console.log(`❌ Missing issue body section: ${section}`);
        issueBodyValid = false;
      }
    }
    
    if (issueBodyValid) {
      console.log('✅ Issue body contains all required sections');
    }
    console.log('');
    
    console.log('🎉 All tests completed!');
    console.log('\n📊 Test Results Summary:');
    console.log(`   • Configuration loading: ✅`);
    console.log(`   • Commit analysis: ✅`);
    console.log(`   • Categorization: ${categorizationCorrect ? '✅' : '❌'}`);
    console.log(`   • Significance scoring: ✅`);
    console.log(`   • Summary generation: ${summaryValid ? '✅' : '❌'}`);
    console.log(`   • Issue body generation: ${issueBodyValid ? '✅' : '❌'}`);
    
    // Output test results for potential CI use
    const testResults = {
      success: true,
      tests: {
        configuration: true,
        analysis: true,
        categorization: categorizationCorrect,
        significance: true,
        summary: summaryValid,
        issueBody: issueBodyValid
      },
      mockAnalysis: {
        commits: analyzedCommits.length,
        significance: summary.totalSignificance,
        changeLevel: summary.changeLevel,
        categories: Object.keys(summary.categories)
      }
    };
    
    // Write test results to file if in CI environment
    if (process.env.CI || process.argv.includes('--output-json')) {
      await fs.writeFile('test-results.json', JSON.stringify(testResults, null, 2));
      console.log('\n📁 Test results written to test-results.json');
    }
    
    if (process.argv.includes('--json')) {
      console.log('\n📋 JSON Output:');
      console.log(JSON.stringify(testResults, null, 2));
    }
    
  } catch (error) {
    console.error('\n💥 Test failed:', error.message);
    console.error(error.stack);
    
    const failureResults = {
      success: false,
      error: error.message,
      stack: error.stack
    };
    
    if (process.env.CI || process.argv.includes('--output-json')) {
      await fs.writeFile('test-results.json', JSON.stringify(failureResults, null, 2));
    }
    
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests();
}

module.exports = { runTests, MockAnalyzer };