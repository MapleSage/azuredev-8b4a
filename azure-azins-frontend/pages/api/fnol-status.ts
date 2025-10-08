import type { NextApiRequest, NextApiResponse } from 'next'
import { SFNClient, DescribeExecutionCommand } from '@aws-sdk/client-sfn'

const sfnClient = new SFNClient({ region: 'us-east-1' })

interface StatusResponse {
  status: string
  currentState?: string
  output?: any
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<StatusResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      status: 'error',
      error: 'Method not allowed' 
    })
  }

  try {
    const { executionArn } = req.body

    if (!executionArn) {
      return res.status(400).json({
        status: 'error',
        error: 'Execution ARN is required'
      })
    }

    const command = new DescribeExecutionCommand({
      executionArn
    })

    const result = await sfnClient.send(command)

    let output = null
    if (result.output) {
      try {
        output = JSON.parse(result.output)
      } catch (e) {
        output = result.output
      }
    }

    res.status(200).json({
      status: result.status || 'UNKNOWN',
      currentState: extractCurrentState(result.status, output),
      output
    })

  } catch (error) {
    console.error('Status check error:', error)
    res.status(500).json({
      status: 'error',
      error: `Failed to check status: ${error}`
    })
  }
}

function extractCurrentState(status: string | undefined, output: any): string | undefined {
  if (status === 'RUNNING') {
    // In a real implementation, you'd get this from CloudWatch or Step Function history
    // For now, return a generic running state
    return 'Processing'
  }
  return undefined
}