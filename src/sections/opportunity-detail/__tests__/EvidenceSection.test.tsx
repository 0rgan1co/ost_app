import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EvidenceSection } from '../components/EvidenceSection'
import type { Evidence } from '../../../types'

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mock supabase so EvidenceSection doesn't need env vars or real network calls
vi.mock('../../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}))

// ─── Factories ────────────────────────────────────────────────────────────────

function makeEvidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    id: 'ev-1',
    type: 'hecho',
    content: 'Los usuarios tardan 3 minutos en completar el registro',
    source: null,
    createdAt: '2026-01-15T10:00:00Z',
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('EvidenceSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('empty state', () => {
    it('should show empty state message when evidence array is empty', () => {
      render(<EvidenceSection evidence={[]} />)
      expect(screen.getByText('Sin evidencia registrada')).toBeInTheDocument()
    })

    it('should show the helper subtitle in empty state', () => {
      render(<EvidenceSection evidence={[]} />)
      expect(
        screen.getByText('Añade citas, hechos u observaciones para sustentar esta oportunidad')
      ).toBeInTheDocument()
    })

    it('should show the section title "Evidencia"', () => {
      render(<EvidenceSection evidence={[]} />)
      expect(screen.getByText('Evidencia')).toBeInTheDocument()
    })
  })

  describe('rendering evidence items', () => {
    it('should render a "hecho" evidence item with its content', () => {
      const evidence = [makeEvidence({ type: 'hecho', content: 'Dato cuantitativo clave' })]
      render(<EvidenceSection evidence={evidence} />)
      expect(screen.getByText('Dato cuantitativo clave')).toBeInTheDocument()
    })

    it('should render a "cita" evidence item with its content', () => {
      const evidence = [
        makeEvidence({ type: 'cita', content: '"El proceso es demasiado largo"' }),
      ]
      render(<EvidenceSection evidence={evidence} />)
      expect(screen.getByText('"El proceso es demasiado largo"')).toBeInTheDocument()
    })

    it('should render an "observacion" evidence item with its content', () => {
      const evidence = [
        makeEvidence({ type: 'observacion', content: 'Los usuarios hacen scroll hasta el fondo' }),
      ]
      render(<EvidenceSection evidence={evidence} />)
      expect(screen.getByText('Los usuarios hacen scroll hasta el fondo')).toBeInTheDocument()
    })

    it('should render the type label for each evidence item', () => {
      const evidence = [
        makeEvidence({ id: 'ev-1', type: 'hecho', content: 'hecho item' }),
        makeEvidence({ id: 'ev-2', type: 'cita', content: 'cita item' }),
        makeEvidence({ id: 'ev-3', type: 'observacion', content: 'observacion item' }),
      ]
      render(<EvidenceSection evidence={evidence} />)
      expect(screen.getByText('Hecho')).toBeInTheDocument()
      expect(screen.getByText('Cita')).toBeInTheDocument()
      expect(screen.getByText('Observación')).toBeInTheDocument()
    })

    it('should render the count badge with the number of evidence items', () => {
      const evidence = [
        makeEvidence({ id: 'ev-1' }),
        makeEvidence({ id: 'ev-2' }),
        makeEvidence({ id: 'ev-3' }),
      ]
      render(<EvidenceSection evidence={evidence} />)
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('should not show the empty state when evidence array has items', () => {
      const evidence = [makeEvidence()]
      render(<EvidenceSection evidence={evidence} />)
      expect(screen.queryByText('Sin evidencia registrada')).not.toBeInTheDocument()
    })
  })

  describe('source display for "cita" type', () => {
    it('should show the source when evidence type is "cita" and source is provided', () => {
      const evidence = [
        makeEvidence({
          type: 'cita',
          content: 'El flujo no es claro',
          source: 'Entrevista usuario #3',
        }),
      ]
      render(<EvidenceSection evidence={evidence} />)
      expect(screen.getByText(/Entrevista usuario #3/)).toBeInTheDocument()
    })

    it('should not show source dash when evidence type is "hecho"', () => {
      const evidence = [makeEvidence({ type: 'hecho', source: null })]
      render(<EvidenceSection evidence={evidence} />)
      // No source element rendered for non-cita types
      expect(screen.queryByText(/—\s/)).not.toBeInTheDocument()
    })

    it('should not show source when cita type has null source', () => {
      const evidence = [makeEvidence({ type: 'cita', source: null })]
      render(<EvidenceSection evidence={evidence} />)
      expect(screen.queryByText(/—\s/)).not.toBeInTheDocument()
    })
  })

  describe('add evidence button', () => {
    it('should show the "Añadir" button when onAddEvidence prop is provided', () => {
      render(<EvidenceSection evidence={[]} onAddEvidence={vi.fn()} />)
      expect(screen.getByText('Añadir')).toBeInTheDocument()
    })

    it('should not show the "Añadir" button when onAddEvidence prop is not provided', () => {
      render(<EvidenceSection evidence={[]} />)
      expect(screen.queryByText('Añadir')).not.toBeInTheDocument()
    })

    it('should show the add form after clicking "Añadir"', async () => {
      const user = userEvent.setup()
      render(<EvidenceSection evidence={[]} onAddEvidence={vi.fn()} />)
      await user.click(screen.getByText('Añadir'))
      expect(screen.getByPlaceholderText('Contenido de la evidencia...')).toBeInTheDocument()
    })
  })
})
