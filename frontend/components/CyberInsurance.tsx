import { useState } from "react";

interface CyberQuote {
  quote: string;
  findings: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    informational: number;
  };
  riskAssessment?: {
    riskLevel: string;
    totalRiskScore: number;
    recommendations: string[];
  };
  coverage?: {
    dataBreachResponse: string;
    businessInterruption: string;
    cyberExtortion: string;
    regulatoryFines: string;
  };
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function CyberInsurance() {
  const [securityProfileId, setSecurityProfileId] = useState("");
  const [region, setRegion] = useState("India");
  const [isLoading, setIsLoading] = useState(false);
  const [quote, setQuote] = useState<CyberQuote | null>(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"quote" | "chat">("quote");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);

  const regions = [
    "India",
    "United States",
    "Europe",
    "United Kingdom",
    "Singapore",
    "Australia",
  ];

  const handleShareFindings = async () => {
    if (!securityProfileId.trim()) {
      alert("Please enter a customer or security profile ID.");
      return;
    }

    setError("");

    await fetch("/api/cyber-insurance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "store_account",
        accountId: securityProfileId,
        region,
      }),
    }).catch(console.error);
  };

  const handleGetQuote = async () => {
    if (!securityProfileId.trim()) {
      alert("Please enter a customer or security profile ID.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/cyber-insurance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "get_quote",
          accountId: securityProfileId,
          region,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setQuote(data);
    } catch (err: any) {
      setError(err.message || "Failed to get quote");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsChatLoading(true);

    try {
      const response = await fetch("/api/cyber-insurance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "chat",
          message: inputMessage,
        }),
      });

      if (!response.ok) {
        throw new Error(`Chat API error: ${response.status}`);
      }

      const data = await response.json();
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content:
          data.response ||
          data.answer ||
          "I can help assess cyber risk, evidence gaps, and coverage readiness.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Unable to reach the cyber workflow right now. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="h-full bg-white flex flex-col">
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-2xl">🛡️</div>
            <div>
              <h2 className="text-lg font-semibold">Cyber Risk & Insurance</h2>
              <p className="text-red-100 text-sm">
                Security posture, fraud signals, and coverage readiness
              </p>
            </div>
          </div>
          <div className="flex bg-red-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("quote")}
              className={`px-4 py-2 rounded-md transition-colors text-sm font-medium ${
                activeTab === "quote"
                  ? "bg-white text-red-600"
                  : "text-red-100 hover:text-white hover:bg-red-700"
              }`}
            >
              Risk Quote
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`px-4 py-2 rounded-md transition-colors text-sm font-medium ${
                activeTab === "chat"
                  ? "bg-white text-red-600"
                  : "text-red-100 hover:text-white hover:bg-red-700"
              }`}
            >
              Specialist Chat
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === "chat" && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-50 rounded-lg p-6 h-96 flex flex-col">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Cyber Insurance Assistant
              </h3>
              <div className="flex-1 overflow-y-auto mb-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-gray-500 text-center py-8">
                    <p>
                      👋 Hi, I can help with cyber coverage, risk posture, and
                      incident readiness.
                    </p>
                    <p>
                      Ask about controls, evidence, breach response, or
                      next-best actions.
                    </p>
                  </div>
                )}

                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.role === "user" ? "bg-red-600 text-white" : "bg-white border border-gray-200"}`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}

                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-lg px-4 py-2">
                      <p className="text-sm text-gray-500">Typing...</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Ask about cyber insurance..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  disabled={isChatLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isChatLoading || !inputMessage.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "quote" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <p className="text-gray-700 mb-4">
                Prepare a cyber insurance quote using a governed customer
                security profile, evidence packet, or questionnaire. The
                workflow keeps pricing signals, recommendations, and approval
                evidence together for underwriter review.
              </p>

              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                <h3 className="font-semibold text-blue-800 mb-2">
                  Intake checklist:
                </h3>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Security questionnaire or posture report attached</li>
                  <li>
                    • Identity, access, backup, and incident-response controls
                    reviewed
                  </li>
                  <li>
                    • Any prior incidents or outstanding remediation items
                    disclosed
                  </li>
                  <li>
                    • Human approval before sending quote terms externally
                  </li>
                </ul>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Request Cyber Insurance Quote
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer / security profile ID
                  </label>
                  <input
                    type="text"
                    value={securityProfileId}
                    onChange={(e) => setSecurityProfileId(e.target.value)}
                    placeholder="CYB-PROFILE-001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Operating region
                  </label>
                  <select
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {regions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleShareFindings}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
                >
                  1. Register security evidence packet
                </button>
                <button
                  onClick={handleGetQuote}
                  disabled={isLoading}
                  className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isLoading ? "Processing..." : "2. Generate guided quote"}
                </button>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3">
                Risk-Based Pricing Signals
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {["Critical", "High", "Medium", "Low", "Informational"].map(
                  (severity) => (
                    <div
                      key={severity}
                      className="rounded-lg border border-gray-200 bg-white p-4 text-center"
                    >
                      <div className="text-sm font-semibold text-gray-700">
                        {severity}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        weighted finding
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-800">Error: {error}</p>
              </div>
            )}

            {quote && (
              <div className="space-y-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-green-800 mb-4">
                    Cyber Insurance Quote
                  </h3>
                  <p className="text-2xl font-bold text-green-700 mb-4">
                    {quote.quote}
                  </p>
                  {quote.riskAssessment && (
                    <div className="mb-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${quote.riskAssessment.riskLevel === "HIGH" ? "bg-red-100 text-red-800" : quote.riskAssessment.riskLevel === "MEDIUM" ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"}`}
                      >
                        Risk Level: {quote.riskAssessment.riskLevel}
                      </span>
                      <span className="ml-3 text-gray-600">
                        Total Risk Score: {quote.riskAssessment.totalRiskScore}
                      </span>
                    </div>
                  )}

                  <h4 className="font-semibold mb-3">Finding Breakdown</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {Object.entries(quote.findings).map(([key, value]) => (
                      <div
                        key={key}
                        className="rounded border border-green-200 bg-white p-3"
                      >
                        <div className="text-xs uppercase text-gray-500">
                          {key}
                        </div>
                        <div className="text-xl font-semibold text-gray-900">
                          {value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {quote.coverage && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h4 className="font-semibold text-blue-800 mb-3">
                      Coverage Limits
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="font-medium">Data Breach Response</p>
                        <p className="text-blue-700">
                          {quote.coverage.dataBreachResponse}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Business Interruption</p>
                        <p className="text-blue-700">
                          {quote.coverage.businessInterruption}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Cyber Extortion</p>
                        <p className="text-blue-700">
                          {quote.coverage.cyberExtortion}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium">Regulatory Fines</p>
                        <p className="text-blue-700">
                          {quote.coverage.regulatoryFines}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {quote.riskAssessment?.recommendations && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <h4 className="font-semibold text-yellow-800 mb-3">
                      Recommendations
                    </h4>
                    <ul className="space-y-2">
                      {quote.riskAssessment.recommendations.map(
                        (rec, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="text-yellow-600 mt-1">•</span>
                            <span className="text-yellow-700">{rec}</span>
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
