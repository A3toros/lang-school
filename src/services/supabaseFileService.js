import { supabase } from '../utils/supabase'

class SupabaseFileService {
  async uploadFile(file, folderId = null, options = {}) {
    const filePath = this.generateFilePath(file, folderId)
    
    const { data, error } = await supabase.storage
      .from('files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })
    
    if (error) throw error
    
    return {
      path: data.path,
      bucket: 'files',
      size: file.size,
      contentType: file.type
    }
  }
  
  generateFilePath(file, folderId) {
    const timestamp = Date.now()
    const fileName = `${timestamp}-${file.name}`
    
    if (folderId) {
      return `folders/folder-${folderId}/${fileName}`
    }
    return `root/${fileName}`
  }
  
  async getSignedUrl(filePath, expiresIn = 3600) {
    const { data, error } = await supabase.storage
      .from('files')
      .createSignedUrl(filePath, expiresIn)
    
    if (error) throw error
    return data.signedUrl
  }
  
  async deleteFile(filePath) {
    const { error } = await supabase.storage
      .from('files')
      .remove([filePath])
    
    if (error) throw error
  }
}

export default new SupabaseFileService()
