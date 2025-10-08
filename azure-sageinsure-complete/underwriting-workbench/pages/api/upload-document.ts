import { NextApiRequest, NextApiResponse } from 'next'
import formidable from 'formidable'
import { promises as fs } from 'fs'
import path from 'path'
import { jobStorage, Job } from './shared/jobStorage'

export const config = {
  api: {
    bodyParser: false,
  },
}

interface UploadResponse {
  jobId: string
  message: string
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UploadResponse | { error: string }>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const form = formidable({
      uploadDir: '/tmp',
      keepExtensions: true,
    })

    const [fields, files] = await form.parse(req)
    const file = Array.isArray(files.file) ? files.file[0] : files.file
    const insuranceType = Array.isArray(fields.insuranceType) 
      ? fields.insuranceType[0] 
      : fields.insuranceType

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    // Generate job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Read file content
    const fileContent = await fs.readFile(file.filepath)
    
    // Store job in shared storage
    const job: Job = {
      jobId,
      filename: file.originalFilename || 'unknown.pdf',
      status: 'processing',
      createdAt: new Date().toISOString(),
      insuranceType: insuranceType || 'property_casualty',
      fileContent: fileContent.toString('base64')
    }

    jobStorage.create(job)

    // Process immediately for demo
    try {
      console.log(`Processing job ${jobId}...`)
      const analysisResult = await simulateAzureOpenAIAnalysis(job)
      
      jobStorage.update(jobId, {
        status: 'completed',
        analysis: analysisResult
      })
      
      console.log(`Job ${jobId} completed successfully`)
    } catch (error) {
      console.error(`Job ${jobId} failed:`, error)
      jobStorage.update(jobId, { status: 'failed' })
    }

    // Clean up temp file
    await fs.unlink(file.filepath)

    res.status(200).json({
      jobId,
      message: 'File uploaded successfully and processing started'
    })

  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'Upload failed' })
  }
}

async function simulateAzureOpenAIAnalysis(job: any) {
  // Simulate Azure OpenAI GPT-4o analysis
  const isLife = job.insuranceType === 'life'
  
  return {
    summary: isLife 
      ? `Life insurance application analysis completed. The applicant appears to be a ${Math.floor(Math.random() * 30) + 25}-year-old individual with standard health profile. Medical history review shows no significant red flags. Recommended for standard rate approval with ${Math.floor(Math.random() * 500000) + 100000} coverage amount.`
      : `Property & casualty insurance application analysis completed. Property located in ${['California', 'Texas', 'Florida', 'New York'][Math.floor(Math.random() * 4)]} with ${['low', 'moderate', 'standard'][Math.floor(Math.random() * 3)]} risk profile. Construction type and location factors analyzed. Recommended for standard coverage approval.`,
    
    riskFactors: isLife 
      ? [
          'Age factor within acceptable range',
          'No significant medical history flags',
          'Standard lifestyle risk assessment',
          'Financial capacity verified'
        ]
      : [
          'Property age and construction type assessed',
          'Geographic risk factors evaluated',
          'Previous claims history reviewed',
          'Security features documented'
        ],
    
    recommendations: isLife
      ? [
          'Approve for standard life insurance rates',
          'Consider wellness program enrollment',
          'Schedule routine medical follow-ups',
          'Review coverage amount annually'
        ]
      : [
          'Approve for standard P&C coverage',
          'Recommend security system installation',
          'Consider bundling discounts',
          'Annual property value reassessment'
        ],
    
    extractedData: {
      applicantName: 'John Doe',
      dateOfBirth: '1985-06-15',
      coverageAmount: isLife ? '$250,000' : '$350,000',
      riskScore: Math.floor(Math.random() * 40) + 60, // 60-100
      documentType: isLife ? 'Life Insurance Application' : 'Property Insurance Application',
      processingTime: '4.2 seconds'
    }
  }
}
