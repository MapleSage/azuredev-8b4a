import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  
  const { agent } = req.query;
  
  try {
    const response = await fetch('http://localhost:8000/invoke/SL48UD1CAD', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: req.body.conversationId || 'local-session',
        text: req.body.text
      })
    });
    
    const data = await response.json();
    res.status(200).json(data);
    
  } catch (e: any) {
    res.status(502).json({ 
      error: "FastAPI unreachable", 
      detail: e?.message,
      note: "Make sure FastAPI is running on localhost:8000"
    });
  }
}