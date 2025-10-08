// Shared in-memory job storage (use database in production)
export interface Job {
  jobId: string
  filename: string
  status: 'processing' | 'completed' | 'failed'
  createdAt: string
  insuranceType: string
  fileContent?: string
  analysis?: any
}

const jobs = new Map<string, Job>()

export const jobStorage = {
  create: (job: Job) => {
    jobs.set(job.jobId, job)
    return job
  },
  
  get: (jobId: string) => {
    return jobs.get(jobId)
  },
  
  update: (jobId: string, updates: Partial<Job>) => {
    const job = jobs.get(jobId)
    if (job) {
      const updatedJob = { ...job, ...updates }
      jobs.set(jobId, updatedJob)
      return updatedJob
    }
    return null
  },
  
  getAll: () => {
    return Array.from(jobs.values())
  }
}