#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequest,
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { REACTION_EMOJIS } from "./types.js";

// Type definitions for tool arguments
interface SendMessageArguments {
  chat_id: string;
  text: string;
  parse_mode?: "MarkdownV2" | "HTML";
}

interface ReactionTypeEmoji {
  type: "emoji";
  emoji: (typeof REACTION_EMOJIS)[number];
}

interface SetMessageReactionArguments {
  chat_id: string;
  message_id: number;
  reaction?: ReactionTypeEmoji;
  is_big?: boolean;
}

// Tool definitions
const sendMessageTool: Tool = {
  name: "telegram_send_message",
  description: "Sends a text message",
  inputSchema: {
    type: "object",
    properties: {
      chat_id: {
        type: "string",
        required: true,
        description:
          "Unique identifier for the target chat or username of the target channel (in the format @channelusername)",
      },
      text: {
        type: "string",
        description: "Text of the message to be sent",
      },
      parse_mode: {
        type: "string",
        description: "Mode for parsing entities in the message text",
        enum: ["MarkdownV2 ", "HTML"],
      },
    },
    required: ["chat_id", "text"],
  },
};

const setMessageReactionTool: Tool = {
  name: "telegram_set_message_reaction",
  description: "Sets or updates a reaction to a message",
  inputSchema: {
    type: "object",
    properties: {
      chat_id: {
        type: "string",
        description:
          "Unique identifier for the target chat or username of the target channel (in the format @channelusername)",
      },
      message_id: {
        type: "number",
        description: "Identifier of the target message",
      },
      reaction: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["emoji"],
          },
          emoji: {
            type: "string",
            enum: REACTION_EMOJIS,
          },
        },
        description: "Reaction to set",
      },
      is_big: {
        type: "boolean",
        description: "Pass `true` to set the reaction with a big animation",
      },
    },
    required: ["chat_id", "message_id"],
  },
};

class TelegramClient {
  private baseUrl: string;

  constructor(botToken: string) {
    this.baseUrl = `https://api.telegram.org/bot${botToken}`;
  }

  async sendMessage(
    chat_id: string,
    text: string,
    parseMode?: "MarkdownV2" | "HTML",
  ): Promise<any> {
    const params = new URLSearchParams({
      chat_id,
      text,
    });
    if (parseMode) {
      params.append("parse_mode", parseMode);
    }

    console.error("Sending message to Telegram...", params);

    const response = await fetch(`${this.baseUrl}/sendMessage`, {
      method: "POST",
      body: params,
    });

    console.error("Telegram response:", response);

    return response.json();
  }

  async setMessageReaction(
    chat_id: string,
    message_id: number,
    reaction?: ReactionTypeEmoji,
    is_big?: boolean,
  ): Promise<any> {
    const params = new URLSearchParams({
      chat_id,
      message_id: message_id.toString(),
    });
    if (reaction) {
      params.append("reaction", JSON.stringify({ reaction }));
    }
    if (is_big) {
      params.append("is_big", is_big ? "True" : "False");
    }

    const response = await fetch(`${this.baseUrl}/setMessageReaction`, {
      method: "POST",
      body: params,
    });
    return response.json();
  }
}

async function main() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.error("Please set TELEGRAM_BOT_TOKEN environment variable");
    process.exit(1);
  }

  console.error("Starting Telegram MCP Server...");
  const server = new Server(
    {
      name: "Telegram MCP Server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  const telegramClient = new TelegramClient(botToken);

  server.setRequestHandler(
    CallToolRequestSchema,
    async (request: CallToolRequest) => {
      console.error("Received CallToolRequest:", request);
      try {
        if (!request.params.arguments) {
          throw new Error("No arguments provided");
        }

        switch (request.params.name) {
          case "telegram_send_message": {
            const args = request.params
              .arguments as unknown as SendMessageArguments;
            const response = await telegramClient.sendMessage(
              args.chat_id,
              args.text,
              args.parse_mode,
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          case "telegram_set_message_reaction": {
            const args = request.params
              .arguments as unknown as SetMessageReactionArguments;
            const response = await telegramClient.setMessageReaction(
              args.chat_id,
              args.message_id,
              args.reaction,
              args.is_big,
            );
            return {
              content: [{ type: "text", text: JSON.stringify(response) }],
            };
          }

          default:
            throw new Error(`Unknown Telegram tool: ${request.params.name}`);
        }
      } catch (error) {
        console.error("Error executing tool:", error);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
        };
      }
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        sendMessageTool,
        setMessageReactionTool,
      ],
    };
  });

  const transport = new StdioServerTransport();
  console.error("Connecting Telegram server to transport...");
  await server.connect(transport);

  console.error("Telegram MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
