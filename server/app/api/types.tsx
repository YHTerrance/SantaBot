export type Draw = {
  id: string
  created_at: string
  deadline: string
  criteria: string
  total_awardees: number
  token: string
  total_award: number
  awardees: number[]
  author: string
  status: number
}

export const DRAW_EXPIRY = 60 * 60 * 24 * 180 // Expire draw after 3 months
