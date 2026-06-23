const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const packageJson = require('../package.json')
const activeRequests = new Map()
const iconPath = path.join(__dirname, '..', 'src', 'images', 'ollama.png')
const appTitle = `Ask Ollama v${packageJson.version}`

function createWindow() {
  const win = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 900,
    minHeight: 620,
    title: appTitle,
    icon: iconPath,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
}

app.whenReady().then(() => {
  app.setName(appTitle)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

function ollamaUrl(pathname) {
  return `http://localhost:11434${pathname}`
}

ipcMain.handle('ollama:tags', async () => {
  let response

  try {
    response = await fetch(ollamaUrl('/api/tags'))
  } catch {
    throw new Error('Ollama not running.')
  }

  if (!response.ok) {
    throw new Error(`Ollama models failed ${response.status}`)
  }

  return response.json()
})

ipcMain.handle('ollama:show', async (_event, model) => {
  try {
    const response = await fetch(ollamaUrl('/api/show'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model })
    })

    if (!response.ok) {
      return null
    }

    return response.json()
  } catch {
    return null
  }
})

ipcMain.on('ollama:generate', async (event, requestId, body) => {
  const controller = new AbortController()

  activeRequests.set(requestId, controller)

  try {
    let response

    try {
      response = await fetch(ollamaUrl('/api/generate'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...body,
          stream: true
        }),
        signal: controller.signal
      })
    } catch (err) {
      if (err.name === 'AbortError') {
        throw err
      }

      throw new Error('Ollama not running.')
    }

    if (!response.ok) {
      throw new Error(`Ollama said ${response.status}`)
    }

    if (!response.body) {
      throw new Error('No stream from Ollama')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.trim()) {
          continue
        }

        const data = JSON.parse(line)

        if (data.response) {
          event.sender.send('ollama:generate-chunk', requestId, data.response)
        }

        if (data.done) {
          event.sender.send('ollama:generate-done', requestId)
          return
        }
      }
    }

    event.sender.send('ollama:generate-done', requestId)
  } catch (err) {
    if (err.name === 'AbortError') {
      event.sender.send('ollama:generate-canceled', requestId)
      return
    }

    event.sender.send('ollama:generate-error', requestId, err.message || 'Ollama request failed')
  } finally {
    activeRequests.delete(requestId)
  }
})

ipcMain.on('ollama:cancel', (_event, requestId) => {
  activeRequests.get(requestId)?.abort()
})
