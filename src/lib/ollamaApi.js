const defaultApiBaseUrl = '/api/ollama'
const apiBaseUrl = (import.meta.env.VITE_OLLAMA_API_BASE_URL || defaultApiBaseUrl).replace(/\/+$/, '')
const apiUrl = path => `${apiBaseUrl}${path}`

export async function getOllamaModels() {
  if (window.ollamaDesktop) {
    return window.ollamaDesktop.tags()
  }

  const response = await fetch(apiUrl('/api/tags'))

  if (!response.ok) {
    throw new Error(`Ollama models failed ${response.status}`)
  }

  return response.json()
}

export async function generateOllamaAnswer({ model, prompt, onChunk, signal }) {
  if (window.ollamaDesktop) {
    await window.ollamaDesktop.generate({ model, prompt }, onChunk, signal)
    return
  }

  const response = await fetch(apiUrl('/api/generate'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      prompt,
      stream: true
    }),
    signal
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
        onChunk(data.response)
      }

      if (data.done) {
        return
      }
    }
  }
}
