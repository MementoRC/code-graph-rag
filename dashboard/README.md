# Upstream Analysis Dashboard

A static dashboard built with [Eleventy](https://www.11ty.dev/) for visualizing upstream activity and analysis status in the code-graph-rag project.

## 🌟 Features

### 📊 **Overview Dashboard**
- **Key Metrics**: Total commits, active extractions, analysis sessions, upstream activity
- **Interactive Charts**: Commit activity timeline and change type distribution
- **Recent Activity**: Latest upstream commits and team participation
- **Repository Status**: Current branch status and modification tracking

### 📚 **Analysis Sessions**
- **Session Tracking**: Complete history of team analysis sessions
- **Decision Logging**: Record of all decisions made during sessions
- **Action Items**: Tracking of follow-up tasks and assignments
- **Participant Management**: Team member participation tracking

### 🔄 **Upstream Activity**
- **Commit Monitoring**: Real-time tracking of upstream repository changes
- **Contributor Analytics**: Top contributors and contribution patterns
- **Release Tracking**: Latest upstream releases and version information
- **Change Classification**: Automated categorization of upstream changes

### 📋 **Extraction Management**
- **Status Tracking**: Progress monitoring for feature extractions
- **Priority Assessment**: Importance and effort estimation
- **GitHub Integration**: Linked issues and pull requests
- **Implementation Guidance**: Documentation and guidelines

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+**
- **GitHub Token** (optional, for GitHub API data)

### Installation
```bash
cd dashboard/
npm install
```

### Development
```bash
# Start development server with auto-reload
npm run dev

# Build for production
npm run build

# Collect fresh data
npm run build:data

# Full build with data collection
npm run build:full
```

### Environment Setup
Create a `.env` file in the dashboard directory:
```bash
GITHUB_TOKEN=your_github_token_here  # Optional but recommended
```

## 📁 Project Structure

```
dashboard/
├── src/                          # Source files
│   ├── _data/                   # Dynamic data files (generated)
│   │   ├── git-stats.json       # Git repository statistics
│   │   ├── github-data.json     # GitHub API data
│   │   ├── analysis-docs.json   # Analysis documentation
│   │   └── upstream-activity.json # Upstream repository data
│   ├── _includes/               # Reusable components
│   ├── _layouts/                # Page layouts
│   │   └── base.njk            # Main layout template
│   ├── analysis/               # Analysis sessions pages
│   ├── extractions/            # Extraction management pages
│   ├── upstream/               # Upstream activity pages
│   ├── assets/                 # Static assets
│   ├── css/                    # Stylesheets
│   ├── js/                     # JavaScript files
│   └── index.njk               # Homepage
├── data/                        # Data collection scripts
│   └── collect-data.js         # Main data collection script
├── .eleventy.js                # Eleventy configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── postcss.config.js           # PostCSS configuration
└── package.json                # Dependencies and scripts
```

## 🔧 Configuration

### Eleventy Configuration (`.eleventy.js`)
```javascript
- Template formats: Nunjucks, Markdown, HTML
- Plugins: Syntax highlighting, Chart.js integration
- Filters: Date formatting, array manipulation
- Shortcodes: Chart generation, utility functions
```

### Tailwind CSS (`tailwind.config.js`)
```javascript
- Custom color palette with primary/secondary themes
- Extended animations and transitions
- Form and typography plugins
- Mobile-first responsive design
```

### Data Collection (`src/data/collect-data.js`)
```javascript
- Git statistics and commit analysis
- GitHub API integration for issues/PRs
- Analysis documentation parsing
- Upstream repository monitoring
```

## 📊 Data Sources

### 1. **Git Statistics**
- Commit history analysis (3 months)
- Branch and remote information
- Author and commit type categorization
- Repository status tracking

### 2. **GitHub API Data**
- Repository metadata
- Issues and pull requests
- Extraction-related activity
- Team member information

### 3. **Analysis Documentation**
- Session documentation parsing
- Decision and action item extraction
- Template usage tracking
- Progress monitoring

### 4. **Upstream Activity**
- Upstream commit monitoring
- Contributor analysis
- Release tracking
- Change pattern analysis

## 🎨 Design System

### Color Palette
```css
Primary: Blue (#3B82F6) - Actions, links, primary UI elements
Secondary: Gray (#64748B) - Text, borders, subtle elements
Success: Green (#10B981) - Completed items, positive status
Warning: Yellow (#F59E0B) - In-progress items, caution
Error: Red (#EF4444) - Issues, negative status
Info: Purple (#8B5CF6) - Information, neutral status
```

### Component Library
- **Cards**: Content containers with hover effects
- **Buttons**: Primary/secondary with consistent styling
- **Charts**: Interactive visualizations with Chart.js
- **Navigation**: Responsive header with mobile support
- **Stats**: Metric display cards with icons

## 🚀 Deployment

### GitHub Pages (Automatic)
The dashboard automatically deploys to GitHub Pages via GitHub Actions:

1. **Triggers**:
   - Push to main branch (dashboard changes)
   - Daily schedule (6 AM UTC)
   - Manual workflow dispatch

2. **Build Process**:
   - Install Node.js dependencies
   - Collect fresh data from all sources
   - Build static site with Eleventy
   - Deploy to GitHub Pages

3. **Access**: `https://[username].github.io/[repository]/`

### Manual Deployment
```bash
# Build and deploy to gh-pages branch
npm run build:full
npm run deploy
```

## 🧪 Testing

### Data Collection Testing
```bash
# Test data collection script
node src/data/collect-data.js

# Verify generated data files
ls -la src/_data/
```

### Build Testing
```bash
# Test build process
npm run build

# Check generated site
ls -la _site/
```

### Local Testing
```bash
# Start local development server
npm run dev

# Visit http://localhost:8080
```

## 🔍 Troubleshooting

### Common Issues

1. **Missing GitHub Data**
   ```bash
   # Check GitHub token configuration
   echo $GITHUB_TOKEN
   
   # Test GitHub API access
   curl -H "Authorization: token $GITHUB_TOKEN" \
        https://api.github.com/user
   ```

2. **Build Failures**
   ```bash
   # Clear cache and rebuild
   rm -rf _site/ node_modules/
   npm install
   npm run build:full
   ```

3. **Data Collection Errors**
   ```bash
   # Check data collection logs
   npm run build:data 2>&1 | tee collection.log
   
   # Verify data file generation
   find src/_data -name "*.json" -exec echo "File: {}" \; -exec head -5 {} \;
   ```

4. **Chart Display Issues**
   ```bash
   # Verify Chart.js CDN access
   curl -I https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.min.js
   
   # Check browser console for JavaScript errors
   ```

### Debug Mode
Enable debug logging by setting environment variable:
```bash
DEBUG=dashboard:* npm run build:data
```

## 🤝 Contributing

### Adding New Features

1. **New Dashboard Page**:
   ```bash
   # Create new page directory
   mkdir src/new-feature/
   
   # Add index.njk with layout
   cat > src/new-feature/index.njk << EOF
   ---
   layout: base.njk
   title: New Feature
   ---
   <div class="card">Content here</div>
   EOF
   ```

2. **New Data Source**:
   ```javascript
   // Add to src/data/collect-data.js
   async collectNewData() {
     // Implementation here
     const data = await fetchData();
     await fs.writeFile(
       path.join(DATA_DIR, 'new-data.json'),
       JSON.stringify(data, null, 2)
     );
   }
   ```

3. **New Chart Type**:
   ```javascript
   // Add Chart.js implementation
   new Chart(ctx, {
     type: 'newType',
     data: processedData,
     options: customOptions
   });
   ```

### Code Style
- **ESLint**: Code linting and formatting
- **Prettier**: Consistent code formatting
- **Tailwind**: Utility-first CSS approach
- **Semantic HTML**: Accessible markup structure

## 📚 Technology Stack

- **[Eleventy](https://www.11ty.dev/)** - Static site generator
- **[Tailwind CSS](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Alpine.js](https://alpinejs.dev/)** - Lightweight JavaScript framework
- **[Chart.js](https://www.chartjs.org/)** - Interactive data visualization
- **[Nunjucks](https://mozilla.github.io/nunjucks/)** - Template engine
- **[GitHub Pages](https://pages.github.com/)** - Static site hosting
- **[GitHub Actions](https://github.com/features/actions)** - CI/CD automation

## 📜 License

This project is licensed under the MIT License - see the main project LICENSE file for details.

## 🙋‍♂️ Support

For questions, issues, or contributions:

1. **Create an Issue**: [GitHub Issues](https://github.com/MementoRC/code-graph-rag/issues)
2. **Start a Discussion**: [GitHub Discussions](https://github.com/MementoRC/code-graph-rag/discussions)
3. **Submit a PR**: [Pull Requests](https://github.com/MementoRC/code-graph-rag/pulls)

---

**Built with ❤️ by the Upstream Analysis Team**