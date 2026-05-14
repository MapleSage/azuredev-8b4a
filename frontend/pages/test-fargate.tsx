import { useState } from "react";

export default function TestPrivateWorkflow() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!message.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/fargate-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: message }),
      });

      const data = await res.json();
      setResponse(
        data.response || data.answer || JSON.stringify(data, null, 2),
      );
    } catch (error: any) {
      setResponse(`Error: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">
          🚀 SageInsure Private Workflow Test
        </h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Test Message:
            </label>
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Create an auto insurance claim for a car accident"
              className="w-full p-3 border rounded-lg"
              onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            />
          </div>

          <button
            onClick={sendMessage}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send to private workflow"}
          </button>
        </div>

        {response && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Workflow Response:</h2>
            <div className="bg-gray-100 p-4 rounded-lg whitespace-pre-wrap">
              {response}
            </div>
          </div>
        )}

        <div className="mt-8 text-sm text-gray-600">
          <p>
            <strong>Endpoint:</strong> private dev01 AgentCore bridge
          </p>
          <p>
            <strong>Status:</strong> local proxy to private backend
          </p>
          <p>
            <strong>Features:</strong> claim IDs, policy coverage, specialist
            workflow routing
          </p>
        </div>
      </div>
    </div>
  );
}
