// Lightweight IndexedDB-backed cache with LRU eviction and schema versioning
// Falls back to localStorage when IndexedDB is unavailable

const DB_NAME = 'lang-school-cache'
const DB_STORE = 'kv'

export const APP_CACHE_VERSION = 1

// Keys used for global metadata
const GLOBAL_VERSION_KEY = 'app_cache_version'

function openDb() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      return resolve(null)
    }
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(DB_STORE)) {
        const store = db.createObjectStore(DB_STORE, { keyPath: 'key' })
        store.createIndex('lastAccessed', 'lastAccessed')
        store.createIndex('size', 'size')
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
  })
}

async function withStore(db, mode, fn) {
  if (!db) return null
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, mode)
    const store = tx.objectStore(DB_STORE)
    const result = fn(store)
    tx.oncomplete = () => resolve(result)
    tx.onerror = () => reject(tx.error)
  })
}

function estimateSize(value) {
  try {
    return new Blob([JSON.stringify(value)]).size
  } catch {
    return 0
  }
}

function nowTs() {
  return Date.now()
}

export class DataCache {
  constructor(options = {}) {
    this.db = null
    this.maxBytes = options.maxBytes || 100 * 1024 * 1024 // 100MB soft cap
    this.namespace = options.namespace || 'default'
    this.fallback = window.localStorage
  }

  async init() {
    this.db = await openDb()
    // Schema version check (stored in localStorage for simplicity)
    const storedVersion = this.fallback.getItem(GLOBAL_VERSION_KEY)
    if (String(storedVersion) !== String(APP_CACHE_VERSION)) {
      await this.clearAll()
      this.fallback.setItem(GLOBAL_VERSION_KEY, String(APP_CACHE_VERSION))
    }
    return this
  }

  buildKey(key) {
    return `${this.namespace}:${key}`
  }

  async get(key) {
    const k = this.buildKey(key)
    if (!this.db) {
      const raw = this.fallback.getItem(k)
      if (!raw) return null
      const parsed = JSON.parse(raw)
      // Check TTL expiration
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        this.fallback.removeItem(k)
        return null
      }
      return parsed.value
    }
    const value = await withStore(this.db, 'readonly', store => store.get(k))
    if (value) {
      // Check TTL expiration
      if (value.expiresAt && Date.now() > value.expiresAt) {
        await withStore(this.db, 'readwrite', store => store.delete(k))
        return null
      }
      // touch LRU - create a new cloneable object
      const updatedValue = {
        key: k,  // Use the built key as the key field
        value: value.value,
        size: value.size,
        lastAccessed: nowTs(),
        createdAt: value.createdAt,
        ttl: value.ttl,
        expiresAt: value.expiresAt
      }
      await withStore(this.db, 'readwrite', store => store.put(updatedValue))
      return value.value
    }
    return null
  }

  async set(key, value, ttl = null) {
    const k = this.buildKey(key)
    const entry = {
      key: k,
      value,
      size: estimateSize(value),
      lastAccessed: nowTs(),
      createdAt: nowTs(),
      ttl: ttl,
      expiresAt: ttl ? nowTs() + ttl : null
    }
    try {
      if (!this.db) {
        this.fallback.setItem(k, JSON.stringify(entry))
        return
      }
      await withStore(this.db, 'readwrite', store => store.put(entry))
      await this.ensureWithinQuota()
    } catch (e) {
      // Quota handling: evict LRU and retry, then fallback to wiping
      await this.evictLeastRecentlyUsed()
      try {
        if (this.db) {
          await withStore(this.db, 'readwrite', store => store.put(entry))
        } else {
          this.fallback.setItem(k, JSON.stringify(entry))
        }
      } catch (e2) {
        await this.clearAll()
      }
    }
  }

  async remove(key) {
    const k = this.buildKey(key)
    if (!this.db) {
      this.fallback.removeItem(k)
      return
    }
    await withStore(this.db, 'readwrite', store => store.delete(k))
  }

  async clearAll() {
    if (this.db) {
      await withStore(this.db, 'readwrite', store => store.clear())
    }
    // Also clear localStorage namespace keys
    const prefix = `${this.namespace}:
`
    for (let i = this.fallback.length - 1; i >= 0; i--) {
      const key = this.fallback.key(i)
      if (key && key.startsWith(prefix)) {
        this.fallback.removeItem(key)
      }
    }
  }

  async ensureWithinQuota() {
    if (!this.db) return
    let totalSize = 0
    const entries = []
    await withStore(this.db, 'readonly', store => {
      return new Promise((resolve, reject) => {
        const req = store.openCursor()
        req.onsuccess = () => {
          const cursor = req.result
          if (cursor) {
            const val = cursor.value
            totalSize += val.size || 0
            entries.push(val)
            cursor.continue()
          } else {
            resolve()
          }
        }
        req.onerror = () => resolve()
      })
    })
    if (totalSize <= this.maxBytes) return
    // Sort by lastAccessed ascending (oldest first)
    entries.sort((a, b) => (a.lastAccessed || 0) - (b.lastAccessed || 0))
    let idx = 0
    while (totalSize > this.maxBytes && idx < entries.length) {
      const toRemove = entries[idx++]
      await withStore(this.db, 'readwrite', store => store.delete(toRemove.key))
      totalSize -= toRemove.size || 0
    }
  }

  async evictLeastRecentlyUsed(count = 5) {
    if (!this.db) return
    const items = []
    await withStore(this.db, 'readonly', store => {
      return new Promise((resolve, reject) => {
        const req = store.openCursor()
        req.onsuccess = () => {
          const cursor = req.result
          if (cursor) {
            items.push(cursor.value)
            cursor.continue()
          } else {
            resolve()
          }
        }
        req.onerror = () => resolve()
      })
    })
    items.sort((a, b) => (a.lastAccessed || 0) - (b.lastAccessed || 0))
    for (let i = 0; i < Math.min(count, items.length); i++) {
      await withStore(this.db, 'readwrite', store => store.delete(items[i].key))
    }
  }
}

// Helper: build standard keys and record shapes for API caching
export function buildCacheKeys(resource, urlOrId = '') {
  const suffix = urlOrId ? `:${urlOrId}` : ''
  return {
    dataKey: `cache:${resource}${suffix}`,
    etagKey: `etag:${resource}${suffix}`,
    versionKey: `version:${resource}${suffix}`
  }
}

export async function initializeDataCache(namespace = 'default') {
  const cache = new DataCache({ namespace })
  await cache.init()
  return cache
}


