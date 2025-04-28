import { clipboard, Menu } from 'electron'
import { intl } from '../lib/intl'
import { mainWindow } from '..'

export const handleMessageContextMenu = (_, text): void => {
  const menu = Menu.buildFromTemplate([
    {
      label: intl.formatMessage({ id: 'copyAll' }),
      click: (): void => {
        clipboard.writeText(text)
      }
    }
  ])
  menu.popup({ window: mainWindow })
}
