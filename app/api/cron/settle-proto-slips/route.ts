// app/api/cron/settle-proto-slips/route.ts
// 프로토 슬립 결과 자동 판정 Cron API
//
// 데이터 구조:
//   proto_slips.selections = JSON 배열:
//     [{ matchSeq, prediction, odds, homeTeam, awayTeam, matchType, ... }]
//   proto_matches: 경기 결과 (round, match_seq, status, result_code)
//
// 판정:
//   selections의 각 항목 prediction vs proto_matches의 result_code 비교
//   전부 적중 → won / 하나라도 틀림 → lost / 미종료 경기 있음 → pending

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

    // 1. pending 슬립 가져오기
    const { data: pendingSlips, error: slipError } = await supabase
      .from('proto_slips')
      .select('*')
      .eq('status', 'pending')

    if (slipError) throw new Error(`슬립 조회 실패: ${slipError.message}`)

    if (!pendingSlips || pendingSlips.length === 0) {
      return NextResponse.json({ success: true, message: 'pending 슬립 없음', settled: 0 })
    }

    console.log(`📋 판정 대상: ${pendingSlips.length}개 슬립`)

    // 2. 관련 회차의 경기 결과 가져오기
    const rounds = [...new Set(pendingSlips.map(s => String(s.round)))]
    
    const { data: matchResults, error: matchError } = await supabase
      .from('proto_matches')
      .select('round, match_seq, status, result_code')
      .in('round', rounds)

    if (matchError) throw new Error(`경기 결과 조회 실패: ${matchError.message}`)

    // Map: "round-match_seq" → { status, resultCode }
    const resultMap = new Map<string, { status: string; resultCode: string | null }>()
    for (const m of (matchResults || [])) {
      resultMap.set(`${m.round}-${m.match_seq}`, {
        status: m.status,
        resultCode: m.result_code
      })
    }

    console.log(`📊 경기 결과 ${resultMap.size}건 로드 (회차: ${rounds.join(', ')})`)

    // 3. 각 슬립 판정
    let wonCount = 0
    let lostCount = 0
    let stillPending = 0
    let errorCount = 0
    const details: any[] = []

    for (const slip of pendingSlips) {
      try {
        // selections JSON 파싱
        const selections = Array.isArray(slip.selections) 
          ? slip.selections 
          : JSON.parse(slip.selections || '[]')
        
        if (selections.length === 0) {
          await updateSlipStatus(slip.id, 'lost', 0)
          lostCount++
          continue
        }

        let allFinished = true
        let allCorrect = true
        let hasVoid = false
        let effectiveOdds = 1
        const matchDetails: any[] = []

        for (const sel of selections) {
          const matchKey = `${slip.round}-${sel.matchSeq}`
          const result = resultMap.get(matchKey)

          if (!result || result.status !== '종료') {
            allFinished = false
            matchDetails.push({
              seq: sel.matchSeq,
              prediction: sel.prediction,
              result: result?.resultCode || 'N/A',
              status: result?.status || 'not found',
              correct: null
            })
            continue
          }

          // 적특/취소
          if (result.resultCode === 'void' || result.resultCode === 'cancelled') {
            hasVoid = true
            matchDetails.push({
              seq: sel.matchSeq,
              prediction: sel.prediction,
              result: result.resultCode,
              correct: 'void'
            })
            continue  // 배당 1.0 (곱하기 안 함)
          }

          const isCorrect = sel.prediction === result.resultCode
          matchDetails.push({
            seq: sel.matchSeq,
            prediction: sel.prediction,
            result: result.resultCode,
            correct: isCorrect
          })

          if (!isCorrect) {
            allCorrect = false
          }

          effectiveOdds *= (sel.odds || 1)
        }

        // 아직 안 끝난 경기가 있는 경우
        if (!allFinished) {
          if (!allCorrect) {
            // 이미 틀린 게 있으면 → early lost
            await updateSlipStatus(slip.id, 'lost', 0)
            lostCount++
            details.push({
              id: slip.id,
              round: slip.round,
              picks: selections.length,
              result: 'lost',
              note: 'early_lost',
              matches: matchDetails
            })
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
            picks: selections.length,
            result: 'won',
            effectiveOdds: effectiveOdds.toFixed(2),
            actualReturn,
            hasVoid,
            matches: matchDetails
          })
        } else {
          await updateSlipStatus(slip.id, 'lost', 0)
          lostCount++
          details.push({
            id: slip.id,
            round: slip.round,
            picks: selections.length,
            result: 'lost',
            matches: matchDetails
          })
        }

      } catch (err: any) {
        console.error(`❌ 슬립 ${slip.id} 판정 실패:`, err.message)
        errorCount++
        details.push({ id: slip.id, error: err.message })
      }
    }

    console.log(`✅ 판정 완료: 적중 ${wonCount}, 미적중 ${lostCount}, 대기 ${stillPending}`)
    
    return NextResponse.json({
      success: true,
      message: `${wonCount + lostCount}건 판정 완료`,
      data: {
        totalPending: pendingSlips.length,
        won: wonCount,
        lost: lostCount,
        stillPending,
        errors: errorCount,
        rounds,
        details
      }
    })

  } catch (error: any) {
    console.error('❌ 슬립 판정 오류:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

async function updateSlipStatus(slipId: string, status: 'won' | 'lost', actualReturn: number) {
  const { error } = await supabase
    .from('proto_slips')
    .update({
      status,
      actual_return: actualReturn,
      settled_at: new Date().toISOString()
    })
    .eq('id', slipId)

  if (error) throw new Error(`슬립 ${slipId} 업데이트 실패: ${error.message}`)
  console.log(`  ${status === 'won' ? '✅' : '❌'} ${slipId}: ${status}`)
}