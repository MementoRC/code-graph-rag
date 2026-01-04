# Analysis Sessions Directory

This directory contains upstream analysis session documents and artifacts.

## File Structure

### 📄 Current Analysis (Always Latest)
- **`latest-analysis.md`** - The most recent analysis session document
- **`latest-summary.md`** - Quick summary of the latest session

### 📦 Archive
- **`archive/`** - Historical analysis documents with timestamps
- **`*-final.json`** - Completed session data in JSON format
- **`*-progress.json`** - Session state files (cleaned automatically)

### 📊 Dashboard Data
- **`dashboard-updates.json`** - Dashboard metrics from all sessions

## Usage

### 🔍 For Quick Review
Always check `latest-analysis.md` for the most current analysis.

### 📋 For Live Sessions
```bash
# Start interactive analysis session
cd .github/upstream-analysis
npm run session start ../analysis-sessions/latest-analysis.md
```

### 📚 For Historical Research
Check the `archive/` directory for previous sessions with timestamps.

## Automation

The analysis session automation:
1. **Archives** old analysis documents before creating new ones
2. **Generates** fresh `latest-analysis.md` and `latest-summary.md`
3. **Preserves** history in timestamped archive files
4. **Cleans** old progress files (keeps last 5)

This ensures you always have a clear, current analysis while preserving historical context.

## File Naming Convention

### Current Files
- `latest-analysis.md` - Always the current analysis
- `latest-summary.md` - Always the current summary

### Archive Files
- `YYYYMMDD-HHMMSS-[original-filename].md` - Timestamped archives
- `session-YYYY-MM-DD-HHMMSS-final.json` - Completed session data
- `session-YYYY-MM-DD-HHMMSS-issues.json` - GitHub issues created

This structure eliminates confusion about which analysis is current while maintaining complete historical records.
