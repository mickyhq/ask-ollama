export default function ChatTools({
  search,
  systemPrompt,
  searchCount,
  searchIndex,
  settingsOpen,
  status,
  onSearchChange,
  onSystemPromptChange,
  onSearchNext,
  onSearchPrevious,
  onExport,
  onClear,
  onToggleSettings,
  hasMessages
}) {
  return (
    <div className="chat-tools">
      <input
        aria-label="Search chat"
        value={search}
        onChange={event => onSearchChange(event.target.value)}
        placeholder="Search chat"
      />

      {search.trim() && <span className="search-count">{searchCount} found</span>}

      {search.trim() && (
        <div className="search-buttons">
          <button
            type="button"
            className="secondary-button"
            disabled={searchCount === 0}
            onClick={onSearchPrevious}
            title="Previous match"
            aria-label="Previous match"
          >
            ‹
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={searchCount === 0}
            onClick={onSearchNext}
            title="Next match"
            aria-label="Next match"
          >
            ›
          </button>
          {searchCount > 0 && <span>{searchIndex + 1}/{searchCount}</span>}
        </div>
      )}

      <input
        aria-label="System prompt"
        value={systemPrompt}
        onChange={event => onSystemPromptChange(event.target.value)}
        placeholder="System prompt"
      />

      <button
        type="button"
        className="secondary-button chat-tool-button"
        disabled={!hasMessages}
        onClick={onExport}
        title="Export chat"
        aria-label="Export chat"
      >
        ⇩
      </button>

      <button
        type="button"
        className="secondary-button chat-tool-button"
        disabled={!hasMessages}
        onClick={onClear}
        title="Clear chat"
        aria-label="Clear chat"
      >
        ⌫
      </button>

      <button
        type="button"
        className="secondary-button chat-tool-button"
        onClick={onToggleSettings}
        title={settingsOpen ? 'Hide settings' : 'Show settings'}
        aria-label={settingsOpen ? 'Hide settings' : 'Show settings'}
      >
        ⚙
      </button>

      {status && <span className="status-text">{status}</span>}
    </div>
  )
}
