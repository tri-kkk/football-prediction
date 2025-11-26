/**
 * Supabase Blog Uploader v3
 * - source_url 기반 중복 방지 (가장 확실)
 * - 팀+날짜 조합 이중 체크
 * - 썸네일 fallback 강화
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// 리그별 기본 썸네일 (Unsplash)
const LEAGUE_THUMBNAILS = {
  'PL': 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&h=450&fit=crop',
  'PD': 'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=800&h=450&fit=crop',
  'BL1': 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=450&fit=crop',
  'SA': 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&h=450&fit=crop',
  'FL1': 'https://images.unsplash.com/photo-1508098682722-e99c643e7f76?w=800&h=450&fit=crop',
  'CL': 'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=800&h=450&fit=crop',
  'EL': 'https://images.unsplash.com/photo-1560272564-c83b66b1ad12?w=800&h=450&fit=crop',
  'ECL': 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=450&fit=crop',
  'NL': 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&h=450&fit=crop',
  'ELC': 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&h=450&fit=crop',
  'PPL': 'https://images.unsplash.com/photo-1489944440615-453fc2b6a9a9?w=800&h=450&fit=crop',
  'DED': 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=450&fit=crop',
};

const DEFAULT_THUMBNAIL = 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=450&fit=crop';

/**
 * source_url로 중복 체크 (가장 확실)
 */
async function checkDuplicateBySourceUrl(sourceUrl) {
  if (!sourceUrl) return false;
  
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('id, slug')
      .eq('source_url', sourceUrl)
      .limit(1);
    
    if (error) {
      // source_url 컬럼이 없을 수 있음 - 무시
      return false;
    }
    
    if (data?.length > 0) {
      console.log(`    🔍 이미 존재: ${data[0].slug}`);
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

/**
 * 팀+날짜 조합으로 중복 체크 (백업)
 */
async function checkDuplicateByTeams(homeTeam, awayTeam) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  
  try {
    const { data } = await supabase
      .from('blog_posts')
      .select('id, slug')
      .ilike('title_kr', `%${homeTeam}%`)
      .ilike('title_kr', `%${awayTeam}%`)
      .gte('created_at', today)
      .limit(1);
    
    if (data?.length > 0) {
      console.log(`    🔍 오늘 이미 포스팅: ${data[0].slug}`);
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
}

function generateSlug(match) {
  const home = (match.homeTeam || 'home').toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-|-$/g, '');
  const away = (match.awayTeam || 'away').toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-|-$/g, '');
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).slice(2, 6);
  
  return `${home}-vs-${away}-${date}-${rand}`;
}

function getCoverImage(match) {
  // 1. 스크래퍼에서 가져온 썸네일
  if (match.thumbnail?.startsWith('http')) {
    return match.thumbnail;
  }
  
  // 2. 리그별 기본 이미지
  if (match.leagueCode && LEAGUE_THUMBNAILS[match.leagueCode]) {
    return LEAGUE_THUMBNAILS[match.leagueCode];
  }
  
  // 3. 최종 fallback
  return DEFAULT_THUMBNAIL;
}

async function uploadPost(match) {
  const coverImage = getCoverImage(match);
  const slug = match.slug || generateSlug(match);
  
  const post = {
    slug,
    title: `${match.homeTeam} vs ${match.awayTeam} Preview`,
    title_kr: match.title_kr || `${match.homeTeamKr || match.homeTeam} vs ${match.awayTeamKr || match.awayTeam} 프리뷰`,
    excerpt: match.excerpt || match.summary || '',
    content: match.content || '',
    cover_image: coverImage,
    category: 'preview',
    tags: match.tags || [match.leagueKr || '축구'],
    published: true,
    published_at: new Date().toISOString(),
    source_url: match.sourceUrl || null,
    views: 0
  };
  
  // meta 컬럼 (있으면)
  try {
    post.meta = {
      league: match.league,
      leagueKr: match.leagueKr,
      leagueCode: match.leagueCode,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeTeamKr: match.homeTeamKr,
      awayTeamKr: match.awayTeamKr,
      prediction: match.prediction,
      source: 'forebet',
      sourceUrl: match.sourceUrl,
      thumbnailType: match.thumbnailType,
      ai_model: match.ai_model
    };
  } catch {}
  
  const { data, error } = await supabase
    .from('blog_posts')
    .insert([post])
    .select('id, slug, cover_image');
  
  if (error) {
    // meta 또는 source_url 컬럼 없으면 제거 후 재시도
    delete post.meta;
    delete post.source_url;
    
    const { data: data2, error: error2 } = await supabase
      .from('blog_posts')
      .insert([post])
      .select('id, slug, cover_image');
    
    if (error2) throw new Error(error2.message);
    return data2[0];
  }
  
  return data[0];
}

async function uploadAll() {
  console.log('📤 Supabase Uploader v3 (중복 방지)');
  console.log('📅 ' + new Date().toISOString() + '\n');
  
  if (!fs.existsSync('processed-previews.json')) {
    console.error('❌ processed-previews.json not found');
    process.exit(1);
  }
  
  const posts = JSON.parse(fs.readFileSync('processed-previews.json'));
  if (!posts.length) {
    console.log('⚠️ No posts to upload');
    return;
  }
  
  console.log(`📋 ${posts.length}개 포스트 업로드 시작...\n`);
  
  let uploaded = 0, skipped = 0, failed = 0;
  
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    console.log(`[${i + 1}/${posts.length}] ${post.homeTeam} vs ${post.awayTeam}`);
    
    // 1. source_url 중복 체크 (가장 확실)
    if (await checkDuplicateBySourceUrl(post.sourceUrl)) {
      console.log('    ⏭️ SKIP (source_url 중복)');
      skipped++;
      continue;
    }
    
    // 2. 팀+날짜 중복 체크 (백업)
    if (await checkDuplicateByTeams(post.homeTeam, post.awayTeam)) {
      console.log('    ⏭️ SKIP (오늘 이미 포스팅)');
      skipped++;
      continue;
    }
    
    // 3. 업로드
    try {
      const result = await uploadPost(post);
      console.log(`    ✅ /blog/${result.slug}`);
      console.log(`    🖼️ ${post.thumbnailType || 'fallback'}`);
      uploaded++;
    } catch (e) {
      console.log(`    ❌ Error: ${e.message}`);
      failed++;
    }
  }
  
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 업로드 결과:`);
  console.log(`   ✅ 성공: ${uploaded}`);
  console.log(`   ⏭️ 스킵: ${skipped}`);
  console.log(`   ❌ 실패: ${failed}`);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL and SUPABASE_SERVICE_KEY required');
  process.exit(1);
}

uploadAll().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
