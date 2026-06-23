const defaultApiBaseUrl = '/api/ollama'
const apiBaseUrl = (import.meta.env.VITE_OLLAMA_API_BASE_URL || defaultApiBaseUrl).replace(/\/+$/, '')
const apiUrl = path => `${apiBaseUrl}${path}`

export async function getOllamaModels() {
  if (window.ollamaDesktop) {
    return window.ollamaDesktop.tags()
  }

  let response

  try {
    response = await fetch(apiUrl('/api/tags'))
  } catch {
    throw new Error('Ollama not running.')
  }

  if (!response.ok) {
    throw new Error(`Ollama models failed ${response.status}`)
  }

  return response.json()
}

export async function getOllamaModelInfo(model) {
  if (!model) {
    return null
  }

  if (window.ollamaDesktop) {
    return window.ollamaDesktop.show(model)
  }

  let response

  try {
    response = await fetch(apiUrl('/api/show'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model })
    })
  } catch {
    return null
  }

  if (!response.ok) {
    return null
  }

  return response.json()
}

export async function generateOllamaAnswer({ model, prompt, images = [], onChunk, signal }) {
  if (window.ollamaDesktop) {
    const requestId = crypto.randomUUID()

    function handleAbort() {
      window.ollamaDesktop.cancel(requestId)
    }

    signal?.addEventListener('abort', handleAbort, { once: true })

    try {
      await window.ollamaDesktop.generate(requestId, { model, prompt, images }, onChunk)
    } finally {
      signal?.removeEventListener('abort', handleAbort)
    }

    return
  }

  let response

  try {
    response = await fetch(apiUrl('/api/generate'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        prompt,
        images,
        stream: true
      }),
      signal
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
        onChunk(data.response)
      }

      if (data.done) {
        return
      }
    }
  }
}
