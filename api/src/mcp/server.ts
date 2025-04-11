import { McpServer, ResourceTemplate } from '@blocklet/mcp/server/mcp.js';
import { z } from 'zod';

import { tellStory } from './agent';

const mcpServer = new McpServer(
  {
    name: 'Example MCP Server on ArcBlock Platform',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  },
);

/**
 * Checks if a user has permission based on the access policy
 * @param {object} context - The authorization context to check against
 * @param {AccessPolicy} [policy] - The access policy to check against
 * @returns {boolean} - Whether the user has permission
 */
function checkPermissions(context: any, policy: any) {
  if (!policy) {
    return true;
  }

  const user = context.user || null;
  if (!user) {
    return false;
  }

  // Check deny rules first
  if (policy.deny) {
    // Check denied DIDs
    if (policy.deny.dids && policy.deny.dids.includes(user.did)) {
      return false;
    }

    // Check denied roles
    if (policy.deny.roles && policy.deny.roles.includes(user.role)) {
      return false;
    }

    // Check denied providers
    if (policy.deny.providers && policy.deny.providers.includes(user.provider)) {
      return false;
    }

    // Check denied auth methods
    if (user.method && policy.deny.methods && policy.deny.methods.includes(user.method)) {
      return false;
    }
  }

  // Check allow rules
  if (policy.allow) {
    let isAllowed = false;

    // If no allow rules are specified, default to allowed
    if (!policy.allow.dids && !policy.allow.roles && !policy.allow.providers && !policy.allow.methods) {
      isAllowed = true;
    } else {
      // Check allowed DIDs
      if (policy.allow.dids && policy.allow.dids.includes(user.did)) {
        isAllowed = true;
      }

      // Check allowed roles
      if (policy.allow.roles && policy.allow.roles.includes(user.role)) {
        isAllowed = true;
      }

      // Check allowed providers
      if (policy.allow.providers && policy.allow.providers.includes(user.provider)) {
        isAllowed = true;
      }

      // Check allowed auth methods
      if (user.method && policy.allow.methods && policy.allow.methods.includes(user.method)) {
        isAllowed = true;
      }
    }

    return isAllowed;
  }

  // If no rules specified, default to allowed
  return true;
}

function wrapToolHandler(handler: Function, policy: any) {
  return async (...input: any[]) => {
    const extra = input[input.length - 1];
    const hasPermission = await checkPermissions(extra.authContext, policy);
    if (!hasPermission) {
      throw new Error('Unauthorized');
    }
    return handler(...input);
  };
}

// 1. Simple Calculator Tool
mcpServer.tool(
  'calculator',
  'Perform basic arithmetic operations',
  {
    operation: z.enum(['add', 'subtract', 'multiply', 'divide']).describe('The arithmetic operation to perform'),
    a: z.number().describe('First number'),
    b: z.number().describe('Second number'),
  },
  ({ operation, a, b }) => {
    let result;
    switch (operation) {
      case 'add':
        result = a + b;
        break;
      case 'subtract':
        result = a - b;
        break;
      case 'multiply':
        result = a * b;
        break;
      case 'divide':
        if (b === 0) {
          return {
            content: [{ type: 'text', text: 'Error: Division by zero' }],
            isError: true,
          };
        }
        result = a / b;
        break;
      default:
        return {
          content: [{ type: 'text', text: 'Invalid operation' }],
          isError: true,
        };
    }
    return {
      content: [{ type: 'text', text: `Result: ${result}` }],
    };
  },
);

// 2. Text Manipulation Tool
mcpServer.tool(
  'text-transform',
  'Transform text in various ways',
  {
    text: z.string().describe('Input text to transform'),
    operation: z.enum(['uppercase', 'lowercase', 'reverse', 'count']).describe('The transformation to apply'),
  },
  ({ text, operation }) => {
    let result;
    switch (operation) {
      case 'uppercase':
        result = text.toUpperCase();
        break;
      case 'lowercase':
        result = text.toLowerCase();
        break;
      case 'reverse':
        result = text.split('').reverse().join('');
        break;
      case 'count':
        result = `Character count: ${text.length}`;
        break;
      default:
        return {
          content: [{ type: 'text', text: 'Invalid operation' }],
          isError: true,
        };
    }
    return {
      content: [{ type: 'text', text: result }],
    };
  },
);

