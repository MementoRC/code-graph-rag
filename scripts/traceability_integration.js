#!/usr/bin/env node

/**
 * Traceability Integration Layer
 * 
 * This module provides integration between the traceability audit system
 * and existing components (TaskMaster, GitHub, Documentation system).
 */

const fs = require('fs');
const path = require('path');
const { TraceabilityAuditSystem } = require('./traceability_audit_system');

/**
 * Integration layer for connecting traceability with existing systems
 */
class TraceabilityIntegration {
    constructor(options = {}) {
        this.projectRoot = options.projectRoot || process.cwd();
        this.auditSystem = new TraceabilityAuditSystem({ projectRoot: this.projectRoot });
        
        // Integration configurations
        this.integrations = {
            taskmaster: {
                enabled: true,
                tasksPath: '.taskmaster/tasks/tasks.json'
            },
            github: {
                enabled: true,
                actionsPath: '.github/workflows'
            },
            documentation: {
                enabled: true,
                docsPath: 'docs/upstream-analysis/extraction'
            }
        };
    }

    /**
     * Initialize traceability for a new extraction from existing data
     */
    async initializeFromExtractionData(extractionId) {
        try {
            console.log(`🔗 Initializing traceability for extraction: ${extractionId}`);
            
            // Gather data from all integrated systems
            const extractionData = await this.gatherExtractionData(extractionId);
            
            // Initialize feature tracking
            const featureRecord = this.auditSystem.initializeFeatureTracking(extractionData);
            
            // Create integration hooks
            await this.createIntegrationHooks(featureRecord);
            
            console.log(`✅ Traceability initialized for feature: ${featureRecord.featureId}`);
            return featureRecord;
            
        } catch (error) {
            console.error(`❌ Failed to initialize traceability: ${error.message}`);
            throw error;
        }
    }

    /**
     * Gather extraction data from all integrated systems
     */
    async gatherExtractionData(extractionId) {
        const extractionData = {
            extractionId,
            featureName: null,
            upstreamRepository: null,
            upstreamCommit: null,
            upstreamBranch: null,
            localBranch: null,
            analysisSession: null,
            implementationPlan: null,
            taskMasterTask: null,
            valueScore: null,
            effortLevel: null,
            roiScore: null,
            compatibilityScore: null,
            riskLevel: null,
            analysisDate: null
        };

        // Try to gather from documentation system
        await this.gatherFromDocumentation(extractionId, extractionData);
        
        // Try to gather from TaskMaster
        await this.gatherFromTaskMaster(extractionId, extractionData);
        
        // Try to gather from GitHub
        await this.gatherFromGitHub(extractionId, extractionData);
        
        // Validate we have minimum required data
        this.validateExtractionData(extractionData);
        
        return extractionData;
    }

    /**
     * Gather data from documentation system
     */
    async gatherFromDocumentation(extractionId, extractionData) {
        if (!this.integrations.documentation.enabled) return;

        try {
            const docsPath = path.join(this.projectRoot, this.integrations.documentation.docsPath);
            
            // Look for assessment file
            const assessmentPath = path.join(docsPath, 'assessments', `${extractionId}.md`);
            if (fs.existsSync(assessmentPath)) {
                const assessmentContent = fs.readFileSync(assessmentPath, 'utf8');
                this.parseAssessmentData(assessmentContent, extractionData);
            }
            
            // Look for implementation plan
            const planPath = path.join(docsPath, 'plans', `${extractionId}.md`);
            if (fs.existsSync(planPath)) {
                const planContent = fs.readFileSync(planPath, 'utf8');
                this.parsePlanData(planContent, extractionData);
            }
            
            console.log('📚 Gathered data from documentation system');
        } catch (error) {
            console.warn(`⚠️ Could not gather from documentation: ${error.message}`);
        }
    }

