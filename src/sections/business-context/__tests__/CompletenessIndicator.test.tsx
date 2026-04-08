import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CompletenessIndicator } from '../components/CompletenessIndicator'
import type { BusinessContext } from '../../../types'

// ─── Factory ─────────────────────────────────────────────────────────────────

const emptyField = { value: '', updatedAt: null }
const filledField = (value: string) => ({ value, updatedAt: '2026-01-01T00:00:00Z' })

function makeContext(overrides: Partial<BusinessContext> = {}): BusinessContext {
  return {
    strategicChallenge: emptyField,
    northStar: emptyField,
    targetSegment: emptyField,
    keyConstraints: emptyField,
    ...overrides,
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CompletenessIndicator', () => {
  describe('renders the correct count label', () => {
    it('should show "0/4 campos completos" when all fields are empty', () => {
      render(<CompletenessIndicator context={makeContext()} />)
      expect(screen.getByText('0/4 campos completos')).toBeInTheDocument()
    })

    it('should show "1/4 campos completos" when only strategicChallenge is filled', () => {
      render(
        <CompletenessIndicator
          context={makeContext({ strategicChallenge: filledField('Aumentar retención') })}
        />
      )
      expect(screen.getByText('1/4 campos completos')).toBeInTheDocument()
    })

    it('should show "2/4 campos completos" when two fields are filled', () => {
      render(
        <CompletenessIndicator
          context={makeContext({
            strategicChallenge: filledField('Aumentar retención'),
            northStar: filledField('10% churn reduction'),
          })}
        />
      )
      expect(screen.getByText('2/4 campos completos')).toBeInTheDocument()
    })

    it('should show "3/4 campos completos" when three fields are filled', () => {
      render(
        <CompletenessIndicator
          context={makeContext({
            strategicChallenge: filledField('Reto estratégico'),
            northStar: filledField('North star'),
            targetSegment: filledField('Segmento objetivo'),
          })}
        />
      )
      expect(screen.getByText('3/4 campos completos')).toBeInTheDocument()
    })

    it('should show "4/4 campos completos" when all fields are filled', () => {
      render(
        <CompletenessIndicator
          context={makeContext({
            strategicChallenge: filledField('Reto estratégico'),
            northStar: filledField('North star'),
            targetSegment: filledField('Segmento objetivo'),
            keyConstraints: filledField('Restricciones clave'),
          })}
        />
      )
      expect(screen.getByText('4/4 campos completos')).toBeInTheDocument()
    })
  })

  describe('applies correct color state', () => {
    it('should apply red classes when 0/4 fields are filled', () => {
      render(<CompletenessIndicator context={makeContext()} />)
      const badge = screen.getByText('0/4 campos completos').closest('span')
      expect(badge?.className).toContain('text-red-400')
      expect(badge?.className).toContain('bg-red-500/10')
    })

    it('should apply amber classes when 1/4 fields are filled', () => {
      render(
        <CompletenessIndicator
          context={makeContext({ strategicChallenge: filledField('algo') })}
        />
      )
      const badge = screen.getByText('1/4 campos completos').closest('span')
      expect(badge?.className).toContain('text-amber-400')
    })

    it('should apply amber classes when 2/4 fields are filled', () => {
      render(
        <CompletenessIndicator
          context={makeContext({
            strategicChallenge: filledField('algo'),
            northStar: filledField('algo'),
          })}
        />
      )
      const badge = screen.getByText('2/4 campos completos').closest('span')
      expect(badge?.className).toContain('text-amber-400')
    })

    it('should apply amber classes when 3/4 fields are filled', () => {
      render(
        <CompletenessIndicator
          context={makeContext({
            strategicChallenge: filledField('a'),
            northStar: filledField('b'),
            targetSegment: filledField('c'),
          })}
        />
      )
      const badge = screen.getByText('3/4 campos completos').closest('span')
      expect(badge?.className).toContain('text-amber-400')
    })

    it('should apply green classes when all 4/4 fields are filled', () => {
      render(
        <CompletenessIndicator
          context={makeContext({
            strategicChallenge: filledField('a'),
            northStar: filledField('b'),
            targetSegment: filledField('c'),
            keyConstraints: filledField('d'),
          })}
        />
      )
      const badge = screen.getByText('4/4 campos completos').closest('span')
      expect(badge?.className).toContain('text-green-400')
      expect(badge?.className).toContain('bg-green-500/10')
    })
  })

  describe('ignores whitespace-only field values', () => {
    it('should count a whitespace-only field as empty', () => {
      render(
        <CompletenessIndicator
          context={makeContext({
            strategicChallenge: { value: '   ', updatedAt: null },
          })}
        />
      )
      // whitespace-only value is trimmed → 0 fields complete
      expect(screen.getByText('0/4 campos completos')).toBeInTheDocument()
    })
  })
})
