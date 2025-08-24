import { Bot, User, Copy, ThumbsUp, ThumbsDown, RotateCcw, Shield, FileText, Clock } from "lucide-react"
import { Button } from "./ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import { ScrollArea } from "./ui/scroll-area"
import { useEffect, useRef } from "react"

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  lastActivity: string
}

interface ChatAreaProps {
  conversation: Conversation | null
  isLoading?: boolean
}

export function ChatArea({ conversation, isLoading }: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [conversation?.messages, isLoading])

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Welcome to SageInsure</h2>
          <p className="text-muted-foreground mb-4">
            Your AI-powered insurance claims assistant. I'm here to help you file claims, check policy details, and answer insurance questions.
          </p>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span>File auto, marine, cyber & commercial claims</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>24/7 claims processing support</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span>Secure & confidential</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Chat Header */}
      <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between p-4">
          <div>
            <h2 className="font-semibold">{conversation.title}</h2>
            <p className="text-sm text-muted-foreground">{conversation.lastActivity}</p>
          </div>
          <Button variant="ghost" size="sm">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          {conversation.messages.map((message) => (
            <div key={message.id} className="flex gap-4">
              <Avatar className="w-8 h-8 flex-shrink-0">
                {message.type === 'user' ? (
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                ) : (
                  <AvatarImage src="/sageinsure_logo.png" alt="SageInsure" />
                )}
                {message.type === 'assistant' && (
                  <AvatarFallback className="bg-blue-500 text-white">
                    <Shield className="w-4 h-4" />
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">
                    {message.type === 'user' ? 'You' : 'SageInsure AI'}
                  </span>
                  <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                </div>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</div>
                </div>
                {message.type === 'assistant' && (
                  <div className="flex items-center gap-2 pt-2">
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2">
                      <ThumbsUp className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2">
                      <ThumbsDown className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-4">
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="bg-blue-500 text-white">
                  <Shield className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">SageInsure AI</span>
                  <span className="text-xs text-muted-foreground">typing...</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
    </div>
  )
}