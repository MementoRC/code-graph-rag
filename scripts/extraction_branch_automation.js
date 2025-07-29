#!/usr/bin/env node

/**
 * Extraction Branch Automation
 * 
 * Automates the creation of feature extraction branches with integrated
 * decision framework assessment and template generation.
 */

const fs = require('fs');
const path = require('path');
const { ExtractionTemplateGenerator } = require('./generate_extraction_templates.js');

class ExtractionBranchAutomation {
    constructor(options = {}) {
        this.repoPath = options.repoPath || process.cwd();
        this.branchPrefix = options.branchPrefix || 'feature/extracted-';
        this.templateGenerator = new ExtractionTemplateGenerator();
        this.ghToken = process.env.GITHUB_TOKEN || options.githubToken;
        this.testingFramework = options.testingFramework || 'jest';
        
        if (!this.ghToken) {
            console.warn('⚠️ No GitHub token provided. Branch creation will be local only.');
        }
    }

    /**
     * Main extraction workflow - from assessment to branch setup
     */
    async extractFeature(assessment, options = {}) {
        const {
            upstreamCommit = null,
            baseBranch = 'main',
            setupTesting = true,
            pushToRemote = true
        } = options;

        console.log(`🚀 Starting feature extraction: ${assessment.title}`);
        
        try {
            // 1. Create branch name
            const branchName = this.generateBranchName(assessment);
            console.log(`📋 Branch name: ${branchName}`);

            // 2. Create and checkout branch
            await this.createBranch(branchName, baseBranch);

            // 3. Generate documentation using template system
            const docs = await this.generateExtractionDocs(assessment, upstreamCommit);
            console.log(`📄 Generated ${docs.length} documentation files`);

            // 4. Set up testing scaffolding
            if (setupTesting) {
                await this.setupTestingScaffolding(assessment, branchName);
                console.log(`🧪 Testing scaffolding created`);
            }

            // 5. Create implementation plan
            const implementationPlan = await this.generateImplementationPlan(assessment);
            console.log(`📝 Implementation plan created`);

            // 6. Commit initial setup
            await this.commitInitialSetup(assessment, branchName);

            // 7. Push to remote if requested
            if (pushToRemote && this.ghToken) {
                await this.pushBranchToRemote(branchName);
                console.log(`🌐 Branch pushed to remote`);
            }

            // 8. Create branch metadata for traceability
            const metadata = await this.createBranchMetadata(assessment, branchName, upstreamCommit);

            console.log(`✅ Feature extraction complete for: ${assessment.title}`);
            
            return {
                success: true,
                branchName,
                documentation: docs,
                implementationPlan,
                metadata,
                testingSetup: setupTesting
            };

        } catch (error) {
            console.error(`❌ Feature extraction failed: ${error.message}`);
            return {
                success: false,
                error: error.message,
                branchName: null
            };
        }
    }

    /**
     * Generate standardized branch name from assessment
     */
    generateBranchName(assessment) {
        const featureName = assessment.title
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')  // Remove special chars
            .replace(/\s+/g, '-')          // Replace spaces with hyphens
            .replace(/-+/g, '-')           // Collapse multiple hyphens
            .slice(0, 50);                 // Limit length

        return `${this.branchPrefix}${featureName}`;
    }

    /**
     * Create and checkout new branch
     */
    async createBranch(branchName, baseBranch = 'main') {
        const { execSync } = require('child_process');
        
        try {
            // Ensure we're on base branch and up to date
            execSync(`git checkout ${baseBranch}`, { cwd: this.repoPath });
            execSync(`git pull origin ${baseBranch}`, { cwd: this.repoPath });
            
            // Create new branch
            execSync(`git checkout -b ${branchName}`, { cwd: this.repoPath });
            
            console.log(`📋 Created and checked out branch: ${branchName}`);
            return branchName;
            
        } catch (error) {
            throw new Error(`Failed to create branch ${branchName}: ${error.message}`);
        }
    }

