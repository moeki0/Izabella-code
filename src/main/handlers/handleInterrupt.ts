import { mainWindow } from '..'

export const handleInterrupt = (): void => {
  globalThis.interrupt = true
  mainWindow.webContents.send('interrupt')
}
