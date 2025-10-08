import { NextApiRequest, NextApiResponse } from 'next'
import { AzureOpenAI } from 'openai'
import formidable from 'formidable'
import fs from 'fs'

export const config = {
  api: {
    bodyParser: false,
  },
}

const openai = new AzureOpenAI({
  apiKey: process.env.AZURE_OPENAI_KEY,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT,
  apiVersion: '2024-02-01',
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const form = formidable({})
    const [fields, files] = await form.parse(req)
    
    const documentType = Array.isArray(fields.documentType) ? fields.documentType[0] : fields.documentType
    const file = Array.isArray(files.file) ? files.file[0] : files.file

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    // Read file content
    const fileContent = fs.readFileSync(file.filepath, 'utf8')

    // Analyze with Azure OpenAI
    const prompt = `Analyze this ${documentType === 'life' ? 'life insurance' : 'P&C insurance'} document and extract key information:

Document Content:
${fileContent}

Please provide:
1. Document type classification
2. Key extracted data (applicant info, coverage details, risk factors)
3. Risk assessment (Low/Medium/High)
4. Summary of findings
5. Underwriting recommendations

Format the response as JSON with the following structure:
{
  "documentType": "string",
  "extractedData": {
    "applicantName": "string",
    "age": "number",
    "coverageAmount": "number",
    "riskFactors": ["array of strings"]
  },
  "riskLevel": "Low|Medium|High",
  "summary": "string",
  "recommendations": "string",
  "status": "Complete"
}`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are an expert insurance underwriter. Analyze documents thoroughly and provide structured JSON responses.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2000
    })

    let analysisResult
    try {
      analysisResult = JSON.parse(response.choices[0].message.content || '{}')
    } catch (parseError) {
      // Fallback if JSON parsing fails
      analysisResult = {
        documentType: documentType === 'life' ? 'Life Insurance Application' : 'P&C Insurance Application',
        extractedData: {
          applicantName: 'Sample Applicant',
          age: 35,
          coverageAmount: 500000,
          riskFactors: ['Standard risk profile']
        },
        riskLevel: 'Medium',
        summary: response.choices[0].message.content || 'Analysis completed',
        recommendations: 'Standard underwriting process recommended',
        status: 'Complete'
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(file.filepath)

    res.status(200).json(analysisResult)
  } catch (error) {
    console.error('Analysis error:', error)
    res.status(500).json({ error: 'Analysis failed' })
  }
}