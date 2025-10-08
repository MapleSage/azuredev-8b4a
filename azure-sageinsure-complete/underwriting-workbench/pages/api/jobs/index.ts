import { NextApiRequest, NextApiResponse } from 'next'
import { jobStorage } from '../shared/jobStorage'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Return all jobs (in production, filter by user)
    const jobs = jobStorage.getAll()
    res.status(200).json(jobs)
  } else {
    res.status(405).json({ error: 'Method not allowed' })
  }
}
