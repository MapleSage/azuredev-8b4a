import { useState, useCallback } from "react"
import { ChatSidebar } from "../components/ChatSidebar"
import { ChatArea } from "../components/ChatArea"
import { MessageInput } from "../components/MessageInput"
interface Message {
  id: number
  type: 'user' | 'assistant'
  content: string
  timestamp: string
}

interface Conversation {
  id: number
  title: string
  messages: Message[]
  lastActivity: string
}

interface AppProps {
  user?: any;
}

export default function App({ user }: AppProps) {
  const [conversations, setConversations] = useState<Conversation[]>([
    {
      id: 1,
      title: "Auto Insurance Claim",
      messages: [
        {
          id: 1,
          type: 'user',
          content: 'I was in a car accident and need to file a claim',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        {
          id: 2,
          type: 'assistant',
          content: "I'm sorry to hear about your accident. I'll help you file your auto insurance claim. To get started, I need some information:\n\n• Date and time of the accident\n• Location where it occurred\n• Description of what happened\n• Other vehicles involved\n• Any injuries sustained\n• Police report number (if available)\n\nPlease provide these details so I can process your claim efficiently.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ],
      lastActivity: "2 minutes ago"
    }
  ])
  const [selectedConversation, setSelectedConversation] = useState<number | null>(1)
  const [selectedBusinessLine, setSelectedBusinessLine] = useState('auto')
  const [isLoading, setIsLoading] = useState(false)

  const handleSelectConversation = useCallback((id: number) => {
    setSelectedConversation(id)
  }, [])

  const handleNewChat = useCallback(() => {
    const newId = Math.max(...conversations.map(c => c.id), 0) + 1
    const newConversation: Conversation = {
      id: newId,
      title: "New Conversation",
      messages: [],
      lastActivity: "Just now"
    }
    setConversations(prev => [newConversation, ...prev])
    setSelectedConversation(newId)
  }, [conversations])

  const handleSendMessage = useCallback(async (message: string, files?: File[]) => {
    if (!selectedConversation) return

    const userMessage: Message = {
      id: Date.now(),
      type: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    // Add user message
    setConversations(prev => prev.map(conv => 
      conv.id === selectedConversation 
        ? { ...conv, messages: [...conv.messages, userMessage], lastActivity: "Just now" }
        : conv
    ))

    setIsLoading(true)

    try {
      // Simulate API call to SageInsure backend
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const assistantMessage: Message = {
        id: Date.now() + 1,
        type: 'assistant',
        content: getAssistantResponse(message),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }

      setConversations(prev => prev.map(conv => 
        conv.id === selectedConversation 
          ? { ...conv, messages: [...conv.messages, assistantMessage] }
          : conv
      ))
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedConversation])

  const getAssistantResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase()
    
    if (message.includes('auto') || message.includes('car') || message.includes('accident')) {
      return "I'll help you with your auto insurance claim. Our Auto Claims Specialist will guide you through the process. Please provide details about the incident, damage, and any injuries."
    }
    if (message.includes('marine') || message.includes('cargo') || message.includes('ship')) {
      return "I'll help you file your marine insurance claim. Our Marine Claims Specialist with Azure integration will handle your marine coverage needs. Please provide details about the cargo, vessel, or marine incident."
    }
    if (message.includes('cyber') || message.includes('data breach') || message.includes('hack')) {
      return "I'll help you file your cyber insurance claim. Our Cyber Claims Specialist will handle data breaches, malware, and cyber security incidents. Please describe the cyber incident and what systems were affected."
    }
    
    return "Thank you for contacting SageInsure. I'm here to help you with your insurance claims. Please let me know what type of claim you need to file (auto, marine, cyber, commercial, etc.) and I'll connect you with the right specialist."
  }

  return (
    <div className="h-screen flex bg-gray-50">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0">
          <ChatSidebar
            conversations={conversations}
            selectedConversation={selectedConversation}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}

          />
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <ChatArea 
            conversation={conversations.find(c => c.id === selectedConversation) || null}
            isLoading={isLoading}
          />
          <MessageInput 
            onSendMessage={handleSendMessage} 
            disabled={isLoading}
          />
        </div>
    </div>
  )
}