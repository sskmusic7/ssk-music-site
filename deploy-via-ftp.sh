#!/bin/bash

# SSK Music Website - Manual FTP Deployment
# Use this script when Netlify automatic deployment isn't working

echo "🚀 SSK Music Website - Manual FTP Deployment"
echo "============================================"

# Configuration - UPDATE THESE WITH YOUR FTP DETAILS
FTP_HOST="your-ftp-host.com"
FTP_USER="your-username"
FTP_PASS="your-password"
FTP_PATH="/public-html"  # Update if different

# Files to deploy
FILES_TO_UPLOAD=(
    "index.html"
    "contact.html"
)

echo "📋 Files to deploy:"
for file in "${FILES_TO_UPLOAD[@]}"; do
    echo "  - $file"
done

echo ""
echo "🔧 To deploy manually:"
echo ""
echo "1. Open your FTP client (FileZilla, Cyberduck, etc.)"
echo "2. Connect to: $FTP_HOST"
echo "3. Navigate to: $FTP_PATH"
echo ""
echo "4. Upload these files:"
for file in "${FILES_TO_UPLOAD[@]}"; do
    echo "   📤 $file"
done

echo ""
echo "⚠️  BACKUP FIRST!"
echo "Before uploading, download the current versions as backup:"
for file in "${FILES_TO_UPLOAD[@]}"; do
    echo "   💾 Download current $file → ${file}.backup"
done

echo ""
echo "✅ After upload, refresh sskmusic.com to see the fixes!"