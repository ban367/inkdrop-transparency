---
name: fix-pr
description: PRのレビューコメントを確認し、対応プランを構築・実装・返信・コミット・resolveする
---

## 1. コンテキスト取得

以下を1回だけ実行する。未resolvedスレッドのみを含むJSONが返る:

```bash
bash .claude/skills/fix-pull-request/scripts/get-pr-context.sh
```

返却JSONの構造:
- `pr`: PR概要（number, title, url, state, headRefName, baseRefName）
- `reviews`: レビュー一覧（state, author, body）— 優先度判定に使う
- `generalComments`: 一般コメント
- `unresolvedThreads[]`: 各要素が `{id (threadId), isOutdated, path, line, comments[{databaseId, body, author.login, path, line}]}`

**`unresolvedThreads` が空で、かつ `generalComments` にも未対応の質問・指摘が残っていなければ**「対応が必要なレビューコメントはありません。」と報告して終了する。`generalComments` にはボットのレビューサマリや既に回答済みのコメントも含まれるため、内容を見て未対応のものが残っているかを判定すること。

`gh pr diff` は、コメントの指摘箇所を確認する必要がある場合のみ取得する（不要なら省略）。

## 2. 対応プランの構築

スレッドごとに対応方針を表形式で提示する:

| # | threadId | 要約 | 対応方針 | 優先度 |
|---|---------|------|---------|-------|
| 1 | PRRT_... | ... | 修正 / Suggestion適用 / 返答 / 不要 | 高/中/低 |

分類:
- **修正** — 具体的な変更内容を示す
- **Suggestion適用** — ` ```suggestion ` ブロックをそのまま／調整して反映
- **返答** — 質問・確認への回答
- **不要** — 意図的な実装やoutdatedで既解消。理由を添えて返信のみ

優先度:
- `CHANGES_REQUESTED` のレビューに紐づくもの → 最優先
- outdatedコメントで既に解消されている場合は低優先、返信+resolveのみ

**ユーザー確認を挟むケース**（コード修正前に一度確認する）:
- 設計・アーキテクチャ判断が必要
- 指摘が曖昧で複数解釈できる
- 波及が3ファイル以上に及ぶ
- レビュアーの指摘に同意できない

明確なバグ・typo・スタイル修正はそのまま進めてよい。

## 3. コード修正

AGENTS.md と `.github/instructions/general.instructions.md` の規約に従い、最小限の変更で対応する。

## 4. コメント返信

各スレッドの**最初のコメントのdatabaseId**に対して返信する（同じthreadに紐づく）。一般コメントはissues APIで返信する。

```bash
PR_NUM=$(gh pr view --json number --jq '.number')
REPO=$(gh repo view --json nameWithOwner --jq '.nameWithOwner')

# インライン返信（<comment_id> は対象スレッドの最初のコメントのdatabaseId）
gh api "repos/$REPO/pulls/$PR_NUM/comments/<comment_id>/replies" \
  -X POST -f body="<返信内容（日本語）>"

# 一般コメント返信
gh api "repos/$REPO/issues/$PR_NUM/comments" \
  -X POST -f body="<返信内容（日本語）>"
```

返信は日本語で簡潔に。修正対応なら変更概要、Suggestion適用ならその旨、意図的実装なら理由、outdatedなら既解消の旨を1〜2文で伝える。

## 5. コミット

英語・Conventional Commits形式。関連する変更はまとめ、性質が異なるもの（fix と refactor、code と docs）は分割する。迷ったら1コミットでよい。

```bash
git add <変更ファイル>
git commit -m "$(cat <<'EOF'
fix: address review comments

- <対応1>
- <対応2>

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

プレフィックス: `fix:` `refactor:` `docs:` `style:` `test:`

## 6. スレッドresolve

対応済み・対応不要いずれも返信後にresolveする:

```bash
gh api graphql -f query='mutation($t:ID!){resolveReviewThread(input:{threadId:$t}){thread{id,isResolved}}}' -F t="<threadId>"
```

## 完了報告

日本語で以下をまとめる:
- 対応したスレッドの件数と対応内容
- コミットハッシュ
- resolveした件数
- 見送った項目があればその理由
