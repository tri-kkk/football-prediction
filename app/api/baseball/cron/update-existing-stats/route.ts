// app/api/baseball/cron/update-existing-stats/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const API_KEY = process.env.API_FOOTBALL_KEY!
const API_HOST = 'v1.baseball.api-sports.io'

export async function GET(request: NextRequest) {
  console.log('⚾ 기존 경기 데이터 업데이트 시작...')
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    
    // 1. hits 데이터가 없는 경기 조회
    const { data: matches, error: fetchError } = await supabase
      .from('baseball_matches')
      .select('id, api_match_id, home_team, away_team, status')
      .is('home_hits', null)
      .eq('status', 'FT')
      .limit(50)
    
    if (fetchError) {
      throw new Error(`DB 조회 오류: ${fetchError.message}`)
    }
    
    if (!matches || matches.length === 0) {
      console.log('✅ 업데이트할 경기 없음')
      return NextResponse.json({
        success: true,
        message: '모든 경기가 이미 최신 상태입니다',
        updated: 0
      })
    }
    
    console.log(`📊 업데이트 대상: ${matches.length}개 경기`)
    
    let updated = 0
    let errors = 0
    
    // 2. 각 경기의 상세 정보 가져오기
    for (const match of matches) {
      try {
        console.log(`  🔍 처리 중: ${match.home_team} vs ${match.away_team} (${match.api_match_id})`)
        
        const url = `https://${API_HOST}/games?id=${match.api_match_id}`
        
        const response = await fetch(url, {
          headers: {
            'x-apisports-key': API_KEY
          }
        })
        
        if (!response.ok) {
          console.error(`  ❌ API 오류: ${response.status}`)
          errors++
          await new Promise(resolve => setTimeout(resolve, 500))
          continue
        }
        
        const data = await response.json()
        
        if (!data.response || data.response.length === 0) {
          console.log(`  ⚠️ 경기 정보 없음`)
          await new Promise(resolve => setTimeout(resolve, 500))
          continue
        }
        
        const game = data.response[0]
        
        // 3. hits, errors 데이터 추출
        const homeHits = game.scores.home.hits || null
        const awayHits = game.scores.away.hits || null
        const homeErrors = game.scores.home.errors || null
        const awayErrors = game.scores.away.errors || null
        
        console.log(`  📊 데이터: H:${homeHits} E:${homeErrors} / A:${awayHits} E:${awayErrors}`)
        
        // 4. 이닝 데이터도 함께 업데이트 (없는 경우)
        let inningData = null
        if (game.scores.home.innings && game.scores.away.innings) {
          inningData = {
            home: {},
            away: {}
          }
          
          for (const [inning, score] of Object.entries(game.scores.home.innings)) {
            if (inning !== 'extra') {
              inningData.home[inning] = score
            }
          }
          
          for (const [inning, score] of Object.entries(game.scores.away.innings)) {
            if (inning !== 'extra') {
              inningData.away[inning] = score
            }
          }
        }
        
        // 5. DB 업데이트
        const updateData: any = {
          home_hits: homeHits,
          away_hits: awayHits,
          home_errors: homeErrors,
          away_errors: awayErrors
        }
        
        // inning 데이터가 없으면 추가
        if (inningData) {
          const { data: existingMatch } = await supabase
            .from('baseball_matches')
            .select('inning')
            .eq('id', match.id)
            .single()
          
          if (!existingMatch?.inning) {
            updateData.inning = inningData
          }
        }
        
        const { error: updateError } = await supabase
          .from('baseball_matches')
          .update(updateData)
          .eq('id', match.id)
        
        if (updateError) {
          console.error(`  ❌ 업데이트 실패:`, updateError.message)
          errors++
        } else {
          console.log(`  ✅ 업데이트 성공`)
          updated++
        }
        
        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
        
      } catch (matchError: any) {
        console.error(`  ❌ 경기 처리 오류:`, matchError.message)
        errors++
      }
    }
    
    console.log(`\n✅ 완료!`)
    console.log(`  업데이트: ${updated}개`)
    console.log(`  오류: ${errors}개`)
    
    return NextResponse.json({
      success: true,
      total: matches.length,
      updated,
      errors,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('❌ 오류:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
