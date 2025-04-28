import { shell } from 'electron'

export const handleLink = (_, url): void => {
  shell.openExternal(url)
}
