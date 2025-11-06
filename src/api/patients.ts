import { api } from './client'

// Server filters based on who is logged in (physician → their patients)
export async function listMyPatients() {
  const { data } = await api.get('/patient-profiles/')
  return (data.results ?? data) as any[]
}
