import { useEffect, useState } from 'react'
import { Undo2, X } from 'lucide-react'

interface UndoToastProps {
  message: string
  duration?: number
  onUndo: () => void
  onDismiss: () => void
}

export function UndoToast({
  message,
  duration = 5000,
  onUndo,
  onDismiss,
}: UndoToastProps) {
  const [progress, setProgress] = useState(100)

  useEffect(() => {
    const start = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - start
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100)
      setProgress(remaining)
      if (remaining <= 0) {
        clearInterval(interval)
        onDismiss()
      }
    }, 50)

    return () => clearInterval(interval)
  }, [duration, onDismiss])

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm">
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <p className="text-sm text-slate-700 dark:text-slate-300 font-[Nunito_Sans] flex-1">
            {message}
          </p>
          <button
            onClick={onUndo}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors font-[Nunito_Sans]"
          >
            <Undo2 size={14} />
            Deshacer
          </button>
          <button
            onClick={onDismiss}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
        <div className="h-0.5 bg-slate-200 dark:bg-slate-700">
          <div
            className="h-full bg-red-500 transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
