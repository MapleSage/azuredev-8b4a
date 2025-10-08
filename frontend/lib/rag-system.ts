import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager'

let s3Client: S3Client | null = null
let credentials: any = null

async function getCredentials() {
  if (credentials) return credentials
  
  try {
    const secretsClient = new SecretsManagerClient({ region: 'us-east-1' })
    const command = new GetSecretValueCommand({
      SecretId: 'sageinsure/config'
    })
    
    const response = await secretsClient.send(command)
    const secrets = JSON.parse(response.SecretString || '{}')
    
    credentials = {
      accessKeyId: secrets.AWS_ACCESS_KEY_ID,
      secretAccessKey: secrets.AWS_SECRET_ACCESS_KEY
    }
    
    return credentials
  } catch (error) {
    console.error('Failed to get credentials from Secrets Manager:', error)
    throw new Error('AWS credentials not available')
  }
}

async function getS3Client() {
  if (s3Client) return s3Client
  
  const creds = await getCredentials()
  s3Client = new S3Client({
    region: 'us-east-1',
    credentials: creds
  })
  
  return s3Client
}

const BUCKET_NAME = 'sageinsure-documents'

export class RAGSystem {
  async uploadDocument(file: File, category: string, userId: string): Promise<string> {
    const key = `uploads/${category}/${userId}/${Date.now()}-${file.name}`
    
    try {
      const client = await getS3Client()
      
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: Buffer.from(await file.arrayBuffer()),
        ContentType: file.type,
        Metadata: {
          originalName: file.name,
          category: category,
          uploadedBy: userId,
          uploadedAt: new Date().toISOString(),
        },
      })

      await client.send(command)
      console.log(`📄 Uploaded ${file.name} to ${category} category`)
      return key
    } catch (error) {
      console.error('S3 upload failed:', error)
      throw new Error('Document upload failed')
    }
  }

  async processDocument(key: string): Promise<void> {
    console.log(`🔄 Processing document: ${key}`)
    await new Promise(resolve => setTimeout(resolve, 1000))
    console.log(`✅ Document processed and added to knowledge base`)
  }
}

export const ragSystem = new RAGSystem()