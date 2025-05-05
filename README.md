<img alt="ChatZen" src="./build/icon.png" width="200">

# ChatZen(α)

- ChatZenはMCP(Model Context Protocol)に対応したLLMチャットクライアントです
- OpenAI、Claude、Gemini、Deepseekに対応しています

![Screenshot](./docs/screenshot.png)

## Settings

`Command`+`,`で設定ファイルを開いて以下のように設定してください。

```json
{
  "model": "gpt-4o-mini",
  "assistant": "Deep Research",
  "models": ["gpt-4o-mini", "deepseek-chat", "gemini-2.5-flash-preview-04-17"],
  "maxSteps": 32,
  "instructions": "You help user.",
  "assistants": [
    {
      "name": "Deep Research",
      "instructions": "BraveSeachとFetchでページにアクセスすることを繰り返してあらゆる情報を集めて結果を長文のレポートでまとめてください。",
      "tools": [
        "brave-search_brave_web_search",
        "fetch_fetch",
        "cosense-mcp-server_search_pages",
        "cosense-mcp-server_list_pages",
        "cosense-mcp-server_list_search_pages"
      ],
      "autoApprove": true
    },
    {
      "name": "ノートアシスタント",
      "instructions": "/Users/username/Noteの下にMarkdownファイルがあるのでユーザーの指示に従いそのファイル群を読み書きしてください。"
    },
    {
      "name": "ChatZen Development",
      "instructions": "/Users/username/Development/chat-zenのコードを調べてユーザーの指示に従ってコーディングしてください。必要に応じてライブラリの仕様を参照してください。",
      "tools": ["claude_code_.+", "mastra-docs", "electron-docs"]
    },
    {
      "name": "Deep GitHub",
      "instructions": "GitHubリポジトリのコードをgithub_search_codeのツール利用を何回も繰り返すことでじっくりと調査してください。それを元にユーザーの質問に答えてください",
      "tools": ["github_search_code", "github_get_file_contents", "github_search_repositories"]
    }
  ],
  "apiKeys": {
    "openai": "***",
    "anthropic": "***",
    "google": "***",
    "deepseek": "***"
  },
  "mcpServers": {
    "electron-docs": {
      "url": "https://gitmcp.io/electron/electron"
    },
    "mastra-docs": {
      "url": "https://gitmcp.io/mastra-ai/mastra"
    },
    "brave-search": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-e", "BRAVE_API_KEY", "mcp/brave-search"],
      "env": {
        "BRAVE_API_KEY": "***"
      }
    },
    "fetch": {
      "command": "uvx",
      "args": ["mcp-server-fetch"]
    },
    "cosense-mcp-server": {
      "command": "npx",
      "args": ["-y", "@yosider/cosense-mcp-server"],
      "env": {
        "COSENSE_PROJECT_NAME": "villagepump"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/username/Note"]
    },
    "claude_code": {
      "command": "claude",
      "args": ["mcp", "serve"],
      "env": {}
    },
    "github": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "GITHUB_PERSONAL_ACCESS_TOKEN",
        "ghcr.io/github/github-mcp-server"
      ],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "***"
      }
    }
  },
  "tokenLimit": 127000
}
```
