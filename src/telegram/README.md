# Telegram MCP Server

PoC MCP Server for Telegram.


### Usage with Claude Desktop

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "telegram": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-telegram"
      ],
      "env": {
        "TELEGRAM_BOT_TOKEN": "XXXXX:SSSSSSSSSSSS",
      }
    }
  }
}
```
