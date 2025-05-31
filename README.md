# Salesforce MCP Server

A comprehensive Model Context Protocol (MCP) server that provides seamless Salesforce integration for AI development tools like Claude Desktop, Cline, and other MCP-compatible clients.

## ⚠️ Current Status & Disclaimer

**This server is currently in a testing and development phase.**

While it offers a comprehensive set of tools for Salesforce integration, please be cautious when using it, especially with production Salesforce orgs. Thorough testing has been conducted, but unexpected issues may still arise.

**Feedback & Issue Reporting:**
Your feedback is highly valuable! If you encounter any issues or have suggestions for improvement:
- **GitHub Issues**: Please submit an issue ticket on the project's GitHub repository.

Thank you for helping improve this tool!

## 🚀 Features

### 15 Comprehensive Tools

#### 🔍 Query & Search Tools
- **`execute-soql`** - Execute SOQL queries with auto-bulk switching and pagination
- **`execute-sosl`** - Multi-object search with result aggregation
- **`describe-sobject`** - SObject metadata with intelligent caching

#### ⚡ Apex Development Tools
- **`execute-apex`** - Anonymous Apex execution with debug log capture
- **`run-apex-tests`** - Apex test execution with coverage reporting
- **`get-apex-logs`** - Debug log retrieval with filtering

#### 📊 Data Management Tools
- **`create-record`** - Single/bulk record creation with auto-bulk switching
- **`get-record`** - Record retrieval with field selection
- **`update-record`** - Single/bulk record updates with validation
- **`delete-record`** - Single/bulk record deletion
- **`upsert-record`** - External ID-based upsert operations

#### 🔧 Metadata Tools (Component-Based)
- **`list-metadata-types`** - Discover metadata types
- **`deploy-metadata`** - Deploy individual metadata components (e.g., ApexClass, CustomObject)
- **`retrieve-metadata`** - Retrieve individual metadata components

#### 🔗 Connection Tools
- **`test-connection`** - Connection validation and health monitoring

### Key Capabilities

- **🔄 Auto-Bulk Switching** - Intelligent API selection for optimal performance
- **🔐 Dual Authentication** - OAuth2 and Username/Password support
- **⚡ Smart Caching** - 1-hour TTL for SObject metadata
- **🛡️ Type Safety** - Full TypeScript implementation with runtime validation
- **📝 Comprehensive Logging** - Detailed debugging and monitoring
- **🔍 Raw Error Exposure** - Preserve exact Salesforce errors for debugging

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/jaworjar95/salesforce-mcp-server.git
cd salesforce-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

### Environment Setup

Create a `.env` file with your Salesforce credentials:

```bash
# Option 1: Username/Password Authentication (Recommended for development)
SF_USERNAME=your-username@company.com
SF_PASSWORD=your-password
SF_SECURITY_TOKEN=your-security-token
SF_LOGIN_URL=https://login.salesforce.com

# Option 2: OAuth2 Authentication (Recommended for production)
SF_CLIENT_ID=your-oauth2-client-id
SF_CLIENT_SECRET=your-oauth2-client-secret
SF_REFRESH_TOKEN=your-refresh-token
SF_INSTANCE_URL=https://yourorg.my.salesforce.com

# Optional Configuration
SF_API_VERSION=63.0
```

## 🔧 MCP Client Configuration

This server supports multiple MCP clients. Choose the configuration that matches your preferred client:

### Claude Desktop Configuration

Add the following to your Claude Desktop MCP settings file:

#### Windows
Location: `%APPDATA%\Claude\claude_desktop_config.json`

#### macOS
Location: `~/Library/Application Support/Claude/claude_desktop_config.json`

#### Configuration

```json
{
  "mcpServers": {
    "salesforce": {
      "command": "node",
      "args": ["path/to/salesforce-mcp-server/build/index.js"],
      "env": {
        "SF_USERNAME": "your-username@company.com",
        "SF_PASSWORD": "your-password",
        "SF_SECURITY_TOKEN": "your-security-token",
        "SF_LOGIN_URL": "https://login.salesforce.com",
        "SF_API_VERSION": "63.0"
      },
      "disabled": false,
      "alwaysAllow": [
        "test-connection",
        "execute-soql",
        "describe-sobject"
      ]
    }
  }
}
```

#### OAuth2 Configuration (Alternative)

```json
{
  "mcpServers": {
    "salesforce": {
      "command": "node",
      "args": ["path/to/salesforce-mcp-server/build/index.js"],
      "env": {
        "SF_CLIENT_ID": "your-oauth2-client-id",
        "SF_CLIENT_SECRET": "your-oauth2-client-secret",
        "SF_REFRESH_TOKEN": "your-refresh-token",
        "SF_INSTANCE_URL": "https://yourorg.my.salesforce.com"
      }
    }
  }
}
```

