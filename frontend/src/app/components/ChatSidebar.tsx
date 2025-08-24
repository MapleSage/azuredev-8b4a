import { Search, Plus, MessageSquare, Settings, User, MoreHorizontal, Shield, FileText, Clock } from "lucide-react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { ScrollArea } from "./ui/scroll-area"
import { Separator } from "./ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"

interface Conversation {
  id: string
  title: string
  messages: any[]
  lastActivity: string
}

interface ChatSidebarProps {
  conversations: Conversation[]
  selectedConversation: string | null
  onSelectConversation: (id: string) => void
  onNewChat: () => void
}

export function ChatSidebar({ conversations, selectedConversation, onSelectConversation, onNewChat }: ChatSidebarProps) {
  const getConversationPreview = (conversation: Conversation) => {
    const lastMessage = conversation.messages[conversation.messages.length - 1]
    if (!lastMessage) return "New conversation"
    return lastMessage.content.substring(0, 60) + (lastMessage.content.length > 60 ? "..." : "")
  }

  const getClaimTypeIcon = (title: string) => {
    const titleLower = title.toLowerCase()
    if (titleLower.includes('auto') || titleLower.includes('car')) return <FileText className="w-4 h-4 text-blue-500" />
    if (titleLower.includes('marine') || titleLower.includes('cargo')) return <FileText className="w-4 h-4 text-teal-500" />
    if (titleLower.includes('cyber') || titleLower.includes('data')) return <Shield className="w-4 h-4 text-red-500" />
    return <MessageSquare className="w-4 h-4 text-sidebar-foreground/60" />
  }

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      {/* Header with SageInsure Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-sidebar-foreground">SageInsure</h1>
            <p className="text-xs text-sidebar-foreground/60">Claims Assistant</p>
          </div>
        </div>
        
        {/* New Chat Button */}
        <Button 
          onClick={onNewChat}
          className="w-full justify-start gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          variant="default"
        >
          <Plus className="w-4 h-4" />
          New Claim
        </Button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-sidebar-foreground/40" />
          <Input
            placeholder="Search claims..."
            className="pl-10 bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/40"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="text-xs font-medium text-sidebar-foreground/60 mb-2">Quick Actions</div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="ghost" size="sm" className="justify-start gap-2 h-8 text-xs">
            <FileText className="w-3 h-3" />
            Auto Claim
          </Button>
          <Button variant="ghost" size="sm" className="justify-start gap-2 h-8 text-xs">
            <Shield className="w-3 h-3" />
            Cyber Claim
          </Button>
        </div>
      </div>

      {/* Conversations */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-sidebar-foreground/60">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs">Start a new claim to begin</p>
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation.id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors group hover:bg-sidebar-accent ${
                    selectedConversation === conversation.id ? 'bg-sidebar-accent border border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getClaimTypeIcon(conversation.title)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-medium text-sidebar-foreground truncate text-sm">
                          {conversation.title}
                        </h3>
                        <MoreHorizontal className="w-3 h-3 text-sidebar-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                      <p className="text-xs text-sidebar-foreground/60 truncate mt-1">
                        {getConversationPreview(conversation)}
                      </p>
                      <p className="text-xs text-sidebar-foreground/40 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {conversation.lastActivity}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground text-xs">
              <User className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground">Policy Holder</p>
            <p className="text-xs text-sidebar-foreground/60">Secure Session</p>
          </div>
          <Button variant="ghost" size="sm" className="text-sidebar-foreground/60 hover:text-sidebar-foreground">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="mt-3 text-xs text-sidebar-foreground/40 text-center">
          🔒 End-to-end encrypted
        </div>
      </div>
    </div>
  )
}