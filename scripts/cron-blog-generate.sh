#!/usr/bin/env bash
# Generate + publish a new SSK Music blog post via Molteesha (OpenClaw gateway).
#
# Runs Mon/Wed/Fri. docs/BLOG_BRIEF.md carries the actual instructions the
# agent follows -- this script only picks the topic and submits the job, so
# the brief can change by commit instead of by rebuilding this script.
#
# Crontab entry:
#   0 7 * * 1,3,5 bash /opt/molteesha/data/workspace/ssk-music-site/scripts/cron-blog-generate.sh >> /var/log/ssk-blog-generate.log 2>&1

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO"

git pull --ff-only origin main 2>/dev/null || true

TOPIC=$(node scripts/blog-topic-guard.mjs --pick)
FORBIDDEN_JSON=$(node scripts/blog-topic-guard.mjs --forbidden)

echo "[blog-gen] $(date -Is) topic: $TOPIC"

PROMPT="Follow docs/BLOG_BRIEF.md exactly and write ONE new SSK Music blog post.

=== MANDATORY TOPIC (write this angle -- do not freestyle) ===
${TOPIC}

=== FORBIDDEN / ALREADY COVERED ===
${FORBIDDEN_JSON}
Obey neverWrite and titleRules above. If the topic is too close to an
existing title, pick again with: node scripts/blog-topic-guard.mjs --pick

When the post is written, run the publish step yourself exactly as the brief
says:
  bash scripts/blog-publish.sh <slug>
It lints, rebuilds, commits, pushes, and polls the live URL -- it exits
non-zero on a lint failure or a failed deploy. Report the slug and the
publish command's real exit result, not an assumption of success."

echo "[blog-gen] $(date -Is) submitting job to Molteesha"
/opt/molteesha/shared/submit-job.sh claude "$PROMPT"
echo "[blog-gen] $(date -Is) job submitted"
