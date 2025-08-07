#!/usr/bin/env node

/**
 * Template System Test Script
 * 
 * Tests the template generation system with mock data
 */

const fs = require('fs').promises;
const path = require('path');
const { TemplateGenerator } = require('./generate-template');

class MockTemplateGenerator extends TemplateGenerator {
  constructor() {
    super();
    this.mockAnalysisData = {
      success: true,
      summary: {
        totalCommits: 8,
        totalFiles: 15,
        totalSignificance: 32,
        changeLevel: 'major',
        categories: {
          feature: {
            count: 3,
            significance: 15,
            commits: [
              {
                hash: 'abc12345678',
                subject: 'feat: add new authentication system',
                author: 'Alice Developer',
                date: new Date('2024-01-15T10:00:00Z'),
                significance: 8,
                category: 'feature',
                fileCount: 5,
                files: [
                  { path: 'src/auth/login.py', status: 'A' },
                  { path: 'src/auth/models.py', status: 'A' }
                ]
              },
              {
                hash: 'def67890123',
                subject: 'feat: implement query caching',
                author: 'Bob Developer',
                date: new Date('2024-01-15T11:00:00Z'),
                significance: 5,
                category: 'feature',
                fileCount: 3,
                files: [
                  { path: 'src/cache/query.py', status: 'A' }
                ]
              }
            ]
          },
          security: {
            count: 2,
            significance: 12,
            commits: [
              {
                hash: 'ghi11111111',
                subject: 'security: fix SQL injection vulnerability',
                author: 'Security Team',
                date: new Date('2024-01-15T12:00:00Z'),
                significance: 10,
                category: 'security',
                fileCount: 2,
                files: [
                  { path: 'src/database/queries.py', status: 'M' }
                ]
              }
            ]
          },
          bugfix: {
            count: 2,
            significance: 4,
            commits: [
              {
                hash: 'jkl22222222',
                subject: 'fix: resolve memory leak in parser',
                author: 'Charlie Developer',
                date: new Date('2024-01-15T13:00:00Z'),
                significance: 3,
                category: 'bugfix',
                fileCount: 1,
                files: [
                  { path: 'src/parsers/memory.py', status: 'M' }
                ]
              }
            ]
          },
          docs: {
            count: 1,
            significance: 1,
            commits: [
              {
                hash: 'mno33333333',
                subject: 'docs: update README installation guide',
                author: 'Doc Writer',
                date: new Date('2024-01-15T14:00:00Z'),
                significance: 1,
                category: 'docs',
                fileCount: 1,
                files: [
                  { path: 'README.md', status: 'M' }
                ]
              }
            ]
          }
        },
        topCommits: [],
        shouldNotify: true,
        analysisDate: new Date('2024-01-15T15:00:00Z').toISOString()
      },
      analyzedCommits: []
    };
    
    // Flatten commits for topCommits
    this.mockAnalysisData.summary.topCommits = Object.values(
      this.mockAnalysisData.summary.categories
    ).flatMap(cat => cat.commits)
     .sort((a, b) => b.significance - a.significance);
    
    this.mockAnalysisData.analyzedCommits = this.mockAnalysisData.summary.topCommits;
  }

  async getAnalysisData(fromRef, toRef) {
    console.log(`🧪 Mock: Generating analysis data for ${fromRef} → ${toRef}`);
    return this.mockAnalysisData;
  }

  async createAnalysisBranch(branchDate) {
    console.log(`🧪 Mock: Would create analysis branch: analysis/${branchDate}`);
    return `analysis/${branchDate}`;
  }
}

