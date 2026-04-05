import { useState, useEffect, useRef } from 'react'
import { X, Send, Sparkles, Loader2, CheckCircle } from 'lucide-react'
import { useOSTWizard } from '../../../hooks/use-ost-wizard'

interface OSTWizardModalProps {
  isOpen: boolean
  projectId: string
  projectName: string
  onClose: () => void
}

export function OSTWizardModal({ isOpen, projectId, projectName, onClose }: OSTWizardModalProps) {
  const { messages, phase, currentPhaseLabel, progress, sending, startWizard, sendMessage } = useOSTWizard(projectId, projectName)
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    if (isOpen && !started) {
      setStarted(true)
      startWizard()
    }
  }, [isOpen, started, startWizard])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!sending) inputRef.current?.focus()
  }, [sending])

  if (!isOpen) return null

  const handleSend = () => {
    if (!input.trim() || sending) return
    sendMessage(input)
    setInput('')
  }

  const isDone = phase === 'done'

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[640px] sm:h-[80vh] z-50 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <Sparkles size={16} className="text-red-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50 font-sans">
                Configurar OST
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-['IBM_Plex_Mono']">
                {currentPhaseLabel}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-slate-100 dark:bg-slate-800 flex-shrink-0">
          <div
            className="h-full bg-red-500 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm font-sans leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-red-500 text-white rounded-br-md'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-md'
                }`}
              >
                {msg.content.split('\n').map((line, i) => (
                  <p key={i} className={i > 0 ? 'mt-2' : ''}>
                    {line.startsWith('- ') ? (
                      <span className="flex items-start gap-2">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-current flex-shrink-0" />
                        {line.slice(2)}
                      </span>
                    ) : line.startsWith('**') && line.endsWith('**') ? (
                      <strong>{line.slice(2, -2)}</strong>
                    ) : (
                      line
                    )}
                  </p>
                ))}
              </div>
            </div>
          ))}

          {sending && (
            <div className="flex justify-start">
              <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-red-400" />
                <span className="text-sm text-slate-500 font-sans">Pensando...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex-shrink-0">
          {isDone ? (
            <button
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 py-3 bg-red-500 hover:bg-red-600 text-white font-semibold text-sm rounded-xl transition-colors font-sans"
            >
              <CheckCircle size={16} />
              Ver mi OST
            </button>
          ) : (
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Escribe tu respuesta..."
                rows={1}
                disabled={sending}
                className="flex-1 resize-none px-4 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent font-sans disabled:opacity-50"
                style={{ maxHeight: '120px' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="w-10 h-10 flex items-center justify-center bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex-shrink-0"
              >
                <Send size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
