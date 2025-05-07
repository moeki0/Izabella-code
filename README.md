<img alt="ChatZen" src="./build/icon.png" width="200">

# ChatZen(α)

- ChatZenは長期記憶を持つモードレスなチャットクライアントです

![Screenshot](./docs/screenshot.png)

## Settings

`Command`+`,`で設定ファイルを開いて以下のように設定してください。

```json
{
  "maxSteps": 32,
  "instructions": "You help user.",
  "apiKeys": {
    "openai": "***",
    "google": "***"
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