    /**
     * Generate extraction documentation using template system
     */
    async generateExtractionDocs(assessment, upstreamCommit = null) {
        const customData = {
            'UPSTREAM_COMMIT': upstreamCommit || 'Not provided',
            'ANALYST': process.env.USER || 'Automated',
            'CURRENT_DATE': new Date().toISOString().split('T')[0]
        };

        // Generate all template types
        const docs = this.templateGenerator.generateAllTemplates(assessment);
        
        // Move generated docs to proper branch location
        const branchDocsDir = path.join(this.repoPath, 'docs', 'feature-extraction', assessment.feature_id);
        if (!fs.existsSync(branchDocsDir)) {
            fs.mkdirSync(branchDocsDir, { recursive: true });
        }

        // Copy templates to branch docs directory
        for (const doc of docs) {
            const targetPath = path.join(branchDocsDir, path.basename(doc.outputFile));
            fs.copyFileSync(doc.outputFile, targetPath);
            doc.branchPath = targetPath;
        }

        return docs;
    }

    /**
     * Set up testing scaffolding for the extracted feature
     */
    async setupTestingScaffolding(assessment, branchName) {
        const testDir = path.join(this.repoPath, 'tests', 'extracted-features', assessment.feature_id);
        
        // Create test directory structure
        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        // Generate test files based on framework
        const testFiles = await this.generateTestFiles(assessment, testDir);
        
        // Create Jest configuration for extracted feature
        if (this.testingFramework === 'jest') {
            await this.createJestConfig(assessment, testDir);
        }

        return {
            testDirectory: testDir,
            testFiles,
            framework: this.testingFramework
        };
    }

    /**
     * Generate test files based on feature type and assessment
     */
    async generateTestFiles(assessment, testDir) {
        const testFiles = [];

        // Unit test template
        const unitTestContent = `/**
 * Unit tests for extracted feature: ${assessment.title}
 * 
 * Upstream source: ${assessment.upstream_reference}
 * Extraction ID: ${assessment.feature_id}
 * Assessment score: ${assessment.weighted_score?.toFixed(2)}
 */

describe('${assessment.title}', () => {
    beforeEach(() => {
        // Setup for each test
    });

    afterEach(() => {
        // Cleanup after each test
    });

    describe('Core functionality', () => {
        test('should implement basic feature behavior', () => {
            // TODO: Implement based on upstream feature
            expect(true).toBe(true); // Placeholder
        });

        test('should handle edge cases', () => {
            // TODO: Add edge case testing
            expect(true).toBe(true); // Placeholder
        });
    });

    describe('Integration', () => {
        test('should integrate with existing system', () => {
            // TODO: Test integration points
            expect(true).toBe(true); // Placeholder
        });
    });

    describe('Performance', () => {
        test('should meet performance requirements', () => {
            // TODO: Add performance tests if needed
            expect(true).toBe(true); // Placeholder
        });
    });
});`;

        const unitTestPath = path.join(testDir, `${assessment.feature_id}.test.js`);
        fs.writeFileSync(unitTestPath, unitTestContent, 'utf8');
        testFiles.push({ type: 'unit', path: unitTestPath });

        // Integration test template (if high complexity)
        if (assessment.scores?.effort?.raw_score >= 2) {
            const integrationTestContent = `/**
 * Integration tests for extracted feature: ${assessment.title}
 */

describe('${assessment.title} - Integration', () => {
    test('should integrate with main application', () => {
        // TODO: Implement integration testing
        expect(true).toBe(true);
    });
});`;

            const integrationTestPath = path.join(testDir, `${assessment.feature_id}.integration.test.js`);
            fs.writeFileSync(integrationTestPath, integrationTestContent, 'utf8');
            testFiles.push({ type: 'integration', path: integrationTestPath });
        }

        return testFiles;
    }

