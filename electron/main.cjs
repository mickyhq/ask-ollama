const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('node:path')
const activeRequests = new Map()

function createWindow() {
  const win = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 900,
    minHeight: 620,
    title: 'Ask Ollama',
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
  const response = await fetch(ollamaUrl('/api/tags'))

  if (!response.ok) {
    throw new Error(`Ollama models failed ${response.status}`)
  }

  return response.json()
})

ipcMain.on('ollama:generate', async (event, requestId, body) => {
  const controller = new AbortController()

  activeRequests.set(requestId, controller)

  try {
    const response = await fetch(ollamaUrl('/api/generate'), {
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
