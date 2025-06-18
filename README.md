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

### Key Capabilities

- **🔄 Auto-Bulk Switching** - Intelligent API selection for optimal performance
- **🔐 Dual Authentication** - OAuth2 and Username/Password support
- **⚡ Smart Caching** - 1-hour TTL for SObject metadata
- **🛡️ Type Safety** - Full TypeScript implementation with runtime validation
- **📝 Comprehensive Logging** - Detailed debugging and monitoring
- **🔍 Raw Error Exposure** - Preserve exact Salesforce errors for debugging

## 🚀 Installation

To use with Desktop APP, such as Claude Desktop, Cline, Cursor, and so on, add the MCP server config below.


### On macOS / Linux systems:

<details>
<summary><strong>Username/Password Authentication</strong></summary>

```json
{
  "mcp.servers": {
    "salesforce": {
      "command": "npx",
      "args": [
        "-y",
        "@jjar/salesforce-mcp-server"
      ],
      "env": {
        "SF_USERNAME": "your-username@company.com",
        "SF_PASSWORD": "your-password",
        "SF_SECURITY_TOKEN": "your-security-token",
        "SF_LOGIN_URL": "https://login.salesforce.com"
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
</details>

<details>
<summary><strong>OAuth 2.0 Authentication</strong></summary>

```json
{
  "mcp.servers": {
    "salesforce": {
      "command": "npx",
      "args": [
        "-y",
        "@jjar/salesforce-mcp-server"
      ],
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
      ]
    }
  }
}
```
</details>

---

### On Windows systems:

<details>
<summary><strong>Username/Password Authentication</strong></summary>

```json
{
  "mcp.servers": {
    "salesforce": {
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "-y",
        "@jjar/salesforce-mcp-server"
      ],
      "env": {
        "SF_USERNAME": "your-username@company.com",
        "SF_PASSWORD": "your-password",
        "SF_SECURITY_TOKEN": "your-security-token",
        "SF_LOGIN_URL": "https://login.salesforce.com"
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
</details>

<details>
<summary><strong>OAuth 2.0 Authentication</strong></summary>

```json
{
  "mcp.servers": {
    "salesforce": {
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "-y",
        "@jjar/salesforce-mcp-server"
      ],
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
      ]
    }
  }
}
```
</details>

### Configuration File Locations

<details>
<summary>Claude Desktop</summary>

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

</details>

<details>
<summary>Cline (VS Code)</summary>

- **Windows**: `%APPDATA%\Code\User\globalStorage\saoudrizwan.claude-dev\settings\cline_mcp_settings.json`
- **macOS**: `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`
- **Linux**: `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json`

</details>

<details>
<summary>Cursor</summary>

- **Windows**: `%USERPROFILE%\.cursor\mcp.json`
- **macOS**: `~/.cursor/mcp.json`
- **Linux**: `~/.cursor/mcp.json`

</details>

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


## Authentication

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
