import React, { useState } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function SageInsureChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const sendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setLoading(true)

    try {
      const res = await fetch('/api/azure-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input })
      })

      const data = await res.json()
      
      if (!res.ok) {
        const errorMsg = `❌ Error: ${data.error || 'Unknown error'}${data.details ? ': ' + data.details : ''}`
        setMessages(prev => [...prev, { role: 'assistant', content: errorMsg }])
        return
      }
      
      const botMessage: Message = {
        role: 'assistant',
        content: `${data.response || 'No response'}\n\n_Source: ${data.source} (${data.route})_`
      }
      setMessages(prev => [...prev, botMessage])
    } catch (err) {
      console.error('Error sending message:', err)
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Network error connecting to SageInsure' }])
    } finally {
      setLoading(false)
      setInput('')
    }
  }

  return (
    <div className="max-w-lg mx-auto p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">💬 SageInsure Chat</h2>
      <div className="border p-3 h-80 overflow-y-auto mb-3 bg-gray-50 rounded">
        {messages.map((msg, idx) => (
          <div key={idx} className={`mb-2 ${msg.role === 'user' ? 'text-blue-700' : 'text-gray-800'}`}>
            <strong>{msg.role === 'user' ? 'You' : 'SageInsure'}:</strong> {msg.content}
          </div>
        ))}
        {loading && <div className="text-gray-500">⏳ Thinking...</div>}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 border rounded px-2 py-1"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask SageInsure..."
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="bg-blue-600 text-white px-3 py-1 rounded"
          disabled={loading}
        >
          Send
        </button>
      </div>
    </div>
  )
}