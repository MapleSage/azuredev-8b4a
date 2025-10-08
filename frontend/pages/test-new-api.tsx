import { useState } from "react";

export default function TestNewAPI() {
  const [message, setMessage] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [specialist, setSpecialist] = useState("marine");

  const testAPI = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: message,
          specialist: specialist,
        }),
      });

      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setResponse(`Error: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Test New FastAPI Architecture</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Specialist:</label>
          <select
            value={specialist}
            onChange={(e) => setSpecialist(e.target.value)}
            className="border rounded px-3 py-2 w-full">
            <option value="marine">Marine Insurance</option>
            <option value="auto">Auto Insurance</option>
            <option value="cyber">Cyber Insurance</option>
            <option value="health">Health Insurance</option>
            <option value="claims">General Claims</option>
            <option value="policy">Policy Assistant</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Message:</label>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your message..."
            className="border rounded px-3 py-2 w-full"
          />
        </div>

        <button
          onClick={testAPI}
          disabled={loading || !message}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50">
          {loading ? "Testing..." : "Test API"}
        </button>

        {response && (
          <div>
            <h3 className="text-lg font-medium mb-2">Response:</h3>
            <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm">
              {response}
            </pre>
          </div>
        )}
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded">
        <h3 className="font-medium mb-2">Test Cases:</h3>
        <div className="space-y-2 text-sm">
          <button
            onClick={() => {
              setMessage("What is my marine cargo coverage?");
              setSpecialist("marine");
            }}
            className="block text-left text-blue-600 hover:underline">
            • Marine Coverage Inquiry
          </button>
          <button
            onClick={() => {
              setMessage("I need to file a claim for my car accident");
              setSpecialist("auto");
            }}
            className="block text-left text-blue-600 hover:underline">
            • Auto Claim Creation
          </button>
          <button
            onClick={() => {
              setMessage("What are my pending claims?");
              setSpecialist("claims");
            }}
            className="block text-left text-blue-600 hover:underline">
            • Claims Status Check
          </button>
          <button
            onClick={() => {
              setMessage("Do I have cyber security coverage?");
              setSpecialist("cyber");
            }}
            className="block text-left text-blue-600 hover:underline">
            • Cyber Security Inquiry
          </button>
        </div>
      </div>
    </div>
  );
}
