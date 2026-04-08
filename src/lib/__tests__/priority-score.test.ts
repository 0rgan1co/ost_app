import { describe, it, expect } from 'vitest'
import { priorityScore } from '../schemas'

// priorityScore(impact, effort) = SCORE[impact] / SCORE[effort]
// where SCORE = { bajo: 1, medio: 2, alto: 3 }

describe('priorityScore', () => {
  describe('canonical combinations', () => {
    it('should return 3 when impact is alto and effort is bajo', () => {
      expect(priorityScore('alto', 'bajo')).toBe(3)
    })

    it('should return 1 when impact and effort are both medio', () => {
      expect(priorityScore('medio', 'medio')).toBe(1)
    })

    it('should return ~0.33 when impact is bajo and effort is alto', () => {
      expect(priorityScore('bajo', 'alto')).toBeCloseTo(1 / 3, 5)
    })

    it('should return 1 when impact and effort are both bajo', () => {
      expect(priorityScore('bajo', 'bajo')).toBe(1)
    })

    it('should return 1 when impact and effort are both alto', () => {
      expect(priorityScore('alto', 'alto')).toBe(1)
    })

    it('should return 1.5 when impact is alto and effort is medio', () => {
      expect(priorityScore('alto', 'medio')).toBe(1.5)
    })

    it('should return 0.5 when impact is bajo and effort is medio', () => {
      expect(priorityScore('bajo', 'medio')).toBe(0.5)
    })

    it('should return 2 when impact is medio and effort is bajo', () => {
      expect(priorityScore('medio', 'bajo')).toBe(2)
    })

    it('should return ~0.67 when impact is medio and effort is alto', () => {
      expect(priorityScore('medio', 'alto')).toBeCloseTo(2 / 3, 5)
    })
  })

  describe('edge cases', () => {
    it('should return 0 when impact is an unknown value', () => {
      expect(priorityScore('desconocido', 'bajo')).toBe(0)
    })

    it('should return 0 when effort is an unknown value', () => {
      expect(priorityScore('alto', 'mucho')).toBe(0)
    })

    it('should return 0 when both values are unknown', () => {
      expect(priorityScore('', '')).toBe(0)
    })

    it('should return 0 for empty strings', () => {
      expect(priorityScore('', 'bajo')).toBe(0)
    })
  })

  describe('ordering — higher impact / lower effort = higher score', () => {
    it('alto/bajo should outrank bajo/alto', () => {
      expect(priorityScore('alto', 'bajo')).toBeGreaterThan(priorityScore('bajo', 'alto'))
    })

    it('alto/bajo should outrank medio/medio', () => {
      expect(priorityScore('alto', 'bajo')).toBeGreaterThan(priorityScore('medio', 'medio'))
    })

    it('medio/bajo should outrank medio/alto', () => {
      expect(priorityScore('medio', 'bajo')).toBeGreaterThan(priorityScore('medio', 'alto'))
    })
  })
})
