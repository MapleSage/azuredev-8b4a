import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { message, customer = 'john_doe' } = req.body

  // Policy Agent - specialized for policy queries with customer data
  const policyData = {
    john_doe: {
      policyNumber: 'POL-2024-001',
      renewalDate: '2024-12-15',
      premium: '$1,200/year',
      coverage: {
        liability: '$100,000/$300,000',
        collision: '$500 deductible',
        comprehensive: '$250 deductible'
      }
    }
  }

  const customerData = policyData[customer as keyof typeof policyData]
  
  if (message.toLowerCase().includes('renewal')) {
    return res.json({
      response: `Your policy ${customerData.policyNumber} renewal is due on ${customerData.renewalDate}. Premium: ${customerData.premium}`,
      agent: 'POLICY_AGENT',
      memory: { lastQuery: 'renewal', customer }
    })
  }

  if (message.toLowerCase().includes('coverage')) {
    return res.json({
      response: `Your coverage details:\n• Liability: ${customerData.coverage.liability}\n• Collision: ${customerData.coverage.collision}\n• Comprehensive: ${customerData.coverage.comprehensive}`,
      agent: 'POLICY_AGENT',
      memory: { lastQuery: 'coverage', customer }
    })
  }

  return res.json({
    response: `Policy Agent: I can help with your policy ${customerData.policyNumber}. Ask about coverage, renewal, or claims.`,
    agent: 'POLICY_AGENT',
    memory: { customer }
  })
}