    /**
     * Create Jest configuration for the extracted feature
     */
    async createJestConfig(assessment, testDir) {
        const jestConfig = {
            displayName: `Extracted Feature: ${assessment.title}`,
            testMatch: [`${testDir}/**/*.test.js`],
            collectCoverageFrom: [
                `src/extracted-features/${assessment.feature_id}/**/*.js`
            ],
            coverageThreshold: {
                global: {
                    branches: 80,
                    functions: 80,
                    lines: 80,
                    statements: 80
                }
            }
        };

        const configPath = path.join(testDir, 'jest.config.js');
        const configContent = `module.exports = ${JSON.stringify(jestConfig, null, 2)};`;
        
        fs.writeFileSync(configPath, configContent, 'utf8');
        return configPath;
    }

    /**
     * Generate implementation plan based on assessment
     */
    async generateImplementationPlan(assessment) {
        const plan = {
            featureId: assessment.feature_id,
            title: assessment.title,
            estimatedEffort: this.mapEffortToSize(assessment.scores?.effort?.raw_score),
            priority: this.mapPriorityToLevel(assessment.scores?.priority?.raw_score),
            phases: [],
            milestones: [],
            dependencies: [],
            risks: []
        };

        // Generate phases based on effort score
        const effortScore = assessment.scores?.effort?.raw_score || 2;
        
        if (effortScore <= 1) {
            // Simple implementation
            plan.phases = [
                { name: 'Implementation', duration: '1-2 days', tasks: ['Implement core feature', 'Add basic tests'] },
                { name: 'Integration', duration: '1 day', tasks: ['Integrate with existing code', 'Update documentation'] }
            ];
        } else if (effortScore === 2) {
            // Moderate implementation
            plan.phases = [
                { name: 'Planning', duration: '1 day', tasks: ['Design implementation', 'Plan integration points'] },
                { name: 'Core Implementation', duration: '2-3 days', tasks: ['Implement main functionality', 'Add unit tests'] },
                { name: 'Integration', duration: '1-2 days', tasks: ['Integrate with system', 'Add integration tests'] },
                { name: 'Polish', duration: '1 day', tasks: ['Documentation', 'Code review', 'Final testing'] }
            ];
        } else {
            // Complex implementation
            plan.phases = [
                { name: 'Analysis', duration: '1-2 days', tasks: ['Analyze upstream implementation', 'Design adaptation strategy'] },
                { name: 'Foundation', duration: '2-3 days', tasks: ['Set up core structure', 'Implement base functionality'] },
                { name: 'Core Features', duration: '3-5 days', tasks: ['Implement main features', 'Add comprehensive tests'] },
                { name: 'Integration', duration: '2-3 days', tasks: ['System integration', 'Performance optimization'] },
                { name: 'Validation', duration: '1-2 days', tasks: ['End-to-end testing', 'Documentation', 'Code review'] }
            ];
        }

        // Add milestones
        plan.milestones = plan.phases.map((phase, index) => ({
            name: `${phase.name} Complete`,
            description: `Completion of ${phase.name} phase`,
            phase: index + 1
        }));

        // Save implementation plan
        const planPath = path.join(this.repoPath, 'docs', 'feature-extraction', assessment.feature_id, 'implementation-plan.json');
        
        // Ensure directory exists
        const planDir = path.dirname(planPath);
        if (!fs.existsSync(planDir)) {
            fs.mkdirSync(planDir, { recursive: true });
        }
        
        fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf8');

        return plan;
    }

