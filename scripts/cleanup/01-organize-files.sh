#!/bin/bash

# Level Up Solo - File Organization Script
# This script organizes the project files into proper directories
# Run from project root: bash scripts/cleanup/01-organize-files.sh

echo "🧹 Starting Level Up Solo file organization..."

# Create necessary directories
echo "📁 Creating directory structure..."
mkdir -p scripts/debug
mkdir -p scripts/database
mkdir -p scripts/migration
mkdir -p docs/archive
mkdir -p docs/web
mkdir -p docs/deployment
mkdir -p attached_assets/archive

# Move debug scripts
echo "🔧 Moving debug scripts..."
mv *debug*.{js,ts,sh} scripts/debug/ 2>/dev/null || true
mv *test*.{js,ts,sh} scripts/debug/ 2>/dev/null || true
mv test-*.{js,ts} scripts/debug/ 2>/dev/null || true
mv check-*.{js,ts} scripts/debug/ 2>/dev/null || true

# Move database scripts
echo "💾 Moving database scripts..."
mv *.sql scripts/database/ 2>/dev/null || true
mv scripts/*database*.{js,ts,sh} scripts/database/ 2>/dev/null || true
mv scripts/*migration*.{js,ts,sh} scripts/migration/ 2>/dev/null || true

# Move iOS documentation (should be in iOS project)
echo "📱 Moving iOS documentation to archive..."
mv docs/*iOS*.md docs/archive/ 2>/dev/null || true
mv docs/*ios*.md docs/archive/ 2>/dev/null || true

# Clean up sensitive files
echo "🔒 Removing sensitive files..."
rm -f *DATABASE_URL*.txt
rm -f *database_url*.txt
rm -f *.log
rm -f *.pid

# Archive old attached assets
echo "📦 Archiving old debug logs..."
# Move files older than 7 days to archive
find attached_assets -name "*.log" -mtime +7 -exec mv {} attached_assets/archive/ \; 2>/dev/null || true
find attached_assets -name "*.png" -mtime +30 -exec mv {} attached_assets/archive/ \; 2>/dev/null || true

# Create .gitignore entries if not exists
echo "📝 Updating .gitignore..."
cat >> .gitignore << EOL

# Cleanup additions
*.log
*.pid
*.txt
scripts/debug/
attached_assets/archive/
.DS_Store
EOL

# Sort and remove duplicates from .gitignore
sort -u .gitignore -o .gitignore

echo "✅ File organization complete!"
echo ""
echo "📊 Summary:"
echo "- Debug scripts moved to: scripts/debug/"
echo "- Database scripts moved to: scripts/database/"
echo "- iOS docs archived to: docs/archive/"
echo "- Sensitive files removed"
echo "- Old assets archived"
echo ""
echo "⚠️  Please review and commit these changes!"