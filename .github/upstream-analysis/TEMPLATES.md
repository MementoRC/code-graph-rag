# Analysis Documentation Templates

This document describes the standardized templates for documenting upstream analysis sessions, ensuring consistency and completeness across all analysis activities.

## 🎯 Overview

The template system provides structured documentation for upstream analysis sessions with the following goals:

- **Consistency**: Standardized format for all analysis sessions
- **Completeness**: Comprehensive coverage of all analysis aspects
- **Traceability**: Clear links between decisions and source changes
- **Actionability**: Clear action items and assignments
- **Historical Record**: Searchable archive of analysis decisions

## 📝 Available Templates

### 1. Full Analysis Session Template (`analysis-session.md`)

The comprehensive template for detailed analysis sessions including:

- **Session Metadata**: Date, participants, duration, upstream version
- **Change Summary**: Statistics, category breakdown, significance scoring
- **Detailed Analysis**: Per-category analysis with impact assessment
- **Impact Assessment**: High/medium/low impact areas on local codebase
- **Extraction Candidates**: Prioritized list of changes to consider integrating
- **Decision Log**: Immediate actions, deferred decisions, rejected items
- **Action Items**: Categorized tasks with assignments and due dates
- **Reference Links**: Upstream and local resources
- **Success Criteria**: Objectives and quality gates
- **Follow-up Schedule**: Next milestones and review dates

### 2. Quick Summary Template (`quick-summary.md`)

A condensed template for rapid reviews including:

- **Overview**: Basic statistics and significance
- **Top Changes**: Most significant commits
- **Extraction Candidates**: High-priority items only  
- **Next Actions**: Immediate action items

### 3. Custom Templates

Additional templates can be created for specific scenarios:
- **Security-focused sessions**
- **Performance analysis sessions** 
- **Breaking change analysis**
- **Documentation reviews**

## 🛠️ Template Generation

### Automatic Generation

Use the template generation script to create pre-populated analysis documents:

```bash
# Navigate to analysis directory
cd .github/upstream-analysis

# Generate session templates with analysis data
node generate-template.js session <from-commit> <to-commit> [options]

# Options:
# -b, --branch          Create analysis branch
# -d, --date <date>     Branch date (YYYY-MM-DD)  
# -l, --lead <name>     Lead analyst name
# -p, --participants    Comma-separated participant names
# --duration <time>     Session duration
# --json               Output JSON result
```

### Examples

```bash
# Basic session generation
node generate-template.js session HEAD~5 HEAD

# Generate with analysis branch creation
node generate-template.js session abc123 def456 --branch --lead "Alice Dev"

# Generate with team information
node generate-template.js session HEAD~10 HEAD \
  --lead "Bob Smith" \
  --participants "Alice,Bob,Charlie" \
  --duration "2 hours"

# Generate for specific date
node generate-template.js session abc123 def456 \
  --date "2024-01-15" \
  --branch
```

### Manual Creation

Templates can also be created manually by copying the template files and filling in the sections:

```bash
# Copy template to new session
cp templates/analysis-session.md sessions/analysis-session-2024-01-15.md

# Edit the copied file to add analysis data
$EDITOR sessions/analysis-session-2024-01-15.md
```

## 📊 Template Data Structure

### Handlebars Variables

Templates use Handlebars syntax for dynamic content generation:

#### Session Metadata
```handlebars
{{sessionDate}}          # Analysis session date
{{branchDate}}           # Analysis branch date  
{{leadAnalyst}}          # Lead analyst name
{{participants}}         # Array of participant names
{{sessionDuration}}      # Duration of analysis session
```

#### Repository Information
```handlebars
{{repoUrl}}              # Upstream repository URL
{{localRepoUrl}}         # Local repository URL
{{upstreamCommit}}       # Latest upstream commit hash
{{previousCommit}}       # Previous analysis commit hash
```

#### Analysis Data
```handlebars
{{totalCommits}}         # Total commits analyzed
{{totalFiles}}           # Total files changed
{{significanceScore}}    # Overall significance score
{{changeLevel}}          # Change level (minor/moderate/major/critical)
{{categories}}           # Object with category breakdown
{{topCommits}}           # Array of most significant commits
```

#### Enhanced Data Structures
```handlebars
{{#each categoryAnalysis}}
  {{category}}           # Category name (capitalized)
  {{count}}              # Number of commits in category
  {{significance}}       # Total significance for category
  {{description}}        # Category description
  {{#each keyCommits}}
    {{hash}}             # Commit hash (short)
    {{subject}}          # Commit subject
    {{author}}           # Commit author
    {{impact}}           # Impact level (High/Medium/Low)
  {{/each}}
{{/each}}
```