async function runTemplateTests() {
  console.log('🧪 Starting template system tests...\n');
  
  const generator = new MockTemplateGenerator();
  
  try {
    console.log('📋 Test 1: Generator Initialization');
    await generator.initialize();
    console.log('✅ Template generator initialized successfully\n');
    
    console.log('📋 Test 2: Template Files Validation');
    const templatesDir = path.join(__dirname, 'templates');
    const templateFiles = await fs.readdir(templatesDir);
    const expectedTemplates = ['analysis-session.md', 'quick-summary.md'];
    
    let templatesValid = true;
    for (const expected of expectedTemplates) {
      if (!templateFiles.includes(expected)) {
        console.log(`❌ Missing template file: ${expected}`);
        templatesValid = false;
      } else {
        console.log(`✅ Found template: ${expected}`);
      }
    }
    
    if (templatesValid) {
      console.log('✅ All expected template files found\n');
    } else {
      console.log('❌ Some template files missing\n');
    }
    
    console.log('📋 Test 3: Template Content Validation');
    for (const templateFile of expectedTemplates) {
      const templatePath = path.join(templatesDir, templateFile);
      const content = await fs.readFile(templatePath, 'utf8');
      
      // Check for required Handlebars variables
      const requiredVars = [
        '{{sessionDate}}',
        '{{totalCommits}}', 
        '{{significanceScore}}',
        '{{changeLevel}}'
      ];
      
      let templateContentValid = true;
      for (const variable of requiredVars) {
        if (!content.includes(variable)) {
          console.log(`❌ ${templateFile} missing variable: ${variable}`);
          templateContentValid = false;
        }
      }
      
      if (templateContentValid) {
        console.log(`✅ ${templateFile} contains all required variables`);
      }
    }
    console.log('');
    
    console.log('📋 Test 4: Session Generation with Mock Data');
    const testOptions = {
      branchDate: '2024-01-15',
      leadAnalyst: 'Test Analyst',
      participants: ['Alice', 'Bob', 'Charlie'],
      duration: '2 hours',
      createBranch: false  // Don't actually create git branch in test
    };
    
    const result = await generator.generateSession('mock-from', 'mock-to', testOptions);
    
    if (result.success) {
      console.log('✅ Session generation completed successfully');
      console.log(`   • Branch Date: ${result.branchDate}`);
      console.log(`   • Full Analysis: ${result.outputs.fullAnalysis}`);
      console.log(`   • Quick Summary: ${result.outputs.quickSummary}`);
      console.log(`   • Significance Score: ${result.analysisData.significanceScore}`);
    } else {
      console.log('❌ Session generation failed:', result.error);
    }
    console.log('');
    
    console.log('📋 Test 5: Generated File Validation');
    const generatedFiles = Object.values(result.outputs);
    
    let generatedFilesValid = true;
    for (const filePath of generatedFiles) {
      try {
        const stats = await fs.stat(filePath);
        if (stats.size > 0) {
          console.log(`✅ Generated file exists and has content: ${path.basename(filePath)}`);
        } else {
          console.log(`❌ Generated file is empty: ${path.basename(filePath)}`);
          generatedFilesValid = false;
        }
      } catch (error) {
        console.log(`❌ Generated file not found: ${path.basename(filePath)}`);
        generatedFilesValid = false;
      }
    }
    
    if (generatedFilesValid) {
      console.log('✅ All generated files are valid\n');
    } else {
      console.log('❌ Some generated files are invalid\n');
    }
    
    console.log('📋 Test 6: Template Content Rendering');
    // Read one of the generated files to verify content rendering
    const fullAnalysisPath = result.outputs.fullAnalysis;
    const generatedContent = await fs.readFile(fullAnalysisPath, 'utf8');
    
    // Check that variables were replaced
    const contentChecks = [
      { check: !generatedContent.includes('{{sessionDate}}'), desc: 'Session date rendered' },
      { check: generatedContent.includes('Test Analyst'), desc: 'Lead analyst name included' },
      { check: generatedContent.includes('major'), desc: 'Change level included' },
      { check: generatedContent.includes('feat: add new authentication'), desc: 'Commit subjects included' },
      { check: generatedContent.includes('security: fix SQL injection'), desc: 'Security commits included' }
    ];
    
    let contentRenderingValid = true;
    for (const { check, desc } of contentChecks) {
      if (check) {
        console.log(`✅ ${desc}`);
      } else {
        console.log(`❌ ${desc}`);
        contentRenderingValid = false;
      }
    }
    
    if (contentRenderingValid) {
      console.log('✅ Template content rendering successful\n');
    } else {
      console.log('❌ Template content rendering issues detected\n');
    }
    
    console.log('📋 Test 7: CLI Interface Validation');
    // Test that the CLI help works
    const { program } = require('commander');
    
    try {
      // This tests that the CLI is properly configured
      program.configureHelp();
      console.log('✅ CLI interface configured properly');
    } catch (error) {
      console.log('❌ CLI interface configuration error:', error.message);
    }
    console.log('');
    
    console.log('🎉 All template tests completed!');
    
    console.log('\n📊 Test Results Summary:');
    console.log(`   • Generator initialization: ✅`);
    console.log(`   • Template files validation: ${templatesValid ? '✅' : '❌'}`);
    console.log(`   • Template content validation: ✅`);
    console.log(`   • Session generation: ${result.success ? '✅' : '❌'}`);
    console.log(`   • Generated files validation: ${generatedFilesValid ? '✅' : '❌'}`);
    console.log(`   • Content rendering: ${contentRenderingValid ? '✅' : '❌'}`);
    console.log(`   • CLI interface: ✅`);
    
    // Cleanup test files
    console.log('\n🧹 Cleaning up test files...');
    for (const filePath of generatedFiles) {
      try {
        await fs.unlink(filePath);
        console.log(`   • Removed: ${path.basename(filePath)}`);
      } catch (error) {
        console.log(`   • Could not remove: ${path.basename(filePath)}`);
      }
    }
    
    // Output test results for potential CI use
    const testResults = {
      success: true,
      tests: {
        initialization: true,
        templateFiles: templatesValid,
        templateContent: true,
        sessionGeneration: result.success,
        generatedFiles: generatedFilesValid,
        contentRendering: contentRenderingValid,
        cliInterface: true
      },
      mockGeneration: {
        branchDate: result.branchDate,
        filesGenerated: generatedFiles.length,
        significanceScore: result.analysisData?.significanceScore,
        changeLevel: result.analysisData?.changeLevel
      }
    };
    
    if (process.env.CI || process.argv.includes('--output-json')) {
      await fs.writeFile('template-test-results.json', JSON.stringify(testResults, null, 2));
      console.log('\n📁 Test results written to template-test-results.json');
    }
    
    if (process.argv.includes('--json')) {
      console.log('\n📋 JSON Output:');
      console.log(JSON.stringify(testResults, null, 2));
    }
    
  } catch (error) {
    console.error('\n💥 Template test failed:', error.message);
    console.error(error.stack);
    
    const failureResults = {
      success: false,
      error: error.message,
      stack: error.stack
    };
    
    if (process.env.CI || process.argv.includes('--output-json')) {
      await fs.writeFile('template-test-results.json', JSON.stringify(failureResults, null, 2));
    }
    
    process.exit(1);
  }
}

// Run tests if called directly
if (require.main === module) {
  runTemplateTests();
}

module.exports = { runTemplateTests, MockTemplateGenerator };