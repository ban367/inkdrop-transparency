#!/bin/bash
set -euo pipefail
# PR対応に必要なコンテキストを1スクリプトで取得する
# - PR概要（number, title, url, head/baseRefName, state）
# - reviews: 直近50件（approval状態の判定が目的。古い投票は後続レビューで上書きされるため打ち切る）
# - generalComments: 全件（ページング）
# - 未resolvedのreviewThreads: 全件（スレッド・スレッド内コメントともにページング）
#
# 各接続は @include ディレクティブで完了済みの取得を抑制するため、
# ページング完了後は不要なレスポンスを取りに行かない。
#
# 使い方:
#   bash get-pr-context.sh           # 現在のブランチのPR
#   bash get-pr-context.sh <PR番号>  # 明示指定

PR_ARG="${1:-}"
set +e
if [ -n "$PR_ARG" ]; then
  PR_NUM=$(gh pr view "$PR_ARG" --json number --jq '.number' 2>/dev/null)
else
  PR_NUM=$(gh pr view --json number --jq '.number' 2>/dev/null)
fi
set -e
if [ -z "$PR_NUM" ]; then
  echo "エラー: プルリクエストを解決できませんでした。" >&2
  exit 1
fi
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')
OWNER="${REPO%%/*}"
REPONAME="${REPO##*/}"

# @include(if: ...) で「初回のみ」「commentsページング継続中」「threadsページング継続中」を制御し、
# 完了した接続はクエリ自体から外してレスポンス量を削減する。
QUERY='query($owner:String!,$repo:String!,$pr:Int!,$threadAfter:String,$commentAfter:String,$isFirst:Boolean!,$wantComments:Boolean!,$wantThreads:Boolean!){repository(owner:$owner,name:$repo){pullRequest(number:$pr){number @include(if:$isFirst),title @include(if:$isFirst),url @include(if:$isFirst),state @include(if:$isFirst),headRefName @include(if:$isFirst),baseRefName @include(if:$isFirst),reviews(last:50) @include(if:$isFirst){nodes{state,author{login},body,submittedAt}},comments(first:100,after:$commentAfter) @include(if:$wantComments){pageInfo{hasNextPage,endCursor}nodes{databaseId,author{login},body,createdAt}},reviewThreads(first:100,after:$threadAfter) @include(if:$wantThreads){pageInfo{hasNextPage,endCursor}nodes{id,isResolved,isOutdated,path,line,comments(first:100){pageInfo{hasNextPage,endCursor}nodes{databaseId,body,author{login},path,line,createdAt}}}}}}}'

THREAD_COMMENTS_QUERY='query($threadId:ID!,$after:String){node(id:$threadId){... on PullRequestReviewThread{comments(first:100,after:$after){pageInfo{hasNextPage,endCursor}nodes{databaseId,body,author{login},path,line,createdAt}}}}}'

META='null'
REVIEWS='[]'
GENERAL='[]'
THREADS='[]'
THREAD_AFTER="null"
COMMENT_AFTER="null"
IS_FIRST="true"
COMMENTS_HAS_NEXT="true"
THREADS_HAS_NEXT="true"

# メインクエリ: reviewThreadsとgeneralComments(=.comments)を並行してページング
while [ "$COMMENTS_HAS_NEXT" = "true" ] || [ "$THREADS_HAS_NEXT" = "true" ]; do
  RESPONSE=$(gh api graphql \
    -f query="$QUERY" \
    -F owner="$OWNER" -F repo="$REPONAME" -F pr="$PR_NUM" \
    -F threadAfter="$THREAD_AFTER" -F commentAfter="$COMMENT_AFTER" \
    -F isFirst="$IS_FIRST" \
    -F wantComments="$COMMENTS_HAS_NEXT" \
    -F wantThreads="$THREADS_HAS_NEXT")

  if [ "$IS_FIRST" = "true" ]; then
    META=$(printf '%s\n' "$RESPONSE" | jq '.data.repository.pullRequest | {number,title,url,state,headRefName,baseRefName}')
    REVIEWS=$(printf '%s\n' "$RESPONSE" | jq '.data.repository.pullRequest.reviews.nodes')
    IS_FIRST="false"
  fi

  if [ "$COMMENTS_HAS_NEXT" = "true" ]; then
    PAGE_COMMENTS=$(printf '%s\n' "$RESPONSE" | jq '.data.repository.pullRequest.comments.nodes')
    GENERAL=$(jq -s '.[0] + .[1]' <(printf '%s\n' "$GENERAL") <(printf '%s\n' "$PAGE_COMMENTS"))
    COMMENTS_HAS_NEXT=$(printf '%s\n' "$RESPONSE" | jq -r '.data.repository.pullRequest.comments.pageInfo.hasNextPage')
    COMMENT_AFTER=$(printf '%s\n' "$RESPONSE" | jq -r '.data.repository.pullRequest.comments.pageInfo.endCursor // "null"')
  fi

  if [ "$THREADS_HAS_NEXT" = "true" ]; then
    PAGE_THREADS=$(printf '%s\n' "$RESPONSE" | jq '[.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false)]')
    THREADS=$(jq -s '.[0] + .[1]' <(printf '%s\n' "$THREADS") <(printf '%s\n' "$PAGE_THREADS"))
    THREADS_HAS_NEXT=$(printf '%s\n' "$RESPONSE" | jq -r '.data.repository.pullRequest.reviewThreads.pageInfo.hasNextPage')
    THREAD_AFTER=$(printf '%s\n' "$RESPONSE" | jq -r '.data.repository.pullRequest.reviewThreads.pageInfo.endCursor // "null"')
  fi
done

# 各スレッド内コメントが100件を超える場合のフォローアップ取得
THREAD_IDS_WITH_MORE=$(printf '%s\n' "$THREADS" | jq -r '.[] | select(.comments.pageInfo.hasNextPage == true) | .id')
for TID in $THREAD_IDS_WITH_MORE; do
  T_AFTER=$(printf '%s\n' "$THREADS" | jq -r --arg id "$TID" '.[] | select(.id == $id) | .comments.pageInfo.endCursor')
  T_HAS_NEXT="true"
  while [ "$T_HAS_NEXT" = "true" ]; do
    T_RESPONSE=$(gh api graphql \
      -f query="$THREAD_COMMENTS_QUERY" \
      -F threadId="$TID" -F after="$T_AFTER")
    T_PAGE=$(printf '%s\n' "$T_RESPONSE" | jq '.data.node.comments.nodes')
    THREADS=$(printf '%s\n' "$THREADS" | jq --arg id "$TID" --argjson extra "$T_PAGE" \
      'map(if .id == $id then .comments.nodes += $extra else . end)')
    T_HAS_NEXT=$(printf '%s\n' "$T_RESPONSE" | jq -r '.data.node.comments.pageInfo.hasNextPage')
    T_AFTER=$(printf '%s\n' "$T_RESPONSE" | jq -r '.data.node.comments.pageInfo.endCursor // "null"')
  done
done

# pageInfoを除去し、commentsをフラットな配列に（SKILL.mdの記載と整合）
THREADS_CLEAN=$(printf '%s\n' "$THREADS" | jq 'map(.comments = .comments.nodes)')

jq -n \
  --argjson meta "$META" \
  --argjson reviews "$REVIEWS" \
  --argjson general "$GENERAL" \
  --argjson threads "$THREADS_CLEAN" \
  '{pr: $meta, reviews: $reviews, generalComments: $general, unresolvedThreads: $threads}'
