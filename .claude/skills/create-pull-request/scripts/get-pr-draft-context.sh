#!/bin/bash
set -euo pipefail
# PR作成に必要なコンテキストを1回で取得する
# 出力: JSON { base, branch, upstream, hasUpstream, pushedToRemote, aheadCount,
#              existingPr, commits, diffStat, diffFiles, template, repo }

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "")
if [ -z "$REPO_ROOT" ]; then
  echo "エラー: gitリポジトリではありません" >&2
  exit 1
fi
cd "$REPO_ROOT"

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" = "HEAD" ]; then
  echo "エラー: detached HEAD 状態です" >&2
  exit 1
fi

# ベースブランチ検出（review-branchスキルのスクリプトを再利用）
# -r で判定する: bash script.sh で明示実行するため実行ビットは不要。
# -x だと実行権限がない環境で意図せずフォールバックしベース判定を誤る
BASE_SCRIPT=".claude/skills/review-branch/scripts/detect-base-branch.sh"
if [ -r "$BASE_SCRIPT" ]; then
  BASE=$(bash "$BASE_SCRIPT" --raw)
else
  if git rev-parse --verify main >/dev/null 2>&1; then
    BASE="main"
  elif git rev-parse --verify master >/dev/null 2>&1; then
    BASE="master"
  else
    BASE="main"
  fi
fi

if [ "$BRANCH" = "$BASE" ]; then
  echo "エラー: 現在ベースブランチ ($BASE) 上にいます。作業ブランチに切り替えてください" >&2
  exit 1
fi

# upstream
set +e
UPSTREAM=$(git rev-parse --abbrev-ref "${BRANCH}@{upstream}" 2>/dev/null)
UP_STATUS=$?
set -e
HAS_UPSTREAM="false"
PUSHED="false"
if [ $UP_STATUS -eq 0 ] && [ -n "$UPSTREAM" ]; then
  HAS_UPSTREAM="true"
  if git merge-base --is-ancestor HEAD "$UPSTREAM" 2>/dev/null; then
    PUSHED="true"
  fi
fi

AHEAD=$(git rev-list --count "$BASE"..HEAD 2>/dev/null || echo "0")

# 既存PR（なければnull）
EXISTING_PR=$(gh pr view --json number,url,state,isDraft 2>/dev/null || true)
[ -z "$EXISTING_PR" ] && EXISTING_PR="null"

COMMITS=$(git log "$BASE"..HEAD --format='%h%x09%s' 2>/dev/null || echo "")
DIFFSTAT=$(git diff "$BASE"...HEAD --stat 2>/dev/null || echo "")
DIFF_FILES=$(git diff "$BASE"...HEAD --name-only 2>/dev/null || echo "")

TEMPLATE=""
if [ -f ".github/pull_request_template.md" ]; then
  TEMPLATE=$(cat ".github/pull_request_template.md")
fi

REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner' 2>/dev/null || echo "")

jq -n \
  --arg base "$BASE" \
  --arg branch "$BRANCH" \
  --arg upstream "$UPSTREAM" \
  --arg hasUpstream "$HAS_UPSTREAM" \
  --arg pushed "$PUSHED" \
  --arg ahead "$AHEAD" \
  --argjson existing "$EXISTING_PR" \
  --arg commits "$COMMITS" \
  --arg diffstat "$DIFFSTAT" \
  --arg diffFiles "$DIFF_FILES" \
  --arg template "$TEMPLATE" \
  --arg repo "$REPO" \
  '{
    base: $base,
    branch: $branch,
    upstream: $upstream,
    hasUpstream: ($hasUpstream == "true"),
    pushedToRemote: ($pushed == "true"),
    aheadCount: ($ahead | tonumber),
    existingPr: $existing,
    commits: $commits,
    diffStat: $diffstat,
    diffFiles: $diffFiles,
    template: $template,
    repo: $repo
  }'
