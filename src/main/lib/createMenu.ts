import { Menu, shell } from 'electron'
import { store } from './store'
import { mainWindow } from '..'

export const createMenu = async (intl): Promise<Menu> => {
  const template = [
    {
      label: intl.formatMessage({ id: 'app' }),
      submenu: [
        { role: 'about', label: intl.formatMessage({ id: 'about' }) },
        { type: 'separator' },
        {
          label: intl.formatMessage({ id: 'setting' }),
          click: (): void => {
            shell.openPath(store.path)
          },
          accelerator: 'Command+,'
        },
        { type: 'separator' },
        { role: 'services', label: intl.formatMessage({ id: 'services' }) },
        { type: 'separator' },
        { role: 'hide', label: intl.formatMessage({ id: 'hide' }) },
        { role: 'hideOthers', label: intl.formatMessage({ id: 'hideOthers' }) },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit', label: intl.formatMessage({ id: 'quit' }) }
      ]
    },
    {
      label: intl.formatMessage({ id: 'file' }),
      submenu: [
        {
          click: (): void => {
            mainWindow.webContents.send('new')
          },
          label: intl.formatMessage({ id: 'new' }),
          accelerator: 'Command+N'
        },
        { type: 'separator' },
        { role: 'close', label: intl.formatMessage({ id: 'close' }) }
      ]
    },
    {
      label: intl.formatMessage({ id: 'edit' }),
      submenu: [
        { role: 'cut', label: intl.formatMessage({ id: 'cut' }) },
        { role: 'copy', label: intl.formatMessage({ id: 'copy' }) },
        { role: 'paste', label: intl.formatMessage({ id: 'paste' }) },
        { role: 'pasteAndMatchStyle', label: intl.formatMessage({ id: 'pasteAndMatchStyle' }) },
        { role: 'delete', label: intl.formatMessage({ id: 'delete' }) },
        { role: 'selectAll', label: intl.formatMessage({ id: 'selectAll' }) },
        { type: 'separator' },
        {
          label: intl.formatMessage({ id: 'speak' }),
          submenu: [
            { role: 'startSpeaking', label: intl.formatMessage({ id: 'startSpeaking' }) },
            { role: 'stopSpeaking', label: intl.formatMessage({ id: 'stopSpeaking' }) }
          ]
        }
      ]
    },
    {
      label: intl.formatMessage({ id: 'view' }),
      submenu: [
        { role: 'zoomIn', label: intl.formatMessage({ id: 'zoomIn' }) },
        { role: 'zoomOut', label: intl.formatMessage({ id: 'zoomOut' }) },
        { role: 'resetZoom', label: intl.formatMessage({ id: 'resetZoom' }) },
        { type: 'separator' },
        { role: 'toggleDevTools', label: intl.formatMessage({ id: 'toggleDevTools' }) },
        { type: 'separator' },
        { role: 'togglefullscreen', label: intl.formatMessage({ id: 'togglefullscreen' }) }
      ]
    },
    {
      label: intl.formatMessage({ id: 'window' }),
      submenu: [
        { role: 'minimize', label: intl.formatMessage({ id: 'minimize' }) },
        { role: 'zoom', label: intl.formatMessage({ id: 'zoom' }) },
        { type: 'separator' },
        { role: 'front', label: intl.formatMessage({ id: 'front' }) }
      ]
    },
    {
      label: intl.formatMessage({ id: 'help' }),
      submenu: [
        {
          label: intl.formatMessage({ id: 'github' }),
          click: (): void => {
            shell.openExternal('https://github.com/ChatZen/ChatZen')
          }
        }
      ]
    }
  ] as Array<Electron.MenuItemConstructorOptions | Electron.MenuItem>

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  return menu
}
