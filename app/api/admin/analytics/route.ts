import { NextResponse } from 'next/server'
import { BetaAnalyticsDataClient } from '@google-analytics/data'



// GA4 Property ID
const PROPERTY_ID = process.env.GA_PROPERTY_ID || '511624468'

// 서비스 계정 인증
let analyticsDataClient: BetaAnalyticsDataClient | null = null

function getClient() {
  if (!analyticsDataClient) {
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
    
    if (!privateKey || !clientEmail) {
      throw new Error('Google Analytics 인증 정보가 설정되지 않았습니다.')
    }
    
    analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
    })
  }
  return analyticsDataClient
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'overview'
    const days = parseInt(searchParams.get('days') || '7')

    // 인증 정보 체크
    if (!process.env.GOOGLE_PRIVATE_KEY || !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL) {
      return NextResponse.json({
        error: 'GA 인증 정보가 설정되지 않았습니다. Vercel 환경변수를 확인해주세요.',
        requiredEnvVars: [
          'GA_PROPERTY_ID',
          'GOOGLE_SERVICE_ACCOUNT_EMAIL', 
          'GOOGLE_PRIVATE_KEY'
        ]
      }, { status: 500 })
    }

    const client = getClient()

    // 날짜 범위 계산
    const endDate = 'today'
    const startDate = `${days}daysAgo`

    let response

    switch (type) {
      case 'realtime':
        // 실시간 접속자
        response = await client.runRealtimeReport({
          property: `properties/${PROPERTY_ID}`,
          metrics: [{ name: 'activeUsers' }],
        })
        return NextResponse.json({
          activeUsers: response[0]?.rows?.[0]?.metricValues?.[0]?.value || '0',
        })

      case 'overview':
        // 전체 개요 통계
        response = await client.runReport({
          property: `properties/${PROPERTY_ID}`,
          dateRanges: [{ startDate, endDate }],
          metrics: [
            { name: 'activeUsers' },
            { name: 'sessions' },
            { name: 'screenPageViews' },
            { name: 'averageSessionDuration' },
            { name: 'bounceRate' },
            { name: 'newUsers' },
          ],
        })
        
        const metrics = response[0]?.rows?.[0]?.metricValues || []
        return NextResponse.json({
          activeUsers: metrics[0]?.value || '0',
          sessions: metrics[1]?.value || '0',
          pageViews: metrics[2]?.value || '0',
          avgSessionDuration: parseFloat(metrics[3]?.value || '0').toFixed(1),
          bounceRate: (parseFloat(metrics[4]?.value || '0') * 100).toFixed(1),
          newUsers: metrics[5]?.value || '0',
        })

      case 'daily':
        // 일별 통계
        response = await client.runReport({
          property: `properties/${PROPERTY_ID}`,
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'date' }],
          metrics: [
            { name: 'activeUsers' },
            { name: 'sessions' },
            { name: 'screenPageViews' },
          ],
          orderBys: [{ dimension: { dimensionName: 'date' } }],
        })
        
        const dailyData = response[0]?.rows?.map(row => ({
          date: row.dimensionValues?.[0]?.value || '',
          users: parseInt(row.metricValues?.[0]?.value || '0'),
          sessions: parseInt(row.metricValues?.[1]?.value || '0'),
          pageViews: parseInt(row.metricValues?.[2]?.value || '0'),
        })) || []
        
        return NextResponse.json(dailyData)

      case 'pages':
        // 인기 페이지 TOP 10
        response = await client.runReport({
          property: `properties/${PROPERTY_ID}`,
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'pagePath' }],
          metrics: [
            { name: 'screenPageViews' },
            { name: 'averageSessionDuration' },
          ],
          orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
          limit: 10,
        })
        
        const pagesData = response[0]?.rows?.map(row => ({
          path: row.dimensionValues?.[0]?.value || '',
          views: parseInt(row.metricValues?.[0]?.value || '0'),
          avgTime: parseFloat(row.metricValues?.[1]?.value || '0').toFixed(1),
        })) || []
        
        return NextResponse.json(pagesData)

      case 'sources':
        // 유입 경로
        response = await client.runReport({
          property: `properties/${PROPERTY_ID}`,
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'sessionDefaultChannelGroup' }],
          metrics: [
            { name: 'sessions' },
            { name: 'activeUsers' },
          ],
          orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
          limit: 10,
        })
        
        const sourcesData = response[0]?.rows?.map(row => ({
          source: row.dimensionValues?.[0]?.value || '',
          sessions: parseInt(row.metricValues?.[0]?.value || '0'),
          users: parseInt(row.metricValues?.[1]?.value || '0'),
        })) || []
        
        return NextResponse.json(sourcesData)

      case 'countries':
        // 국가별 트래픽
        response = await client.runReport({
          property: `properties/${PROPERTY_ID}`,
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'country' }],
          metrics: [
            { name: 'activeUsers' },
            { name: 'sessions' },
          ],
          orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
          limit: 15,
        })
        
        const countriesData = response[0]?.rows?.map(row => ({
          country: row.dimensionValues?.[0]?.value || '',
          users: parseInt(row.metricValues?.[0]?.value || '0'),
          sessions: parseInt(row.metricValues?.[1]?.value || '0'),
        })) || []
        
        return NextResponse.json(countriesData)

      case 'devices':
        // 디바이스별 비율
        response = await client.runReport({
          property: `properties/${PROPERTY_ID}`,
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'deviceCategory' }],
          metrics: [
            { name: 'activeUsers' },
            { name: 'sessions' },
          ],
          orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
        })
        
        const devicesData = response[0]?.rows?.map(row => ({
          device: row.dimensionValues?.[0]?.value || '',
          users: parseInt(row.metricValues?.[0]?.value || '0'),
          sessions: parseInt(row.metricValues?.[1]?.value || '0'),
        })) || []
        
        return NextResponse.json(devicesData)

      // 🆕 시간대별 트래픽
      case 'hourly':
        response = await client.runReport({
          property: `properties/${PROPERTY_ID}`,
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'hour' }],
          metrics: [
            { name: 'activeUsers' },
            { name: 'sessions' },
          ],
          orderBys: [{ dimension: { dimensionName: 'hour' } }],
        })
        
        const hourlyData = response[0]?.rows?.map(row => ({
          hour: parseInt(row.dimensionValues?.[0]?.value || '0'),
          users: parseInt(row.metricValues?.[0]?.value || '0'),
          sessions: parseInt(row.metricValues?.[1]?.value || '0'),
        })) || []
        
        return NextResponse.json(hourlyData)

      // 🆕 신규 vs 재방문자
      case 'usertype':
        response = await client.runReport({
          property: `properties/${PROPERTY_ID}`,
          dateRanges: [{ startDate, endDate }],
          dimensions: [{ name: 'newVsReturning' }],
          metrics: [
            { name: 'activeUsers' },
            { name: 'sessions' },
          ],
        })
        
        const userTypeData = response[0]?.rows?.map(row => ({
          type: row.dimensionValues?.[0]?.value || '',
          users: parseInt(row.metricValues?.[0]?.value || '0'),
          sessions: parseInt(row.metricValues?.[1]?.value || '0'),
        })) || []
        
        return NextResponse.json(userTypeData)

      // 🆕 전주 대비 성장률
      case 'comparison':
        const currentEnd = 'today'
        const currentStart = `${days}daysAgo`
        const previousEnd = `${days + 1}daysAgo`
        const previousStart = `${days * 2}daysAgo`
        
        response = await client.runReport({
          property: `properties/${PROPERTY_ID}`,
          dateRanges: [
            { startDate: currentStart, endDate: currentEnd },
            { startDate: previousStart, endDate: previousEnd },
          ],
          metrics: [
            { name: 'activeUsers' },
            { name: 'sessions' },
            { name: 'screenPageViews' },
            { name: 'newUsers' },
          ],
        })
        
        const currentMetrics = response[0]?.rows?.[0]?.metricValues || []
        const previousMetrics = response[0]?.rows?.[1]?.metricValues || []
        
        const calcGrowth = (current: string, previous: string) => {
          const c = parseFloat(current || '0')
          const p = parseFloat(previous || '0')
          if (p === 0) return c > 0 ? 100 : 0
          return ((c - p) / p * 100).toFixed(1)
        }
        
        return NextResponse.json({
          current: {
            users: parseInt(currentMetrics[0]?.value || '0'),
            sessions: parseInt(currentMetrics[1]?.value || '0'),
            pageViews: parseInt(currentMetrics[2]?.value || '0'),
            newUsers: parseInt(currentMetrics[3]?.value || '0'),
          },
          previous: {
            users: parseInt(previousMetrics[0]?.value || '0'),
            sessions: parseInt(previousMetrics[1]?.value || '0'),
            pageViews: parseInt(previousMetrics[2]?.value || '0'),
            newUsers: parseInt(previousMetrics[3]?.value || '0'),
          },
          growth: {
            users: calcGrowth(currentMetrics[0]?.value, previousMetrics[0]?.value),
            sessions: calcGrowth(currentMetrics[1]?.value, previousMetrics[1]?.value),
            pageViews: calcGrowth(currentMetrics[2]?.value, previousMetrics[2]?.value),
            newUsers: calcGrowth(currentMetrics[3]?.value, previousMetrics[3]?.value),
          }
        })

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    }

  } catch (error: any) {
    console.error('GA Analytics API Error:', error)
    
    // 에러 타입에 따른 상세 메시지
    let errorMessage = error.message || 'Unknown error'
    let statusCode = 500
    
    if (error.code === 7 || error.message?.includes('PERMISSION_DENIED')) {
      errorMessage = 'GA4 속성에 대한 권한이 없습니다. 서비스 계정에 뷰어 권한을 추가해주세요.'
      statusCode = 403
    } else if (error.code === 5 || error.message?.includes('NOT_FOUND')) {
      errorMessage = 'GA4 속성을 찾을 수 없습니다. Property ID를 확인해주세요.'
      statusCode = 404
    } else if (error.message?.includes('credentials')) {
      errorMessage = '인증 정보가 올바르지 않습니다. 환경변수를 확인해주세요.'
      statusCode = 401
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: statusCode })
  }
}
