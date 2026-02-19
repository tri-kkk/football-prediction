// app/api/cron/settle-proto-slips/route.ts
// 프로토 슬립 결과 자동 판정 Cron API
//
// 테이블 구조:
//   proto_slips: 슬립 전체 (status: pending/won/lost)
//   proto_slip_matches: 슬립 내 개별 선택 (actual_result, is_correct)
//   proto_matches: 경기 결과 (status, result_code)
//
// 판정 로직:
//   1. pending 슬립 조회
//   2. 각 슬립의 slip_matches → proto_matches 결과와 비교
//   3. actual_result, is_correct 업데이트
//   4. 모든 경기 종료 시 슬립 status 확정 (won/lost)

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const maxDuration = 30

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    
    const cronSecret = process.env.PROTO_CRON_SECRET || process.env.CRON_SECRET || 'trendsoccer-proto-2026'
    if (secret !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('🎯 프로토 슬립 결과 판정 시작...')

    // 1. pending 상태인 슬립 전부 가져오기
    const { data: pendingSlips, error: slipError } = await supabase
      .from('proto_slips')
      .select('*')
      .eq('status', 'pending')

    if (slipError) {
      throw new Error(`슬립 조회 실패: ${slipError.message}`)
    }

    if (!pendingSlips || pendingSlips.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'pending 슬립 없음',
        settled: 0
      })
    }

    console.log(`📋 판정 대상: ${pendingSlips.length}개 슬립`)

    // 2. 모든 pending 슬립의 slip_matches 가져오기
    const slipIds = pendingSlips.map(s => s.id)
    
    const { data: allSlipMatches, error: smError } = await supabase
      .from('proto_slip_matches')
      .select('*')
      .in('slip_id', slipIds)

    if (smError) {
      throw new Error(`슬립 매치 조회 실패: ${smError.message}`)
    }

    // slip_id별로 그룹화
    const slipMatchesMap = new Map<string, any[]>()
    for (const sm of (allSlipMatches || [])) {
      const existing = slipMatchesMap.get(sm.slip_id) || []
      existing.push(sm)
      slipMatchesMap.set(sm.slip_id, existing)
    }

    // 3. 관련된 모든 회차의 경기 결과 가져오기
    const rounds = [...new Set(pendingSlips.map(s => String(s.round)))]
    
    const { data: matchResults, error: matchError } = await supabase
      .from('proto_matches')
      .select('round, match_seq, status, result_code')
      .in('round', rounds)

    if (matchError) {
      throw new Error(`경기 결과 조회 실패: ${matchError.message}`)
    }

    // 빠른 조회용 Map: "round-match_seq" → { status, resultCode }
    const resultMap = new Map<string, { status: string; resultCode: string | null }>()
    for (const m of (matchResults || [])) {
      resultMap.set(`${m.round}-${m.match_seq}`, {
        status: m.status,
        resultCode: m.result_code
      })
    }

    // 4. 각 슬립 판정
    let wonCount = 0
    let lostCount = 0
    let stillPending = 0
    let errorCount = 0
    let matchesUpdated = 0
    const details: any[] = []

    for (const slip of pendingSlips) {
      try {
        const slipMatches = slipMatchesMap.get(slip.id) || []
        
        if (slipMatches.length === 0) {
          // 선택이 없는 슬립 → lost 처리
          await updateSlipStatus(slip.id, 'lost', 0)
          lostCount++
          continue
        }

        let allFinished = true
        let allCorrect = true
        let hasVoid = false
        let effectiveOdds = 1

        // 먼저 모든 매치의 결과를 업데이트
        for (const sm of slipMatches) {
          const matchKey = `${slip.round}-${sm.match_seq}`
          const result = resultMap.get(matchKey)

          if (!result || result.status !== '종료') {
            allFinished = false
            continue  // 안 끝난 경기는 스킵하고 끝난 것만 업데이트
          }

          // 적특/취소 처리
          if (result.resultCode === 'void' || result.resultCode === 'cancelled') {
            hasVoid = true
            if (sm.actual_result !== result.resultCode) {
              await supabase
                .from('proto_slip_matches')
                .update({ actual_result: result.resultCode, is_correct: null })
                .eq('id', sm.id)
              matchesUpdated++
            }
            continue
          }

          const isCorrect = sm.prediction === result.resultCode

          // actual_result 또는 is_correct가 변경된 경우만 업데이트
          if (sm.actual_result !== result.resultCode || sm.is_correct !== isCorrect) {
            await supabase
              .from('proto_slip_matches')
              .update({ actual_result: result.resultCode, is_correct: isCorrect })
              .eq('id', sm.id)
            matchesUpdated++
          }

          if (!isCorrect) {
            allCorrect = false
          }

          effectiveOdds *= (sm.odds || 1)
        }

        // 아직 안 끝난 경기가 있으면 pending 유지
        if (!allFinished) {
          // 단, 이미 틀린 게 확인되면 early lost 처리 가능
          // (하나라도 틀리면 나머지 결과와 상관없이 미적중)
          if (!allCorrect) {
            await updateSlipStatus(slip.id, 'lost', 0)
            lostCount++
            details.push({ id: slip.id, round: slip.round, result: 'lost', note: 'early_lost' })
          } else {
            stillPending++
          }
          continue
        }

        // 모든 경기 종료 → 최종 판정
        if (allCorrect) {
          const amount = slip.amount || 0
          const actualReturn = Math.floor(amount * effectiveOdds)
          
          await updateSlipStatus(slip.id, 'won', actualReturn)
          wonCount++
          details.push({
            id: slip.id,
            round: slip.round,
            selections: slipMatches.length,
            result: 'won',
            effectiveOdds: effectiveOdds.toFixed(2),
            actualReturn,
            hasVoid
          })
        } else {
          await updateSlipStatus(slip.id, 'lost', 0)
          lostCount++
          details.push({
            id: slip.id,
            round: slip.round,
            selections: slipMatches.length,
            result: 'lost'
          })
        }

      } catch (err: any) {
        console.error(`❌ 슬립 ${slip.id} 판정 실패:`, err.message)
        errorCount++
      }
    }

    const summary = {
      success: true,
      message: `${wonCount + lostCount}건 판정 완료`,
      data: {
        totalPending: pendingSlips.length,
        won: wonCount,
        lost: lostCount,
        stillPending,
        errors: errorCount,
        matchesUpdated,
        rounds,
        details: details.slice(0, 20)
      }
    }

    console.log(`✅ 판정 완료: 적중 ${wonCount}, 미적중 ${lostCount}, 대기 ${stillPending}, 매치 업데이트 ${matchesUpdated}`)
    
    return NextResponse.json(summary)

  } catch (error: any) {
    console.error('❌ 슬립 판정 오류:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

// 슬립 상태 업데이트
async function updateSlipStatus(slipId: string, status: 'won' | 'lost', actualReturn: number) {
  const { error } = await supabase
    .from('proto_slips')
    .update({
      status,
      actual_return: actualReturn,
      settled_at: new Date().toISOString()
    })
    .eq('id', slipId)

  if (error) {
    console.error(`❌ 슬립 ${slipId} 업데이트 실패:`, error.message)
    throw error
  }
  
  console.log(`  ${status === 'won' ? '✅' : '❌'} 슬립 ${slipId}: ${status} (수익: ${actualReturn})`)
}