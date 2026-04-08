import { describe, it, expect } from 'vitest'
import { parseSuggestion } from '../parse-suggestion'
import type { SuggestionAction } from '../parse-suggestion'

describe('parseSuggestion', () => {
  describe('Pass 1 — line-level precise patterns', () => {
    describe('add_solution', () => {
      it('should detect "nueva solución:" prefix and return add_solution action', () => {
        const result = parseSuggestion('Nueva solución: Los usuarios prefieren onboarding guiado')
        expect(result).toHaveLength(1)
        expect(result[0].type).toBe('add_solution')
        expect(result[0].data).toEqual({ description: 'Los usuarios prefieren onboarding guiado' })
      })

      it('should detect "agregar solución:" and extract content', () => {
        const result = parseSuggestion('Agregar solución: La retención mejora con notificaciones push')
        expect(result[0].type).toBe('add_solution')
        expect(result[0].description).toContain('La retención mejora con notificaciones push')
      })

      it('should detect "solución:" standalone prefix', () => {
        const result = parseSuggestion('solución: Los usuarios no leen los correos de bienvenida')
        expect(result[0].type).toBe('add_solution')
      })
    })

    describe('add_evidence', () => {
      it('should detect "agregar evidencia:" and return add_evidence action', () => {
        const result = parseSuggestion('Agregar evidencia: El 60% de los usuarios abandona en el paso 3')
        expect(result).toHaveLength(1)
        expect(result[0].type).toBe('add_evidence')
        expect(result[0].data).toMatchObject({
          content: 'El 60% de los usuarios abandona en el paso 3',
          type: 'observacion',
        })
      })

      it('should detect "evidencia:" prefix', () => {
        const result = parseSuggestion('evidencia: Entrevistas muestran frustración con el flujo actual')
        expect(result[0].type).toBe('add_evidence')
      })
    })

    describe('update_description', () => {
      it('should detect "actualizar la descripción:" and return update_description action', () => {
        const result = parseSuggestion('Actualizar la descripción: Mejorar la experiencia de onboarding para nuevos usuarios')
        expect(result).toHaveLength(1)
        expect(result[0].type).toBe('update_description')
        expect(result[0].data).toEqual({ description: 'Mejorar la experiencia de onboarding para nuevos usuarios' })
      })

      it('should detect "nueva descripción:" prefix', () => {
        const result = parseSuggestion('Nueva descripción: Optimizar el flujo de activación')
        expect(result[0].type).toBe('update_description')
      })
    })

    describe('suggest_experiment', () => {
      it('should detect "experimento:" and return suggest_experiment action', () => {
        const result = parseSuggestion('Experimento: Probar un wizard de onboarding de 3 pasos')
        expect(result).toHaveLength(1)
        expect(result[0].type).toBe('suggest_experiment')
        expect(result[0].data).toEqual({ description: 'Probar un wizard de onboarding de 3 pasos' })
      })

      it('should detect "probar si" pattern', () => {
        const result = parseSuggestion('Probar si el email de reactivación aumenta el regreso al día 7')
        expect(result[0].type).toBe('suggest_experiment')
      })

      it('should detect "validar con" pattern', () => {
        const result = parseSuggestion('Validar con un prototipo de baja fidelidad la nueva pantalla')
        expect(result[0].type).toBe('suggest_experiment')
      })
    })

    describe('multi-line messages', () => {
      it('should extract multiple actions from a multi-line message', () => {
        const message = [
          'Nueva solución: Los usuarios no confían en el formulario',
          'Agregar evidencia: Tasa de abandono del 45% en el paso de pago',
        ].join('\n')
        const result = parseSuggestion(message)
        expect(result).toHaveLength(2)
        expect(result[0].type).toBe('add_solution')
        expect(result[1].type).toBe('add_evidence')
      })

      it('should only match one pattern per line even if multiple patterns could apply', () => {
        const message = 'Nueva solución: Evidencia muestra que los usuarios prefieren el modo oscuro'
        const result = parseSuggestion(message)
        // The solution pattern fires first — only one action per line
        const types = result.map(a => a.type)
        expect(types.filter(t => t === 'add_solution')).toHaveLength(1)
      })
    })
  })

  describe('Pass 2 — keyword-level fallback', () => {
    it('should return add_solution via keyword when no line pattern matches', () => {
      const result = parseSuggestion(
        'Creo que deberías considerar esta solución para la retención de usuarios.'
      )
      const types = result.map((a: SuggestionAction) => a.type)
      expect(types).toContain('add_solution')
    })

    it('should return suggest_experiment via keyword for text mentioning experimento', () => {
      const result = parseSuggestion(
        'Sería útil diseñar un experimento para validar esta suposición.'
      )
      const types = result.map((a: SuggestionAction) => a.type)
      expect(types).toContain('suggest_experiment')
    })

    it('should not produce duplicate types in fallback pass', () => {
      const result = parseSuggestion(
        'La solución es que el problema se puede resolver con un experimento pequeño.'
      )
      const types = result.map((a: SuggestionAction) => a.type)
      const uniqueTypes = new Set(types)
      expect(types.length).toBe(uniqueTypes.size)
    })
  })

  describe('Pass 3 — manual fallback', () => {
    it('should return a single manual action when no pattern or keyword matches', () => {
      const content = 'Esto es un texto genérico sin palabras clave reconocibles.'
      const result = parseSuggestion(content)
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('manual')
      expect(result[0].description).toBe(content)
      expect(result[0].data).toEqual({})
    })

    it('should return manual action for empty string', () => {
      const result = parseSuggestion('')
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('manual')
    })
  })

  describe('action shape', () => {
    it('should always return an array', () => {
      expect(Array.isArray(parseSuggestion('cualquier texto'))).toBe(true)
    })

    it('should include a non-empty description in every action', () => {
      const result = parseSuggestion('Nueva solución: algo interesante')
      result.forEach((action: SuggestionAction) => {
        expect(typeof action.description).toBe('string')
        expect(action.description.length).toBeGreaterThan(0)
      })
    })

    it('should include a data object in every action', () => {
      const result = parseSuggestion('Agregar evidencia: dato relevante')
      result.forEach((action: SuggestionAction) => {
        expect(typeof action.data).toBe('object')
        expect(action.data).not.toBeNull()
      })
    })
  })
})
