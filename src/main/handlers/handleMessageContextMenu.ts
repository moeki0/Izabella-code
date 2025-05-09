import { clipboard, Menu } from 'electron'
import { intl } from '../lib/intl'
import { mainWindow } from '..'
import { handleInterrupt } from './handleInterrupt'

export const handleMessageContextMenu = (_, text, isAssistantMessage = false): void => {
  const menuTemplate: Array<Electron.MenuItemConstructorOptions | Electron.MenuItem> = [
    {
      label: intl.formatMessage({ id: 'copyAll' }),
      click: (): void => {
        clipboard.writeText(text)
      }
    }
  ]

  if (isAssistantMessage) {
    menuTemplate.push(
      {
        type: 'separator'
      },
      {
        label: intl.formatMessage({ id: 'stopAssistant' }),
        click: (): void => {
          handleInterrupt()
        }
      }
    )
  }

  const menu = Menu.buildFromTemplate(menuTemplate)
  menu.popup({ window: mainWindow })
}
