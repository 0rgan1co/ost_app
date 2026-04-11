import { GitBranch, Layers, Sparkles, BookOpen, Settings, HelpCircle, FlaskConical, ClipboardCheck } from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  isActive?: boolean
}

interface MainNavProps {
  items: NavItem[]
  onNavigate?: (href: string) => void
  collapsed?: boolean
}

const iconMap: Record<string, React.ReactNode> = {
  '/ost-tree':          <GitBranch size={18} />,
  '/experiments':       <FlaskConical size={18} />,
  '/reviews':           <ClipboardCheck size={18} />,
  '/opportunity':       <Layers size={18} />,
  '/ai-evaluation':     <Sparkles size={18} />,
  '/business-context':  <BookOpen size={18} />,
  '/settings':          <Settings size={18} />,
  '/help':              <HelpCircle size={18} />,
}

export function MainNav({ items, onNavigate, collapsed = false }: MainNavProps) {
  const primary = items.filter(
    (i) => !['/settings', '/help'].includes(i.href)
  )
  const utility = items.filter((i) => ['/settings', '/help'].includes(i.href))

  const renderItem = (item: NavItem) => (
    <button
      key={item.href}
      onClick={() => onNavigate?.(item.href)}
      title={item.label}
      className={`
        w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold
        font-sans transition-all duration-150
        ${collapsed ? 'justify-center' : ''}
        ${item.isActive
          ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
        }
      `}
    >
      <span className={`flex-shrink-0 ${item.isActive ? 'text-red-500' : ''}`}>
        {iconMap[item.href] ?? <Layers size={18} />}
      </span>
      {!collapsed && <span className="truncate">{item.label}</span>}
      {item.isActive && !collapsed && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500" />
      )}
    </button>
  )

  return (
    <nav className="flex flex-col gap-1">
      {primary.map(renderItem)}

      {utility.length > 0 && (
        <>
          <div className="my-2 border-t border-slate-200 dark:border-slate-800" />
          {utility.map(renderItem)}
        </>
      )}
    </nav>
  )
}
