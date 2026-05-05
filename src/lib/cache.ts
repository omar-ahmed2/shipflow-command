// Simple in-memory cache to reduce DB load
// TTL (Time To Live) in milliseconds

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

class SimpleCache {
  private cache: Map<string, CacheItem<any>> = new Map()
  private readonly DEFAULT_TTL = 60000 // 60 seconds default for high load
  private maxSize = 1000 // Maximum cache entries

  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    // LRU eviction: remove oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)
    if (!item) return null

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data as T
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Clear expired items
  cleanup(): void {
    const now = Date.now()
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key)
      }
    }
  }

  // Get cache stats
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// Export singleton instance
export const cache = new SimpleCache()

// Auto-cleanup every 5 minutes
setInterval(() => {
  cache.cleanup()
}, 5 * 60 * 1000)

// Cache keys generator
export const cacheKeys = {
  shipments: (userId?: string) => `shipments_${userId || 'all'}`,
  courierShipments: (courierId: string) => `courier_shipments_${courierId}`,
  sellerShipments: (sellerId: string) => `seller_shipments_${sellerId}`,
  couriers: () => 'couriers_list',
  sellers: () => 'sellers_list',
  settlements: (userId?: string) => `settlements_${userId || 'all'}`,
  notifications: (userId: string) => `notifications_${userId}`,
  user: (userId: string) => `user_${userId}`,
  profile: (userId: string) => `profile_${userId}`
}

// Wrapper for async functions with caching
export function withCache<T>(
  fn: () => Promise<T>,
  key: string,
  ttl: number = 30000
): () => Promise<T> {
  return async () => {
    const cached = cache.get<T>(key)
    if (cached !== null) {
      return cached
    }

    const result = await fn()
    cache.set(key, result, ttl)
    return result
  }
}
