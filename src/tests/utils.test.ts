import { describe, it, expect } from 'vitest'
import { formatTaskFromDb } from '../utils/taskUtils'
import { SECRETARIAS } from '../utils/secretarias'

describe('formatTaskFromDb', () => {
  it('converts basic task fields correctly', () => {
    const raw = {
      id: 'test-uuid',
      title: 'Test Task',
      description: 'Test description',
      status: 'solicitado',
      type: ['release'],
      creator: 'John',
      priority: 'alta',
      due_date: '2026-04-07T10:00:00Z',
      created_at: '2026-04-01T10:00:00Z',
      task_assignees: [{ users: { name: 'John' } }],
    }

    const task = formatTaskFromDb(raw)

    expect(task.id).toBe('test-uuid')
    expect(task.title).toBe('Test Task')
    expect(task.description).toBe('Test description')
    expect(task.status).toBe('solicitado')
    expect(task.type).toEqual(['release'])
    expect(task.creator).toBe('John')
    expect(task.priority).toBe('alta')
    expect(task.assignees).toEqual(['John'])
  })

  it('handles missing optional fields with defaults', () => {
    const raw = {
      id: 'test-uuid',
      title: 'Minimal Task',
      status: 'producao',
      type: [],
      creator: 'System',
      created_at: '2026-04-01T10:00:00Z',
    }

    const task = formatTaskFromDb(raw)

    expect(task.description).toBe('')
    expect(task.priority).toBe('baixa')
    expect(task.dueDate).toBeNull()
    expect(task.assignees).toEqual([])
    expect(task.archived).toBe(false)
    expect(task.inauguracao_secretarias).toEqual([])
    expect(task.video_captacao_equipe).toEqual([])
  })

  it('parses inauguracao_secretarias from JSON string', () => {
    const raw = {
      id: 'test-uuid',
      title: 'Inauguration',
      status: 'inauguracao',
      type: ['inauguracao'],
      creator: 'Admin',
      inauguracao_secretarias: '["SVCS - Secretaria do Verde", "SIURB - Infraestrutura"]',
      created_at: '2026-04-01T10:00:00Z',
    }

    const task = formatTaskFromDb(raw)
    expect(task.inauguracao_secretarias).toEqual([
      'SVCS - Secretaria do Verde',
      'SIURB - Infraestrutura',
    ])
  })

  it('parses inauguracao_secretarias from array', () => {
    const raw = {
      id: 'test-uuid',
      title: 'Inauguration',
      status: 'inauguracao',
      type: ['inauguracao'],
      creator: 'Admin',
      inauguracao_secretarias: ['SS - Saúde', 'SE - Educação'],
      created_at: '2026-04-01T10:00:00Z',
    }

    const task = formatTaskFromDb(raw)
    expect(task.inauguracao_secretarias).toEqual(['SS - Saúde', 'SE - Educação'])
  })

  it('handles null creator gracefully', () => {
    const raw = {
      id: 'test-uuid',
      title: 'No Creator',
      status: 'solicitado',
      type: [],
      creator: null,
      created_at: '2026-04-01T10:00:00Z',
    }

    const task = formatTaskFromDb(raw)
    expect(task.creator).toBe('Desconhecido')
  })
})

describe('SECRETARIAS constant', () => {
  it('contains expected number of secretarias', () => {
    expect(SECRETARIAS.length).toBeGreaterThan(30)
  })

  it('contains known secretarias', () => {
    expect(SECRETARIAS).toContain('SS - Saúde')
    expect(SECRETARIAS).toContain('SE - Educação')
    expect(SECRETARIAS).toContain('SIURB - Infraestrutura')
  })

  it('has no duplicate entries', () => {
    const unique = new Set(SECRETARIAS)
    expect(unique.size).toBe(SECRETARIAS.length)
  })
})
