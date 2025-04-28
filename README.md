<img alt="ChatZen" src="./build/icon.png" width="200">

# ChatZen(α)

- ChatZenはMCP(Model Context Protocol)に対応したLLMチャットクライアントです
- OpenAI、Claude、Gemini、Deepseekに対応しています

![Screenshot](./docs/screenshot.png)

## Settings

`Command+,`で設定ファイルを開いて以下のように設定してください。

```json
{
  "model": "deepseek-chat",
  "maxSteps": 32,
  "instructions": "ユーザーに従ってください。",
  "assistants": [
    {
      "name": "Deep Research",
      "instructions": "BraveSeachとFetchでアクセスすることを繰り返してあらゆる情報を集めて結果を長文のレポートでまとめてください。"
    },
    {
      "name": "ノートアシスタント",
      "instructions": "/Users/username/Documents/notesの下にMarkdownファイルがあるのでユーザーの指示に従いそのファイル群を読み書きしてください。"
    }
  ],
  "apiKeys": {
    "openai": "...",
    "anthropic": "...",
    "google": "...",
    "deepseek": "..."
  },
  "mcpServers": {
    "brave-search": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "-e", "BRAVE_API_KEY", "mcp/brave-search"],
      "env": {
        "BRAVE_API_KEY": "..."
      }
    },
    "fetch": {
      "command": "uvx",
      "args": ["mcp-server-fetch"]
    },
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/Users/username/Documents/notes"
      ]
    }
  }
}
```