### Cline Configuration

Cline (VS Code extension) provides advanced MCP server management capabilities.

#### Configuration Location

Cline stores MCP server configurations in:
- **Windows**: `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
- **macOS**: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- **Linux**: `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

#### Basic Configuration

```json
{
  "mcpServers": {
    "salesforce": {
      "command": "node",
      "args": ["path/to/salesforce-mcp-server/build/index.js"],
      "env": {
        "SF_USERNAME": "your-username@company.com",
        "SF_PASSWORD": "your-password",
        "SF_SECURITY_TOKEN": "your-security-token",
        "SF_LOGIN_URL": "https://login.salesforce.com",
        "SF_API_VERSION": "63.0"
      },
      "disabled": false,
      "alwaysAllow": [
        "test-connection",
        "execute-soql",
        "describe-sobject",
        "get-record",
        "get-apex-logs",
        "list-metadata-types"
      ]
    }
  }
}
```

#### Enhanced Configuration with Network Timeout

```json
{
  "mcpServers": {
    "salesforce": {
      "command": "node",
      "args": ["path/to/salesforce-mcp-server/build/index.js"],
      "env": {
        "SF_USERNAME": "your-username@company.com",
        "SF_PASSWORD": "your-password",
        "SF_SECURITY_TOKEN": "your-security-token",
        "SF_LOGIN_URL": "https://login.salesforce.com",
        "SF_API_VERSION": "63.0"
      },
      "disabled": false,
      "alwaysAllow": [
        "test-connection",
        "execute-soql",
        "describe-sobject",
        "get-record",
        "get-apex-logs",
        "list-metadata-types"
      ],
      "networkTimeout": 60
    }
  }
}
```

#### OAuth2 Configuration for Cline

```json
{
  "mcpServers": {
    "salesforce": {
      "command": "node",
      "args": ["path/to/salesforce-mcp-server/build/index.js"],
      "env": {
        "SF_CLIENT_ID": "your-oauth2-client-id",
        "SF_CLIENT_SECRET": "your-oauth2-client-secret",
        "SF_REFRESH_TOKEN": "your-refresh-token",
        "SF_INSTANCE_URL": "https://yourorg.my.salesforce.com"
      },
      "disabled": false,
      "alwaysAllow": [
        "test-connection",
        "execute-soql",
        "describe-sobject",
        "get-record",
        "get-apex-logs",
        "list-metadata-types"
      ],
      "networkTimeout": 60
    }
  }
}
```

#### Tool Safety Levels

**✅ Safe for Auto-Approval (`alwaysAllow`)**
- `test-connection` - Connection validation (read-only)
- `execute-soql` - SOQL queries (read-only)
- `describe-sobject` - Metadata inspection (read-only)
- `get-record` - Single record retrieval (read-only)
- `get-apex-logs` - Debug log access (read-only)
- `list-metadata-types` - Metadata type discovery (read-only)

**⚠️ Requires Manual Approval**
- `create-record`, `update-record`, `delete-record`, `upsert-record` - Data modification
- `deploy-metadata` - Metadata deployment
- `execute-apex`, `run-apex-tests` - Code execution
- `execute-sosl` - Search operations (can be resource-intensive)
- `retrieve-metadata` - Metadata retrieval (can be large)

#### Usage in Cline

1. Install the Cline VS Code extension
2. Configure the MCP server as shown above
3. Restart VS Code
4. Open Cline and start using Salesforce tools in your conversations

#### Troubleshooting Cline Integration

**Common Issues:**
- **Server Not Responding**: Check if Node.js is installed and the build directory exists
- **Permission Errors**: Verify Salesforce credentials in environment variables
- **Tool Not Available**: Ensure the server is enabled and not disabled in Cline settings
- **Connection Failures**: Verify login URL (use `https://test.salesforce.com` for sandboxes) and your sf credentials
- **Build Errors**: Run `npm run build` to ensure the server is properly compiled

## 📖 Tool Documentation

### Query Tools

#### execute-soql
Execute SOQL queries with automatic bulk switching for large datasets.

```typescript
// Example: Query all accounts created today
{
  "query": "SELECT Id, Name, CreatedDate FROM Account WHERE CreatedDate = TODAY",
  "tooling": false,
  "bulkThreshold": 2000
}
```

#### execute-sosl
Perform multi-object searches across your Salesforce org.

