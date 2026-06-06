const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('ollamaDesktop', {
  tags() {
    return ipcRenderer.invoke('ollama:tags')
  },
  generate(body, onChunk, signal) {
    const requestId = crypto.randomUUID()

    return new Promise((resolve, reject) => {
      function cleanup() {
        ipcRenderer.removeListener('ollama:generate-chunk', handleChunk)
        ipcRenderer.removeListener('ollama:generate-done', handleDone)
        ipcRenderer.removeListener('ollama:generate-error', handleError)
        ipcRenderer.removeListener('ollama:generate-canceled', handleCanceled)
        signal?.removeEventListener('abort', handleAbort)
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

      function handleAbort() {
        ipcRenderer.send('ollama:cancel', requestId)
      }

      ipcRenderer.on('ollama:generate-chunk', handleChunk)
      ipcRenderer.on('ollama:generate-done', handleDone)
      ipcRenderer.on('ollama:generate-error', handleError)
      ipcRenderer.on('ollama:generate-canceled', handleCanceled)
      signal?.addEventListener('abort', handleAbort, { once: true })
      ipcRenderer.send('ollama:generate', requestId, body)
    })
  }
})
