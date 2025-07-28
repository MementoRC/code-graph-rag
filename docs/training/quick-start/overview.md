# Quick Start Tutorial

Welcome to the 30-minute quick start tutorial! This hands-on guide will get you up and running with the Upstream Analysis System quickly and effectively.

## 🎯 What You'll Accomplish

In the next 30 minutes, you'll:

- ✅ Set up a basic analysis environment
- ✅ Run your first automated sync
- ✅ Conduct a mini analysis session
- ✅ Extract a simple feature
- ✅ View results in the dashboard

## ⏱️ Time Breakdown

- **Setup** (10 minutes) - Environment preparation
- **First Sync** (5 minutes) - Test the sync process
- **Analysis Session** (10 minutes) - Practice the workflow
- **Dashboard Review** (5 minutes) - Explore visualizations

## 🛠️ Prerequisites

Before starting, ensure you have:

- [ ] GitHub repository with admin access
- [ ] Node.js 18+ installed
- [ ] Git configured with your credentials
- [ ] 30 minutes of uninterrupted time
- [ ] Upstream repository identified (we'll use a demo if needed)

## 📋 Quick Setup Checklist

Let's get your environment ready:

### Step 1: Clone the Repository
```bash
git clone https://github.com/MementoRC/code-graph-rag.git
cd code-graph-rag
git checkout feat-upstream-analysis-strategy
```

### Step 2: Install Dependencies
```bash
# Install main project dependencies
npm install

# Install analysis tools
cd tools/analysis-session
npm install
cd ../..

# Install dashboard
cd dashboard
npm install
cd ..
```

### Step 3: Configure Basic Settings
```bash
# Copy example configuration
cp .github/upstream-analysis/config.yml.example .github/upstream-analysis/config.yml

# Set your GitHub token (optional for demo)
echo "GITHUB_TOKEN=your_token_here" > .env
```

## 🚀 Tutorial Steps

### Step 1: First Sync (5 minutes)

Let's test the sync process with a demo upstream repository:

```bash
# Set up demo upstream remote
git remote add demo-upstream https://github.com/facebook/react.git

# Run manual sync test
cd scripts
node test-sync-demo.js
```

**Expected Output:**
```
✅ Connected to upstream repository
✅ Fetched 23 new commits
✅ Analyzed changes: 15 features, 5 bugs, 3 docs
✅ Generated analysis summary
```

**🎉 Success Indicator:** You should see a new file `analysis-results.json` with change data.

### Step 2: Mini Analysis Session (10 minutes)

Now let's conduct a quick analysis session:

```bash
# Generate analysis template
cd tools/analysis-session
node session-cli.js generate-template session \
  --lead-analyst "Your Name" \
  --duration 10 \
  --focus demo
```

This creates a structured analysis document. Let's fill it out:

#### Analysis Exercise

1. **Open the generated template** (located in `analysis-sessions/`)
2. **Review the pre-populated changes** (5 sample changes from demo sync)
3. **For each change, decide:**
   - Priority: High/Medium/Low
   - Extraction potential: Yes/No/Maybe
   - Implementation effort: XS/S/M/L/XL

#### Practice Decision Framework

Use this simple framework for each change:

```
Value Score (1-5):
- Aligns with our goals? ___
- Solves current problems? ___
- Improves user experience? ___

Effort Score (1-5):
- Implementation complexity? ___
- Testing requirements? ___
- Integration challenges? ___

Decision: Extract if Value > Effort
```

**📝 Exercise Result:** You should have 2-3 changes marked for extraction.

### Step 3: Feature Extraction Demo (8 minutes)

Let's extract a simple feature:

```bash
# Create extraction branch for highest-priority change
cd scripts
node extraction_branch_automation.js create \
  --feature-name "demo-improvement" \
  --upstream-commit "abc123" \
  --priority high \
  --effort S
```

This automatically:
- Creates a new branch `feature/extracted-demo-improvement`
- Generates implementation plan
- Sets up basic testing structure
- Creates traceability documentation

**🔍 Verification:**
```bash
git branch | grep extracted
# Should show: feature/extracted-demo-improvement

ls feature-docs/
# Should show: extraction-plan.md, traceability.md
```

### Step 4: Dashboard Review (5 minutes)

View your progress in the dashboard:

```bash
cd dashboard
npm run build:data
npm run serve
```

Visit `http://localhost:3000` to see:

- **Overview metrics** with your session data
- **Recent activity** from the demo sync
- **Extraction status** showing your new branch
- **Analysis history** with your session

**📊 Key Metrics to Check:**
- Total commits analyzed: ~23
- Analysis sessions: 1
- Active extractions: 1
- Team participation: 1

### Step 5: Cleanup (2 minutes)

Clean up the demo environment:

```bash
# Remove demo remote
git remote remove demo-upstream

# Keep the extraction branch for reference
git checkout main

# Archive demo session
mkdir archive/
mv analysis-sessions/demo-* archive/
```

## ✅ Tutorial Completion Checklist

Verify you've completed everything:

- [ ] ✅ **Sync Process**: Successfully synced with demo upstream
- [ ] ✅ **Analysis Session**: Completed decision framework exercise
- [ ] ✅ **Feature Extraction**: Created extraction branch with documentation
- [ ] ✅ **Dashboard**: Viewed live metrics and progress
- [ ] ✅ **Cleanup**: Archived demo materials

## 🎉 Congratulations!

You've successfully completed the quick start tutorial! You now have hands-on experience with:

- **Automated sync** process and change detection
- **Structured analysis** using decision frameworks
- **Feature extraction** workflow and branch automation
- **Dashboard visualization** and progress tracking

## 📈 Your Learning Progress

### ✅ Completed
- Basic system operation
- Core workflow understanding
- Hands-on tool usage
- Dashboard navigation

### 🎯 Next Steps
- **[Your First Real Session](your-first-session)** - Analyze your actual upstream
- **[Using the Dashboard](using-dashboard)** - Deep dive into visualizations
- **[Basic Extraction](basic-extraction)** - Extract a real feature
- **[Team Collaboration](../best-practices/team-collaboration)** - Add team members

## 🤔 What If Things Didn't Work?

### Common Issues and Solutions

**Sync failed with "Permission denied":**
```bash
# Check GitHub token
echo $GITHUB_TOKEN
# Should show your token, not empty

# Verify token permissions
curl -H "Authorization: token $GITHUB_TOKEN" https://api.github.com/user
```

**Dashboard shows no data:**
```bash
# Check data generation
cd dashboard
ls src/_data/
# Should show: git-stats.json, analysis-docs.json, etc.

# Regenerate data
npm run build:data
```

**Scripts not working:**
```bash
# Check Node.js version
node --version
# Should be 18.0 or higher

# Reinstall dependencies
rm -rf node_modules
npm install
```

## 🏆 Success Stories

*"Completed the tutorial in 25 minutes and immediately saw the value. The structured approach made our chaotic upstream review process so much cleaner!"*
— Development Team Lead

*"The hands-on nature really helped. Seeing the actual files created and dashboard updated made it click for our team."*
— Senior Developer

## 🎓 Ready for More?

Choose your next learning path:

### For Individual Learning
- **[Complete User Guide](../../docs/user-guide/overview)** - Comprehensive system usage
- **[Advanced Workflows](../../docs/workflows/analysis-workflow)** - Complex scenarios
- **[Best Practices](../best-practices/session-planning)** - Expert techniques

### For Team Rollout
- **[Team Training Plan](../roles/team-lead)** - How to train your team
- **[Role-Based Guides](../roles/analyst)** - Specialized training paths
- **[Onboarding Checklist](../../reference/templates/onboarding-checklist)** - New team member setup

### For Advanced Users
- **[System Architecture](../../docs/architecture/overview)** - Deep technical understanding
- **[API Reference](../../reference/api/overview)** - Integration and customization
- **[Administration Guide](../../docs/admin/configuration)** - System management

## 💡 Pro Tips for Your Real Implementation

1. **Start Small** - Begin with one upstream repository
2. **Set Regular Schedule** - Weekly sessions work best
3. **Document Decisions** - Future you will thank present you
4. **Involve the Team** - Collaboration improves decision quality
5. **Monitor Metrics** - Track your success and adjust process

---

:::tip Time Saver
Bookmark this page! Many teams refer back to the tutorial steps when onboarding new team members or refreshing their skills.
:::

:::info Real-World Timing
While this tutorial takes 30 minutes, real analysis sessions typically take 60-90 minutes for a full week's changes. The time investment pays off through systematic decision-making and better feature adoption.
:::

Ready to dive deeper? **[Start Your First Real Session](your-first-session)** 🚀