```typescript
// Example: Search for contacts and leads
{
  "searchString": "FIND {John} IN NAME FIELDS RETURNING Contact(Id, Name), Lead(Id, Name)",
  "searchScope": "NAME"
}
```

### Apex Tools

#### execute-apex
Execute anonymous Apex code with debug log capture.

```typescript
// Example: Create and insert an account
{
  "apexCode": "Account acc = new Account(Name='Test Account'); insert acc; System.debug('Created: ' + acc.Id);",
  "logLevel": "DEBUG"
}
```

#### run-apex-tests
Run Apex tests with detailed coverage reporting.

```typescript
// Example: Run specific test classes
{
  "testClasses": ["AccountTest", "ContactTest"],
  "maxFailedTests": 5
}
```

### Data Management Tools

#### create-record
Create single or multiple records with auto-bulk switching.

```typescript
// Example: Create multiple accounts
{
  "sobjectType": "Account",
  "records": [
    {"Name": "Company A", "Type": "Customer"},
    {"Name": "Company B", "Type": "Prospect"}
  ],
  "allOrNone": false
}
```

### Metadata Tools (Component-Based)

#### deploy-metadata
Deploy individual metadata components or arrays of components.

```typescript
// Example: Deploy a single ApexClass
{
  "components": {
    "type": "ApexClass",
    "fullName": "MyExampleClass",
    "metadata": {
      "body": "public class MyExampleClass {\n    public static void sayHello() {\n        System.debug('Hello from component deployment!');\n    }\n}"
    }
  },
  "options": {
    "checkOnly": true, // Optional: validate without saving
    "runTests": ["MyExampleClass_Test"] // Optional: specify tests to run
  }
}
```

#### retrieve-metadata
Retrieve individual metadata components or arrays of components.

```typescript
// Example: Retrieve an ApexClass component
{
  "components": {
    "type": "ApexClass",
    "fullName": "MyExistingClass"
  },
  "options": {
    "includeBody": true // Optional: include source code
  }
}
```

## 🔐 Authentication

### Username/Password Authentication
1. Obtain your security token from Salesforce Setup → Personal Information → Reset Security Token
2. Set environment variables as shown in the configuration section
3. Use `https://login.salesforce.com` for production or `https://test.salesforce.com` for sandboxes

### OAuth2 Authentication
1. Create a Connected App in Salesforce Setup
2. Configure OAuth settings and obtain client credentials
3. Generate a refresh token using the OAuth2 flow
4. Set environment variables as shown in the configuration section

## 🏗️ Architecture

### Core Components
- **Authentication Manager** - Dual OAuth2/Username-Password support
- **Connection Manager** - Singleton pattern with health monitoring
- **Tool Classes** - Organized by functionality (Query, Apex, Data, Metadata)
- **Error Handler** - Comprehensive error formatting with context
- **Cache Manager** - TTL-based caching for performance optimization

### Performance Features
- **Auto-Bulk Switching** - Automatically uses Bulk API for large operations
- **Intelligent Caching** - SObject metadata cached for 1 hour
- **Connection Reuse** - Single connection across all operations
- **Polling Optimization** - Efficient monitoring of long-running operations

## 🧪 Testing

```bash
# Test individual tools
node tests/test-query-tools.js
node tests/test-data-tools.js
node tests/test-apex-tools.js
node tests/test-metadata-tools.js
```

### Test Structure

The test files are organized by functionality:

- **test-query-tools.js**: Tests basic connection and query tools (test-connection, execute-soql, execute-sosl, describe-sobject)
- **test-data-tools.js**: Tests data management tools (create-record, get-record, update-record, delete-record, upsert-record)
- **test-apex-tools.js**: Tests Apex development tools (execute-apex, run-apex-tests, get-apex-logs)
- **test-metadata-tools.js**: Tests metadata tools (list-metadata-types, deploy-metadata, retrieve-metadata)

Each test file creates its own server instance, sends requests to test specific tools, and validates the responses.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Jarosław Jaworski**

## 🤖 Development Credits

Part of this implementation was developed with assistance from Claude Sonnet 4 using the Cline VS Code extension, demonstrating the power of AI-assisted development in creating comprehensive developer tools.

## 🔗 Related Projects

- [Model Context Protocol](https://github.com/modelcontextprotocol) - The protocol this server implements
- [jsforce](https://github.com/jsforce/jsforce) - Salesforce API library used in this project
- [Claude Desktop](https://claude.ai/desktop) - AI assistant that supports MCP servers
- [Cline](https://github.com/saoudrizwan/claude-dev) - VS Code extension for AI-assisted development
