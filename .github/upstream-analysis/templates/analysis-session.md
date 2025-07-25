# Upstream Analysis Session: {{sessionDate}}

## 📋 Session Metadata

- **Date**: {{sessionDate}}
- **Analysis Branch**: `analysis/{{branchDate}}`
- **Upstream Version**: {{upstreamCommit}}
- **Previous Analysis**: {{previousCommit}}
- **Lead Analyst**: {{leadAnalyst}}
- **Participants**: {{#each participants}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
- **Duration**: {{sessionDuration}}

## 📊 Change Summary

### Overall Statistics
- **Total Commits**: {{totalCommits}}
- **Total Files Changed**: {{totalFiles}}
- **Significance Score**: {{significanceScore}} ({{changeLevel}} level)
- **Analysis Range**: [`{{previousCommit}}`]({{repoUrl}}/commit/{{previousCommit}}) → [`{{upstreamCommit}}`]({{repoUrl}}/commit/{{upstreamCommit}})

### Category Breakdown
{{#each categories}}
- **{{@key}}**: {{count}} commits ({{significance}} significance)
  {{#each commits}}
  - [`{{hash}}`]({{../repoUrl}}/commit/{{hash}}) {{subject}} ({{significance}})
  {{/each}}
{{/each}}

### Change Level Assessment
{{#if (eq changeLevel "critical")}}
🚨 **CRITICAL CHANGES DETECTED** - Immediate review and planning required
{{else if (eq changeLevel "major")}}
🔶 **MAJOR CHANGES** - Significant impact, requires thorough analysis
{{else if (eq changeLevel "moderate")}}
🔵 **MODERATE CHANGES** - Standard review process
{{else}}
🟢 **MINOR CHANGES** - Low impact, optional review
{{/if}}

## 🔍 Detailed Analysis by Category

{{#each categoryAnalysis}}
### {{category}} Changes ({{count}} commits)

{{#if description}}
**Overview**: {{description}}
{{/if}}

**Significance Level**: {{significance}}/10

#### Key Commits:
{{#each keyCommits}}
- **[`{{hash}}`]({{repoUrl}}/commit/{{hash}})**
  - **Subject**: {{subject}}
  - **Author**: {{author}}
  - **Files**: {{fileCount}} changed
  - **Impact**: {{impact}}
  {{#if filesChanged}}
  - **Key Files**: {{#each filesChanged}}{{path}}{{#unless @last}}, {{/unless}}{{/each}}
  {{/if}}
  {{#if notes}}
  - **Notes**: {{notes}}
  {{/if}}

{{/each}}

{{#if relevantLinks}}
#### Relevant Links:
{{#each relevantLinks}}
- [{{title}}]({{url}}) - {{description}}
{{/each}}
{{/if}}

{{/each}}

## 🎯 Impact Assessment on Local Codebase

### High Impact Areas
{{#each highImpactAreas}}
- **{{area}}**: {{description}}
  - **Affected Components**: {{#each components}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
  - **Risk Level**: {{riskLevel}}
  - **Mitigation Strategy**: {{mitigation}}
{{/each}}

### Medium Impact Areas
{{#each mediumImpactAreas}}
- **{{area}}**: {{description}}
  - **Considerations**: {{considerations}}
{{/each}}

### Low Impact Areas
{{#each lowImpactAreas}}
- **{{area}}**: {{description}}
{{/each}}

## 🏆 Extraction Candidates

### High Priority (Immediate Consideration)
{{#each highPriorityExtractions}}
- **{{title}}** (Significance: {{significance}})
  - **Source Commits**: {{#each commits}}[`{{hash}}`]({{repoUrl}}/commit/{{hash}}){{#unless @last}}, {{/unless}}{{/each}}
  - **Description**: {{description}}
  - **Local Benefit**: {{localBenefit}}
  - **Implementation Effort**: {{effort}}
  - **Dependencies**: {{#if dependencies}}{{#each dependencies}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}None{{/if}}
  - **Risks**: {{risks}}
  - **Integration Strategy**: {{integrationStrategy}}
{{/each}}

### Medium Priority (Consider for Next Cycle)
{{#each mediumPriorityExtractions}}
- **{{title}}** (Significance: {{significance}})
  - **Source Commits**: {{#each commits}}[`{{hash}}`]({{repoUrl}}/commit/{{hash}}){{#unless @last}}, {{/unless}}{{/each}}
  - **Description**: {{description}}
  - **Local Benefit**: {{localBenefit}}
  - **Implementation Effort**: {{effort}}
{{/each}}

### Low Priority (Future Consideration)
{{#each lowPriorityExtractions}}
- **{{title}}**: {{description}}
  - **Source**: {{#each commits}}[`{{hash}}`]({{repoUrl}}/commit/{{hash}}){{#unless @last}}, {{/unless}}{{/each}}
{{/each}}

## 📝 Decision Log

### Immediate Actions Decided
{{#each immediateActions}}
- **{{action}}**
  - **Rationale**: {{rationale}}
  - **Assignee**: {{assignee}}
  - **Due Date**: {{dueDate}}
  - **Success Criteria**: {{successCriteria}}
{{/each}}

### Deferred Decisions
{{#each deferredDecisions}}
- **{{decision}}**
  - **Reason for Deferral**: {{reason}}
  - **Revisit Date**: {{revisitDate}}
  - **Additional Info Needed**: {{additionalInfo}}
{{/each}}

### Rejected Extractions
{{#each rejectedExtractions}}
- **{{title}}**
  - **Reason**: {{reason}}
  - **Source**: {{#each commits}}[`{{hash}}`]({{repoUrl}}/commit/{{hash}}){{#unless @last}}, {{/unless}}{{/each}}
{{/each}}

## 📋 Action Items and Assignments

### Development Tasks
{{#each developmentTasks}}
- [ ] **{{task}}**
  - **Assignee**: {{assignee}}
  - **Priority**: {{priority}}
  - **Due Date**: {{dueDate}}
  - **Description**: {{description}}
  - **Dependencies**: {{#if dependencies}}{{#each dependencies}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}{{else}}None{{/if}}
  - **Success Criteria**: {{successCriteria}}
{{/each}}

### Research Tasks
{{#each researchTasks}}
- [ ] **{{task}}**
  - **Assignee**: {{assignee}}
  - **Due Date**: {{dueDate}}
  - **Questions to Answer**: {{questions}}
  - **Deliverable**: {{deliverable}}
{{/each}}

### Testing Tasks
{{#each testingTasks}}
- [ ] **{{task}}**
  - **Assignee**: {{assignee}}
  - **Due Date**: {{dueDate}}
  - **Scope**: {{scope}}
  - **Success Criteria**: {{successCriteria}}
{{/each}}

### Documentation Tasks
{{#each documentationTasks}}
- [ ] **{{task}}**
  - **Assignee**: {{assignee}}
  - **Due Date**: {{dueDate}}
  - **Audience**: {{audience}}
  - **Format**: {{format}}
{{/each}}

## 🔗 Reference Links

### Upstream Resources
- [Upstream Repository](https://github.com/vitali87/code-graph-rag)
- [Commit Range]({{repoUrl}}/compare/{{previousCommit}}...{{upstreamCommit}})
- [Upstream Issues](https://github.com/vitali87/code-graph-rag/issues)
- [Upstream Pull Requests](https://github.com/vitali87/code-graph-rag/pulls)

### Local Resources
- [Analysis Branch]({{localRepoUrl}}/tree/analysis/{{branchDate}})
- [Previous Analysis]({{previousAnalysisUrl}})
- [Integration Tracking Issue]({{trackingIssueUrl}})

### Documentation
{{#each documentationLinks}}
- [{{title}}]({{url}}) - {{description}}
{{/each}}

## 📈 Metrics and KPIs

### Analysis Efficiency
- **Time to Complete Analysis**: {{analysisTime}}
- **Coverage**: {{coveragePercentage}}% of changes analyzed
- **Extraction Rate**: {{extractionCount}}/{{totalCommits}} commits flagged for extraction

### Quality Indicators
- **False Positive Rate**: {{falsePositiveRate}}% (extraction candidates later rejected)
- **Missed Opportunities**: {{missedOpportunities}} (post-analysis discoveries)
- **Team Consensus**: {{consensusScore}}/10

## 🎯 Success Criteria

### Session Objectives Met
{{#each sessionObjectives}}
- [{{#if completed}}x{{else}} {{/if}}] {{objective}}
  {{#if completed}}
  - **Achieved**: {{achievement}}
  {{else}}
  - **Status**: {{status}}
  - **Blocker**: {{blocker}}
  {{/if}}
{{/each}}

### Quality Gates
- [{{#if qualityGates.completeCoverage}}x{{else}} {{/if}}] All significant commits analyzed
- [{{#if qualityGates.consensusReached}}x{{else}} {{/if}}] Team consensus on high-priority extractions
- [{{#if qualityGates.actionItemsAssigned}}x{{else}} {{/if}}] All action items assigned and scheduled
- [{{#if qualityGates.risksIdentified}}x{{else}} {{/if}}] Major risks identified and mitigation planned
- [{{#if qualityGates.documentationComplete}}x{{else}} {{/if}}] Analysis documentation complete

## 📅 Follow-up Schedule

### Next Milestones
{{#each followupMilestones}}
- **{{milestone}}**: {{date}}
  - **Objective**: {{objective}}
  - **Deliverables**: {{#each deliverables}}{{this}}{{#unless @last}}, {{/unless}}{{/each}}
  - **Owner**: {{owner}}
{{/each}}

### Review Schedule
- **Next Team Review**: {{nextReviewDate}}
- **Progress Check-in**: {{progressCheckDate}}
- **Integration Review**: {{integrationReviewDate}}

## 🔍 Post-Session Notes

### What Went Well
{{#each positives}}
- {{this}}
{{/each}}

### Areas for Improvement
{{#each improvements}}
- {{this}}
{{/each}}

### Process Refinements
{{#each processRefinements}}
- **{{refinement}}**: {{description}}
{{/each}}

---

**Analysis completed**: {{completionTime}}  
**Document generated**: {{generationTime}}  
**Template version**: v{{templateVersion}}  
**Generated by**: [Upstream Analysis Bot](../analyze-changes.js)