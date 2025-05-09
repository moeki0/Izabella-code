import { is } from '@electron-toolkit/utils'
import { BrowserWindow, Menu, shell } from 'electron'
import { join } from 'node:path'
import { intl } from './intl'
import { createMenu } from './createMenu'

export const createWindow = async (): Promise<BrowserWindow> => {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    titleBarStyle: 'hidden',
    trafficLightPosition: {
      x: 13,
      y: 13
    },
    ...(process.platform === 'linux' ? {} : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  const menu = await createMenu(intl)
  Menu.setApplicationMenu(menu)

  return mainWindow
}
