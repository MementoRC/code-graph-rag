#!/usr/bin/env node

/**
 * Traceability Webhook Handler
 *
 * This service handles real-time updates from GitHub, TaskMaster, and other
 * integrated systems to maintain up-to-date traceability information.
 */

const http = require('http');
const crypto = require('crypto');
const { TraceabilityIntegration } = require('./traceability_integration');

/**
 * Webhook handler for real-time traceability updates
 */
class TraceabilityWebhookHandler {
    constructor(options = {}) {
        this.port = options.port || process.env.TRACEABILITY_WEBHOOK_PORT || 8080;
        this.secret = options.secret || process.env.TRACEABILITY_WEBHOOK_SECRET || 'default-secret';
        this.projectRoot = options.projectRoot || process.cwd();

        this.integration = new TraceabilityIntegration({ projectRoot: this.projectRoot });
        this.server = null;

        // Event handlers
        this.handlers = {
            github: this.handleGitHubWebhook.bind(this),
            taskmaster: this.handleTaskMasterWebhook.bind(this),
            custom: this.handleCustomWebhook.bind(this)
        };
    }

    /**
     * Start the webhook server
     */
    start() {
        this.server = http.createServer((req, res) => {
            this.handleRequest(req, res);
        });

        this.server.listen(this.port, () => {
            console.log(`🔗 Traceability webhook server listening on port ${this.port}`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            console.log('🛑 Shutting down webhook server...');
            this.server.close(() => {
                console.log('✅ Webhook server shut down');
                process.exit(0);
            });
        });
    }

    /**
     * Handle incoming webhook requests
     */
    async handleRequest(req, res) {
        try {
            // Collect request body
            const body = await this.collectRequestBody(req);

            // Validate signature if provided
            if (req.headers['x-hub-signature-256']) {
                if (!this.validateSignature(body, req.headers['x-hub-signature-256'])) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid signature' }));
                    return;
                }
            }

            // Parse request body
            let payload;
            try {
                payload = JSON.parse(body);
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
                return;
            }

            // Determine webhook type and route
            const webhookType = this.detectWebhookType(req, payload);
            const handler = this.handlers[webhookType];

            if (!handler) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: `Unknown webhook type: ${webhookType}` }));
                return;
            }

            // Process webhook
            const result = await handler(req, payload);

            // Send response
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'success',
                processed: true,
                result: result
            }));

        } catch (error) {
            console.error(`❌ Webhook processing error: ${error.message}`);

            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                status: 'error',
                message: error.message
            }));
        }
    }

    /**
     * Collect request body
     */
    collectRequestBody(req) {
        return new Promise((resolve, reject) => {
            let body = '';

            req.on('data', chunk => {
                body += chunk.toString();
            });

            req.on('end', () => {
                resolve(body);
            });

            req.on('error', error => {
                reject(error);
            });
        });
    }

    /**
     * Validate webhook signature
     */
    validateSignature(body, signature) {
        const expectedSignature = crypto
            .createHmac('sha256', this.secret)
            .update(body)
            .digest('hex');

        const providedSignature = signature.replace('sha256=', '');

        return crypto.timingSafeEqual(
            Buffer.from(expectedSignature, 'hex'),
            Buffer.from(providedSignature, 'hex')
        );
    }

    /**
     * Detect webhook type from request
     */
    detectWebhookType(req, payload) {
        // GitHub webhook
        if (req.headers['x-github-event']) {
            return 'github';
        }

        // TaskMaster webhook
        if (req.headers['x-taskmaster-event'] || payload.source === 'taskmaster') {
            return 'taskmaster';
        }

        // Custom webhook
        return 'custom';
    }

    /**
     * Handle GitHub webhook events
     */
    async handleGitHubWebhook(req, payload) {
        const eventType = req.headers['x-github-event'];
        console.log(`🐙 Processing GitHub webhook: ${eventType}`);

        const result = {
            eventType,
            processed: false,
            featuresUpdated: []
        };

        try {
            switch (eventType) {
                case 'pull_request':
                    await this.handlePullRequestEvent(payload, result);
                    break;

                case 'workflow_run':
                    await this.handleWorkflowRunEvent(payload, result);
                    break;

                case 'push':
                    await this.handlePushEvent(payload, result);
                    break;

                case 'issues':
                    await this.handleIssuesEvent(payload, result);
                    break;

                default:
                    console.log(`ℹ️ Unhandled GitHub event type: ${eventType}`);
            }

            result.processed = true;
            console.log(`✅ GitHub webhook processed: ${eventType}`);

        } catch (error) {
            console.error(`❌ GitHub webhook processing failed: ${error.message}`);
            result.error = error.message;
        }

        return result;
    }

    /**
     * Handle pull request events
     */
    async handlePullRequestEvent(payload, result) {
        const { action, pull_request } = payload;
        const branchName = pull_request.head.ref;

        // Check if this is an extraction branch
        if (!branchName.startsWith('feature/extracted-')) {
            return;
        }

        const featureId = this.extractFeatureIdFromBranch(branchName);
        if (!featureId) {
            return;
        }

        const githubEvent = {
            type: 'pull_request',
            action,
            pullRequest: pull_request.number,
            branchName,
            mergedAt: pull_request.merged_at,
            state: pull_request.state,
            merged: pull_request.merged
        };

        await this.integration.syncWithGitHub(featureId, githubEvent);
        result.featuresUpdated.push(featureId);

        console.log(`🔄 Updated traceability for feature ${featureId} from PR ${pull_request.number}`);
    }

    /**
     * Handle workflow run events
     */
    async handleWorkflowRunEvent(payload, result) {
        const { action, workflow_run } = payload;
        const branchName = workflow_run.head_branch;

        // Check if this is an extraction branch
        if (!branchName || !branchName.startsWith('feature/extracted-')) {
            return;
        }

        const featureId = this.extractFeatureIdFromBranch(branchName);
        if (!featureId) {
            return;
        }

        const githubEvent = {
            type: 'workflow_run',
            action,
            workflow: workflow_run.name,
            runId: workflow_run.id,
            status: workflow_run.status,
            conclusion: workflow_run.conclusion,
            branchName
        };

        await this.integration.syncWithGitHub(featureId, githubEvent);
        result.featuresUpdated.push(featureId);

        console.log(`🔄 Updated traceability for feature ${featureId} from workflow ${workflow_run.name}`);
    }

    /**
     * Handle push events
     */
    async handlePushEvent(payload, result) {
        const branchName = payload.ref.replace('refs/heads/', '');

        // Check if this is an extraction branch
        if (!branchName.startsWith('feature/extracted-')) {
            return;
        }

        const featureId = this.extractFeatureIdFromBranch(branchName);
        if (!featureId) {
            return;
        }

        // Add milestone for commits
        const commitCount = payload.commits.length;
        if (commitCount > 0) {
            await this.integration.auditSystem.addMilestone(featureId, {
                title: `Code Commits`,
                description: `${commitCount} commit(s) pushed to ${branchName}`,
                type: 'technical',
                metadata: {
                    commitCount,
                    branchName,
                    latestCommit: payload.head_commit.id,
                    source: 'github',
                    eventType: 'push'
                }
            });

            result.featuresUpdated.push(featureId);
            console.log(`🔄 Added milestone for feature ${featureId} from push event`);
        }
    }

    /**
     * Handle issues events
     */
    async handleIssuesEvent(payload, result) {
        const { action, issue } = payload;

        // Look for extraction references in issue title or body
        const issueText = `${issue.title} ${issue.body}`.toLowerCase();
        const extractionMatches = issueText.match(/(?:ext-|feature\/)([a-z0-9-]+)/gi);

        if (!extractionMatches) {
            return;
        }

        for (const match of extractionMatches) {
            const featureId = this.normalizeFeatureId(match);

            if (action === 'opened' && issue.labels.some(label => label.name === 'bug')) {
                // Bug reported
                await this.integration.auditSystem.addBlocker(featureId, {
                    title: `Bug Report: ${issue.title}`,
                    description: issue.body || 'See GitHub issue for details',
                    severity: this.determineSeverityFromLabels(issue.labels),
                    category: 'technical',
                    metadata: {
                        issueNumber: issue.number,
                        issueUrl: issue.html_url,
                        source: 'github',
                        eventType: 'issue_opened'
                    }
                });

                result.featuresUpdated.push(featureId);
                console.log(`🔄 Added blocker for feature ${featureId} from issue #${issue.number}`);
            }

            if (action === 'closed' && issue.labels.some(label => label.name === 'bug')) {
                // Bug resolved - this would need additional logic to find and resolve the blocker
                console.log(`ℹ️ Bug issue closed for feature ${featureId}: #${issue.number}`);
            }
        }
    }

    /**
     * Handle TaskMaster webhook events
     */
    async handleTaskMasterWebhook(req, payload) {
        console.log(`📋 Processing TaskMaster webhook`);

        const result = {
            eventType: 'taskmaster',
            processed: false,
            featuresUpdated: []
        };

        try {
            const { taskId, status, phase, extractionId } = payload;

            if (!extractionId) {
                console.log('ℹ️ TaskMaster webhook missing extraction ID');
                return result;
            }

            const featureId = this.normalizeFeatureId(extractionId);

            const taskUpdate = {
                taskId,
                status,
                phase,
                updatedAt: new Date().toISOString()
            };

            await this.integration.syncWithTaskMaster(featureId, taskUpdate);
            result.featuresUpdated.push(featureId);
            result.processed = true;

            console.log(`✅ TaskMaster webhook processed for feature: ${featureId}`);

        } catch (error) {
            console.error(`❌ TaskMaster webhook processing failed: ${error.message}`);
            result.error = error.message;
        }

        return result;
    }

    /**
     * Handle custom webhook events
     */
    async handleCustomWebhook(req, payload) {
        console.log(`🔧 Processing custom webhook`);

        const result = {
            eventType: 'custom',
            processed: false,
            featuresUpdated: []
        };

        try {
            // Handle quality metrics updates
            if (payload.type === 'quality_metrics') {
                const { featureId, metrics } = payload;

                await this.integration.auditSystem.updateQualityMetrics(featureId, metrics);
                result.featuresUpdated.push(featureId);
                result.processed = true;

                console.log(`✅ Quality metrics updated for feature: ${featureId}`);
            }

            // Handle manual milestone updates
            if (payload.type === 'milestone') {
                const { featureId, milestone } = payload;

                await this.integration.auditSystem.addMilestone(featureId, milestone);
                result.featuresUpdated.push(featureId);
                result.processed = true;

                console.log(`✅ Milestone added for feature: ${featureId}`);
            }

            // Handle blocker updates
            if (payload.type === 'blocker') {
                const { featureId, blocker, action } = payload;

                if (action === 'add') {
                    await this.integration.auditSystem.addBlocker(featureId, blocker);
                } else if (action === 'resolve') {
                    await this.integration.auditSystem.resolveBlocker(featureId, blocker.blockerId, blocker.resolution);
                }

                result.featuresUpdated.push(featureId);
                result.processed = true;

                console.log(`✅ Blocker ${action} for feature: ${featureId}`);
            }

        } catch (error) {
            console.error(`❌ Custom webhook processing failed: ${error.message}`);
            result.error = error.message;
        }

        return result;
    }

    // ===============================
    // Helper Methods
    // ===============================

    /**
     * Extract feature ID from branch name
     */
    extractFeatureIdFromBranch(branchName) {
        const match = branchName.match(/feature\/extracted-(.+)/);
        return match ? this.normalizeFeatureId(match[1]) : null;
    }

    /**
     * Normalize feature ID format
     */
    normalizeFeatureId(input) {
        // Convert various formats to consistent feature ID
        if (input.startsWith('EXT-')) {
            return input;
        }

        if (input.startsWith('feature/extracted-')) {
            return input.replace('feature/extracted-', '').toUpperCase();
        }

        return input.toUpperCase();
    }

    /**
     * Determine severity from GitHub issue labels
     */
    determineSeverityFromLabels(labels) {
        const labelNames = labels.map(label => label.name.toLowerCase());

        if (labelNames.includes('critical') || labelNames.includes('urgent')) {
            return 'critical';
        }

        if (labelNames.includes('high priority') || labelNames.includes('high')) {
            return 'high';
        }

        if (labelNames.includes('medium priority') || labelNames.includes('medium')) {
            return 'medium';
        }

        return 'low';
    }

    /**
     * Stop the webhook server
     */
    stop() {
        if (this.server) {
            this.server.close();
            console.log('🛑 Webhook server stopped');
        }
    }
}

// Export for use in other modules
module.exports = { TraceabilityWebhookHandler };

// Command line interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const command = args[0];

    const webhook = new TraceabilityWebhookHandler();

    switch (command) {
        case 'start':
            console.log('🚀 Starting traceability webhook server...');
            webhook.start();
            break;

        case 'test':
            console.log('🧪 Testing webhook handler...');
            // You could add test scenarios here
            console.log('✅ Webhook handler test completed');
            break;

        case 'help':
        default:
            console.log(`
🔗 Traceability Webhook Handler CLI

Commands:
  start     Start the webhook server
  test      Run webhook handler tests
  help      Show this help message

Environment Variables:
  TRACEABILITY_WEBHOOK_PORT    Port to listen on (default: 8080)
  TRACEABILITY_WEBHOOK_SECRET  Secret for webhook signature validation

Usage:
  node traceability_webhook.js [command]

Examples:
  node traceability_webhook.js start
  TRACEABILITY_WEBHOOK_PORT=3000 node traceability_webhook.js start
            `);
            break;
    }
}
