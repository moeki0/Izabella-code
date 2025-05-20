# アーティファクトツール

Izabellaには、エージェント（Claude）が直接アーティファクト（メモやコードなど）を作成、検索、更新できるようにするためのツールが用意されています。

## 概要

アーティファクトツールは、会話中に生成された重要な情報やコード、メモなどをユーザーのために保存・管理するために使用できます。保存されたアーティファクトは、サイドバーのアーティファクトパネルで確認、編集、削除が可能です。

以下の機能が提供されています：

1. **アーティファクト作成**（`create_artifact`）- 新しいアーティファクトを作成
2. **アーティファクト検索**（`search_artifacts`）- 既存のアーティファクトを検索
3. **アーティファクト更新**（`update_artifact`）- 既存のアーティファクトを更新

## 仕組み

これらのツールは内部でKnowledgeStoreを直接使用してアーティファクトを管理します。ハンドラーを経由せず、効率的にナレッジベースにデータを書き込みます。

KnowledgeStoreインスタンスは内部でキャッシュされ、複数回のツール呼び出しで同じインスタンスが再利用されます。

## 使用方法

### 1. アーティファクト作成ツール（create_artifact）

エージェントはアーティファクトを作成するために以下のパラメータを使用します：

- `title`: アーティファクトのタイトル（必須）
- `content`: アーティファクトの内容（マークダウン形式、必須）

#### 例

```json
{
  "title": "JavaScriptのクロージャについてのメモ", 
  "content": "# JavaScriptのクロージャ\n\nクロージャは関数と、その関数が宣言されたレキシカルスコープの組み合わせです。\n\n```javascript\nfunction makeCounter() {\n  let count = 0;\n  return function() {\n    return count++;\n  }\n}\n\nconst counter = makeCounter();\nconsole.log(counter()); // 0\nconsole.log(counter()); // 1\n```\n\nこの例では、`counter`関数は`makeCounter`関数のスコープにアクセスし続けることができます。"
}
```

#### 応答

```json
{
  "success": true,
  "message": "「JavaScriptのクロージャについてのメモ」というタイトルのアーティファクトが正常に作成されました。", 
  "id": "artifact--JavaScriptのクロージャについてのメモ"
}
```

### 2. アーティファクト検索ツール（search_artifacts）

エージェントはアーティファクトを内容で検索するために以下のパラメータを使用します：

- `query`: 検索クエリ（必須、内容の意味的な類似性、タイトルの完全一致、部分一致、またはあいまい検索で検索）
- `limit`: 返す結果の最大数（オプション、デフォルト: 20、最大: 100）

このツールは次の3つの検索方法を組み合わせて使用します：
1. プレフィックス検索：タイトルに検索クエリが含まれるアーティファクトを検索
2. ベクトル検索：内容の意味的な類似性に基づいてアーティファクトを検索
3. ファジー検索：タイトルの誤字や不完全な入力に対応したあいまい検索

#### 例

```json
{
  "query": "JavaScriptのクロージャについて説明", 
  "limit": 10
}
```

#### 応答

```json
{
  "success": true,
  "count": 4,
  "artifacts": [
    {
      "id": "artifact--JavaScriptクロージャ",
      "title": "JavaScriptクロージャ",
      "content": "# JavaScriptのクロージャ\n\nクロージャの基本...",
      "created_at": 1621234570,
      "similarity": 0.95,
      "match_type": "prefix"
    },
    {
      "id": "artifact--JavaScriptのクロージャについてのメモ",
      "title": "JavaScriptのクロージャについてのメモ",
      "content": "# JavaScriptのクロージャ\n\nクロージャは関数と...",
      "created_at": 1621234567,
      "similarity": 0.89,
      "match_type": "semantic"
    },
    {
      "id": "artifact--JavaScriptの関数型プログラミング",
      "title": "JavaScriptの関数型プログラミング",
      "content": "# JavaScriptの関数型プログラミング\n\n関数型プログラミングは...",
      "created_at": 1621234500,
      "similarity": 0.78,
      "match_type": "fuzzy_id"
    },
    {
      "id": "artifact--JavaScriptの非同期処理",
      "title": "JavaScriptの非同期処理",
      "content": "# JavaScriptの非同期処理\n\nJavaScriptでは...",
      "created_at": 1621234400,
      "similarity": 0.76,
      "match_type": "semantic"
    }
  ]
}
```

結果は類似度（similarity）の高い順に並べられます。類似度は0から1の範囲で、1に近いほど検索クエリとアーティファクトが類似していることを示します。

`match_type`フィールドは検索結果の種類を示します：
- `prefix`: タイトルに検索クエリが含まれる場合の検索結果
- `semantic`: 内容の意味的な類似性に基づく検索結果
- `fuzzy_id`: タイトルのファジー検索に基づく結果

### 3. アーティファクト更新ツール（update_artifact）

エージェントはアーティファクトを更新するために以下のパラメータを使用します：

- `id`: 更新するアーティファクトのID（必須、"artifact--"プレフィックスの有無は任意）
- `title`: 新しいタイトル（オプション）
- `content`: 新しい内容（オプション）

タイトルと内容の少なくとも一方は指定する必要があります。

#### 例

```json
{
  "id": "JavaScriptのクロージャについてのメモ",
  "title": "JavaScriptのクロージャとスコープ",
  "content": "# JavaScriptのクロージャとスコープ\n\n（更新された内容）..."
}
```

または一部のみ更新する場合：

```json
{
  "id": "artifact--JavaScriptのクロージャについてのメモ",
  "title": "JavaScriptのクロージャとスコープ"
}
```

#### 応答

```json
{
  "success": true,
  "message": "「JavaScriptのクロージャとスコープ」というタイトルのアーティファクトが正常に更新されました。",
  "id": "artifact--JavaScriptのクロージャとスコープ"
}
```

## 注意点

- タイトルと内容は空にできません
- 同じタイトルのアーティファクトが既に存在する場合、上書きされます
- アーティファクトの内容はマークダウン形式で記述すると、後で読みやすく表示されます
- 保存されたアーティファクトはサイドバーのアーティファクトパネルで確認できます
- アーティファクトのIDは検索と更新で利用されますが、ユーザーがIDを直接扱う必要はありません

## 使用例

- 会話中に書かれたコードやスニペットの保存
- 説明や手順のメモとしての保存
- 複雑な情報（設定ファイルなど）を後で参照できるよう保存
- チュートリアルやガイドの保存
- 以前に保存したアーティファクトの検索と参照
- アーティファクトの内容や分類の更新

## 技術的な詳細

アーティファクトは内部的には `artifact--{title}` というIDを持つナレッジアイテムとして保存されます。これにより、ナレッジベースの検索機能を活用してアーティファクトを管理できます。KnowledgeStoreのaddTexts関数を使用してデータを保存し、search関数を使用して検索、upsertText関数を使用して更新するため、効率的に動作します。