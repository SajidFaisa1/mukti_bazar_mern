import { describe, it, expect } from 'vitest'

// Minimal pure helper replicating quantity logic (guard + optimistic apply)
const applyQuantityChange = (item, delta, { min = 1, stock = Infinity }) => {
  const target = item.quantity + delta
  if (delta < 0 && target < min) return item.quantity // guard
  if (target > stock) return item.quantity // guard
  return target
}

describe('applyQuantityChange', () => {
  it('prevents going below min', () => {
    expect(applyQuantityChange({ quantity: 1 }, -1, { min: 1 })).toBe(1)
  })
  it('prevents exceeding stock', () => {
    expect(applyQuantityChange({ quantity: 3 }, 5, { stock: 5 })).toBe(3)
  })
  it('increments within bounds', () => {
    expect(applyQuantityChange({ quantity: 2 }, 1, { min: 1, stock: 10 })).toBe(3)
  })
})
