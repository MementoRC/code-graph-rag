# Upstream Change Detection and Notification System

This system analyzes changes from the upstream repository and provides intelligent notifications through multiple channels based on the significance of the changes.

## 🏗️ Architecture

The system consists of three main components:

1. **Configuration** (`config.yml`) - Defines rules for significance detection and notification settings
2. **Analysis Engine** (`analyze-changes.js`) - Node.js script that analyzes commits and generates notifications
3. **GitHub Actions Integration** - Automated workflow that runs analysis after each upstream sync

## 📋 Features

### Change Analysis
- **Commit Categorization**: Automatically categorizes commits (feature, bugfix, security, etc.)
- **Significance Scoring**: Calculates importance scores based on files changed and commit messages
- **Smart Filtering**: Reduces noise by filtering out low-significance changes
- **File Pattern Matching**: Identifies significant files using configurable patterns

### Multi-Channel Notifications
- **GitHub Issues**: Creates tracking issues for significant changes
- **Slack Integration**: Sends notifications to configured Slack channels
- **Email Digests**: Supports email notifications for major changes

### Intelligence Features
- **Threshold-Based**: Only notifies when changes exceed significance thresholds
- **Categorized Reporting**: Groups changes by type for better understanding
- **Diff Links**: Provides direct links to changed files and diffs
- **Statistical Summaries**: Shows commit counts, files changed, and significance metrics

## 🚀 Usage

### Automatic Operation
The system runs automatically as part of the upstream sync workflow:

1. Daily sync detects upstream changes
2. If changes are found, analysis job is triggered
3. Commits are analyzed and categorized
4. Notifications are sent based on significance scores
5. Analysis checkpoint is stored for next run

### Manual Execution
```bash
# Navigate to analysis directory
cd .github/upstream-analysis

# Install dependencies
npm install

# Run analysis on specific commit range
node analyze-changes.js <from-commit> <to-commit>

# Run with JSON output
node analyze-changes.js <from-commit> <to-commit> --json

# Run tests
npm test
```

### Environment Variables
- `GITHUB_TOKEN`: Required for GitHub API access and issue creation
- `SLACK_WEBHOOK_URL`: Required for Slack notifications (if enabled)
- `FROM_REF`: Source commit for analysis range
- `TO_REF`: Target commit for analysis range

## ⚙️ Configuration

### Significance Rules
Configure what constitutes a significant change:

```yaml
significance:
  # File patterns that indicate important changes
  significant_files:
    - "*.py"
    - "*.js"
    - "pyproject.toml"
    - "README.md"
  
  # Files to ignore (low significance)
  ignore_files:
    - "*.log"
    - "*.tmp"
    - "docs/**"
  
  # Keywords that increase significance
  significant_keywords:
    - "breaking"
    - "security"
    - "feat"
    - "fix"
```

### Categorization
Define how commits are categorized:

```yaml
categories:
  security:
    keywords: ["security", "vulnerability", "cve"]
    weight: 10
    color: "#fd7e14"
  
  feature:
    keywords: ["feat", "feature", "add", "new"]
    weight: 8
    color: "#28a745"
```

### Notification Channels
Configure notification delivery:

```yaml
notifications:
  github_issues:
    enabled: true
    min_significance_score: 15
    labels: ["upstream-sync", "analysis-required"]
  
  slack:
    enabled: false
    min_significance_score: 10
    channel: "#upstream-analysis"
```

## 🧪 Testing

The system includes comprehensive tests:

```bash
# Run all tests
npm test

# Run with detailed output
node test-analyze.js

# Generate JSON test results
node test-analyze.js --json
```

### Test Coverage
- Configuration loading and validation
- Commit analysis and categorization
- Significance scoring algorithms
- Summary generation
- Issue body formatting
- Mock data validation

## 📊 Analysis Output

### GitHub Actions Outputs
- `analysis_success`: Whether analysis completed successfully
- `significance_score`: Total significance score for changes  
- `change_level`: Classification (minor, moderate, major, critical)
- `github_issue_created`: Whether GitHub issue was created
- `slack_sent`: Whether Slack notification was sent

### Analysis Summary
Generated for each run with:
- Total commits and files changed
- Significance score and change level
- Breakdown by category
- Top significant commits
- Notification delivery status

## 🔧 Customization

### Adding New Categories
1. Add category definition to `config.yml`:
```yaml
categories:
  performance:
    keywords: ["perf", "optimize", "speed"]
    weight: 6
    color: "#17a2b8"
```

2. Adjust significance thresholds if needed
3. Test with mock data to validate categorization

### Notification Channels
To add new notification channels:

1. Extend the `analyze-changes.js` script
2. Add configuration section to `config.yml`
3. Add environment variables for credentials
4. Update GitHub Actions workflow with new secrets

### Custom Filtering
Modify significance calculation by:
- Adjusting file patterns
- Adding/removing keywords
- Changing category weights
- Modifying threshold values

## 🚨 Troubleshooting

### Common Issues

**Analysis fails with "No commits found"**
- Check that upstream remote is configured
- Verify commit range is valid
- Ensure fetch was successful

**Notifications not sent**
- Check significance score vs. thresholds
- Verify environment variables are set
- Check API credentials and permissions

**Incorrect categorization**
- Review keyword lists in configuration
- Check for typos in commit messages
- Adjust category weights if needed

### Debug Mode
Set debug environment variables:
```bash
DEBUG=1 node analyze-changes.js <from> <to>
```

### Logs
Check GitHub Actions logs for detailed execution information:
- Sync job: Basic fetch and branch operations
- Analysis job: Detailed commit analysis and notification delivery

## 📚 Dependencies

### Runtime Dependencies
- `@octokit/rest@^19.0.0`: GitHub API client
- `@slack/webhook@^6.1.0`: Slack notifications
- `js-yaml@^4.1.0`: Configuration parsing

### Development Dependencies  
- `node-fetch@^3.3.0`: HTTP requests for testing

### System Requirements
- Node.js 18+
- Git 2.20+
- GitHub Actions environment

## 🔒 Security Considerations

- GitHub token requires `issues: write` permission for issue creation
- Slack webhook URLs should be stored as repository secrets
- Configuration file may contain sensitive patterns - review before committing
- Analysis results may include commit content - ensure appropriate access controls

## 📈 Performance

### Optimization Features
- Configurable API delays to avoid rate limiting
- Batch processing for large change sets
- Efficient git command usage
- Caching of analysis checkpoints

### Limits
- Maximum 100 commits per analysis run (configurable)
- File size limit for diff analysis (1MB default)
- API timeout limits (30 seconds default)
- Maximum 20 files in detailed analysis

## 🛠️ Development

### File Structure
```
.github/upstream-analysis/
├── config.yml              # Configuration file
├── analyze-changes.js       # Main analysis script
├── test-analyze.js         # Test suite
├── package.json            # Node.js dependencies
├── README.md               # This documentation
└── last-analysis.txt       # Analysis checkpoint (auto-generated)
```

### Contributing
1. Modify configuration or analysis logic
2. Run tests to validate changes: `npm test`
3. Test with real data using manual execution
4. Update documentation if needed
5. Commit changes and test via GitHub Actions

This system provides intelligent, automated analysis of upstream changes with flexible notification options and comprehensive testing.