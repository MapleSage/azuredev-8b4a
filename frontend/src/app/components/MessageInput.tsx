import { useState, useRef } from "react"
import { Send, Paperclip, Mic, Image, Video, X } from "lucide-react"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"

interface MessageInputProps {
  onSendMessage: (message: string, files?: File[]) => void
  disabled?: boolean
}

export function MessageInput({ onSendMessage, disabled }: MessageInputProps) {
  const [message, setMessage] = useState("")
  const [attachedFiles, setAttachedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if ((message.trim() || attachedFiles.length > 0) && !disabled) {
      onSendMessage(message.trim(), attachedFiles)
      setMessage("")
      setAttachedFiles([])
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleFileUpload = (files: FileList | null, type: string) => {
    if (!files) return
    
    const newFiles = Array.from(files).filter(file => {
      if (type === 'image' && !file.type.startsWith('image/')) return false
      if (type === 'video' && !file.type.startsWith('video/')) return false
      return file.size <= 10 * 1024 * 1024 // 10MB limit
    })
    
    setAttachedFiles(prev => [...prev, ...newFiles])
  }

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleVoiceInput = () => {
    // Placeholder for voice input functionality
    console.log("Voice input clicked - to be implemented")
  }

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
    }
  }

  return (
    <div className="border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky bottom-0">
      <div className="max-w-4xl mx-auto p-4">
        {/* File attachments preview */}
        {attachedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 bg-muted px-3 py-2 rounded-lg text-sm">
                <span className="truncate max-w-[200px]">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-4 w-4 p-0"
                  onClick={() => removeFile(index)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                placeholder="Describe your insurance claim or ask a question..."
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value)
                  adjustTextareaHeight()
                }}
                onKeyDown={handleKeyDown}
                disabled={disabled}
                className="min-h-[60px] max-h-[200px] resize-none pr-32 bg-input-background border-border focus:ring-2 focus:ring-blue-500"
                rows={1}
                autoFocus
              />
              
              {/* Upload buttons */}
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-muted"
                  disabled={disabled}
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach file"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-muted"
                  disabled={disabled}
                  onClick={() => imageInputRef.current?.click()}
                  title="Upload image"
                >
                  <Image className="w-4 h-4" />
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-muted"
                  disabled={disabled}
                  onClick={() => videoInputRef.current?.click()}
                  title="Upload video"
                >
                  <Video className="w-4 h-4" />
                </Button>
                
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 hover:bg-muted"
                  disabled={disabled}
                  onClick={handleVoiceInput}
                  title="Voice input"
                >
                  <Mic className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <Button
              type="submit"
              disabled={(!message.trim() && attachedFiles.length === 0) || disabled}
              className="h-[60px] px-4 bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
        
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <p>Press Enter to send, Shift + Enter for new line</p>
          <p>SageInsure AI • Secure & Confidential</p>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files, 'file')}
        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
      />
      
      <input
        ref={imageInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files, 'image')}
        accept="image/*"
      />
      
      <input
        ref={videoInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFileUpload(e.target.files, 'video')}
        accept="video/*"
      />
    </div>
  )
}