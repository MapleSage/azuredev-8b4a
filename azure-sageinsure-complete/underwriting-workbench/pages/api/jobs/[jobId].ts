import { NextApiRequest, NextApiResponse } from 'next'
import { jobStorage } from '../shared/jobStorage'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { jobId } = req.query

  if (req.method === 'GET') {
    const job = jobStorage.get(jobId as string)
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' })
    }
    
    res.status(200).json(job)
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
