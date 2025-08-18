#!/bin/bash

# Literature Manager Data Repository Setup Script
# This script creates the required folder structure and pushes to GitHub

echo "🚀 Setting up Literature Manager Data Repository..."

# Create temporary directory
TEMP_DIR="temp-data-repo"
rm -rf $TEMP_DIR
mkdir $TEMP_DIR
cd $TEMP_DIR

# Clone the data repository
echo "📥 Cloning data repository..."
git clone https://github.com/formicrogses/literature-manager-data.git .

# Create required directories
echo "📁 Creating required directories..."
mkdir -p pdfs
mkdir -p thumbnails

# Create placeholder files to ensure directories are tracked by git
echo "# PDF Files Directory

This directory contains all uploaded PDF files for the literature management system.

Files are automatically organized with the naming convention:
`paper-{id}-{timestamp}-{random}.pdf`

## Storage Features
- Automatic compression for files > 2MB
- Maximum file size: 100MB per file
- Supported formats: PDF, DOC, DOCX
- SHA-256 hash verification for integrity

## DO NOT MANUALLY EDIT
This directory is automatically managed by the Literature Management System.
Manual changes may be overwritten during synchronization." > pdfs/README.md

echo "# Thumbnails Directory

This directory contains auto-generated thumbnail images for PDF files.

Files are automatically organized with the naming convention:
`paper-{id}-{timestamp}-{random}.jpg`

## Thumbnail Features
- Auto-generated from PDF first page
- Format: JPEG with 85% quality
- Maximum dimensions: 400x300 pixels
- Fallback to research area icons when generation fails

## DO NOT MANUALLY EDIT
This directory is automatically managed by the Literature Management System.
Manual changes may be overwritten during synchronization." > thumbnails/README.md

# Copy the README.md from parent directory
cp ../data-repo-README.md README.md

# Create CHANGELOG.md
echo "# Changelog

All notable changes to the Literature Manager Data Repository will be documented in this file.

## [1.0.0] - $(date +%Y-%m-%d)

### Added
- Initial repository structure setup
- Created \`pdfs/\` directory for PDF file storage
- Created \`thumbnails/\` directory for generated thumbnails
- Added comprehensive README.md documentation
- Established automatic synchronization system
- Implemented SHA-based conflict resolution
- Added support for multiple file formats (PDF, DOC, DOCX)

### Features
- Automatic PDF compression for files > 2MB
- Real-time synchronization with web interface
- Thumbnail generation from PDF first page
- Multi-layer backup strategy
- Public access snapshots
- Version control protection

### Technical
- GitHub Contents API integration
- PDF.js-based thumbnail generation
- Exponential backoff retry mechanism
- Data integrity verification
- Automated conflict resolution

---

🤖 This changelog is automatically maintained by the Literature Management System." > CHANGELOG.md

# Add all changes to git
echo "📝 Adding changes to git..."
git add .

# Commit changes
echo "💾 Committing changes..."
git commit -m "$(cat <<'EOF'
Initialize data repository structure and documentation

- Create pdfs/ directory for PDF file storage with README
- Create thumbnails/ directory for generated thumbnails with README  
- Add comprehensive README.md with repository documentation
- Add CHANGELOG.md for version tracking
- Establish proper folder structure for literature management system
- Add placeholder files to ensure directories are tracked by git

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

# Push to GitHub
echo "🚀 Pushing to GitHub..."
git push origin main

echo "✅ Data repository setup completed successfully!"
echo "📁 Repository structure:"
echo "   ├── README.md"
echo "   ├── CHANGELOG.md" 
echo "   ├── papers.json"
echo "   ├── public-papers.json"
echo "   ├── pdfs/"
echo "   │   └── README.md"
echo "   └── thumbnails/"
echo "       └── README.md"

# Clean up
cd ..
rm -rf $TEMP_DIR

echo "🎉 All done! Data repository is ready for use."