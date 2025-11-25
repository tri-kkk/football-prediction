// 하이라이트 인터페이스
export interface Highlight {
  id: number
  matchId: number
  eventId: string
  homeTeam: string
  awayTeam: string
  league: string
  matchDate: string
  youtubeUrl: string
  youtubeId: string
  thumbnailUrl: string
  videoTitle: string
  duration: number
  views: number
}

// 하이라이트 API 응답
export interface HighlightsResponse {
  highlights: Highlight[]
  total: number
  page: number
  limit: number
}

// YouTube 모달 Props
export interface YouTubeModalProps {
  isOpen: boolean
  videoId: string | null
  onClose: () => void
}
