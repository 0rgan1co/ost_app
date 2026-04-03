import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Send, GitBranch, Loader2, Bot, User } from 'lucide-react'
import type { ConversationMessage } from '../../../types'

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-red-500/15 border border-red-500/20">
        <Bot size={13} className="text-red-400" />
      </div>
      <div className="rounded-2xl rounded-tl-sm border border-red-500/20 bg-slate-800 px-4 py-2.5">
        <div className="flex gap-1 items-center h-4">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="size-1.5 rounded-full bg-slate-500 animate-bounce"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Individual message bubble ────────────────────────────────────────────────

interface MessageBubbleProps {
  message: ConversationMessage
  onApplySuggestion?: (messageId: string) => void
}

function MessageBubble({ message, onApplySuggestion }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="flex items-start gap-3 justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-slate-700 px-4 py-2.5">
          <p className="text-sm text-slate-100 leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
          <p className="mt-1 font-mono text-xs text-slate-500 text-right">
            {new Date(message.createdAt).toLocaleTimeString('es', { timeStyle: 'short' })}
          </p>
        </div>
        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-700">
          <User size={13} className="text-slate-300" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-start gap-3">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-red-500/15 border border-red-500/20">
        <Bot size={13} className="text-red-400" />
      </div>
      <div className="max-w-[85%] space-y-2">
        <div className="rounded-2xl rounded-tl-sm border border-red-500/20 bg-slate-800 px-4 py-2.5">
          <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
            {message.content}
          </p>
          <p className="mt-1 font-mono text-xs text-slate-500">
            {new Date(message.createdAt).toLocaleTimeString('es', { timeStyle: 'short' })}
          </p>
        </div>

        {message.hasSuggestion && onApplySuggestion && (
          <button
            type="button"
            onClick={() => onApplySuggestion(message.id)}
            className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/15 transition-colors"
          >
            <GitBranch size={12} />
            Aplicar sugerencia al OST
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Conversation Panel ───────────────────────────────────────────────────────

interface ConversationPanelProps {
  conversation: ConversationMessage[]
  isSendingMessage?: boolean
  hasEvaluation: boolean
  onSendMessage?: (message: string) => void
  onApplySuggestion?: (messageId: string) => void
}

export function ConversationPanel({
  conversation,
  isSendingMessage = false,
  hasEvaluation,
  onSendMessage,
  onApplySuggestion,
}: ConversationPanelProps) {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conversation, isSendingMessage])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = inputValue.trim()
    if (!trimmed || isSendingMessage || !onSendMessage) return
    onSendMessage(trimmed)
    setInputValue('')
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as FormEvent)
    }
  }

  if (!hasEvaluation) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col items-center justify-center gap-2 text-center py-4">
          <Bot size={24} className="text-slate-400" />
          <p className="text-sm text-slate-500">
            Ejecuta una evaluación con IA para iniciar la conversación de refinamiento.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
        <Bot size={15} className="text-red-400" />
        <span className="text-sm font-medium text-slate-300">Conversación con Claude</span>
        {conversation.length > 0 && (
          <span className="ml-auto font-mono text-xs text-slate-400">
            {conversation.length} mensaje{conversation.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto max-h-[400px] p-4 space-y-4">
        {conversation.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 text-center py-8">
            <p className="text-sm text-slate-500">
              Pregunta a Claude sobre la evaluación o pide que profundice en algún punto.
            </p>
          </div>
        )}

        {conversation.map(message => (
          <MessageBubble
            key={message.id}
            message={message}
            onApplySuggestion={onApplySuggestion}
          />
        ))}

        {isSendingMessage && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-slate-800 p-3">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje... (Enter para enviar)"
            rows={2}
            disabled={isSendingMessage}
            className="flex-1 resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-400 outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isSendingMessage}
            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            aria-label="Enviar mensaje"
          >
            {isSendingMessage ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Send size={15} />
            )}
          </button>
        </form>
        <p className="mt-1.5 text-xs text-slate-400 pl-1">
          Shift+Enter para nueva línea
        </p>
      </div>
    </div>
  )
}
