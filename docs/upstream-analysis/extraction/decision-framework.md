# Feature Extraction Decision Framework

This framework provides a structured, repeatable process for evaluating, prioritizing, and planning the extraction of features from upstream sources. It is designed to integrate with the existing change classification system, TaskMaster AI for implementation planning, and GitHub workflow automation.

---

## 1. Value Assessment Criteria

Each candidate feature is scored (0-10) on the following criteria. The final value score is a weighted sum, with weights configurable in `config.yml`.

| Criterion                | Weight | Description                                                                                 |
|--------------------------|--------|---------------------------------------------------------------------------------------------|
| **Innovation Value**     | 25%    | Novelty, uniqueness, and potential to differentiate the product                             |
| **Performance Impact**   | 20%    | Expected improvement in speed, efficiency, or scalability                                   |
| **Code Quality**         | 15%    | Impact on maintainability, readability, and technical debt                                  |
| **User Experience**      | 15%    | Enhancement to end-user experience or usability                                             |
| **Security Enhancement** | 10%    | Strengthening of security posture or risk reduction                                         |
| **Technical Debt Reduction** | 10% | Reduction of legacy code, simplification, or modernization                                  |
| **Strategic Alignment**  | 5%     | Alignment with roadmap, business goals, or key initiatives                                  |

**Scoring Example:**

| Criterion                | Score (0-10) | Weighted Score |
|--------------------------|--------------|---------------|
| Innovation Value         | 8            | 2.0           |
| Performance Impact       | 7            | 1.4           |
| Code Quality             | 9            | 1.35          |
| User Experience          | 6            | 0.9           |
| Security Enhancement     | 5            | 0.5           |
| Technical Debt Reduction | 8            | 0.8           |
| Strategic Alignment      | 10           | 0.5           |
| **Total**                |              | **7.45**      |

---

## 2. Implementation Effort Estimation

Estimate the effort required to extract and integrate the feature using T-shirt sizing:

| Size | Description                                 | Typical Examples                        |
|------|---------------------------------------------|-----------------------------------------|
| XS   | 1-2 days, simple config/docs                | Config changes, doc updates             |
| S    | 3-5 days, minor features/bugfixes           | Small feature, isolated bugfix          |
| M    | 1-2 weeks, moderate features/refactoring    | Multi-file refactor, moderate feature   |
| L    | 2-4 weeks, major features/architecture      | Major feature, cross-cutting change     |
| XL   | 1+ months, system overhauls/integrations    | System overhaul, major integration      |

---

## 3. Compatibility Evaluation Matrix

Assess the compatibility of the feature with the current codebase and processes:

| Factor                | Assessment Questions                                                                 | Rating (Low/Med/High) |
|-----------------------|--------------------------------------------------------------------------------------|-----------------------|
| Architecture Fit      | Does it fit our current architecture and design patterns?                            |                       |
| Dependency Impact     | Does it introduce new dependencies or conflicts?                                     |                       |
| Testing Requirements  | How complex is the required testing (unit, integration, e2e)?                        |                       |
| Documentation Needs   | What level of documentation is required for adoption and maintenance?                 |                       |

**Example:**

| Factor                | Rating | Notes                                 |
|-----------------------|--------|---------------------------------------|
| Architecture Fit      | High   | Follows existing modular structure    |
| Dependency Impact     | Low    | No new dependencies                   |
| Testing Requirements  | Medium | Requires new integration tests        |
| Documentation Needs   | Low    | Minor doc update                      |

---

## 4. Priority Determination Algorithm

Priority is determined by combining value score and effort estimate:

- **High Priority**: Value ≥ 8, Effort = XS/S
- **Medium Priority**: Value 5-7, Effort = M
- **Low Priority**: Any value, Effort = L/XL
- **Rejected**: Value < 5 (regardless of effort)

**Algorithm:**

```python
if value_score >= 8 and effort in ["XS", "S"]:
    priority = "High"
elif 5 <= value_score < 8 and effort == "M":
    priority = "Medium"
elif effort in ["L", "XL"]:
    priority = "Low"
else:
    priority = "Rejected"
```

---

## 5. ROI Calculation Methodology

Estimate Return on Investment (ROI) to support decision-making:

**ROI = (Estimated Value Score × Weight) / Effort Cost**

- *Estimated Value Score*: Weighted sum from value assessment (0-10)
- *Effort Cost*: Numeric mapping (XS=1, S=2, M=3, L=5, XL=8)
- *Weight*: Optional multiplier for strategic initiatives

**Example:**

- Value Score: 7.45
- Effort: S (2)
- ROI: 7.45 / 2 = 3.73

---

## 6. Integration Points

- **Change Classification System**: Use value and compatibility scores to classify changes (e.g., "core", "optional", "experimental").
- **TaskMaster AI**: Pass priority, effort, and compatibility data for implementation planning and task breakdown.
- **GitHub Workflow Automation**: Automate labeling, issue creation, and PR prioritization based on decision matrix.

---

## 7. Decision Matrix Workflow

1. **Feature Identified**: Candidate feature is proposed from upstream analysis.
2. **Value Assessment**: Score each criterion (0-10), calculate weighted value.
3. **Effort Estimation**: Assign T-shirt size.
4. **Compatibility Evaluation**: Fill out compatibility matrix.
5. **Priority Determination**: Apply algorithm to set priority.
6. **ROI Calculation**: Compute ROI for further justification.
7. **Integration**: Feed results into classification, TaskMaster AI, and GitHub workflows.
8. **Decision**: Approve, defer, or reject extraction.

---

## 8. Example Decision Record

```yaml
feature: "Graph-based Dependency Visualization"
value_assessment:
  innovation: 9
  performance: 8
  code_quality: 7
  user_experience: 8
  security: 5
  tech_debt: 7
  strategic_alignment: 10
  weighted_score: 8.0
effort: S
compatibility:
  architecture_fit: High
  dependency_impact: Low
  testing_requirements: Medium
  documentation_needs: Low
priority: High
roi: 4.0
integration:
  classification: core
  taskmaster_ai: true
  github_automation: true
decision: Approve
```

---

## 9. Customization

- All weights, thresholds, and mappings are configurable in `config.yml`.
- Team-specific criteria and integration hooks can be added as needed.