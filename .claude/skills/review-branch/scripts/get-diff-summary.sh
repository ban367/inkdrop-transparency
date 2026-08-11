#!/bin/bash
set -euo pipefail

# 引数があればそれを使用、なければ detect-base-branch.sh で自動検出
if [ -n "${1:-}" ]; then
  BASE_BRANCH="$1"
else
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  BASE_BRANCH=$(bash "$SCRIPT_DIR/detect-base-branch.sh" --raw 2>/dev/null || echo "main")
fi

# ブランチ名のバリデーション（オプションインジェクション / コマンドインジェクション対策）
# 1. シェルオプションとして解釈されうる値（先頭が -）を拒否する
if [[ "$BASE_BRANCH" == -* ]]; then
  echo "エラー: 無効なブランチ名です（先頭の - は使用できません）: $BASE_BRANCH" >&2
  exit 1
fi

# 2. git の正式なブランチ名形式かを検証する
if ! git check-ref-format --branch "$BASE_BRANCH" >/dev/null 2>&1; then
  echo "エラー: 無効なブランチ名です: $BASE_BRANCH" >&2
  exit 1
fi

# 各カテゴリのファイル一覧を取得し、ユニークなファイル数を算出する
# コミット済み差分: merge-base から HEAD までの差分（作業ツリーの変更を含まない）
COMMITTED_FILES=$(git diff "$BASE_BRANCH"...HEAD --name-only 2>/dev/null || true)
# 未コミット変更（unstaged）
UNSTAGED_FILES=$(git diff --name-only 2>/dev/null || true)
# 未コミット変更（staged）
STAGED_FILES=$(git diff --cached --name-only 2>/dev/null || true)
# 未追跡ファイル
UNTRACKED_FILES=$(git ls-files --others --exclude-standard 2>/dev/null || true)

# 全ファイルをユニーク化してカウント
FILE_COUNT=$(printf '%s\n' "$COMMITTED_FILES" "$UNSTAGED_FILES" "$STAGED_FILES" "$UNTRACKED_FILES" | { grep -v '^$' || true; } | sort -u | wc -l | tr -d ' ')

# カテゴリ別のカウント（表示用）
COMMITTED_COUNT=$(printf '%s\n' "$COMMITTED_FILES" | { grep -c -v '^$' || true; })
UNSTAGED_COUNT=$(printf '%s\n' "$UNSTAGED_FILES" | { grep -c -v '^$' || true; })
STAGED_COUNT=$(printf '%s\n' "$STAGED_FILES" | { grep -c -v '^$' || true; })
UNTRACKED_COUNT=$(printf '%s\n' "$UNTRACKED_FILES" | { grep -c -v '^$' || true; })

# 行数サマリー（コミット済み差分）
STAT=$(git diff "$BASE_BRANCH"...HEAD --shortstat 2>/dev/null || echo "")
if [ -n "$STAT" ]; then
  ADDED=$(echo "$STAT" | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
  DELETED=$(echo "$STAT" | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo "0")
else
  ADDED="0"
  DELETED="0"
fi

echo "変更ファイル数: ${FILE_COUNT}（ユニーク）"
echo "  コミット済み差分: ${COMMITTED_COUNT}"
echo "  未コミット変更: $((UNSTAGED_COUNT + STAGED_COUNT))"
echo "  未追跡ファイル: ${UNTRACKED_COUNT}"
echo "追加行数: +${ADDED}"
echo "削除行数: -${DELETED}"

if [ "$FILE_COUNT" -le 20 ]; then
  echo "レビューモード: 通常モード（全差分を一括取得）"
else
  echo "レビューモード: ファイル別モード（ファイルごとに逐次取得）"
fi
