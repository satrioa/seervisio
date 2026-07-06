export type TourPosition = 'top' | 'bottom' | 'left' | 'right' | 'center'

export interface TourStep {
  id: string
  title: string
  description: string
  route?: string
  selector?: string
  position: TourPosition
  waitForVisible?: number
  autoNavigate?: boolean
  autoOpen?: boolean
  autoClick?: boolean
  validation?: string
  estimatedTime?: string
  missionId: string
  spotlightPadding?: number
}

export interface Mission {
  id: string
  title: string
  description: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedTime: string
  reward: string
  steps: TourStep[]
  aiPrompt?: string
  featureFlag?: string
}

export interface TourState {
  tour_version: number
  completed_at: string | null
  skipped_at: string | null
  last_step: number
  last_mission: string | null
  completed_missions: string[]
  dismissed_missions: string[]
}

export interface TourConfig {
  missions: Mission[]
  role: string
  version: number
  brandOverrides?: Partial<TourConfig>
}

export type TourStatus = 'idle' | 'welcome' | 'touring' | 'paused' | 'completed' | 'skipped'
