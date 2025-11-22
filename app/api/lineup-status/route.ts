import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const fixtureId = searchParams.get('fixtureId')

    if (!fixtureId) {
      return NextResponse.json(
        { error: 'fixtureId is required' },
        { status: 400 }
      )
    }

    console.log(`🔍 Checking lineup status for fixture ${fixtureId}`)

    // 1️⃣ Supabase DB에서 라인업 상태 조회 (캐시)
    const { data, error } = await supabase
      .from('lineup_status')
      .select('*')
      .eq('fixture_id', fixtureId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('❌ Database error:', error)
      // DB 에러는 무시하고 API로 진행
    }

    // 2️⃣ DB에 데이터 있으면 반환
    if (data && !error) {
      const response = {
        success: true,
        lineupAvailable: data.lineup_available,
        homeTeam: data.home_team,
        awayTeam: data.away_team,
        homeFormation: data.home_formation,
        awayFormation: data.away_formation,
        homeCoach: data.home_coach,
        awayCoach: data.away_coach,
        lastChecked: data.updated_at,
      }

      if (data.lineup_available) {
        console.log(`✅ [DB] Lineup available: ${data.home_formation} vs ${data.away_formation}`)
      }

      return NextResponse.json(response)
    }

    // 3️⃣ DB에 데이터 없으면 API-Football에서 실시간 조회
    console.log(`📡 DB에 없음, API-Football에서 조회...`)
    
    try {
      // 먼저 fixture 정보 가져오기 (league_id, date 필요)
      const fixtureInfoResponse = await fetch(
        `https://v3.football.api-sports.io/fixtures?id=${fixtureId}`,
        {
          headers: {
            'x-rapidapi-key': API_FOOTBALL_KEY,
            'x-rapidapi-host': 'v3.football.api-sports.io',
          },
        }
      )

      if (!fixtureInfoResponse.ok) {
        throw new Error(`Fixture API failed: ${fixtureInfoResponse.status}`)
      }

      const fixtureData = await fixtureInfoResponse.json()
      const fixture = fixtureData.response?.[0]

      if (!fixture) {
        throw new Error('Fixture not found')
      }

      const leagueId = fixture.league.id
      const fixtureDate = fixture.fixture.date.split('T')[0] // YYYY-MM-DD

      // 라인업 조회
      const lineupResponse = await fetch(
        `https://v3.football.api-sports.io/fixtures/lineups?fixture=${fixtureId}`,
        {
          headers: {
            'x-rapidapi-key': API_FOOTBALL_KEY,
            'x-rapidapi-host': 'v3.football.api-sports.io',
          },
        }
      )

      if (!lineupResponse.ok) {
        throw new Error(`Lineup API failed: ${lineupResponse.status}`)
      }

      const lineupData = await lineupResponse.json()
      const lineups = lineupData.response || []

      // 라인업 데이터 없음
      if (lineups.length !== 2) {
        console.log(`⏳ Lineup not available yet for fixture ${fixtureId}`)
        
        // DB에 저장 (NOT NULL 필드 포함)
        await supabase
          .from('lineup_status')
          .upsert({
            fixture_id: parseInt(fixtureId),
            league_id: leagueId,
            fixture_date: fixtureDate,
            lineup_available: false,
            home_team: fixture.teams.home.name,
            away_team: fixture.teams.away.name,
            updated_at: new Date().toISOString(),
          })

        return NextResponse.json({
          success: true,
          lineupAvailable: false,
          message: 'Lineup not available yet',
          lastChecked: new Date().toISOString(),
        })
      }

      // 라인업 데이터 있음
      const [homeLineup, awayLineup] = lineups
      
      console.log(`✅ [API] Lineup available: ${homeLineup.formation} vs ${awayLineup.formation}`)

      // DB에 저장 (NOT NULL 필드 포함)
      await supabase
        .from('lineup_status')
        .upsert({
          fixture_id: parseInt(fixtureId),
          league_id: leagueId,
          fixture_date: fixtureDate,
          lineup_available: true,
          home_team: homeLineup.team.name,
          away_team: awayLineup.team.name,
          home_formation: homeLineup.formation,
          away_formation: awayLineup.formation,
          home_coach: homeLineup.coach?.name,
          away_coach: awayLineup.coach?.name,
          updated_at: new Date().toISOString(),
        })

      return NextResponse.json({
        success: true,
        lineupAvailable: true,
        homeTeam: homeLineup.team.name,
        awayTeam: awayLineup.team.name,
        homeFormation: homeLineup.formation,
        awayFormation: awayLineup.formation,
        homeCoach: homeLineup.coach?.name,
        awayCoach: awayLineup.coach?.name,
        lastChecked: new Date().toISOString(),
      })

    } catch (apiError: any) {
      console.error('❌ API-Football error:', apiError)
      
      // API 에러여도 false 반환 (에러 숨기기)
      return NextResponse.json({
        success: true,
        lineupAvailable: false,
        message: 'Lineup not available yet',
        lastChecked: new Date().toISOString(),
      })
    }

  } catch (error: any) {
    console.error('❌ Error fetching lineup status:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch lineup status',
        details: error.message 
      },
      { status: 500 }
    )
  }
}