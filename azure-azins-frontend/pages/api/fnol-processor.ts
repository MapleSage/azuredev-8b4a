import type { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'

export const config = {
  api: {
    bodyParser: false,
  },
}

interface FNOLResponse {
  classification: string
  confidence: number
  extractedData: any
  routing: string
  executionArn?: string
  error?: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<FNOLResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      classification: '', 
      confidence: 0, 
      extractedData: {}, 
      routing: '',
      error: 'Method not allowed' 
    })
  }

  try {
    const form = formidable()
    const [fields, files] = await form.parse(req)
    
    const uploadedFile = Array.isArray(files.document) ? files.document[0] : files.document
    
    if (!uploadedFile) {
      return res.status(400).json({
        classification: '',
        confidence: 0,
        extractedData: {},
        routing: '',
        error: 'No document uploaded'
      })
    }

    // Simulate processing with existing FNOL Lambda
    const filename = uploadedFile.originalFilename?.toLowerCase() || ''
    const mockResult = generateMockFNOLResult(filename)

    // Simulate Step Function execution
    const mockExecutionArn = `arn:aws:states:us-east-1:767398007438:execution:SageInsure-FNOL-dev:${Date.now()}`

    res.status(200).json({
      classification: mockResult.type,
      confidence: mockResult.confidence,
      extractedData: mockResult.extractedData,
      routing: mockResult.routing,
      executionArn: mockExecutionArn
    })

  } catch (error) {
    console.error('FNOL processing error:', error)
    res.status(500).json({
      classification: '',
      confidence: 0,
      extractedData: {},
      routing: '',
      error: `Processing failed: ${error}`
    })
  }
}



function generateMockFNOLResult(filename: string) {
  // Fallback mock classification based on filename patterns
  if (filename.includes('accident') || filename.includes('collision')) {
    return {
      type: 'Auto Insurance Claim - Collision',
      confidence: 94.5,
      extractedData: {
        claimType: 'Auto Collision',
        incidentDate: '2024-01-15',
        policyNumber: 'POL-2024-001',
        vehicleVIN: '1HGCF86461A130849',
        estimatedDamage: '$15,000',
        location: 'Highway 101, San Francisco, CA'
      },
      routing: 'auto-claims-processing'
    }
  }
  
  if (filename.includes('medical') || filename.includes('health')) {
    return {
      type: 'Health Insurance Claim',
      confidence: 91.2,
      extractedData: {
        claimType: 'Medical',
        serviceDate: '2024-01-10',
        policyNumber: 'HLT-2024-002',
        providerName: 'General Hospital',
        diagnosisCode: 'M79.3',
        claimAmount: '$2,500'
      },
      routing: 'health-claims-processing'
    }
  }
  
  if (filename.includes('property') || filename.includes('home')) {
    return {
      type: 'Property Insurance Claim',
      confidence: 88.7,
      extractedData: {
        claimType: 'Property Damage',
        incidentDate: '2024-01-12',
        policyNumber: 'PROP-2024-003',
        propertyAddress: '123 Main St, Phoenix, AZ',
        damageType: 'Water Damage',
        estimatedCost: '$8,500'
      },
      routing: 'property-claims-processing'
    }
  }

  return {
    type: 'Non-Insurance Document',
    confidence: 76.3,
    extractedData: {
      documentType: 'General Document',
      extractedText: 'Document content extracted but not classified as insurance claim',
      requiresReview: true
    },
    routing: 'human-review'
  }
}