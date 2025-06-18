# Salesforce MCP Server

A comprehensive Model Context Protocol (MCP) server that provides seamless Salesforce integration for AI development tools like Claude Desktop, Cline, and other MCP-compatible clients.

## 🚀 Features

### 17 Comprehensive Tools

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
- **`deploy-metadata`** - Deploy individual metadata components (e.g., ApexClass, CustomObject) from files or JSON
- **`deploy-bundle`** - Deploy a metadata bundle (e.g., LWC) from a directory path
- **`retrieve-metadata`** - Retrieve individual metadata components, with an option to save to a file
- **`check-deploy-status`** - Check the status of a deployment

#### 🔗 Connection Tools
- **`test-connection`** - Connection validation and health monitoring

### Supported Metadata Types

The `deploy-metadata` tool supports the following metadata types:

-   `ApexClass`
-   `ApexTrigger`
-   `ApexComponent`
-   `ApexPage`
-   `CustomObject`
-   `CustomField`
-   `ValidationRule`
-   `WorkflowRule`
-   `Flow`
-   `CustomLabel`
-   `CustomTab`
-   `CustomApplication`
-   `PermissionSet`
-   `PermissionSetGroup`
-   `CustomMetadata`
-   `EmailTemplate`
-   `Layout`
-   `FlexiPage`

### Key Capabilities

- **🔄 Auto-Bulk Switching** - Intelligent API selection for optimal performance
- **🔐 Dual Authentication** - OAuth2 and Username/Password support
- **⚡ Smart Caching** - 1-hour TTL for SObject metadata
- **🛡️ Type Safety** - Full TypeScript implementation with runtime validation
- **📝 Comprehensive Logging** - Detailed debugging and monitoring
- **🔍 Raw Error Exposure** - Preserve exact Salesforce errors for debugging

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

-   Node.js (version 18 or higher recommended)
-   An MCP-compatible client like [Cline](https://github.com/saoudrizwan/claude-dev) or [Claude Desktop](https://claude.ai/desktop)

### Environment Setup

You will provide your Salesforce credentials as environment variables within your MCP client's configuration.

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
SF_API_VERSION=64.0
```

## 🔧 MCP Client Configuration

To use this server with an MCP client like Cline or Claude Desktop, add the following configuration to your client's settings file. The `command` should use `npx` to run the package directly from the npm registry.

### Configuration Examples

Choose one of the following authentication methods and add the corresponding JSON object to the `mcpServers` section of your settings file.

**1. Username/Password Authentication**

```json
{
  "salesforce": {
    "command": "npx",
    "args": ["-y", "@jjar/salesforce-mcp-server"],
    "env": {
      "SF_USERNAME": "your-username@company.com",
      "SF_PASSWORD": "your-password",
      "SF_SECURITY_TOKEN": "your-security-token",
      "SF_LOGIN_URL": "https://login.salesforce.com",
      "SF_API_VERSION": "64.0"
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
```

**2. OAuth 2.0 Authentication**

```json
{
  "salesforce": {
    "command": "npx",
    "args": ["-y", "@jjar/salesforce-mcp-server"],
    "env": {
      "SF_CLIENT_ID": "your-oauth2-client-id",
      "SF_CLIENT_SECRET": "your-oauth2-client-secret",
      "SF_REFRESH_TOKEN": "your-refresh-token",
      "SF_INSTANCE_URL": "https://yourorg.my.salesforce.com",
      "SF_API_VERSION": "64.0"
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

##  Authentication

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

## 🔗 Related Projects

- [Model Context Protocol](https://github.com/modelcontextprotocol) - The protocol this server implements
- [jsforce](https://github.com/jsforce/jsforce) - Salesforce API library used in this project
- [Claude Desktop](https://claude.ai/desktop) - AI assistant that supports MCP servers
- [Cline](https://github.com/saoudrizwan/claude-dev) - VS Code extension for AI-assisted development

## 👨‍💻 Author

**Jarosław Jaworski**

## 🤖 Development Credits

Part of this implementation was developed with assistance from Claude Sonnet 4 using the Cline VS Code extension, demonstrating the power of AI-assisted development in creating comprehensive developer tools.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