    /**
     * Parse assessment data from markdown content
     */
    parseAssessmentData(content, extractionData) {
        // Extract feature name
        const featureMatch = content.match(/# Feature Extraction Assessment: (.+)/);
        if (featureMatch) {
            extractionData.featureName = featureMatch[1].trim();
        }

        // Extract upstream information
        const upstreamRepoMatch = content.match(/\*\*Upstream Repository\*\*: `?([^`\n]+)`?/);
        if (upstreamRepoMatch) {
            extractionData.upstreamRepository = upstreamRepoMatch[1].trim();
        }

        const upstreamCommitMatch = content.match(/\*\*Upstream Commit\*\*: `?([a-f0-9]{40})`?/);
        if (upstreamCommitMatch) {
            extractionData.upstreamCommit = upstreamCommitMatch[1].trim();
        }

        // Extract assessment scores
        const valueScoreMatch = content.match(/\*\*Total Value Score\*\*: (\d+)/);
        if (valueScoreMatch) {
            extractionData.valueScore = parseInt(valueScoreMatch[1], 10);
        }

        const effortMatch = content.match(/\*\*Effort Level\*\*: ([A-Z]{1,2})/);
        if (effortMatch) {
            extractionData.effortLevel = effortMatch[1];
        }

        const roiMatch = content.match(/\*\*ROI Score\*\*: ([0-9.]+)/);
        if (roiMatch) {
            extractionData.roiScore = parseFloat(roiMatch[1]);
        }
    }

    /**
     * Parse implementation plan data
     */
    parsePlanData(content, extractionData) {
        // Extract implementation branch
        const branchMatch = content.match(/\*\*Implementation Branch\*\*: `?([^`\n]+)`?/);
        if (branchMatch) {
            extractionData.localBranch = branchMatch[1].trim();
        }

        // Extract analysis session reference
        const sessionMatch = content.match(/\*\*Analysis Session\*\*: `?([^`\n]+)`?/);
        if (sessionMatch) {
            extractionData.analysisSession = sessionMatch[1].trim();
        }
    }

    /**
     * Gather data from TaskMaster system
     */
    async gatherFromTaskMaster(extractionId, extractionData) {
        if (!this.integrations.taskmaster.enabled) return;

        try {
            const tasksPath = path.join(this.projectRoot, this.integrations.taskmaster.tasksPath);
            if (!fs.existsSync(tasksPath)) {
                console.warn('⚠️ TaskMaster tasks.json not found');
                return;
            }

            const tasksContent = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));
            
            // Search for extraction-related tasks
            const extractionTasks = this.findExtractionTasks(tasksContent, extractionId, extractionData.featureName);
            
            if (extractionTasks.length > 0) {
                // Use the first matching task as the primary task
                const primaryTask = extractionTasks[0];
                extractionData.taskMasterTask = primaryTask.id;
                
                // If we don't have feature name from docs, try to extract from task
                if (!extractionData.featureName && primaryTask.title) {
                    extractionData.featureName = this.extractFeatureNameFromTask(primaryTask.title);
                }
            }
            
            console.log('📋 Gathered data from TaskMaster system');
        } catch (error) {
            console.warn(`⚠️ Could not gather from TaskMaster: ${error.message}`);
        }
    }

    /**
     * Find extraction-related tasks in TaskMaster
     */
    findExtractionTasks(tasksData, extractionId, featureName) {
        const allTasks = [];
        
        if (tasksData.tasks) {
            // Add main tasks
            allTasks.push(...tasksData.tasks);
            
            // Add subtasks
            tasksData.tasks.forEach(task => {
                if (task.subtasks) {
                    allTasks.push(...task.subtasks.map(subtask => ({
                        ...subtask,
                        parentId: task.id
                    })));
                }
            });
        }
        
        // Filter tasks that match extraction criteria
        return allTasks.filter(task => {
            const taskText = `${task.title || ''} ${task.description || ''} ${task.details || ''}`.toLowerCase();
            
            // Check for extraction ID
            if (taskText.includes(extractionId.toLowerCase())) {
                return true;
            }
            
            // Check for feature name
            if (featureName && taskText.includes(featureName.toLowerCase())) {
                return true;
            }
            
            // Check for extraction keywords
            if (taskText.includes('extraction') || taskText.includes('extract') || taskText.includes('upstream')) {
                return true;
            }
            
            return false;
        });
    }

    /**
     * Extract feature name from task title
     */
    extractFeatureNameFromTask(taskTitle) {
        // Try to extract from common patterns
        const patterns = [
            /extract.+?feature.+?:?\s*(.+)/i,
            /implement.+?extracted.+?:?\s*(.+)/i,
            /feature.+?extraction.+?:?\s*(.+)/i
        ];
        
        for (const pattern of patterns) {
            const match = taskTitle.match(pattern);
            if (match) {
                return match[1].trim();
            }
        }
        
        // Fallback: return the task title
        return taskTitle.trim();
    }

    /**
     * Gather data from GitHub system
     */
    async gatherFromGitHub(extractionId, extractionData) {
        if (!this.integrations.github.enabled) return;

        try {
            // Look for extraction branch
            const extractionBranch = this.findExtractionBranch(extractionId, extractionData.featureName);
            if (extractionBranch) {
                extractionData.localBranch = extractionBranch;
            }
            
            console.log('🐙 Gathered data from GitHub system');
        } catch (error) {
            console.warn(`⚠️ Could not gather from GitHub: ${error.message}`);
        }
    }

    /**
     * Find extraction branch in Git
     */
    findExtractionBranch(extractionId, featureName) {
        try {
            const { execSync } = require('child_process');
            
            // Get all branches
            const branches = execSync('git branch -a', { 
                encoding: 'utf8', 
                cwd: this.projectRoot 
            }).split('\n').map(b => b.trim().replace(/^\*\s*/, ''));
            
            // Look for extraction branch patterns
            const patterns = [
                `feature/extracted-${extractionId}`,
                featureName ? `feature/extracted-${featureName.toLowerCase().replace(/\s+/g, '-')}` : null
            ].filter(Boolean);
            
            for (const pattern of patterns) {
                const matchingBranch = branches.find(branch => 
                    branch.includes(pattern) || branch.endsWith(pattern)
                );
                if (matchingBranch) {
                    return matchingBranch.replace(/^(remotes\/)?origin\//, '');
                }
            }
            
        } catch (error) {
            console.warn(`⚠️ Could not check Git branches: ${error.message}`);
        }
        
        return null;
    }

    /**
     * Validate extraction data has minimum requirements
     */
    validateExtractionData(extractionData) {
        const required = ['extractionId'];
        const missing = required.filter(field => !extractionData[field]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required extraction data: ${missing.join(', ')}`);
        }
        
        // Set defaults for missing optional fields
        if (!extractionData.featureName) {
            extractionData.featureName = `Feature-${extractionData.extractionId}`;
        }
        
        if (!extractionData.analysisDate) {
            extractionData.analysisDate = new Date().toISOString();
        }
    }

    /**
     * Create integration hooks for ongoing tracking
     */
    async createIntegrationHooks(featureRecord) {
        // Create GitHub workflow integration
        await this.createGitHubHooks(featureRecord);
        
        // Create TaskMaster integration
        await this.createTaskMasterHooks(featureRecord);
        
        // Create documentation hooks
        await this.createDocumentationHooks(featureRecord);
    }

    /**
     * Create GitHub workflow hooks
     */
    async createGitHubHooks(featureRecord) {
        try {
            // Create a metadata file for GitHub Actions to use
            const metadataPath = path.join(this.projectRoot, '.traceability', 'github-hooks', `${featureRecord.featureId}.json`);
            
            // Ensure directory exists
            const hooksDir = path.dirname(metadataPath);
            if (!fs.existsSync(hooksDir)) {
                fs.mkdirSync(hooksDir, { recursive: true });
            }
            
            const hookData = {
                featureId: featureRecord.featureId,
                extractionId: featureRecord.extractionId,
                localBranch: featureRecord.local.branch,
                webhookUrl: process.env.TRACEABILITY_WEBHOOK_URL || null,
                trackingEnabled: true,
                lastSync: new Date().toISOString()
            };
            
            fs.writeFileSync(metadataPath, JSON.stringify(hookData, null, 2));
            console.log('🔗 Created GitHub integration hooks');
            
        } catch (error) {
            console.warn(`⚠️ Could not create GitHub hooks: ${error.message}`);
        }
    }

    /**
     * Create TaskMaster integration hooks
     */
    async createTaskMasterHooks(featureRecord) {
        try {
            // Create a tracking file for TaskMaster integration
            const trackingPath = path.join(this.projectRoot, '.traceability', 'taskmaster-hooks', `${featureRecord.featureId}.json`);
            
            // Ensure directory exists
            const hooksDir = path.dirname(trackingPath);
            if (!fs.existsSync(hooksDir)) {
                fs.mkdirSync(hooksDir, { recursive: true });
            }
            
            const trackingData = {
                featureId: featureRecord.featureId,
                taskId: featureRecord.local.taskMasterTask,
                trackingEnabled: true,
                lastUpdate: new Date().toISOString(),
                milestoneMapping: {
                    'planning': '8.4',  // Implementation Guidelines
                    'implementation': '8.5',  // PR Template
                    'testing': '8.6',  // Traceability System
                    'deployment': '8.7'  // End-to-End Testing
                }
            };
            
            fs.writeFileSync(trackingPath, JSON.stringify(trackingData, null, 2));
            console.log('📋 Created TaskMaster integration hooks');
            
        } catch (error) {
            console.warn(`⚠️ Could not create TaskMaster hooks: ${error.message}`);
        }
    }

    /**
     * Create documentation system hooks
     */
    async createDocumentationHooks(featureRecord) {
        try {
            // Create a documentation tracking file
            const docTrackingPath = path.join(this.projectRoot, '.traceability', 'docs-hooks', `${featureRecord.featureId}.json`);
            
            // Ensure directory exists
            const hooksDir = path.dirname(docTrackingPath);
            if (!fs.existsSync(hooksDir)) {
                fs.mkdirSync(hooksDir, { recursive: true });
            }
            
            const docData = {
                featureId: featureRecord.featureId,
                assessmentPath: `docs/upstream-analysis/extraction/assessments/${featureRecord.extractionId}.md`,
                planPath: `docs/upstream-analysis/extraction/plans/${featureRecord.extractionId}.md`,
                trackingEnabled: true,
                lastSync: new Date().toISOString()
            };
            
            fs.writeFileSync(docTrackingPath, JSON.stringify(docData, null, 2));
            console.log('📚 Created documentation integration hooks');
            
        } catch (error) {
            console.warn(`⚠️ Could not create documentation hooks: ${error.message}`);
        }
    }

    /**
     * Sync traceability data with TaskMaster updates
     */
    async syncWithTaskMaster(featureId, taskUpdate) {
        try {
            console.log(`🔄 Syncing traceability with TaskMaster for feature: ${featureId}`);
            
            // Determine what type of update this is
            if (taskUpdate.status === 'done') {
                // Mark milestone as achieved
                await this.auditSystem.addMilestone(featureId, {
                    title: `TaskMaster Task Completed`,
                    description: `Task ${taskUpdate.taskId} marked as done in TaskMaster`,
                    type: 'technical',
                    metadata: {
                        taskId: taskUpdate.taskId,
                        source: 'taskmaster',
                        syncedAt: new Date().toISOString()
                    }
                });
            }
            
            if (taskUpdate.phase) {
                // Update lifecycle phase
                await this.auditSystem.updateFeatureLifecycle(featureId, taskUpdate.phase, 'completed', {
                    source: 'taskmaster',
                    taskId: taskUpdate.taskId,
                    syncedAt: new Date().toISOString()
                });
            }
            
            console.log('✅ TaskMaster sync completed');
            
        } catch (error) {
            console.error(`❌ TaskMaster sync failed: ${error.message}`);
        }
    }

    /**
     * Sync traceability data with GitHub updates
     */
    async syncWithGitHub(featureId, githubEvent) {
        try {
            console.log(`🔄 Syncing traceability with GitHub for feature: ${featureId}`);
            
            if (githubEvent.type === 'pull_request' && githubEvent.action === 'merged') {
                // PR merged - mark implementation phase complete
                await this.auditSystem.updateFeatureLifecycle(featureId, 'implementation', 'completed', {
                    source: 'github',
                    pullRequest: githubEvent.pullRequest,
                    mergedAt: githubEvent.mergedAt,
                    syncedAt: new Date().toISOString()
                });
                
                // Add milestone
                await this.auditSystem.addMilestone(featureId, {
                    title: 'Implementation Merged',
                    description: `Pull request #${githubEvent.pullRequest} merged successfully`,
                    type: 'technical',
                    metadata: {
                        pullRequest: githubEvent.pullRequest,
                        source: 'github',
                        syncedAt: new Date().toISOString()
                    }
                });
            }
            
            if (githubEvent.type === 'workflow_run' && githubEvent.status === 'failure') {
                // CI failure - add blocker
                await this.auditSystem.addBlocker(featureId, {
                    title: 'CI/CD Failure',
                    description: `Workflow ${githubEvent.workflow} failed`,
                    severity: 'high',
                    category: 'technical',
                    metadata: {
                        workflow: githubEvent.workflow,
                        runId: githubEvent.runId,
                        source: 'github',
                        reportedAt: new Date().toISOString()
                    }
                });
            }
            
            console.log('✅ GitHub sync completed');
            
        } catch (error) {
            console.error(`❌ GitHub sync failed: ${error.message}`);
        }
    }

    /**
     * Generate comprehensive integration report
     */
    async generateIntegrationReport(featureId) {
        try {
            console.log(`📊 Generating integration report for feature: ${featureId}`);
            
            const feature = this.auditSystem.loadFeatureRecord(featureId);
            if (!feature) {
                throw new Error(`Feature ${featureId} not found`);
            }
            
            const report = {
                featureId,
                generatedAt: new Date().toISOString(),
                integrationStatus: {
                    taskmaster: this.checkTaskMasterIntegration(feature),
                    github: this.checkGitHubIntegration(feature),
                    documentation: this.checkDocumentationIntegration(feature)
                },
                traceabilityChain: this.buildTraceabilityChain(feature),
                auditSummary: {
                    totalEvents: feature.auditTrail.length,
                    lastEvent: feature.auditTrail[feature.auditTrail.length - 1],
                    integrity: await this.auditSystem.validateAuditTrailIntegrity(featureId)
                },
                recommendations: this.generateRecommendations(feature)
            };
            
            // Save report
            const reportPath = path.join(this.projectRoot, '.traceability', 'reports', `integration-${featureId}-${Date.now()}.json`);
            fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            
            console.log(`✅ Integration report saved: ${reportPath}`);
            return report;
            
        } catch (error) {
            console.error(`❌ Failed to generate integration report: ${error.message}`);
            throw error;
        }
    }

    /**
     * Check TaskMaster integration status
     */
    checkTaskMasterIntegration(feature) {
        return {
            connected: !!feature.local.taskMasterTask,
            taskId: feature.local.taskMasterTask,
            lastSync: this.getLastSyncTime(feature, 'taskmaster'),
            healthStatus: feature.local.taskMasterTask ? 'healthy' : 'disconnected'
        };
    }

    /**
     * Check GitHub integration status
     */
    checkGitHubIntegration(feature) {
        return {
            connected: !!feature.local.branch,
            branch: feature.local.branch,
            lastSync: this.getLastSyncTime(feature, 'github'),
            healthStatus: feature.local.branch ? 'healthy' : 'disconnected'
        };
    }

    /**
     * Check documentation integration status
     */
    checkDocumentationIntegration(feature) {
        const assessmentExists = fs.existsSync(
            path.join(this.projectRoot, 'docs/upstream-analysis/extraction/assessments', `${feature.extractionId}.md`)
        );
        
        return {
            connected: assessmentExists,
            assessmentPath: `docs/upstream-analysis/extraction/assessments/${feature.extractionId}.md`,
            lastSync: this.getLastSyncTime(feature, 'documentation'),
            healthStatus: assessmentExists ? 'healthy' : 'missing_docs'
        };
    }

    /**
     * Get last sync time for integration
     */
    getLastSyncTime(feature, integration) {
        const syncEvents = feature.auditTrail.filter(event => 
            event.data && event.data.source === integration
        );
        
        if (syncEvents.length > 0) {
            return syncEvents[syncEvents.length - 1].timestamp;
        }
        
        return null;
    }

    /**
     * Build complete traceability chain
     */
    buildTraceabilityChain(feature) {
        return {
            upstream: {
                repository: feature.upstream.repository,
                commit: feature.upstream.commit,
                analysisSession: feature.upstream.analysisSession
            },
            extraction: {
                extractionId: feature.extractionId,
                assessmentScore: feature.assessment.valueScore,
                effortLevel: feature.assessment.effortLevel
            },
            implementation: {
                branch: feature.local.branch,
                taskMasterTask: feature.local.taskMasterTask,
                currentPhase: feature.lifecycle.status
            },
            quality: feature.quality
        };
    }

    /**
     * Generate recommendations for improving integration
     */
    generateRecommendations(feature) {
        const recommendations = [];
        
        // Check for missing integrations
        if (!feature.local.taskMasterTask) {
            recommendations.push({
                type: 'integration',
                priority: 'medium',
                message: 'Consider linking to a TaskMaster task for better project tracking'
            });
        }
        
        if (!feature.local.branch) {
            recommendations.push({
                type: 'integration',
                priority: 'high',
                message: 'Implementation branch not detected - ensure proper branch naming convention'
            });
        }
        
        // Check audit trail health
        if (feature.auditTrail.length < 3) {
            recommendations.push({
                type: 'audit',
                priority: 'low',
                message: 'Limited audit trail - consider adding more milestone tracking'
            });
        }
        
        // Check quality metrics
        if (!feature.quality.testCoverage) {
            recommendations.push({
                type: 'quality',
                priority: 'high',
                message: 'Test coverage not tracked - implement quality metrics tracking'
            });
        }
        
        return recommendations;
    }
}

