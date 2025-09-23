import React, { useState, useEffect } from 'react'
import { usePhotoCache } from '../../hooks/usePhotoCache'
import photoCache from '../../utils/photoCache'

const PhotoCacheDemo = () => {
  const [stats, setStats] = useState(null)
  const [testUrl, setTestUrl] = useState('')
  const [testFileId, setTestFileId] = useState('')
  const [forceRefresh, setForceRefresh] = useState(false)

  // Example photo URL (replace with actual Cloudinary URL)
  const exampleUrl = 'https://res.cloudinary.com/your-cloud/image/upload/v1234567890/sample.jpg'
  const exampleFileId = 'sample-photo-123'

  const { 
    blobUrl, 
    loading, 
    error, 
    isCached, 
    refresh,
    clearCache 
  } = usePhotoCache(testUrl || exampleUrl, testFileId || exampleFileId, { 
    forceRefresh 
  })

  // Load cache stats
  useEffect(() => {
    const loadStats = async () => {
      try {
        const cacheStats = await photoCache.getStats()
        setStats(cacheStats)
      } catch (error) {
        console.error('Failed to load cache stats:', error)
      }
    }
    loadStats()
  }, [blobUrl]) // Refresh stats when photo changes

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm border border-neutral-200">
      <h3 className="text-lg font-semibold text-neutral-800 mb-4">Photo Cache Demo</h3>
      
      {/* Cache Stats */}
      {stats && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-800 mb-2">Cache Statistics</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Photos Cached:</span>
              <span className="ml-2 font-medium">{stats.photoCount}</span>
            </div>
            <div>
              <span className="text-gray-600">Total Size:</span>
              <span className="ml-2 font-medium">{formatBytes(stats.totalSize)}</span>
            </div>
            <div>
              <span className="text-gray-600">Oldest Photo:</span>
              <span className="ml-2 font-medium text-xs">
                {stats.oldestPhoto ? formatDate(stats.oldestPhoto) : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Newest Photo:</span>
              <span className="ml-2 font-medium text-xs">
                {stats.newestPhoto ? formatDate(stats.newestPhoto) : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Test Controls */}
      <div className="mb-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Test Photo URL:
          </label>
          <input
            type="url"
            value={testUrl}
            onChange={(e) => setTestUrl(e.target.value)}
            placeholder={exampleUrl}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            File ID:
          </label>
          <input
            type="text"
            value={testFileId}
            onChange={(e) => setTestFileId(e.target.value)}
            placeholder={exampleFileId}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={forceRefresh}
              onChange={(e) => setForceRefresh(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Force Refresh</span>
          </label>
          
          <button
            onClick={refresh}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh Photo'}
          </button>
          
          <button
            onClick={clearCache}
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Clear Cache
          </button>
        </div>
      </div>

      {/* Photo Display */}
      <div className="mb-4">
        <h4 className="font-medium text-gray-800 mb-2">Photo Preview</h4>
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          {loading && (
            <div className="flex items-center justify-center h-32">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                <span className="text-sm text-gray-500">
                  {isCached ? 'Loading from cache...' : 'Downloading...'}
                </span>
              </div>
            </div>
          )}
          
          {error && (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <div className="text-red-500 mb-2">❌ Error: {error}</div>
                <button
                  onClick={refresh}
                  className="text-sm text-blue-500 hover:text-blue-700 underline"
                >
                  Retry
                </button>
              </div>
            </div>
          )}
          
          {blobUrl && !loading && (
            <div className="text-center">
              <img
                src={blobUrl}
                alt="Cached photo"
                className="max-w-full max-h-64 mx-auto rounded-lg shadow-sm"
              />
              <div className="mt-2 text-sm text-gray-600">
                Status: {isCached ? '✅ Cached' : '🌐 Fresh Download'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="text-sm text-gray-600">
        <h5 className="font-medium mb-2">How it works:</h5>
        <ul className="list-disc list-inside space-y-1">
          <li>Photos are stored on your PC in IndexedDB</li>
          <li>Only downloads new photos or when URLs change</li>
          <li>Shows cached photos even when offline</li>
          <li>Automatically refreshes photos older than 7 days</li>
          <li>500MB cache limit for photos</li>
        </ul>
      </div>
    </div>
  )
}

export default PhotoCacheDemo
