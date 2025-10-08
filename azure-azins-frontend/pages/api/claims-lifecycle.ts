import type { NextApiRequest, NextApiResponse } from 'next'

interface ClaimsLifecycleResponse {
  response: string
  claimId?: string
  status?: string
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ClaimsLifecycleResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      response: '',
      error: 'Method not allowed' 
    })
  }

  try {
    const { action, claimId, message } = req.body

    if (!action && !message) {
      return res.status(400).json({
        response: '',
        error: 'Action or message is required'
      })
    }

    // Route to main chat API with Claims Lifecycle specialist
    const chatResponse = await fetch(`${req.headers.origin}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message || `${action} ${claimId || ''}`.trim(),
        specialist: 'CLAIMS_LIFECYCLE',
        conversationId: 'claims-lifecycle-session'
      })
    })

    if (!chatResponse.ok) {
      throw new Error(`Chat API error: ${chatResponse.status}`)
    }

    const data = await chatResponse.json()
    
    // Extract claim ID if present in response
    let extractedClaimId = null
    if (data.response) {
      const claimIdMatch = data.response.match(/claim\s+(?:id|ID):\s*([a-z0-9-]+)/i)
      if (claimIdMatch) {
        extractedClaimId = claimIdMatch[1]
      }
    }

    return res.status(200).json({
      response: data.response || data.text || 'Request processed',
      claimId: extractedClaimId,
      status: 'success'
    })

  } catch (error) {
    console.error('Claims Lifecycle API error:', error)
    return res.status(500).json({
      response: '',
      error: `Claims lifecycle processing failed: ${error}`
    })
  }
}