let currentUsername = 'Config Console Application'

export const setUsername = (name: string) => {
  currentUsername = name
}

const format = (args: any[]) => [`[${currentUsername}]`, ...args]

export const log = (...args: any[]) => console.log(...format(args))
export const info = (...args: any[]) => console.info(...format(args))
export const warn = (...args: any[]) => console.warn(...format(args))
export const error = (...args: any[]) => console.error(...format(args))
export const debug = (...args: any[]) => console.debug(...format(args))

export const patchConsoleWithUser = () => {
  console.log = (...args) => log(...args)
  console.info = (...args) => info(...args)
  console.warn = (...args) => warn(...args)
  console.error = (...args) => error(...args)
  console.debug = (...args) => debug(...args)
}
