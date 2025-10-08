import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('API callback received:', req.query);
  
  // Check for error parameters
  if (req.query.error) {
    console.error('OAuth error:', req.query.error, req.query.error_description);
    return res.redirect(302, `/?error=${req.query.error}`);
  }
  
  // Redirect to the frontend auth callback page with query params
  const queryString = new URLSearchParams(req.query as Record<string, string>).toString();
  console.log('Redirecting to frontend callback with:', queryString);
  res.redirect(302, `/auth/callback?${queryString}`);
}