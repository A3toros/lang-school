import React from 'react'

export const getFileIconComponent = (fileType) => {
  const iconStyle = "w-8 h-8 text-blue-600"
  
  switch (fileType) {
    case 'pdf':
      return (
        <div className={`${iconStyle} flex items-center justify-center bg-red-50 rounded-lg`}>
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            <text x="12" y="16" textAnchor="middle" className="text-xs font-bold fill-red-600">PDF</text>
          </svg>
        </div>
      )
    case 'doc':
    case 'docx':
      return (
        <div className={`${iconStyle} flex items-center justify-center bg-blue-50 rounded-lg`}>
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            <text x="12" y="16" textAnchor="middle" className="text-xs font-bold fill-blue-600">DOC</text>
          </svg>
        </div>
      )
    case 'xls':
    case 'xlsx':
      return (
        <div className={`${iconStyle} flex items-center justify-center bg-green-50 rounded-lg`}>
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            <text x="12" y="16" textAnchor="middle" className="text-xs font-bold fill-green-600">XLS</text>
          </svg>
        </div>
      )
    case 'ppt':
    case 'pptx':
      return (
        <div className={`${iconStyle} flex items-center justify-center bg-orange-50 rounded-lg`}>
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            <text x="12" y="16" textAnchor="middle" className="text-xs font-bold fill-orange-600">PPT</text>
          </svg>
        </div>
      )
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
    case 'svg':
      return (
        <div className={`${iconStyle} flex items-center justify-center bg-purple-50 rounded-lg`}>
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8.5,13.5L11,16.5L14.5,12L19,18H5M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19Z" />
          </svg>
        </div>
      )
    case 'mp3':
    case 'wav':
    case 'ogg':
    case 'm4a':
    case 'aac':
    case 'flac':
      return (
        <div className={`${iconStyle} flex items-center justify-center bg-pink-50 rounded-lg`}>
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.85 14,18.71V20.77C18.01,19.86 21,16.28 21,12C21,7.72 18.01,4.14 14,3.23M16.5,12C16.5,10.23 15.48,8.71 14,7.97V16.02C15.48,15.29 16.5,13.77 16.5,12M3,9V15H7L12,20V4L7,9H3Z" />
          </svg>
        </div>
      )
    case 'zip':
    case 'rar':
      return (
        <div className={`${iconStyle} flex items-center justify-center bg-yellow-50 rounded-lg`}>
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            <text x="12" y="16" textAnchor="middle" className="text-xs font-bold fill-yellow-600">ZIP</text>
          </svg>
        </div>
      )
    case 'txt':
      return (
        <div className={`${iconStyle} flex items-center justify-center bg-gray-50 rounded-lg`}>
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
            <text x="12" y="16" textAnchor="middle" className="text-xs font-bold fill-gray-600">TXT</text>
          </svg>
        </div>
      )
    default:
      return (
        <div className={`${iconStyle} flex items-center justify-center bg-gray-50 rounded-lg`}>
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
          </svg>
        </div>
      )
  }
}