    /**
     * Commit initial branch setup
     */
    async commitInitialSetup(assessment, branchName) {
        const { execSync } = require('child_process');
        
        try {
            // Add all new files
            execSync('git add .', { cwd: this.repoPath });
            
            // Commit with descriptive message
            const commitMessage = `feat: initialize extraction for ${assessment.title}

- Decision framework assessment completed
- Documentation templates generated
- Testing scaffolding created
- Implementation plan established

Extraction ID: ${assessment.feature_id}
Upstream source: ${assessment.upstream_reference}
Assessment score: ${assessment.weighted_score?.toFixed(2)}
Branch: ${branchName}

🤖 Generated with Feature Extraction Workflow
Co-Authored-By: Extraction Automation <noreply@memento.dev>`;

            execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, { cwd: this.repoPath });
            console.log('📝 Initial setup committed');
            
        } catch (error) {
            console.warn(`⚠️ Commit failed (may be no changes): ${error.message}`);
        }
    }

    /**
     * Push branch to remote repository
     */
    async pushBranchToRemote(branchName) {
        const { execSync } = require('child_process');
        
        try {
            execSync(`git push -u origin ${branchName}`, { cwd: this.repoPath });
            console.log(`🌐 Pushed ${branchName} to remote`);
        } catch (error) {
            throw new Error(`Failed to push branch to remote: ${error.message}`);
        }
    }

    /**
     * Create branch metadata for traceability
     */
    async createBranchMetadata(assessment, branchName, upstreamCommit) {
        const metadata = {
            extractionId: assessment.feature_id,
            branchName,
            featureTitle: assessment.title,
            upstreamSource: assessment.upstream_reference,
            upstreamCommit: upstreamCommit,
            assessmentData: assessment,
            createdAt: new Date().toISOString(),
            createdBy: process.env.USER || 'Automated',
            status: 'initialized',
            implementation: {
                phases: [],
                currentPhase: null,
                progress: 0
            }
        };

        // Save metadata
        const metadataDir = path.join(this.repoPath, '.extraction-metadata');
        if (!fs.existsSync(metadataDir)) {
            fs.mkdirSync(metadataDir, { recursive: true });
        }

        const metadataPath = path.join(metadataDir, `${assessment.feature_id}.json`);
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

        return metadata;
    }

    /**
     * Helper methods
     */
    mapEffortToSize(effortScore) {
        const sizeMap = { 0: 'XS', 1: 'S', 2: 'M', 3: 'L' };
        return sizeMap[effortScore] || 'M';
    }

    mapPriorityToLevel(priorityScore) {
        const levelMap = { 0: 'Low', 1: 'Low', 2: 'Medium', 3: 'High' };
        return levelMap[priorityScore] || 'Medium';
    }
}

// CLI interface for manual extraction
async function runManualExtraction() {
    console.log('🎯 Feature Extraction Branch Automation - Manual Mode\n');

    // Mock assessment for demonstration
    const mockAssessment = {
        feature_id: 'demo_automation_01',
        title: 'Advanced Search Filters',
        description: 'Enhanced search functionality with multiple filter options',
        upstream_reference: 'https://github.com/upstream/repo/commit/def456',
        scores: { value: { raw_score: 3 }, effort: { raw_score: 2 }, compatibility: { raw_score: 1 }, priority: { raw_score: 2 } },
        rationale: {
            value: 'High user value, frequently requested feature',
            effort: 'Moderate complexity, requires UI and backend changes',
            compatibility: 'Minimal conflicts with existing search',
            priority: 'Important enhancement, good timing'
        },
        weighted_score: 2.1,
        decision: 'extract',
        decision_rationale: 'Strong value with manageable effort'
    };

    const automation = new ExtractionBranchAutomation({
        repoPath: process.cwd(),
        testingFramework: 'jest'
    });

    try {
        const result = await automation.extractFeature(mockAssessment, {
            upstreamCommit: 'abc123def456',
            baseBranch: 'feature/upstream-analysis-strategy',
            setupTesting: true,
            pushToRemote: false  // Don't push in demo mode
        });

        if (result.success) {
            console.log('\n✅ Extraction automation completed successfully!');
            console.log(`📋 Branch: ${result.branchName}`);
            console.log(`📄 Documentation files: ${result.documentation.length}`);
            console.log(`🧪 Testing setup: ${result.testingSetup ? 'Complete' : 'Skipped'}`);
        } else {
            console.log('\n❌ Extraction automation failed:', result.error);
        }

    } catch (error) {
        console.error('\n💥 Automation error:', error.message);
    }
}

// Export for use as module
module.exports = { ExtractionBranchAutomation };

// Run manual extraction if called directly
if (require.main === module) {
    runManualExtraction();
}