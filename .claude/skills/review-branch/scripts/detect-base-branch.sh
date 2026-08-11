#!/bin/bash
set -euo pipefail

# --raw オプション: ブランチ名のみを出力する（スクリプト間連携用）
RAW_MODE=false
if [ "${1:-}" = "--raw" ]; then
  RAW_MODE=true
fi

# 現在のブランチを取得
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

if [ "$CURRENT_BRANCH" = "HEAD" ]; then
  if [ "$RAW_MODE" = true ]; then
    echo "main"
  else
    echo "検出失敗: detached HEAD 状態です"
    echo "推定ベースブランチ: main"
  fi
  exit 0
fi

# main / master のどちらが存在するかを確認
DEFAULT_BRANCH=""
if git rev-parse --verify main >/dev/null 2>&1; then
  DEFAULT_BRANCH="main"
elif git rev-parse --verify master >/dev/null 2>&1; then
  DEFAULT_BRANCH="master"
fi

# 現在のブランチがデフォルトブランチ自体の場合
if [ "$CURRENT_BRANCH" = "$DEFAULT_BRANCH" ]; then
  if [ "$RAW_MODE" = true ]; then
    echo "$DEFAULT_BRANCH"
  else
    echo "検出失敗: 現在デフォルトブランチ ($DEFAULT_BRANCH) 上にいます"
    echo "推定ベースブランチ: $DEFAULT_BRANCH"
  fi
  exit 0
fi

# ローカルブランチの中から、現在のブランチとの merge-base が最も近いものを探す
BEST_BRANCH=""
BEST_DISTANCE=999999
CURRENT_HEAD=$(git rev-parse HEAD)

for BRANCH in $(git for-each-ref --format='%(refname:short)' refs/heads/ 2>/dev/null); do
  # 自分自身はスキップ
  [ "$BRANCH" = "$CURRENT_BRANCH" ] && continue

  MERGE_BASE=$(git merge-base "$CURRENT_BRANCH" "$BRANCH" 2>/dev/null || echo "")
  [ -z "$MERGE_BASE" ] && continue

  # 子孫ブランチをスキップ（merge-base が現在の HEAD と一致 = 候補は現在ブランチから派生した子）
  [ "$MERGE_BASE" = "$CURRENT_HEAD" ] && continue

  # merge-base から現在のブランチの HEAD までのコミット数（少ないほど分岐が近い）
  DISTANCE=$(git rev-list --count "$MERGE_BASE".."$CURRENT_BRANCH" 2>/dev/null || echo "999999")

  # 同距離ならデフォルトブランチを優先
  if [ "$DISTANCE" -lt "$BEST_DISTANCE" ] || { [ "$DISTANCE" -eq "$BEST_DISTANCE" ] && [ "$BRANCH" = "$DEFAULT_BRANCH" ]; }; then
    BEST_DISTANCE="$DISTANCE"
    BEST_BRANCH="$BRANCH"
  fi
done

# 結果出力
RESULT_BRANCH=""
if [ -n "$BEST_BRANCH" ]; then
  RESULT_BRANCH="$BEST_BRANCH"
else
  # フォールバック: デフォルトブランチがあればそれを使う
  if [ -n "$DEFAULT_BRANCH" ]; then
    RESULT_BRANCH="$DEFAULT_BRANCH"
  else
    RESULT_BRANCH="main"
    if [ "$RAW_MODE" = false ]; then
      echo "検出失敗: ベースブランチを特定できませんでした"
    fi
  fi
fi

if [ "$RAW_MODE" = true ]; then
  echo "$RESULT_BRANCH"
else
  echo "推定ベースブランチ: $RESULT_BRANCH"
fi