### Data Enhancement

The template generator enhances raw analysis data with:

1. **Repository URLs**: Automatic detection of GitHub repository URLs
2. **Impact Assessment**: Placeholder sections for manual completion
3. **Extraction Candidates**: Auto-generated based on significance scores
4. **Category Descriptions**: Helpful descriptions for each change category
5. **Action Item Templates**: Structured task categories
6. **Reference Links**: Pre-populated with relevant documentation

## 🎨 Template Customization

### Adding New Templates

1. Create new template file in `templates/` directory:
```bash
touch templates/security-focused.md
```

2. Use Handlebars syntax for dynamic content:
```handlebars
# Security Analysis: {{sessionDate}}

## Critical Security Changes
{{#each securityCommits}}
- **{{hash}}**: {{subject}} (Severity: {{severity}})
{{/each}}
```

3. Update the generator script to handle the new template:
```javascript
// In generate-template.js
outputs.securityAnalysis = await this.generateFromTemplate(
  'security-focused',
  templateData,
  `security-analysis-${branchDate}`
);
```

### Customizing Existing Templates

1. Edit template files directly in `templates/` directory
2. Add new Handlebars variables as needed
3. Update the data enhancement logic in `generate-template.js`
4. Test with sample data to ensure proper rendering

### Handlebars Helpers

Custom helpers are available for template logic:

```handlebars
{{#eq changeLevel "critical"}}
🚨 CRITICAL CHANGES DETECTED
{{/eq}}

{{formatDate date}}                # Format date as YYYY-MM-DD
{{capitalize category}}            # Capitalize first letter
{{truncate description 100}}       # Truncate to 100 characters
{{json data}}                     # Output JSON for debugging
```

## 📋 Best Practices

### Session Planning

1. **Pre-populate data**: Always use the generator to create initial templates
2. **Set clear objectives**: Define session goals before starting analysis
3. **Assign roles**: Designate lead analyst and participants upfront
4. **Time box sessions**: Plan for 1-3 hours depending on change volume

### During Analysis

1. **Follow template structure**: Complete sections in order for thoroughness
2. **Document decisions**: Record rationale for all significant decisions
3. **Assign action items**: Every decision should have an owner and due date
4. **Link to sources**: Include commit links and reference materials

### After Analysis

1. **Review completeness**: Ensure all template sections are addressed
2. **Validate action items**: Confirm assignments and deadlines are realistic
3. **Archive properly**: Store in `sessions/` directory with consistent naming
4. **Share results**: Distribute to relevant team members and stakeholders

### Quality Checklist

Before considering an analysis session complete:

- [ ] All high-significance commits analyzed
- [ ] Impact assessment completed for affected areas
- [ ] Extraction candidates prioritized and evaluated
- [ ] Action items assigned with realistic deadlines
- [ ] Risk assessment completed for high-priority extractions
- [ ] Follow-up schedule established
- [ ] Documentation complete and stored properly

## 🔧 Troubleshooting

### Common Issues

**Template generation fails**
- Check that analysis dependencies are installed: `npm install`
- Verify git repository is properly configured with upstream remote
- Ensure commit references are valid

**Missing data in generated templates**
- Check that upstream analysis completed successfully
- Verify commit range contains actual changes
- Review analysis configuration for significance thresholds

**Handlebars rendering errors**
- Validate template syntax with online Handlebars validator
- Check that all referenced variables exist in data structure
- Review custom helper functions for errors

### Debug Mode

Enable debug output for template generation:

```bash
DEBUG=1 node generate-template.js session <from> <to>
```

This provides detailed logging of:
- Template data structure
- Handlebars compilation process
- File generation steps
- Error details and stack traces

## 📚 Examples and References

### Example Sessions

See `examples/` directory for sample analysis sessions:
- **`example-session.md`**: Complete analysis with all sections filled
- **`example-quick-summary.md`**: Condensed summary format

### Reference Materials

- [Handlebars Documentation](https://handlebarsjs.com/) - Template syntax reference
- [Commander.js Documentation](https://github.com/tj/commander.js) - CLI framework
- [Upstream Analysis Strategy](../docs/upstream-analysis-strategy.md) - Overall strategy

### Integration with Workflow

Templates integrate with the broader upstream analysis workflow:

1. **Automated Detection**: Change detection system identifies significant updates
2. **Template Generation**: This system creates pre-populated analysis documents
3. **Manual Analysis**: Team conducts analysis using structured templates
4. **Decision Tracking**: Results feed back into tracking and automation systems

This template system ensures that every upstream analysis session produces consistent, comprehensive, and actionable documentation that supports effective decision-making and knowledge retention.