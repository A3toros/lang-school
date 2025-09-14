// Enhanced file type detection and utilities
export const getFileType = (mimeType, fileName = '') => {
  const typeMap = {
    // Documents
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'text/plain': 'txt',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/vnd.ms-powerpoint': 'ppt',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
    'application/zip': 'zip',
    'application/x-zip-compressed': 'zip',
    'application/x-rar-compressed': 'rar',
    // Images
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    // Audio
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/ogg': 'ogg',
    'audio/m4a': 'm4a',
    'audio/aac': 'aac',
    'audio/flac': 'flac'
  }
  
  // First try MIME type detection
  if (mimeType && typeMap[mimeType]) {
    return typeMap[mimeType]
  }
  
  // Fallback to extension-based detection
  if (fileName) {
    const extension = fileName.split('.').pop()?.toLowerCase()
    const extensionMap = {
      'pdf': 'pdf',
      'doc': 'doc',
      'docx': 'docx',
      'txt': 'txt',
      'xls': 'xls',
      'xlsx': 'xlsx',
      'ppt': 'ppt',
      'pptx': 'pptx',
      'zip': 'zip',
      'rar': 'rar',
      'jpg': 'jpg',
      'jpeg': 'jpg',
      'png': 'png',
      'gif': 'gif',
      'webp': 'webp',
      'svg': 'svg',
      'mp3': 'mp3',
      'wav': 'wav',
      'ogg': 'ogg',
      'm4a': 'm4a',
      'aac': 'aac',
      'flac': 'flac'
    }
    
    if (extension && extensionMap[extension]) {
      return extensionMap[extension]
    }
  }
  
  return 'unknown'
}

export const getFileIcon = (fileType) => {
  const iconMap = {
    // Documents
    pdf: '📄', doc: '📝', docx: '📝', txt: '📄',
    xls: '📊', xlsx: '📊', ppt: '📽️', pptx: '📽️',
    zip: '📦', rar: '📦',
    // Images
    jpg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️', svg: '🖼️',
    // Audio
    mp3: '🎵', wav: '🎵', ogg: '🎵', m4a: '🎵', aac: '🎵', flac: '🎵'
  }
  return iconMap[fileType] || '📄'
}

export const getAcceptedTypes = () => {
  return [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Audio
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/m4a',
    'audio/aac',
    'audio/flac'
  ]
}

export const canPreview = (fileType) => {
  const previewableTypes = [
    'pdf', 'txt', 'jpg', 'png', 'gif', 'webp', 'svg',
    'mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'
  ]
  return previewableTypes.includes(fileType)
}

export const isImage = (fileType) => {
  return ['jpg', 'png', 'gif', 'webp', 'svg'].includes(fileType)
}

export const isAudio = (fileType) => {
  return ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(fileType)
}

export const isDocument = (fileType) => {
  return ['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx'].includes(fileType)
}

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

