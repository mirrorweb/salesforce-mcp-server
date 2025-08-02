# Salesforce MCP Server

A comprehensive Model Context Protocol (MCP) server that provides secure, per-user Salesforce integration for AI development tools like Claude Desktop, Cline, and other MCP-compatible clients.

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
- **🔐 Secure OAuth2 Authentication** - Per-user access with individual limits and permissions
- **⚡ Smart Caching** - 1-hour TTL for SObject metadata
- **🛡️ Type Safety** - Full TypeScript implementation with runtime validation
- **📝 Comprehensive Logging** - Detailed debugging and monitoring
- **🔍 Raw Error Exposure** - Preserve exact Salesforce errors for debugging

## 🔐 Authentication Setup

This server uses **OAuth2 authentication** for secure, per-user access to Salesforce. This approach ensures individual user access limits and proper security compliance.

> **⚠️ Security Notice**: Username/password authentication is deprecated for security reasons. OAuth2 provides better security, individual user tracking, and respects organizational access policies.

### Step 1: Create a Connected App in Salesforce

1. **Navigate to Setup**:
   - Log into your Salesforce org
   - Go to **Setup** → **App Manager**
   - Click **New Connected App**

2. **Basic Information**:
   ```
   Connected App Name: MCP Salesforce Server
   API Name: MCP_Salesforce_Server
   Contact Email: your-email@company.com
   ```

3. **API (Enable OAuth Settings)**:
   - Check **Enable OAuth Settings**
   - **Callback URL**: `http://localhost:3000/callback` (for local development)
   - **Selected OAuth Scopes**:
     - Access and manage your data (api)
     - Perform requests on your behalf at any time (refresh_token, offline_access)
     - Access your basic information (id, profile, email, address, phone)

4. **Additional Settings**:
   - **Require Secret for Web Server Flow**: Checked
   - **Require Secret for Refresh Token Flow**: Checked
   - **Enable Client Credentials Flow**: Unchecked (not needed)

5. **Save and Note Credentials**:
   - After saving, note the **Consumer Key** (Client ID)
   - Click **Click to reveal** for the **Consumer Secret** (Client Secret)

### Step 2: Obtain Refresh Token

You need to complete the OAuth2 authorization code flow to get a refresh token. Here are several methods:

#### Method 1: Using Salesforce CLI (Recommended)

```bash
# Install Salesforce CLI if not already installed
npm install -g @salesforce/cli

# Authorize your org (this will open a browser)
sf org login web --set-default-dev-hub --alias my-org

# Get the refresh token
sf org display --verbose --target-org my-org
```

#### Method 2: Using Browser (Manual Flow)

1. **Authorization URL**:
   ```
   https://login.salesforce.com/services/oauth2/authorize?response_type=code&client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3000/callback&scope=api%20refresh_token
   ```
   
   Replace `YOUR_CLIENT_ID` with your Connected App's Consumer Key.

2. **Complete Authorization**:
   - Open the URL in your browser
   - Log in and approve the app
   - You'll be redirected to `http://localhost:3000/callback?code=AUTHORIZATION_CODE`
   - Copy the `code` parameter value

3. **Exchange Code for Tokens**:
   ```bash
   curl -X POST https://login.salesforce.com/services/oauth2/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=authorization_code" \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "redirect_uri=http://localhost:3000/callback" \
     -d "code=YOUR_AUTHORIZATION_CODE"
   ```

4. **Extract Refresh Token**:
   From the JSON response, save the `refresh_token` value.

#### Method 3: Using Postman

1. Create a new POST request to: `https://login.salesforce.com/services/oauth2/token`
2. Set headers: `Content-Type: application/x-www-form-urlencoded`
3. In the body (x-www-form-urlencoded), add:
   ```
   grant_type: authorization_code
   client_id: YOUR_CLIENT_ID
   client_secret: YOUR_CLIENT_SECRET
   redirect_uri: http://localhost:3000/callback
   code: YOUR_AUTHORIZATION_CODE
   ```

### Step 3: Configure MCP Client

#### For Production Orgs:
- **Instance URL**: `https://yourcompany.my.salesforce.com`
- **Login URL**: Use the instance URL above

#### For Sandbox Orgs:
- **Instance URL**: `https://yourcompany--sandbox.sandbox.my.salesforce.com`
- **Login URL**: Replace with your sandbox instance URL

## 🚀 Installation

### On macOS / Linux systems:

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

### On Windows systems:

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

> **⚠️ Important**: After adding or modifying the MCP server configuration, you must restart VS Code for the changes to take effect.

</details>

<details>
<summary>Cursor</summary>

- **Windows**: `%USERPROFILE%\.cursor\mcp.json`
- **macOS**: `~/.cursor/mcp.json`
- **Linux**: `~/.cursor/mcp.json`

</details>

## 🔧 Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SF_CLIENT_ID` | ✅ | Consumer Key from Connected App | `3MVG9PE4Q...` |
| `SF_CLIENT_SECRET` | ✅ | Consumer Secret from Connected App | `A1B2C3D4E5...` |
| `SF_REFRESH_TOKEN` | ✅ | OAuth2 refresh token | `5Aep861TSESvWeug_w...` |
| `SF_INSTANCE_URL` | ✅ | Your Salesforce instance URL | `https://mycompany.my.salesforce.com` |

### Benefits of OAuth2 Authentication

1. **Individual User Access**: Each user authenticates with their own credentials
2. **Granular Permissions**: Respects user permissions and organizational policies
3. **Audit Trail**: All actions are tracked under the specific user
4. **Security Compliance**: Meets enterprise security requirements
5. **Token Management**: Refresh tokens can be revoked if compromised
6. **No Password Exposure**: Passwords are never stored or transmitted

## 🛡️ Tool Safety Levels

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

## 🔍 Troubleshooting

### Common OAuth Issues

1. **Invalid Client ID/Secret**:
   - Verify the Connected App credentials
   - Ensure the app is deployed and active

2. **Invalid Refresh Token**:
   - Re-generate the refresh token using the authorization flow
   - Check token expiration in Connected App settings

3. **Instance URL Mismatch**:
   - Use the exact instance URL from your Salesforce org
   - For sandboxes, include the full sandbox URL

4. **Permission Issues**:
   - Verify OAuth scopes in the Connected App
   - Check user permissions for specific operations

### Testing Your Configuration

Use the `test-connection` tool to verify your setup:

```bash
# The MCP server will use this tool automatically when you ask about connection status
# Example: "Test my Salesforce connection"
```

## 🏗️ Architecture

### Core Components
- **OAuth2 Authentication Manager** - Secure token-based authentication
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

---

<details>
<summary><strong>⚠️ Deprecated: Username/Password Authentication</strong></summary>

> **Security Warning**: Username/password authentication is deprecated and not recommended for production use. Please migrate to OAuth2 authentication for better security and compliance.

For legacy systems that require username/password authentication, the following environment variables were supported:

- `SF_USERNAME` - Salesforce username
- `SF_PASSWORD` - Salesforce password  
- `SF_SECURITY_TOKEN` - Security token (if required)
- `SF_LOGIN_URL` - Login URL (production or sandbox)

**Migration Path**: Follow the OAuth2 setup instructions above to upgrade to secure authentication.

</details>