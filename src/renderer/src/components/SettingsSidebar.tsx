import { useState, useEffect, useCallback } from 'react'
// FiSettings is imported elsewhere, keeping import for consistency
import TextareaAutosize from 'react-textarea-autosize'
import { switchLocale, SupportedLocales, useIntl } from '../lib/locale'

interface MCPServerConfig {
  command: string
  args: string[]
  env?: Record<string, string>
}

interface SettingsSidebarProps {
  isOpen: boolean
  onClose: () => void
}

function SettingsSidebar({ isOpen }: SettingsSidebarProps): React.JSX.Element | null {
  const [apiKeys, setApiKeys] = useState<{ openai?: string; google?: string }>({
    openai: '',
    google: ''
  })
  const [mcpServers, setMcpServers] = useState<Record<string, MCPServerConfig>>({})
  const [newServerName, setNewServerName] = useState('')
  const [newServerCommandLine, setNewServerCommandLine] = useState('')
  const [newServerEnv, setNewServerEnv] = useState('')
  const [currentLocale, setCurrentLocale] = useState<SupportedLocales>('en')
  const intl = useIntl()

  const fetchSettings = useCallback(async (): Promise<void> => {
    try {
      const apiKeysResponse = await window.api.getConfig('apiKeys')
      const mcpServersResponse = (await window.api.getConfig('mcpServers')) as
        | Record<string, MCPServerConfig>
        | undefined

      // Get current locale from main process
      const locale = (await window.api.getLocale()) as SupportedLocales

      setApiKeys(apiKeysResponse || { openai: '', google: '' })
      setMcpServers(mcpServersResponse || {})
      setCurrentLocale(locale || 'en')
    } catch (error) {
      console.error('Error fetching settings:', error)
    }
  }, [])

  const saveApiKeys = async (): Promise<void> => {
    try {
      await window.api.setConfig('apiKeys', apiKeys)

      // Show confirmation dialog and restart app
      if (
        confirm('API keys updated. The application needs to restart to apply changes. Restart now?')
      ) {
        await window.api.restartApp()
      }
    } catch (error) {
      console.error('Error saving API keys:', error)
    }
  }

  const parseEnvVariables = (envString: string): Record<string, string> | undefined => {
    if (!envString.trim()) {
      return undefined
    }

    try {
      const envVars: Record<string, string> = {}

      // Parse each line like KEY=VALUE
      envString.split('\n').forEach((line) => {
        line = line.trim()
        if (!line) return

        // Handle KEY=VALUE format
        const match = line.match(/^([^=]+)=(.*)$/)
        if (match) {
          const [, key, value] = match
          envVars[key.trim()] = value.trim()
        }
      })

      return Object.keys(envVars).length > 0 ? envVars : undefined
    } catch (error) {
      console.error('Error parsing environment variables:', error)
      return undefined
    }
  }

  const addMcpServer = async (): Promise<void> => {
    if (
      newServerName.trim() &&
      newServerCommandLine.trim() &&
      !Object.keys(mcpServers).includes(newServerName)
    ) {
      // Split the command line into command and arguments
      const parts = newServerCommandLine.split(' ').filter((part) => part.trim() !== '')

      if (parts.length > 0) {
        const command = parts[0]
        const args = parts.slice(1)
        const env = parseEnvVariables(newServerEnv)

        const newServer: MCPServerConfig = {
          command,
          args
        }

        // Only add env if it's not empty
        if (env) {
          newServer.env = env
        }

        const updatedServers = {
          ...mcpServers,
          [newServerName]: newServer
        }

        setMcpServers(updatedServers)
        setNewServerName('')
        setNewServerCommandLine('')
        setNewServerEnv('')
        await window.api.setConfig('mcpServers', updatedServers)

        // Show confirmation dialog and restart app
        if (
          confirm(
            'MCP server configuration updated. The application needs to restart to apply changes. Restart now?'
          )
        ) {
          await window.api.restartApp()
        }
      }
    }
  }

  const removeMcpServer = async (serverName: string): Promise<void> => {
    const updatedServers = { ...mcpServers }
    delete updatedServers[serverName]

    setMcpServers(updatedServers)
    await window.api.setConfig('mcpServers', updatedServers)

    // Show confirmation dialog and restart app
    if (
      confirm('MCP server removed. The application needs to restart to apply changes. Restart now?')
    ) {
      await window.api.restartApp()
    }
  }

  const handleOpenAIKeyChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setApiKeys({ ...apiKeys, openai: e.target.value })
  }

  const handleGeminiKeyChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setApiKeys({ ...apiKeys, google: e.target.value })
  }

  const handleLocaleChange = async (e: React.ChangeEvent<HTMLSelectElement>): Promise<void> => {
    const newLocale = e.target.value as SupportedLocales
    setCurrentLocale(newLocale)
    await switchLocale(newLocale)

    // Show confirmation dialog and restart app
    if (
      confirm(
        '言語設定が変更されました。変更を適用するにはアプリケーションを再起動する必要があります。今すぐ再起動しますか？\n\nLanguage settings have been changed. The application needs to restart to apply changes. Restart now?'
      )
    ) {
      await window.api.restartApp()
    }
  }

  // Initial fetch of settings
  useEffect(() => {
    if (isOpen) {
      fetchSettings()
    }
  }, [isOpen, fetchSettings])

  if (!isOpen) return null

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">{intl.formatMessage({ id: 'settings' }) || 'Settings'}</div>
      </div>

      <div className="settings">
        <div className="settings-section">
          <h3 className="settings-section-title">Language / 言語</h3>
          <div className="settings-input-group">
            <select
              id="locale-selector"
              value={currentLocale}
              onChange={handleLocaleChange}
              className="settings-select"
            >
              <option value="en">English</option>
              <option value="ja">日本語</option>
            </select>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">API Keys</h3>
          <div className="settings-input-group">
            <label htmlFor="openai-api-key">OpenAI (Legacy)</label>
            <input
              type="password"
              id="openai-api-key"
              value={apiKeys.openai}
              onChange={handleOpenAIKeyChange}
              placeholder="sk-..."
            />
          </div>

          <div className="settings-input-group">
            <label htmlFor="gemini-api-key">Gemini 2.5 Flash</label>
            <input
              type="password"
              id="gemini-api-key"
              value={apiKeys.google}
              onChange={handleGeminiKeyChange}
              placeholder="AIza..."
            />
          </div>

          <div className="settings-input-group">
            <button className="settings-save-button" onClick={saveApiKeys}>
              Save
            </button>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">MCP Servers</h3>

          <div className="settings-input-group">
            <label htmlFor="new-server-name">Server Name</label>
            <input
              type="text"
              id="new-server-name"
              value={newServerName}
              onChange={(e) => setNewServerName(e.target.value)}
              placeholder="e.g., filesystem"
            />
          </div>

          <div className="settings-input-group">
            <label htmlFor="new-server-command-line">Command (with arguments)</label>
            <input
              type="text"
              id="new-server-command-line"
              value={newServerCommandLine}
              onChange={(e) => setNewServerCommandLine(e.target.value)}
              placeholder="e.g., npx -y mcp-datetime"
            />
          </div>

          <div className="settings-input-group">
            <label htmlFor="new-server-env">
              Environment Variables (one per line, KEY=VALUE format)
            </label>
            <TextareaAutosize
              id="new-server-env"
              value={newServerEnv}
              onChange={(e) => setNewServerEnv(e.target.value)}
              placeholder="FIRECRAWL_API_KEY=your-api-key&#10;KIBELA_ORIGIN=https://example.kibe.la"
              minRows={3}
              className="settings-textarea"
            />
          </div>

          <div className="settings-input-group">
            <button className="settings-save-button" onClick={() => addMcpServer()}>
              Add
            </button>
          </div>

          <div className="settings-server-list">
            {Object.entries(mcpServers).map(([name, config], index) => (
              <div key={index} className="settings-server-item">
                <div className="settings-server-info">
                  <div className="settings-server-name">{name}</div>
                  <div className="settings-server-command">
                    {config.command} {config.args.join(' ')}
                  </div>
                </div>
                <button
                  className="settings-server-remove-button"
                  onClick={() => removeMcpServer(name)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export { SettingsSidebar }