// Export for use in other modules
module.exports = { TraceabilityIntegration };

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0];
    const extractionId = args[1];

    const integration = new TraceabilityIntegration();

    switch (command) {
        case 'init':
            if (!extractionId) {
                console.error('❌ Extraction ID required');
                process.exit(1);
            }
            
            integration.initializeFromExtractionData(extractionId)
                .then(feature => {
                    console.log(`✅ Traceability initialized for feature: ${feature.featureId}`);
                })
                .catch(error => {
                    console.error(`❌ Initialization failed: ${error.message}`);
                    process.exit(1);
                });
            break;

        case 'report':
            if (!extractionId) {
                console.error('❌ Feature ID required for report');
                process.exit(1);
            }
            
            integration.generateIntegrationReport(extractionId)
                .then(report => {
                    console.log(`✅ Integration report generated for: ${extractionId}`);
                    console.log(`📊 TaskMaster: ${report.integrationStatus.taskmaster.healthStatus}`);
                    console.log(`🐙 GitHub: ${report.integrationStatus.github.healthStatus}`);
                    console.log(`📚 Documentation: ${report.integrationStatus.documentation.healthStatus}`);
                })
                .catch(error => {
                    console.error(`❌ Report generation failed: ${error.message}`);
                    process.exit(1);
                });
            break;

        case 'help':
        default:
            console.log(`
🔗 Traceability Integration CLI

Commands:
  init <extractionId>    Initialize traceability for an extraction
  report <featureId>     Generate integration report for a feature
  help                   Show this help message

Usage:
  node traceability_integration.js [command] [options]

Examples:
  node traceability_integration.js init EXT-123456
  node traceability_integration.js report FEAT-789012
            `);
            break;
    }
}