import { useState } from "react";

// Direct chat test without authentication
export default function TestChatDirect() {
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string; timestamp: string }>
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [specialist, setSpecialist] = useState("marine");

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = {
      role: "user" as const,
      content: input,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);
    setInput("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: input,
          specialist: specialist,
          conversationId: `test-${Date.now()}`,
        }),
      });

      const data = await response.json();

      const assistantMessage = {
        role: "assistant" as const,
        content: data.response || data.text || "No response received",
        timestamp: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Log the full response for debugging
      console.log("Full API Response:", data);
    } catch (error) {
      const errorMessage = {
        role: "assistant" as const,
        content: `Error: ${error}`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const testCases = [
    { text: "What is my marine cargo coverage?", specialist: "marine" },
    { text: "I need to file a claim for my car accident", specialist: "auto" },
    { text: "What are my pending claims?", specialist: "claims" },
    { text: "Do I have cyber security coverage?", specialist: "cyber" },
    { text: "Hello, how are you?", specialist: "policy" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">
          Direct Chat Test - New FastAPI Architecture
        </h1>

        {/* Controls */}
        <div className="bg-white p-4 rounded-lg shadow mb-4">
          <div className="flex gap-4 mb-4">
            <select
              value={specialist}
              onChange={(e) => setSpecialist(e.target.value)}
              className="border rounded px-3 py-2">
              <option value="marine">Marine Insurance</option>
              <option value="auto">Auto Insurance</option>
              <option value="cyber">Cyber Insurance</option>
              <option value="health">Health Insurance</option>
              <option value="claims">General Claims</option>
              <option value="policy">Policy Assistant</option>
            </select>

            <button
              onClick={() => setMessages([])}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600">
              Clear Chat
            </button>
          </div>

          {/* Test Cases */}
          <div className="mb-4">
            <h3 className="font-medium mb-2">Quick Test Cases:</h3>
            <div className="flex flex-wrap gap-2">
              {testCases.map((testCase, index) => (
                <button
                  key={index}
                  onClick={() => {
                    setInput(testCase.text);
                    setSpecialist(testCase.specialist);
                  }}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200">
                  {testCase.text.substring(0, 30)}...
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="bg-white rounded-lg shadow">
          <div className="h-96 overflow-y-auto p-4 border-b">
            {messages.length === 0 ? (
              <div className="text-gray-500 text-center py-8">
                No messages yet. Try sending a message or use a test case above.
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`mb-4 ${message.role === "user" ? "text-right" : "text-left"}`}>
                  <div
                    className={`inline-block max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.role === "user"
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-800"
                    }`}>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    <div className="text-xs opacity-75 mt-1">
                      {message.timestamp}
                    </div>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div className="text-left mb-4">
                <div className="inline-block bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                    Thinking...
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) =>
                  e.key === "Enter" && !loading && sendMessage()
                }
                placeholder="Type your message..."
                className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Architecture Info */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium mb-2">Architecture Flow:</h3>
          <p className="text-sm text-gray-700">
            Frontend → Next.js API Route → FastAPI (Port 8002) → Lambda Data
            Provider → Knowledge Bases
          </p>
        </div>
      </div>
    </div>
  );
}
