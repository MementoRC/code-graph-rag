# Automated Change Classification System

This document describes the intelligent classification system that automatically categorizes upstream changes by type and relevance to the local codebase.

## 🎯 Overview

The automated classification system analyzes upstream commits and provides:

- **Intelligent Categorization**: Multi-algorithm approach using rule-based classification with optional NLP enhancement
- **Relevance Scoring**: Determines how relevant changes are to the local codebase
- **Confidence Assessment**: Provides confidence scores for classification decisions
- **Feedback Learning**: Improves accuracy through manual feedback and training data
- **Performance Optimization**: Efficient batch processing with caching capabilities

## 🏗️ Architecture

### Classification Pipeline

```
Commit → File Analysis → Keyword Extraction → Pattern Matching → NLP Analysis → Category Classification → Relevance Scoring → Final Classification
```

### Core Components

1. **Rule-Based Engine**: Primary classification using configurable patterns and keywords
2. **File Pattern Analyzer**: Analyzes changed files to infer change type
3. **NLP Processor** (Optional): Natural language processing for commit messages
4. **Relevance Scorer**: Determines local codebase relevance
5. **Feedback System**: Learns from manual corrections and training data

## 📊 Classification Categories

### Primary Categories

- **feature**: New functionality and enhancements
- **bugfix**: Bug fixes and issue resolutions
- **security**: Security updates and vulnerability fixes
- **performance**: Performance improvements and optimizations
- **refactor**: Code restructuring without functionality changes
- **documentation**: Documentation updates and improvements
- **build**: Build, CI/CD, and deployment changes
- **test**: Testing improvements and additions
- **breaking**: Breaking changes requiring migration

### Classification Confidence

- **High Confidence** (≥0.8): Clear indicators, strong pattern matches
- **Medium Confidence** (0.5-0.8): Some indicators, moderate certainty
- **Low Confidence** (<0.5): Ambiguous changes, requires review

## 🎚️ Relevance Scoring

### Scoring Factors

#### File Overlap Analysis (40% weight)
- Extension relevance to local codebase
- Directory overlap with core components
- File naming pattern matches

#### Functionality Impact (30% weight)
- Core keyword matches (graph, query, rag, database, api)
- Component-specific changes
- Critical functionality modifications

#### Roadmap Alignment (30% weight)
- Priority keyword matches
- Strategic area alignment
- Development focus compatibility

### Relevance Levels

- **High Relevance** (≥0.7): Directly impacts core functionality
- **Medium Relevance** (0.4-0.7): Related to project scope
- **Low Relevance** (<0.4): Minimal impact on local codebase

## ⚙️ Configuration

### Classification Rules

Configure in `classification-config.yml`:

```yaml
classification_rules:
  feature:
    keywords: ["feat", "feature", "add", "new", "implement"]
    file_patterns: ["*.py", "*.js", "src/**"]
    negative_keywords: ["fix", "bug", "remove"]
    weight: 1.0
    confidence_threshold: 0.6
```

### Relevance Scoring

```yaml
relevance_scoring:
  file_overlap:
    weight: 0.4
    local_extensions: [".py", ".js", ".ts", ".md"]
    core_directories: ["src/", "codebase_rag/", "tests/"]
  
  functionality_impact:
    weight: 0.3
    core_keywords: ["graph", "query", "rag", "database"]
    impact_multiplier: 1.5
```

## 🚀 Usage

### Integration with Analysis System

The classification system automatically integrates with the existing analysis workflow:

```bash
# Analysis with classification
cd .github/upstream-analysis
node analyze-changes.js <from-commit> <to-commit>
```

### Direct Classification

```bash
# Classify specific commits
node classify-changes.js --commits <hash1,hash2,hash3>

# Batch classification
node classify-changes.js --batch <commit-list-file>
```

### Testing

```bash
# Run classification tests
npm run test-classification

# Test specific categories
node test-classification.js --category feature

# Accuracy validation
node test-classification.js --validate training-data.json
```

## 🧪 Training and Feedback

### Training Data Format

```json
[
  {
    "commitHash": "abc123456789",
    "subject": "feat: add multi-language support",
    "author": "Developer Name",
    "files": [
      {"path": "src/parser.py", "status": "A"},
      {"path": "tests/test_parser.py", "status": "A"}
    ],
    "expectedCategory": "feature",
    "confidence": 0.9,
    "relevance": 0.8,
    "notes": "New functionality description"
  }
]
```

### Adding Feedback

