const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ollamaDesktop', {
  tags() {
    return ipcRenderer.invoke('ollama:tags')
  },
  show(model) {
    return ipcRenderer.invoke('ollama:show', model)
  },
  generate(requestId, body, onChunk) {
    return new Promise((resolve, reject) => {
      function cleanup() {
        ipcRenderer.removeListener('ollama:generate-chunk', handleChunk)
        ipcRenderer.removeListener('ollama:generate-done', handleDone)
        ipcRenderer.removeListener('ollama:generate-error', handleError)
        ipcRenderer.removeListener('ollama:generate-canceled', handleCanceled)
      }

      function handleChunk(_event, chunkRequestId, chunk) {
        if (chunkRequestId === requestId) {
          onChunk(chunk)
        }
      }

      function handleDone(_event, doneRequestId) {
        if (doneRequestId === requestId) {
          cleanup()
          resolve()
        }
      }

      function handleError(_event, errorRequestId, message) {
        if (errorRequestId === requestId) {
          cleanup()
          reject(new Error(message))
        }
      }

      function handleCanceled(_event, canceledRequestId) {
        if (canceledRequestId === requestId) {
          cleanup()
          reject(new DOMException('Canceled', 'AbortError'))
        }
      }

      ipcRenderer.on('ollama:generate-chunk', handleChunk)
      ipcRenderer.on('ollama:generate-done', handleDone)
      ipcRenderer.on('ollama:generate-error', handleError)
      ipcRenderer.on('ollama:generate-canceled', handleCanceled)
      ipcRenderer.send('ollama:generate', requestId, body)
    })
  },
  cancel(requestId) {
    ipcRenderer.send('ollama:cancel', requestId)
  }
})