// 3. Mock Database Query Tool
mcpServer.tool(
  'db-query',
  'Simulate database queries with mock data',
  {
    table: z.enum(['users', 'products', 'orders']).describe('The table to query'),
    action: z.enum(['list', 'count', 'find']).describe('The query action to perform'),
    filter: z.string().optional().describe('Optional filter criteria'),
  },
  wrapToolHandler(
    ({ table, action, filter }: { table: string; action: string; filter: string }) => {
      const mockData = {
        users: [
          { id: 1, name: 'Alice', email: 'alice@example.com' },
          { id: 2, name: 'Bob', email: 'bob@example.com' },
        ],
        products: [
          { id: 1, name: 'Laptop', price: 999 },
          { id: 2, name: 'Phone', price: 599 },
        ],
        orders: [
          { id: 1, userId: 1, productId: 1, status: 'completed' },
          { id: 2, userId: 2, productId: 2, status: 'pending' },
        ],
      };

      let result;
      switch (action) {
        case 'list':
          result = mockData[table];
          break;
        case 'count':
          result = `Total ${table}: ${mockData[table].length}`;
          break;
        case 'find':
          if (filter) {
            result = mockData[table].filter((item) =>
              Object.values(item).some((val) => String(val).toLowerCase().includes(filter.toLowerCase())),
            );
          } else {
            result = 'Please provide a filter criteria';
          }
          break;
        default:
          return {
            content: [{ type: 'text', text: 'Invalid action' }],
            isError: true,
          };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    },
    {
      allow: {
        roles: ['admin', 'owner'],
      },
    },
  ),
);

// 4. Time and Date Tool
mcpServer.tool(
  'datetime',
  'Various time and date operations',
  {
    operation: z.enum(['current', 'format', 'add']).describe('The operation to perform'),
    format: z.string().optional().describe('Optional date format (e.g., "YYYY-MM-DD")'),
    units: z.number().optional().describe('Number of units to add'),
    timeUnit: z.enum(['days', 'hours', 'minutes']).optional().describe('Time unit to add'),
  },
  ({ operation, format, units, timeUnit }) => {
    const now = new Date();
    let result;

    switch (operation) {
      case 'current':
        result = now.toISOString();
        break;
      case 'format':
        if (format) {
          // Simple format implementation (in real app, use a proper date library)
          result = now.toLocaleDateString();
        } else {
          result = now.toISOString();
        }
        break;
      case 'add':
        if (units && timeUnit) {
          const msPerUnit = {
            days: 86400000,
            hours: 3600000,
            minutes: 60000,
          };
          const newDate = new Date(now.getTime() + units * msPerUnit[timeUnit]);
          result = newDate.toISOString();
        } else {
          result = 'Please provide both units and timeUnit';
        }
        break;
      default:
        return {
          content: [{ type: 'text', text: 'Invalid operation' }],
          isError: true,
        };
    }

    return {
      content: [{ type: 'text', text: result }],
    };
  },
);

// 5. Storytelling Tool
mcpServer.tool(
  'storytelling',
  'Tell a story about a given topic',
  {
    topic: z.string().describe('The topic to tell a story about'),
    language: z.string().describe('The language to tell the story in').default('zh-CN'),
  },
  wrapToolHandler(
    async ({ topic, language }: { topic: string; language: string }) => {
      const result = await tellStory(topic, language);
      return {
        content: [{ type: 'text', text: result }],
      };
    },
    {
      allow: {
        roles: ['admin', 'member', 'owner'],
      },
    },
  ),
);

mcpServer.resource(
  'document',
  new ResourceTemplate('document://{name}', {
    list: () => {
      return {
        resources: [
          {
            name: 'document-getting-started',
            uri: 'document://getting-started',
          },
        ],
      };
    },
  }),
  (uri) => {
    return {
      contents: [
        {
          uri: uri.href,
          text: 'Getting Started',
          mimeType: 'text/plain',
        },
      ],
    };
  },
);

export { mcpServer };