```javascript
// Programmatic feedback
classifier.addFeedback(
  'commit-hash',
  'expected-category',
  'actual-category',
  confidence
);

// Batch feedback from manual review
await classifier.loadFeedbackFile('manual-reviews.json');
```

### Continuous Learning

The system improves through:
1. **Manual Feedback**: Corrections from analysis sessions
2. **Training Data**: Historical classifications
3. **Pattern Recognition**: Automatic pattern updates
4. **Threshold Adjustment**: Dynamic confidence tuning

## 📈 Performance Metrics

### Accuracy Tracking

```javascript
const metrics = classifier.getAccuracyMetrics();
console.log(`Overall Accuracy: ${metrics.accuracy * 100}%`);
console.log(`Category Accuracy:`, metrics.categoryAccuracy);
console.log(`Total Feedback: ${metrics.totalFeedback}`);
```

### Performance Optimization

- **Batch Processing**: Process multiple commits efficiently
- **Caching**: Cache classification results for repeated analysis
- **Parallel Processing**: Utilize multiple cores for large datasets
- **Memory Management**: Optimize for large commit histories

## 🔧 Advanced Features

### NLP Enhancement

When Natural.js is available:

```yaml
nlp_analysis:
  enabled: true
  use_stemming: true
  use_sentiment: false
  entity_recognition: true
```

Features:
- **Stemming**: Normalize word variations
- **Tokenization**: Advanced text parsing
- **Entity Recognition**: Identify technical terms
- **Sentiment Analysis**: Assess change impact

### Machine Learning (Future)

Optional TensorFlow.js integration:

```yaml
machine_learning:
  enabled: false
  model_path: "models/classification-model.json"
  training_threshold: 100
  retrain_interval: 30
```

## 🛠️ Customization

### Adding New Categories

1. **Define Category Rules**:
```yaml
new_category:
  keywords: ["new", "category", "keywords"]
  file_patterns: ["*.ext", "path/**"]
  weight: 1.0
  confidence_threshold: 0.6
  description: "Category description"
```

2. **Update Training Data**: Add examples for new category
3. **Test Classification**: Validate with test suite
4. **Adjust Thresholds**: Fine-tune confidence levels

### Custom Relevance Scoring

```javascript
// Extend ChangeClassifier
class CustomClassifier extends ChangeClassifier {
  calculateCustomRelevance(commit) {
    // Custom relevance logic
    return relevanceScore;
  }
}
```

## 🔍 Troubleshooting

### Common Issues

**Low Classification Accuracy**
- Review and update keyword lists
- Adjust confidence thresholds
- Add more training data for problematic categories
- Check file pattern matches

**Poor Relevance Scoring**
- Update core_directories and local_extensions
- Adjust relevance weights
- Review core_keywords for project alignment

**Performance Issues**
- Enable caching for repeated analysis
- Use batch processing for large datasets
- Optimize file pattern matching
- Consider parallel processing

### Debug Mode

```bash
DEBUG=1 node classify-changes.js <commits>
```

Provides detailed logging of:
- Classification decision process
- Keyword and pattern matches
- Confidence score calculations
- Relevance scoring breakdown

## 📚 API Reference

### ChangeClassifier Class

#### Methods

```javascript
// Initialize classifier
await classifier.initialize()

// Classify single commit
const result = classifier.classifyCommit(commit)

// Batch classification
const results = classifier.classifyCommits(commits)

// Add feedback
classifier.addFeedback(hash, expected, actual, confidence)

// Get accuracy metrics
const metrics = classifier.getAccuracyMetrics()
```

#### Classification Result

```javascript
{
  category: "feature",
  confidence: 0.85,
  relevance: 0.7,
  reasoning: ["Keywords: feat, add", "File patterns: 2/3 match"],
  metadata: {
    hasFiles: true,
    fileCount: 3,
    authorDomain: "company.com",
    timestamp: "2024-01-15T10:30:00Z"
  }
}
```

## 🔗 Integration Points

### With Analysis System
- **Automatic Enhancement**: Integrates with existing `analyze-changes.js`
- **Backward Compatibility**: Falls back to legacy classification if needed
- **Result Enhancement**: Adds classification data to analysis results

### With Notification System
- **Smart Filtering**: Filter notifications by classification confidence
- **Category-Based Routing**: Route different categories to different channels
- **Relevance Thresholds**: Only notify on high-relevance changes

### With Template System
- **Enhanced Templates**: Include classification data in analysis templates
- **Category Sections**: Organize analysis by classification categories
- **Confidence Indicators**: Show classification confidence in templates

This classification system transforms raw upstream changes into intelligently categorized, relevance-scored insights that enable more effective analysis and decision-making.