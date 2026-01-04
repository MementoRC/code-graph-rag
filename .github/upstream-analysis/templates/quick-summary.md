# Quick Analysis Summary: {{sessionDate}}

## 🎯 Overview
- **Commits**: {{totalCommits}}
- **Significance**: {{significanceScore}} ({{changeLevel}})
- **Range**: [`{{previousCommit}}`]({{repoUrl}}/commit/{{previousCommit}}) → [`{{upstreamCommit}}`]({{repoUrl}}/commit/{{upstreamCommit}})

## 📊 Top Changes
{{#each topCommits}}
- **{{category}}**: [`{{hash}}`]({{repoUrl}}/commit/{{hash}}) {{subject}} ({{significance}})
{{/each}}

## 🏆 Extraction Candidates
{{#each extractions}}
- **{{title}}** ({{priority}} priority)
  - {{description}}
  - Effort: {{effort}} | Benefit: {{benefit}}
{{/each}}

## 📋 Next Actions
{{#each actions}}
- [ ] {{action}} ({{assignee}} by {{dueDate}})
{{/each}}

---
*Generated: {{generationTime}} | [Full Analysis](analysis-session-{{branchDate}}.md)*
