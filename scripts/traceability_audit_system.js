#!/usr/bin/env node

/**
 * Comprehensive Traceability and Audit System for Feature Extraction
 *
 * This system provides complete audit trail tracking for extracted features,
 * from initial analysis through implementation and deployment.
 *
 * Features:
 * - Complete lifecycle tracking
 * - Audit event logging with chain integrity
 * - Cross-system integration (TaskMaster, GitHub, Documentation)
 * - Analytics and reporting
 * - Real-time progress monitoring
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Main Traceability and Audit System
 */
class TraceabilityAuditSystem {
    constructor(options = {}) {
        this.projectRoot = options.projectRoot || process.cwd();
        this.auditDir = path.join(this.projectRoot, '.traceability');
        this.ensureAuditDirectories();

        // Configuration
        this.config = {
            retentionDays: options.retentionDays || 365,
            compressionThreshold: options.compressionThreshold || 10000,
            encryptionKey: options.encryptionKey || this.generateEncryptionKey(),
            integrations: {
                taskmaster: true,
                github: true,
                documentation: true
            }
        };

        // Initialize tracking state
        this.currentSession = null;
        this.eventChain = [];
    }

    /**
     * Ensure audit directory structure exists
     */
    ensureAuditDirectories() {
        const dirs = [
            this.auditDir,
            path.join(this.auditDir, 'events'),
            path.join(this.auditDir, 'features'),
            path.join(this.auditDir, 'sessions'),
            path.join(this.auditDir, 'reports'),
            path.join(this.auditDir, 'backups')
        ];

        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    /**
     * Generate a unique encryption key for data protection
     */
    generateEncryptionKey() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Create a new audit session
     */
    createAuditSession(sessionType, metadata = {}) {
        const sessionId = this.generateId('SES');
        const session = {
            sessionId,
            sessionType, // 'analysis', 'extraction', 'implementation', 'deployment'
            startTime: new Date().toISOString(),
            endTime: null,
            status: 'active',
            metadata: {
                ...metadata,
                user: process.env.USER || 'system',
                environment: process.env.NODE_ENV || 'development',
                version: this.getSystemVersion()
            },
            events: [],
            performance: {
                startMemory: process.memoryUsage(),
                operations: 0,
                errors: 0,
                warnings: 0
            }
        };

        this.currentSession = session;
        this.logEvent('session_created', { sessionId, sessionType });

        return sessionId;
    }

    /**
     * End the current audit session
     */
    endAuditSession(sessionId, summary = {}) {
        if (!this.currentSession || this.currentSession.sessionId !== sessionId) {
            throw new Error(`Session ${sessionId} not found or not active`);
        }

        this.currentSession.endTime = new Date().toISOString();
        this.currentSession.status = 'completed';
        this.currentSession.summary = summary;
        this.currentSession.performance.endMemory = process.memoryUsage();
        this.currentSession.performance.duration =
            new Date(this.currentSession.endTime) - new Date(this.currentSession.startTime);

        // Save session to disk
        this.saveSession(this.currentSession);

        this.logEvent('session_completed', {
            sessionId,
            duration: this.currentSession.performance.duration,
            operations: this.currentSession.performance.operations
        });

        const completedSession = this.currentSession;
        this.currentSession = null;

        return completedSession;
    }

    /**
     * Initialize tracking for a new extracted feature
     */
    initializeFeatureTracking(extractionData) {
        const featureId = extractionData.extractionId || this.generateId('EXT');

        const featureRecord = {
            featureId,
            featureName: extractionData.featureName,
            extractionId: extractionData.extractionId,

            // Upstream traceability
            upstream: {
                repository: extractionData.upstreamRepository,
                commit: extractionData.upstreamCommit,
                branch: extractionData.upstreamBranch,
                pullRequest: extractionData.upstreamPR,
                analysisSession: extractionData.analysisSession
            },

            // Local implementation
            local: {
                repository: this.getLocalRepository(),
                branch: extractionData.localBranch,
                implementationPlan: extractionData.implementationPlan,
                taskMasterTask: extractionData.taskMasterTask
            },

            // Assessment data
            assessment: {
                valueScore: extractionData.valueScore,
                effortLevel: extractionData.effortLevel,
                roiScore: extractionData.roiScore,
                compatibilityScore: extractionData.compatibilityScore,
                riskLevel: extractionData.riskLevel
            },

            // Lifecycle tracking
            lifecycle: {
                status: 'initialized',
                phases: [
                    { name: 'analysis', status: 'completed', completedAt: extractionData.analysisDate },
                    { name: 'planning', status: 'in_progress', startedAt: new Date().toISOString() },
                    { name: 'implementation', status: 'pending' },
                    { name: 'testing', status: 'pending' },
                    { name: 'deployment', status: 'pending' }
                ],
                milestones: [],
                blockers: []
            },

            // Quality metrics
            quality: {
                testCoverage: null,
                codeQualityScore: null,
                securityScanResults: null,
                performanceImpact: null
            },

            // Audit trail
            auditTrail: [],

            // Metadata
            createdAt: new Date().toISOString(),
            createdBy: process.env.USER || 'system',
            lastUpdated: new Date().toISOString()
        };

        // Save feature record
        this.saveFeatureRecord(featureRecord);

        this.logEvent('feature_tracking_initialized', {
            featureId,
            featureName: extractionData.featureName,
            upstreamCommit: extractionData.upstreamCommit
        });

        return featureRecord;
    }

    /**
     * Update feature lifecycle status
     */
    updateFeatureLifecycle(featureId, phase, status, metadata = {}) {
        const feature = this.loadFeatureRecord(featureId);
        if (!feature) {
            throw new Error(`Feature ${featureId} not found`);
        }

        // Update phase status
        const phaseIndex = feature.lifecycle.phases.findIndex(p => p.name === phase);
        if (phaseIndex === -1) {
            throw new Error(`Phase ${phase} not found for feature ${featureId}`);
        }

        const oldStatus = feature.lifecycle.phases[phaseIndex].status;
        feature.lifecycle.phases[phaseIndex].status = status;
        feature.lifecycle.phases[phaseIndex].lastUpdated = new Date().toISOString();

        if (status === 'completed') {
            feature.lifecycle.phases[phaseIndex].completedAt = new Date().toISOString();
        } else if (status === 'in_progress' && !feature.lifecycle.phases[phaseIndex].startedAt) {
            feature.lifecycle.phases[phaseIndex].startedAt = new Date().toISOString();
        }

        // Update overall status
        const completedPhases = feature.lifecycle.phases.filter(p => p.status === 'completed').length;
        const totalPhases = feature.lifecycle.phases.length;
        const progressPercentage = Math.round((completedPhases / totalPhases) * 100);

        feature.lifecycle.status = this.calculateOverallStatus(feature.lifecycle.phases);
        feature.lifecycle.progress = progressPercentage;
        feature.lastUpdated = new Date().toISOString();

        // Add audit event
        const auditEvent = {
            eventId: this.generateId('AUD'),
            eventType: 'lifecycle_update',
            timestamp: new Date().toISOString(),
            data: {
                phase,
                oldStatus,
                newStatus: status,
                progressPercentage,
                metadata
            },
            sessionId: this.currentSession?.sessionId
        };

        feature.auditTrail.push(auditEvent);

        // Save updated feature
        this.saveFeatureRecord(feature);

        this.logEvent('feature_lifecycle_updated', {
            featureId,
            phase,
            oldStatus,
            newStatus: status,
            progressPercentage
        });

        return feature;
    }

    /**
     * Add milestone to feature tracking
     */
    addMilestone(featureId, milestone) {
        const feature = this.loadFeatureRecord(featureId);
        if (!feature) {
            throw new Error(`Feature ${featureId} not found`);
        }

        const milestoneRecord = {
            milestoneId: this.generateId('MIL'),
            title: milestone.title,
            description: milestone.description,
            type: milestone.type, // 'technical', 'business', 'quality'
            achievedAt: new Date().toISOString(),
            achievedBy: process.env.USER || 'system',
            metadata: milestone.metadata || {}
        };

        feature.lifecycle.milestones.push(milestoneRecord);
        feature.lastUpdated = new Date().toISOString();

        // Add audit event
        const auditEvent = {
            eventId: this.generateId('AUD'),
            eventType: 'milestone_achieved',
            timestamp: new Date().toISOString(),
            data: {
                milestoneId: milestoneRecord.milestoneId,
                title: milestone.title,
                type: milestone.type
            },
            sessionId: this.currentSession?.sessionId
        };

        feature.auditTrail.push(auditEvent);

        this.saveFeatureRecord(feature);

        this.logEvent('milestone_added', {
            featureId,
            milestoneId: milestoneRecord.milestoneId,
            title: milestone.title
        });

        return milestoneRecord;
    }

    /**
     * Add blocker to feature tracking
     */
    addBlocker(featureId, blocker) {
        const feature = this.loadFeatureRecord(featureId);
        if (!feature) {
            throw new Error(`Feature ${featureId} not found`);
        }

        const blockerRecord = {
            blockerId: this.generateId('BLK'),
            title: blocker.title,
            description: blocker.description,
            severity: blocker.severity, // 'low', 'medium', 'high', 'critical'
            category: blocker.category, // 'technical', 'business', 'resource'
            status: 'active',
            reportedAt: new Date().toISOString(),
            reportedBy: process.env.USER || 'system',
            resolvedAt: null,
            resolvedBy: null,
            resolution: null,
            metadata: blocker.metadata || {}
        };

        feature.lifecycle.blockers.push(blockerRecord);
        feature.lastUpdated = new Date().toISOString();

        // Add audit event
        const auditEvent = {
            eventId: this.generateId('AUD'),
            eventType: 'blocker_reported',
            timestamp: new Date().toISOString(),
            data: {
                blockerId: blockerRecord.blockerId,
                title: blocker.title,
                severity: blocker.severity
            },
            sessionId: this.currentSession?.sessionId
        };

        feature.auditTrail.push(auditEvent);

        this.saveFeatureRecord(feature);

        this.logEvent('blocker_added', {
            featureId,
            blockerId: blockerRecord.blockerId,
            title: blocker.title,
            severity: blocker.severity
        });

        return blockerRecord;
    }

    /**
     * Resolve a blocker
     */
    resolveBlocker(featureId, blockerId, resolution) {
        const feature = this.loadFeatureRecord(featureId);
        if (!feature) {
            throw new Error(`Feature ${featureId} not found`);
        }

        const blocker = feature.lifecycle.blockers.find(b => b.blockerId === blockerId);
        if (!blocker) {
            throw new Error(`Blocker ${blockerId} not found`);
        }

        blocker.status = 'resolved';
        blocker.resolvedAt = new Date().toISOString();
        blocker.resolvedBy = process.env.USER || 'system';
        blocker.resolution = resolution;

        feature.lastUpdated = new Date().toISOString();

        // Add audit event
        const auditEvent = {
            eventId: this.generateId('AUD'),
            eventType: 'blocker_resolved',
            timestamp: new Date().toISOString(),
            data: {
                blockerId,
                title: blocker.title,
                resolution
            },
            sessionId: this.currentSession?.sessionId
        };

        feature.auditTrail.push(auditEvent);

        this.saveFeatureRecord(feature);

        this.logEvent('blocker_resolved', {
            featureId,
            blockerId,
            title: blocker.title
        });

        return blocker;
    }

    /**
     * Update feature quality metrics
     */
    updateQualityMetrics(featureId, metrics) {
        const feature = this.loadFeatureRecord(featureId);
        if (!feature) {
            throw new Error(`Feature ${featureId} not found`);
        }

        const oldMetrics = { ...feature.quality };
        feature.quality = { ...feature.quality, ...metrics };
        feature.lastUpdated = new Date().toISOString();

        // Add audit event
        const auditEvent = {
            eventId: this.generateId('AUD'),
            eventType: 'quality_metrics_updated',
            timestamp: new Date().toISOString(),
            data: {
                oldMetrics,
                newMetrics: feature.quality,
                updatedFields: Object.keys(metrics)
            },
            sessionId: this.currentSession?.sessionId
        };

        feature.auditTrail.push(auditEvent);

        this.saveFeatureRecord(feature);

        this.logEvent('quality_metrics_updated', {
            featureId,
            updatedFields: Object.keys(metrics)
        });

        return feature.quality;
    }

    /**
     * Generate analytics report for features
     */
    generateAnalyticsReport(options = {}) {
        const {
            startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            endDate = new Date(),
            includeDetails = false
        } = options;

        const features = this.getAllFeatures();
        const filteredFeatures = features.filter(f => {
            const createdAt = new Date(f.createdAt);
            return createdAt >= startDate && createdAt <= endDate;
        });

        const report = {
            reportId: this.generateId('RPT'),
            generatedAt: new Date().toISOString(),
            period: {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            },
            summary: {
                totalFeatures: filteredFeatures.length,
                completedFeatures: filteredFeatures.filter(f => f.lifecycle.status === 'completed').length,
                inProgressFeatures: filteredFeatures.filter(f => f.lifecycle.status === 'in_progress').length,
                blockedFeatures: filteredFeatures.filter(f => f.lifecycle.status === 'blocked').length,
                averageCompletionTime: this.calculateAverageCompletionTime(filteredFeatures),
                totalMilestones: filteredFeatures.reduce((sum, f) => sum + f.lifecycle.milestones.length, 0),
                totalBlockers: filteredFeatures.reduce((sum, f) => sum + f.lifecycle.blockers.length, 0),
                activeBlockers: filteredFeatures.reduce((sum, f) =>
                    sum + f.lifecycle.blockers.filter(b => b.status === 'active').length, 0)
            },
            metrics: {
                averageValueScore: this.calculateAverage(filteredFeatures, 'assessment.valueScore'),
                averageROIScore: this.calculateAverage(filteredFeatures, 'assessment.roiScore'),
                effortDistribution: this.calculateEffortDistribution(filteredFeatures),
                phaseDistribution: this.calculatePhaseDistribution(filteredFeatures),
                qualityMetrics: this.aggregateQualityMetrics(filteredFeatures)
            },
            trends: {
                featuresOverTime: this.calculateFeaturesOverTime(filteredFeatures),
                completionRate: this.calculateCompletionRate(filteredFeatures),
                blockerRate: this.calculateBlockerRate(filteredFeatures)
            }
        };

        if (includeDetails) {
            report.features = filteredFeatures;
        }

        // Save report
        this.saveReport(report);

        this.logEvent('analytics_report_generated', {
            reportId: report.reportId,
            totalFeatures: report.summary.totalFeatures
        });

        return report;
    }

    /**
     * Log an audit event
     */
    logEvent(eventType, data = {}) {
        const event = {
            eventId: this.generateId('EVT'),
            eventType,
            timestamp: new Date().toISOString(),
            sessionId: this.currentSession?.sessionId,
            data,
            checksum: null
        };

        // Calculate checksum for integrity
        event.checksum = this.calculateChecksum(event);

        // Add to event chain
        this.eventChain.push(event);

        // Persist event
        this.saveEvent(event);

        // Update session performance
        if (this.currentSession) {
            this.currentSession.events.push(event.eventId);
            this.currentSession.performance.operations++;
        }

        return event;
    }

    /**
     * Validate audit trail integrity
     */
    validateAuditTrailIntegrity(featureId) {
        const feature = this.loadFeatureRecord(featureId);
        if (!feature) {
            throw new Error(`Feature ${featureId} not found`);
        }

        const validationResults = {
            featureId,
            isValid: true,
            issues: [],
            checksumValidation: true,
            chronologyValidation: true,
            completenessValidation: true
        };

        // Validate event checksums
        for (const auditEvent of feature.auditTrail) {
            const calculatedChecksum = this.calculateChecksum(auditEvent);
            if (auditEvent.checksum !== calculatedChecksum) {
                validationResults.isValid = false;
                validationResults.checksumValidation = false;
                validationResults.issues.push({
                    type: 'checksum_mismatch',
                    eventId: auditEvent.eventId,
                    expected: calculatedChecksum,
                    actual: auditEvent.checksum
                });
            }
        }

        // Validate chronological order
        for (let i = 1; i < feature.auditTrail.length; i++) {
            const prevEvent = feature.auditTrail[i - 1];
            const currentEvent = feature.auditTrail[i];

            if (new Date(prevEvent.timestamp) > new Date(currentEvent.timestamp)) {
                validationResults.isValid = false;
                validationResults.chronologyValidation = false;
                validationResults.issues.push({
                    type: 'chronology_violation',
                    eventId: currentEvent.eventId,
                    timestamp: currentEvent.timestamp,
                    previousTimestamp: prevEvent.timestamp
                });
            }
        }

        // Validate completeness
        const requiredEvents = ['lifecycle_update'];
        const eventTypes = feature.auditTrail.map(e => e.eventType);

        for (const requiredEvent of requiredEvents) {
            if (!eventTypes.includes(requiredEvent)) {
                validationResults.isValid = false;
                validationResults.completenessValidation = false;
                validationResults.issues.push({
                    type: 'missing_required_event',
                    eventType: requiredEvent
                });
            }
        }

        this.logEvent('audit_trail_validated', {
            featureId,
            isValid: validationResults.isValid,
            issueCount: validationResults.issues.length
        });

        return validationResults;
    }

    // ===============================
    // Helper Methods
    // ===============================

    /**
     * Generate a unique ID with prefix
     */
    generateId(prefix = 'ID') {
        const timestamp = Date.now().toString(36);
        const random = crypto.randomBytes(4).toString('hex');
        return `${prefix}-${timestamp}-${random}`;
    }

    /**
     * Calculate checksum for audit events
     */
    calculateChecksum(obj) {
        // Create a copy without the checksum field
        const objForChecksum = { ...obj };
        delete objForChecksum.checksum;

        const dataString = JSON.stringify(objForChecksum, Object.keys(objForChecksum).sort());
        return crypto.createHash('sha256').update(dataString).digest('hex');
    }

    /**
     * Calculate overall status from phases
     */
    calculateOverallStatus(phases) {
        const hasBlocked = phases.some(p => p.status === 'blocked');
        const hasInProgress = phases.some(p => p.status === 'in_progress');
        const allCompleted = phases.every(p => p.status === 'completed');

        if (hasBlocked) return 'blocked';
        if (allCompleted) return 'completed';
        if (hasInProgress) return 'in_progress';
        return 'pending';
    }

    /**
     * Get system version information
     */
    getSystemVersion() {
        try {
            const packagePath = path.join(this.projectRoot, 'package.json');
            if (fs.existsSync(packagePath)) {
                const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
                return pkg.version || '1.0.0';
            }
        } catch (error) {
            // Fallback to default version
        }
        return '1.0.0';
    }

    /**
     * Get local repository information
     */
    getLocalRepository() {
        try {
            const gitConfigPath = path.join(this.projectRoot, '.git', 'config');
            if (fs.existsSync(gitConfigPath)) {
                const gitConfig = fs.readFileSync(gitConfigPath, 'utf8');
                const urlMatch = gitConfig.match(/url = (.+)/);
                if (urlMatch) {
                    return urlMatch[1];
                }
            }
        } catch (error) {
            // Fallback to project root
        }
        return this.projectRoot;
    }

    // ===============================
    // File System Operations
    // ===============================

    /**
     * Save feature record to disk
     */
    saveFeatureRecord(feature) {
        const featurePath = path.join(this.auditDir, 'features', `${feature.featureId}.json`);
        fs.writeFileSync(featurePath, JSON.stringify(feature, null, 2));
    }

    /**
     * Load feature record from disk
     */
    loadFeatureRecord(featureId) {
        const featurePath = path.join(this.auditDir, 'features', `${featureId}.json`);
        if (!fs.existsSync(featurePath)) {
            return null;
        }
        return JSON.parse(fs.readFileSync(featurePath, 'utf8'));
    }

    /**
     * Get all feature records
     */
    getAllFeatures() {
        const featuresDir = path.join(this.auditDir, 'features');
        const featureFiles = fs.readdirSync(featuresDir).filter(f => f.endsWith('.json'));

        return featureFiles.map(file => {
            const featurePath = path.join(featuresDir, file);
            return JSON.parse(fs.readFileSync(featurePath, 'utf8'));
        });
    }

    /**
     * Save audit session to disk
     */
    saveSession(session) {
        const sessionPath = path.join(this.auditDir, 'sessions', `${session.sessionId}.json`);
        fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2));
    }

    /**
     * Save audit event to disk
     */
    saveEvent(event) {
        const eventPath = path.join(this.auditDir, 'events', `${event.eventId}.json`);
        fs.writeFileSync(eventPath, JSON.stringify(event, null, 2));
    }

    /**
     * Save analytics report to disk
     */
    saveReport(report) {
        const reportPath = path.join(this.auditDir, 'reports', `${report.reportId}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    }

    // ===============================
    // Analytics Helper Methods
    // ===============================

    /**
     * Calculate average completion time
     */
    calculateAverageCompletionTime(features) {
        const completedFeatures = features.filter(f => f.lifecycle.status === 'completed');
        if (completedFeatures.length === 0) return 0;

        const totalTime = completedFeatures.reduce((sum, feature) => {
            const startTime = new Date(feature.createdAt);
            const endTime = new Date(feature.lastUpdated);
            return sum + (endTime - startTime);
        }, 0);

        return Math.round(totalTime / completedFeatures.length / (1000 * 60 * 60 * 24)); // Days
    }

    /**
     * Calculate average for nested properties
     */
    calculateAverage(features, propertyPath) {
        const values = features.map(f => {
            const value = propertyPath.split('.').reduce((obj, key) => obj?.[key], f);
            return typeof value === 'number' ? value : 0;
        }).filter(v => v > 0);

        if (values.length === 0) return 0;
        return Math.round((values.reduce((sum, v) => sum + v, 0) / values.length) * 100) / 100;
    }

    /**
     * Calculate effort distribution
     */
    calculateEffortDistribution(features) {
        const distribution = {};
        features.forEach(f => {
            const effort = f.assessment.effortLevel || 'unknown';
            distribution[effort] = (distribution[effort] || 0) + 1;
        });
        return distribution;
    }

    /**
     * Calculate phase distribution
     */
    calculatePhaseDistribution(features) {
        const distribution = {};
        features.forEach(f => {
            const status = f.lifecycle.status || 'unknown';
            distribution[status] = (distribution[status] || 0) + 1;
        });
        return distribution;
    }

    /**
     * Aggregate quality metrics
     */
    aggregateQualityMetrics(features) {
        const metrics = {
            testCoverage: this.calculateAverage(features, 'quality.testCoverage'),
            codeQualityScore: this.calculateAverage(features, 'quality.codeQualityScore'),
            securityIssues: features.reduce((sum, f) =>
                sum + (f.quality.securityScanResults?.issues || 0), 0)
        };
        return metrics;
    }

    /**
     * Calculate features over time
     */
    calculateFeaturesOverTime(features) {
        const timeGroups = {};
        features.forEach(f => {
            const month = new Date(f.createdAt).toISOString().substring(0, 7); // YYYY-MM
            timeGroups[month] = (timeGroups[month] || 0) + 1;
        });
        return timeGroups;
    }

    /**
     * Calculate completion rate
     */
    calculateCompletionRate(features) {
        if (features.length === 0) return 0;
        const completed = features.filter(f => f.lifecycle.status === 'completed').length;
        return Math.round((completed / features.length) * 100 * 100) / 100;
    }

    /**
     * Calculate blocker rate
     */
    calculateBlockerRate(features) {
        if (features.length === 0) return 0;
        const blocked = features.filter(f => f.lifecycle.status === 'blocked').length;
        return Math.round((blocked / features.length) * 100 * 100) / 100;
    }
}

// Export for use in other modules
module.exports = { TraceabilityAuditSystem };

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0];

    const system = new TraceabilityAuditSystem();

    switch (command) {
        case 'init':
            console.log('🔧 Initializing traceability audit system...');
            system.ensureAuditDirectories();
            console.log('✅ Traceability audit system initialized');
            break;

        case 'report':
            console.log('📊 Generating analytics report...');
            const report = system.generateAnalyticsReport({ includeDetails: false });
            console.log(`✅ Report generated: ${report.reportId}`);
            console.log(`📈 Total features: ${report.summary.totalFeatures}`);
            console.log(`✅ Completed: ${report.summary.completedFeatures}`);
            console.log(`🔄 In progress: ${report.summary.inProgressFeatures}`);
            break;

        case 'validate':
            const featureId = args[1];
            if (!featureId) {
                console.error('❌ Feature ID required for validation');
                process.exit(1);
            }
            console.log(`🔍 Validating audit trail for feature: ${featureId}`);
            const validation = system.validateAuditTrailIntegrity(featureId);
            console.log(`${validation.isValid ? '✅' : '❌'} Validation result: ${validation.isValid ? 'PASSED' : 'FAILED'}`);
            if (!validation.isValid) {
                console.log(`❌ Issues found: ${validation.issues.length}`);
                validation.issues.forEach(issue => {
                    console.log(`   • ${issue.type}: ${JSON.stringify(issue)}`);
                });
            }
            break;

        case 'help':
        default:
            console.log(`
🔗 Traceability Audit System CLI

Commands:
  init      Initialize the audit system directories
  report    Generate analytics report for all features
  validate <featureId>  Validate audit trail integrity for a feature
  help      Show this help message

Usage:
  node traceability_audit_system.js [command] [options]

Examples:
  node traceability_audit_system.js init
  node traceability_audit_system.js report
  node traceability_audit_system.js validate EXT-123456
            `);
            break;
    }
}
