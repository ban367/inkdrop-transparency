---
name: create-pr
description: 現在のブランチからgh pr createでPRを作成する。タイトルは英語（Conventional Commits）、本文は日本語でPRテンプレート（.github/pull_request_template.md）に沿って記入する
---

## 1. コンテキスト取得

以下を1回だけ実行する:

```bash
bash .claude/skills/create-pull-request/scripts/get-pr-draft-context.sh
```

返却JSONの主な項目:
- `branch` / `base`: 作業ブランチ / ベースブランチ（自動検出）
- `hasUpstream` / `pushedToRemote`: upstream設定済みか、HEADがリモートに反映済みか
- `aheadCount`: ベースに対する追加コミット数
- `existingPr`: 既存PR情報（nullならなし）
- `commits`: `<hash>\t<subject>` 改行区切り
- `diffStat` / `diffFiles`: 差分サマリー・変更ファイル一覧
- `template`: PRテンプレート本文（空文字列なら未設置）

## 2. 前提チェック

- `aheadCount == 0` → 「ベース (`<base>`) に対するコミットがありません。」と報告して終了
- `existingPr` が存在 → 「PR #<number> が既に存在します: <url>」と案内し、修正は `fix-pr` スキルの利用を促して終了

## 3. ドラフト生成

### タイトル（英語）

Conventional Commits形式の1行。`commits` のsubjectと `diffStat` から主要な変更を抽出して要約する:

- プレフィックス: `feat:` `fix:` `refactor:` `docs:` `style:` `test:` `chore:`
- スコープが明確なら `feat(auth): ...` のように付けてよい
- 50字程度を目安に、末尾ピリオドなし
- 複数の性質の変更が混在する場合は代表的なものを主語にし、残りは本文で触れる

### 本文（日本語）

`template` が空でない場合、**テンプレートの見出し構造を維持したまま**中身を差し替える:

- `<!-- ... -->` のHTMLコメントや ` ```text ... ``` ` のコードブロックは**記入ガイドのサンプル**。最終本文には**残さず**、該当セクションの内容として素の日本語テキストに置き換える
- 「概要」セクション: **何を・なぜ**変更したかを簡潔に記述する。背景があれば補足する
- 「セルフレビュー」セクション: 差分から推定した動作確認の観点・手順を記述する
- 空の箇条書き（`- ` や `- a` `- b` `- c` などのプレースホルダ）は、差分から妥当な動作確認項目で置換する（例: `- ユニットテストを追加し通過を確認`）。不要なら削除してよい
- 見出し（`##` 行）の文言・順序は変更しない

`template` が空の場合は以下の簡易構成で作成する:

```markdown
## 概要

<変更内容と背景を日本語で要約>

## セルフレビュー

- <動作確認項目1>
- <動作確認項目2>
```

## 4. ユーザー確認

生成したタイトル・本文をそのまま提示し、以下を確認する:

- タイトル・本文の内容でよいか（修正要望があれば反映）
- ベースブランチが `<base>` で正しいか（自動検出結果のため念のため確認）
- draft PRとして作成するか（デフォルトはnon-draft。ユーザーが明示的に指定した場合のみ `--draft` を付ける）

承認を得てから次へ進む。外部に可視化される操作のため、必ず確認を挟むこと。

## 5. リモートpush

`pushedToRemote` が `false` の場合、PR作成前にpushが必要:

```bash
# upstream未設定の場合
git push -u origin <branch>

# upstreamはあるがHEADが未反映の場合
git push
```

## 6. PR作成

タイトルは英語、本文は日本語でHEREDOC経由で渡す:

```bash
gh pr create \
  --base <base> \
  --title "<英語タイトル>" \
  --body "$(cat <<'EOF'
<日本語本文>
EOF
)"
```

draft指定時は `--draft` を追加する。

## 完了報告

日本語で以下をまとめる:
- 作成したPRのURL
- 採用したタイトル・ベースブランチ
- push操作を行った場合はその旨
