import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { intent, details, policy } = req.body

    // Get the CDK API Gateway URL from environment
    const CDK_API_URL = process.env.CDK_API_URL || 'https://your-api-gateway-url.amazonaws.com'

    // Call the CDK claims endpoint
    const response = await fetch(`${CDK_API_URL}/claims`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent,
        details,
        policy
      })
    })

    if (!response.ok) {
      throw new Error(`CDK Claims API error: ${response.status}`)
    }

    const data = await response.json()

    return res.status(200).json({
      claimId: data.claimId,
      status: data.status,
      escalated: data.escalated,
      underwriterReview: data.underwriterReview,
      estimatedProcessingTime: data.estimatedProcessingTime,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Claims backend error:', error)
    return res.status(500).json({
      error: 'Failed to process claim',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}