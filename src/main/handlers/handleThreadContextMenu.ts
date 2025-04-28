import { Menu } from 'electron'
import { intl } from '../lib/intl'
import { handleThreadDelete } from './handleThreadDelete'
import { mainWindow } from '..'

export const handleThreadContextMenu = (_, id): void => {
  const menu = Menu.buildFromTemplate([
    {
      label: intl.formatMessage({ id: 'delete' }),
      click: async (): Promise<void> => {
        await handleThreadDelete(id)
        mainWindow.webContents.send('delete-thread', id)
      }
    }
  ])
  menu.popup({ window: mainWindow })
}
