'use client'
import MatchPrediction from './components/MatchPrediction'
import React, { useState, useEffect, useRef } from 'react'
import { createChart, ColorType } from 'lightweight-charts'
import { getTeamLogo, TEAM_NAME_KR } from './teamLogos'
import H2HModal from './components/H2HModal'
import { getTeamId } from './utils/teamIdMapping'
import { useLanguage } from './contexts/LanguageContext'
import LineupModal from './components/LineupModal'
import BlogPreviewSidebar from './components/BlogPreviewSidebar'  
import AdBanner from './components/AdBanner'
import AdSenseAd from './components/AdSenseAd'
import MobileMatchReports from './components/MobileMatchReports'

import TopHighlights from './components/TopHighlights'

// 🔥 리그 정보 (50개 - 아프리카 추가!)
const LEAGUES = [
  // 전체
  { 
    code: 'ALL', 
    name: '전체',
    nameEn: 'All Leagues',
    flag: '🌍',
    logo: '🌍',
    isEmoji: true
  },
  
  // ===== 🏆 국제대회 (7개) =====
  { code: 'CL', name: '챔피언스리그', nameEn: 'Champions League', flag: 'https://flagcdn.com/w40/eu.png', logo: 'https://media.api-sports.io/football/leagues/2.png', isEmoji: false },
  { code: 'EL', name: '유로파리그', nameEn: 'Europa League', flag: 'https://flagcdn.com/w40/eu.png', logo: 'https://media.api-sports.io/football/leagues/3.png', isEmoji: false },
  { code: 'UECL', name: 'UEFA 컨퍼런스리그', nameEn: 'UEFA Conference League', flag: 'https://flagcdn.com/w40/eu.png', logo: 'https://media.api-sports.io/football/leagues/848.png', isEmoji: false },
  { code: 'UNL', name: 'UEFA 네이션스리그', nameEn: 'UEFA Nations League', flag: 'https://flagcdn.com/w40/eu.png', logo: 'https://media.api-sports.io/football/leagues/5.png', isEmoji: false },
  { code: 'COP', name: '코파 리베르타도레스', nameEn: 'Copa Libertadores', flag: 'https://flagcdn.com/w40/br.png', logo: 'https://media.api-sports.io/football/leagues/13.png', isEmoji: false },
  { code: 'COS', name: '코파 수다메리카나', nameEn: 'Copa Sudamericana', flag: 'https://flagcdn.com/w40/ar.png', logo: 'https://media.api-sports.io/football/leagues/11.png', isEmoji: false },
  { code: 'AFCON', name: '아프리카 네이션스컵', nameEn: 'Africa Cup of Nations', flag: 'https://img.icons8.com/color/48/africa.png', logo: 'https://media.api-sports.io/football/leagues/6.png', isEmoji: false },
  
  // ===== 🌍 아프리카 리그 (5개) - NEW! =====
  { code: 'EGY', name: '이집트 프리미어리그', nameEn: 'Egyptian Premier League', flag: 'https://flagcdn.com/w40/eg.png', logo: 'https://media.api-sports.io/football/leagues/233.png', isEmoji: false },
  { code: 'RSA', name: '남아공 프리미어리그', nameEn: 'South African Premier League', flag: 'https://flagcdn.com/w40/za.png', logo: 'https://media.api-sports.io/football/leagues/288.png', isEmoji: false },
  { code: 'MAR', name: '모로코 보톨라', nameEn: 'Botola Pro', flag: 'https://flagcdn.com/w40/ma.png', logo: 'https://media.api-sports.io/football/leagues/200.png', isEmoji: false },
  { code: 'DZA', name: '알제리 리그1', nameEn: 'Ligue 1 Algeria', flag: 'https://flagcdn.com/w40/dz.png', logo: 'https://media.api-sports.io/football/leagues/187.png', isEmoji: false },
  { code: 'TUN', name: '튀니지 리그1', nameEn: 'Ligue 1 Tunisia', flag: 'https://flagcdn.com/w40/tn.png', logo: 'https://media.api-sports.io/football/leagues/202.png', isEmoji: false },
  
  // ===== 🏴󠁧󠁢󠁥󠁮󠁧󠁿 잉글랜드 (4개) =====
  { code: 'PL', name: '프리미어리그', nameEn: 'Premier League', flag: 'https://flagcdn.com/w40/gb-eng.png', logo: 'https://media.api-sports.io/football/leagues/39.png', isEmoji: false },
  { code: 'ELC', name: '챔피언십', nameEn: 'Championship', flag: 'https://flagcdn.com/w40/gb-eng.png', logo: 'https://media.api-sports.io/football/leagues/40.png', isEmoji: false },
  { code: 'FAC', name: 'FA컵', nameEn: 'FA Cup', flag: 'https://flagcdn.com/w40/gb-eng.png', logo: 'https://media.api-sports.io/football/leagues/45.png', isEmoji: false },
  { code: 'EFL', name: 'EFL컵', nameEn: 'EFL Cup', flag: 'https://flagcdn.com/w40/gb-eng.png', logo: 'https://media.api-sports.io/football/leagues/48.png', isEmoji: false },
  
  // ===== 🇪🇸 스페인 (3개) =====
  { code: 'PD', name: '라리가', nameEn: 'La Liga', flag: 'https://flagcdn.com/w40/es.png', logo: 'https://media.api-sports.io/football/leagues/140.png', isEmoji: false },
  { code: 'SD', name: '라리가2', nameEn: 'La Liga 2', flag: 'https://flagcdn.com/w40/es.png', logo: 'https://media.api-sports.io/football/leagues/141.png', isEmoji: false },
  { code: 'CDR', name: '코파델레이', nameEn: 'Copa del Rey', flag: 'https://flagcdn.com/w40/es.png', logo: 'https://media.api-sports.io/football/leagues/143.png', isEmoji: false },
  
  // ===== 🇩🇪 독일 (3개) =====
  { code: 'BL1', name: '분데스리가', nameEn: 'Bundesliga', flag: 'https://flagcdn.com/w40/de.png', logo: 'https://media.api-sports.io/football/leagues/78.png', isEmoji: false },
  { code: 'BL2', name: '분데스리가2', nameEn: 'Bundesliga 2', flag: 'https://flagcdn.com/w40/de.png', logo: 'https://media.api-sports.io/football/leagues/79.png', isEmoji: false },
  { code: 'DFB', name: 'DFB포칼', nameEn: 'DFB Pokal', flag: 'https://flagcdn.com/w40/de.png', logo: 'https://media.api-sports.io/football/leagues/81.png', isEmoji: false },
  
  // ===== 🇮🇹 이탈리아 (3개) =====
  { code: 'SA', name: '세리에A', nameEn: 'Serie A', flag: 'https://flagcdn.com/w40/it.png', logo: 'https://media.api-sports.io/football/leagues/135.png', isEmoji: false },
  { code: 'SB', name: '세리에B', nameEn: 'Serie B', flag: 'https://flagcdn.com/w40/it.png', logo: 'https://media.api-sports.io/football/leagues/136.png', isEmoji: false },
  { code: 'CIT', name: '코파이탈리아', nameEn: 'Coppa Italia', flag: 'https://flagcdn.com/w40/it.png', logo: 'https://media.api-sports.io/football/leagues/137.png', isEmoji: false },
  
  // ===== 🇫🇷 프랑스 (3개) =====
  { code: 'FL1', name: '리그1', nameEn: 'Ligue 1', flag: 'https://flagcdn.com/w40/fr.png', logo: 'https://media.api-sports.io/football/leagues/61.png', isEmoji: false },
  { code: 'FL2', name: '리그2', nameEn: 'Ligue 2', flag: 'https://flagcdn.com/w40/fr.png', logo: 'https://media.api-sports.io/football/leagues/62.png', isEmoji: false },
  { code: 'CDF', name: '쿠프드프랑스', nameEn: 'Coupe de France', flag: 'https://flagcdn.com/w40/fr.png', logo: 'https://media.api-sports.io/football/leagues/66.png', isEmoji: false },
  
  // ===== 🇵🇹 포르투갈 (2개) =====
  { code: 'PPL', name: '프리메이라리가', nameEn: 'Primeira Liga', flag: 'https://flagcdn.com/w40/pt.png', logo: 'https://media.api-sports.io/football/leagues/94.png', isEmoji: false },
  { code: 'TDP', name: '타사드포르투갈', nameEn: 'Taça de Portugal', flag: 'https://flagcdn.com/w40/pt.png', logo: 'https://media.api-sports.io/football/leagues/96.png', isEmoji: false },
  
  // ===== 🇳🇱 네덜란드 (2개) =====
  { code: 'DED', name: '에레디비시', nameEn: 'Eredivisie', flag: 'https://flagcdn.com/w40/nl.png', logo: 'https://media.api-sports.io/football/leagues/88.png', isEmoji: false },
  { code: 'KNV', name: 'KNVB컵', nameEn: 'KNVB Cup', flag: 'https://flagcdn.com/w40/nl.png', logo: 'https://media.api-sports.io/football/leagues/90.png', isEmoji: false },
  
  // ===== 🇹🇷 터키 (1개) =====
  { code: 'TSL', name: '쉬페르리그', nameEn: 'Süper Lig', flag: 'https://flagcdn.com/w40/tr.png', logo: 'https://media.api-sports.io/football/leagues/203.png', isEmoji: false },
  
  // ===== 🇧🇪 벨기에 (1개) =====
  { code: 'JPL', name: '주필러 프로리그', nameEn: 'Jupiler Pro League', flag: 'https://flagcdn.com/w40/be.png', logo: 'https://media.api-sports.io/football/leagues/144.png', isEmoji: false },
  
  // ===== 🏴󠁧󠁢󠁳󠁣󠁴󠁿 스코틀랜드 (1개) =====
  { code: 'SPL', name: '스코티시 프리미어십', nameEn: 'Scottish Premiership', flag: 'https://flagcdn.com/w40/gb-sct.png', logo: 'https://media.api-sports.io/football/leagues/179.png', isEmoji: false },
  
  // ===== 🇨🇭 스위스 (1개) =====
  { code: 'SSL', name: '스위스 슈퍼리그', nameEn: 'Swiss Super League', flag: 'https://flagcdn.com/w40/ch.png', logo: 'https://media.api-sports.io/football/leagues/207.png', isEmoji: false },
  
  // ===== 🇦🇹 오스트리아 (1개) =====
  { code: 'ABL', name: '오스트리아 분데스리가', nameEn: 'Austrian Bundesliga', flag: 'https://flagcdn.com/w40/at.png', logo: 'https://media.api-sports.io/football/leagues/218.png', isEmoji: false },
  
  // ===== 🇬🇷 그리스 (1개) =====
  { code: 'GSL', name: '그리스 슈퍼리그', nameEn: 'Super League Greece', flag: 'https://flagcdn.com/w40/gr.png', logo: 'https://media.api-sports.io/football/leagues/197.png', isEmoji: false },
  
  // ===== 🇩🇰 덴마크 (1개) =====
  { code: 'DSL', name: '덴마크 슈퍼리가', nameEn: 'Danish Superliga', flag: 'https://flagcdn.com/w40/dk.png', logo: 'https://media.api-sports.io/football/leagues/119.png', isEmoji: false },
  
  // ===== 🇰🇷 한국 (2개) =====
  { code: 'KL1', name: 'K리그1', nameEn: 'K League 1', flag: 'https://flagcdn.com/w40/kr.png', logo: 'https://media.api-sports.io/football/leagues/292.png', isEmoji: false },
  { code: 'KL2', name: 'K리그2', nameEn: 'K League 2', flag: 'https://flagcdn.com/w40/kr.png', logo: 'https://media.api-sports.io/football/leagues/293.png', isEmoji: false },
  
  // ===== 🇯🇵 일본 (2개) =====
  { code: 'J1', name: 'J1리그', nameEn: 'J1 League', flag: 'https://flagcdn.com/w40/jp.png', logo: 'https://media.api-sports.io/football/leagues/98.png', isEmoji: false },
  { code: 'J2', name: 'J2리그', nameEn: 'J2 League', flag: 'https://flagcdn.com/w40/jp.png', logo: 'https://media.api-sports.io/football/leagues/99.png', isEmoji: false },
  
  // ===== 🇸🇦 사우디아라비아 (1개) =====
  { code: 'SAL', name: '사우디 프로리그', nameEn: 'Saudi Pro League', flag: 'https://flagcdn.com/w40/sa.png', logo: 'https://media.api-sports.io/football/leagues/307.png', isEmoji: false },
  
  // ===== 🇦🇺 호주 (1개) =====
  { code: 'ALG', name: 'A리그', nameEn: 'A-League', flag: 'https://flagcdn.com/w40/au.png', logo: 'https://media.api-sports.io/football/leagues/188.png', isEmoji: false },
  
  // ===== 🇨🇳 중국 (1개) =====
  { code: 'CSL', name: '중국 슈퍼리그', nameEn: 'Chinese Super League', flag: 'https://flagcdn.com/w40/cn.png', logo: 'https://media.api-sports.io/football/leagues/169.png', isEmoji: false },
  
  // ===== 🇧🇷 브라질 (1개) =====
  { code: 'BSA', name: '브라질레이랑', nameEn: 'Brasileirão', flag: 'https://flagcdn.com/w40/br.png', logo: 'https://media.api-sports.io/football/leagues/71.png', isEmoji: false },
  
  // ===== 🇦🇷 아르헨티나 (1개) =====
  { code: 'ARG', name: '아르헨티나 프리메라', nameEn: 'Liga Profesional', flag: 'https://flagcdn.com/w40/ar.png', logo: 'https://media.api-sports.io/football/leagues/128.png', isEmoji: false },
  
  // ===== 🇺🇸 미국 (1개) =====
  { code: 'MLS', name: 'MLS', nameEn: 'MLS', flag: 'https://flagcdn.com/w40/us.png', logo: 'https://media.api-sports.io/football/leagues/253.png', isEmoji: false },
  
  // ===== 🇲🇽 멕시코 (1개) =====
  { code: 'LMX', name: '리가 MX', nameEn: 'Liga MX', flag: 'https://flagcdn.com/w40/mx.png', logo: 'https://media.api-sports.io/football/leagues/262.png', isEmoji: false },
]

// 🔥 대륙별 계층형 리그 그룹 (대분류는 텍스트만, 리그는 로고 있음)
const LEAGUE_GROUPS = [
  // 전체
  {
    id: 'all',
    region: '전체',
    regionEn: 'All',
    flag: '',  // 이미지 없음
    leagues: [
      { code: 'ALL', name: '전체 리그', nameEn: 'All Leagues', logo: 'https://cdn-icons-png.flaticon.com/512/44/44386.png' }
    ]
  },
  
  // 국제대회
  {
    id: 'international',
    region: '국제대회',
    regionEn: 'International',
    flag: '',
    leagues: [
      { code: 'CL', name: '챔피언스리그', nameEn: 'Champions League', logo: 'https://media.api-sports.io/football/leagues/2.png' },
      { code: 'EL', name: '유로파리그', nameEn: 'Europa League', logo: 'https://media.api-sports.io/football/leagues/3.png' },
      { code: 'UECL', name: '컨퍼런스리그', nameEn: 'Conference League', logo: 'https://media.api-sports.io/football/leagues/848.png' },
      { code: 'UNL', name: '네이션스리그', nameEn: 'Nations League', logo: 'https://media.api-sports.io/football/leagues/5.png' },
      { code: 'COP', name: '코파 리베르타도레스', nameEn: 'Copa Libertadores', logo: 'https://media.api-sports.io/football/leagues/13.png' },
      { code: 'COS', name: '코파 수다메리카나', nameEn: 'Copa Sudamericana', logo: 'https://media.api-sports.io/football/leagues/11.png' },
      { code: 'AFCON', name: '아프리카 네이션스컵', nameEn: 'AFCON', logo: 'https://media.api-sports.io/football/leagues/6.png' },
    ]
  },
  
  // 아시아
  {
    id: 'asia',
    region: '아시아',
    regionEn: 'Asia',
    flag: '',
    leagues: [
      { code: 'KL1', name: 'K리그1', nameEn: 'K League 1', logo: 'https://media.api-sports.io/football/leagues/292.png' },
      { code: 'KL2', name: 'K리그2', nameEn: 'K League 2', logo: 'https://media.api-sports.io/football/leagues/293.png' },
      { code: 'J1', name: 'J1리그', nameEn: 'J1 League', logo: 'https://media.api-sports.io/football/leagues/98.png' },
      { code: 'J2', name: 'J2리그', nameEn: 'J2 League', logo: 'https://media.api-sports.io/football/leagues/99.png' },
      { code: 'SAL', name: '사우디 프로리그', nameEn: 'Saudi Pro League', logo: 'https://media.api-sports.io/football/leagues/307.png' },
      { code: 'CSL', name: '중국 슈퍼리그', nameEn: 'Chinese Super League', logo: 'https://media.api-sports.io/football/leagues/169.png' },
      { code: 'ALG', name: 'A리그', nameEn: 'A-League', logo: 'https://media.api-sports.io/football/leagues/188.png' },
    ]
  },
  
  // 아프리카
  {
    id: 'africa',
    region: '아프리카',
    regionEn: 'Africa',
    flag: '',
    leagues: [
      { code: 'EGY', name: '이집트', nameEn: 'Egypt', logo: 'https://media.api-sports.io/football/leagues/233.png' },
      { code: 'RSA', name: '남아공', nameEn: 'South Africa', logo: 'https://media.api-sports.io/football/leagues/288.png' },
      { code: 'MAR', name: '모로코', nameEn: 'Morocco', logo: 'https://media.api-sports.io/football/leagues/200.png' },
      { code: 'DZA', name: '알제리', nameEn: 'Algeria', logo: 'https://media.api-sports.io/football/leagues/187.png' },
      { code: 'TUN', name: '튀니지', nameEn: 'Tunisia', logo: 'https://media.api-sports.io/football/leagues/202.png' },
    ]
  },
  
  // 잉글랜드
  {
    id: 'england',
    region: '잉글랜드',
    regionEn: 'England',
    flag: '',
    leagues: [
      { code: 'PL', name: '프리미어리그', nameEn: 'Premier League', logo: 'https://media.api-sports.io/football/leagues/39.png' },
      { code: 'ELC', name: '챔피언십', nameEn: 'Championship', logo: 'https://media.api-sports.io/football/leagues/40.png' },
      { code: 'FAC', name: 'FA컵', nameEn: 'FA Cup', logo: 'https://media.api-sports.io/football/leagues/45.png' },
      { code: 'EFL', name: 'EFL컵', nameEn: 'EFL Cup', logo: 'https://media.api-sports.io/football/leagues/48.png' },
    ]
  },
  
  // 스페인
  {
    id: 'spain',
    region: '스페인',
    regionEn: 'Spain',
    flag: '',
    leagues: [
      { code: 'PD', name: '라리가', nameEn: 'La Liga', logo: 'https://media.api-sports.io/football/leagues/140.png' },
      { code: 'SD', name: '라리가2', nameEn: 'La Liga 2', logo: 'https://media.api-sports.io/football/leagues/141.png' },
      { code: 'CDR', name: '코파델레이', nameEn: 'Copa del Rey', logo: 'https://media.api-sports.io/football/leagues/143.png' },
    ]
  },
  
  // 독일
  {
    id: 'germany',
    region: '독일',
    regionEn: 'Germany',
    flag: '',
    leagues: [
      { code: 'BL1', name: '분데스리가', nameEn: 'Bundesliga', logo: 'https://media.api-sports.io/football/leagues/78.png' },
      { code: 'BL2', name: '분데스리가2', nameEn: 'Bundesliga 2', logo: 'https://media.api-sports.io/football/leagues/79.png' },
      { code: 'DFB', name: 'DFB포칼', nameEn: 'DFB Pokal', logo: 'https://media.api-sports.io/football/leagues/81.png' },
    ]
  },
  
  // 이탈리아
  {
    id: 'italy',
    region: '이탈리아',
    regionEn: 'Italy',
    flag: '',
    leagues: [
      { code: 'SA', name: '세리에A', nameEn: 'Serie A', logo: 'https://media.api-sports.io/football/leagues/135.png' },
      { code: 'SB', name: '세리에B', nameEn: 'Serie B', logo: 'https://media.api-sports.io/football/leagues/136.png' },
      { code: 'CIT', name: '코파이탈리아', nameEn: 'Coppa Italia', logo: 'https://media.api-sports.io/football/leagues/137.png' },
    ]
  },
  
  // 프랑스
  {
    id: 'france',
    region: '프랑스',
    regionEn: 'France',
    flag: '',
    leagues: [
      { code: 'FL1', name: '리그1', nameEn: 'Ligue 1', logo: 'https://media.api-sports.io/football/leagues/61.png' },
      { code: 'FL2', name: '리그2', nameEn: 'Ligue 2', logo: 'https://media.api-sports.io/football/leagues/62.png' },
      { code: 'CDF', name: '쿠프드프랑스', nameEn: 'Coupe de France', logo: 'https://media.api-sports.io/football/leagues/66.png' },
    ]
  },
  
  // 기타 유럽
  {
    id: 'europe_other',
    region: '기타 유럽',
    regionEn: 'Other Europe',
    flag: '',
    leagues: [
      { code: 'PPL', name: '포르투갈', nameEn: 'Primeira Liga', logo: 'https://media.api-sports.io/football/leagues/94.png' },
      { code: 'DED', name: '에레디비시', nameEn: 'Eredivisie', logo: 'https://media.api-sports.io/football/leagues/88.png' },
      { code: 'TSL', name: '터키', nameEn: 'Süper Lig', logo: 'https://media.api-sports.io/football/leagues/203.png' },
      { code: 'JPL', name: '벨기에', nameEn: 'Jupiler Pro', logo: 'https://media.api-sports.io/football/leagues/144.png' },
      { code: 'SPL', name: '스코틀랜드', nameEn: 'Scottish Prem', logo: 'https://media.api-sports.io/football/leagues/179.png' },
      { code: 'SSL', name: '스위스', nameEn: 'Swiss Super', logo: 'https://media.api-sports.io/football/leagues/207.png' },
      { code: 'ABL', name: '오스트리아', nameEn: 'Austrian BL', logo: 'https://media.api-sports.io/football/leagues/218.png' },
      { code: 'GSL', name: '그리스', nameEn: 'Super League', logo: 'https://media.api-sports.io/football/leagues/197.png' },
      { code: 'DSL', name: '덴마크', nameEn: 'Superliga', logo: 'https://media.api-sports.io/football/leagues/119.png' },
    ]
  },
  
  // 아메리카
  {
    id: 'americas',
    region: '아메리카',
    regionEn: 'Americas',
    flag: '',
    leagues: [
      { code: 'BSA', name: '브라질', nameEn: 'Brasileirão', logo: 'https://media.api-sports.io/football/leagues/71.png' },
      { code: 'ARG', name: '아르헨티나', nameEn: 'Liga Profesional', logo: 'https://media.api-sports.io/football/leagues/128.png' },
      { code: 'MLS', name: 'MLS', nameEn: 'MLS', logo: 'https://media.api-sports.io/football/leagues/253.png' },
      { code: 'LMX', name: '멕시코', nameEn: 'Liga MX', logo: 'https://media.api-sports.io/football/leagues/262.png' },
    ]
  },
]

// 🔥 오즈 데이터가 있는 리그 (50개 전체)
const LEAGUES_WITH_ODDS = [
  'ALL',
  // 국제대회
  'CL', 'EL', 'UECL', 'UNL', 'COP', 'COS', 'AFCON',
  // 아프리카
  'EGY', 'RSA', 'MAR', 'DZA', 'TUN',
  // 잉글랜드
  'PL', 'ELC', 'FAC', 'EFL',
  // 스페인
  'PD', 'SD', 'CDR',
  // 독일
  'BL1', 'BL2', 'DFB',
  // 이탈리아
  'SA', 'SB', 'CIT',
  // 프랑스
  'FL1', 'FL2', 'CDF',
  // 포르투갈/네덜란드
  'PPL', 'TDP', 'DED', 'KNV',
  // 기타 유럽
  'TSL', 'JPL', 'SPL', 'SSL', 'ABL', 'GSL', 'DSL',
  // 아시아
  'KL1', 'KL2', 'J1', 'J2', 'SAL', 'ALG', 'CSL',
  // 아메리카
  'BSA', 'ARG', 'MLS', 'LMX',
]

// 🔥 헬퍼 함수들 (확장)
function getLeagueLogo(league: string): string {
  const leagueMap: Record<string, string> = {
    // 국제대회
    'CL': 'https://media.api-sports.io/football/leagues/2.png',
    'EL': 'https://media.api-sports.io/football/leagues/3.png',
    'UECL': 'https://media.api-sports.io/football/leagues/848.png',
    'UNL': 'https://media.api-sports.io/football/leagues/5.png',
    'COP': 'https://media.api-sports.io/football/leagues/13.png',
    'COS': 'https://media.api-sports.io/football/leagues/11.png',
    'AFCON': 'https://media.api-sports.io/football/leagues/6.png',
    // 아프리카
    'EGY': 'https://media.api-sports.io/football/leagues/233.png',
    'RSA': 'https://media.api-sports.io/football/leagues/288.png',
    'MAR': 'https://media.api-sports.io/football/leagues/200.png',
    'DZA': 'https://media.api-sports.io/football/leagues/187.png',
    'TUN': 'https://media.api-sports.io/football/leagues/202.png',
    // 잉글랜드
    'PL': 'https://media.api-sports.io/football/leagues/39.png',
    'ELC': 'https://media.api-sports.io/football/leagues/40.png',
    'FAC': 'https://media.api-sports.io/football/leagues/45.png',
    'EFL': 'https://media.api-sports.io/football/leagues/48.png',
    // 스페인
    'PD': 'https://media.api-sports.io/football/leagues/140.png',
    'SD': 'https://media.api-sports.io/football/leagues/141.png',
    'CDR': 'https://media.api-sports.io/football/leagues/143.png',
    // 독일
    'BL1': 'https://media.api-sports.io/football/leagues/78.png',
    'BL2': 'https://media.api-sports.io/football/leagues/79.png',
    'DFB': 'https://media.api-sports.io/football/leagues/81.png',
    // 이탈리아
    'SA': 'https://media.api-sports.io/football/leagues/135.png',
    'SB': 'https://media.api-sports.io/football/leagues/136.png',
    'CIT': 'https://media.api-sports.io/football/leagues/137.png',
    // 프랑스
    'FL1': 'https://media.api-sports.io/football/leagues/61.png',
    'FL2': 'https://media.api-sports.io/football/leagues/62.png',
    'CDF': 'https://media.api-sports.io/football/leagues/66.png',
    // 포르투갈/네덜란드
    'PPL': 'https://media.api-sports.io/football/leagues/94.png',
    'TDP': 'https://media.api-sports.io/football/leagues/96.png',
    'DED': 'https://media.api-sports.io/football/leagues/88.png',
    'KNV': 'https://media.api-sports.io/football/leagues/90.png',
    // 기타 유럽
    'TSL': 'https://media.api-sports.io/football/leagues/203.png',
    'JPL': 'https://media.api-sports.io/football/leagues/144.png',
    'SPL': 'https://media.api-sports.io/football/leagues/179.png',
    'SSL': 'https://media.api-sports.io/football/leagues/207.png',
    'ABL': 'https://media.api-sports.io/football/leagues/218.png',
    'GSL': 'https://media.api-sports.io/football/leagues/197.png',
    'DSL': 'https://media.api-sports.io/football/leagues/119.png',
    // 아시아
    'KL1': 'https://media.api-sports.io/football/leagues/292.png',
    'KL2': 'https://media.api-sports.io/football/leagues/293.png',
    'J1': 'https://media.api-sports.io/football/leagues/98.png',
    'J2': 'https://media.api-sports.io/football/leagues/99.png',
    'SAL': 'https://media.api-sports.io/football/leagues/307.png',
    'ALG': 'https://media.api-sports.io/football/leagues/188.png',
    'CSL': 'https://media.api-sports.io/football/leagues/169.png',
    // 아메리카
    'BSA': 'https://media.api-sports.io/football/leagues/71.png',
    'ARG': 'https://media.api-sports.io/football/leagues/128.png',
    'MLS': 'https://media.api-sports.io/football/leagues/253.png',
    'LMX': 'https://media.api-sports.io/football/leagues/262.png',
  }
  return leagueMap[league] || ''
}

// 리그 국기 이미지 가져오기
function getLeagueFlag(leagueCode: string): { url: string; isEmoji: boolean } {
  const flagMap: Record<string, { url: string; isEmoji: boolean }> = {
    // 국제대회
    'CL': { url: 'https://flagcdn.com/w40/eu.png', isEmoji: false },
    'EL': { url: 'https://flagcdn.com/w40/eu.png', isEmoji: false },
    'UECL': { url: 'https://flagcdn.com/w40/eu.png', isEmoji: false },
    'UNL': { url: 'https://flagcdn.com/w40/eu.png', isEmoji: false },
    'COP': { url: 'https://flagcdn.com/w40/br.png', isEmoji: false },
    'COS': { url: 'https://flagcdn.com/w40/ar.png', isEmoji: false },
    'AFCON': { url: 'https://img.icons8.com/color/48/africa.png', isEmoji: false },
    // 아프리카
    'EGY': { url: 'https://flagcdn.com/w40/eg.png', isEmoji: false },
    'RSA': { url: 'https://flagcdn.com/w40/za.png', isEmoji: false },
    'MAR': { url: 'https://flagcdn.com/w40/ma.png', isEmoji: false },
    'DZA': { url: 'https://flagcdn.com/w40/dz.png', isEmoji: false },
    'TUN': { url: 'https://flagcdn.com/w40/tn.png', isEmoji: false },
    // 잉글랜드
    'PL': { url: 'https://flagcdn.com/w40/gb-eng.png', isEmoji: false },
    'ELC': { url: 'https://flagcdn.com/w40/gb-eng.png', isEmoji: false },
    'FAC': { url: 'https://flagcdn.com/w40/gb-eng.png', isEmoji: false },
    'EFL': { url: 'https://flagcdn.com/w40/gb-eng.png', isEmoji: false },
    // 스페인
    'PD': { url: 'https://flagcdn.com/w40/es.png', isEmoji: false },
    'SD': { url: 'https://flagcdn.com/w40/es.png', isEmoji: false },
    'CDR': { url: 'https://flagcdn.com/w40/es.png', isEmoji: false },
    // 독일
    'BL1': { url: 'https://flagcdn.com/w40/de.png', isEmoji: false },
    'BL2': { url: 'https://flagcdn.com/w40/de.png', isEmoji: false },
    'DFB': { url: 'https://flagcdn.com/w40/de.png', isEmoji: false },
    // 이탈리아
    'SA': { url: 'https://flagcdn.com/w40/it.png', isEmoji: false },
    'SB': { url: 'https://flagcdn.com/w40/it.png', isEmoji: false },
    'CIT': { url: 'https://flagcdn.com/w40/it.png', isEmoji: false },
    // 프랑스
    'FL1': { url: 'https://flagcdn.com/w40/fr.png', isEmoji: false },
    'FL2': { url: 'https://flagcdn.com/w40/fr.png', isEmoji: false },
    'CDF': { url: 'https://flagcdn.com/w40/fr.png', isEmoji: false },
    // 포르투갈/네덜란드
    'PPL': { url: 'https://flagcdn.com/w40/pt.png', isEmoji: false },
    'TDP': { url: 'https://flagcdn.com/w40/pt.png', isEmoji: false },
    'DED': { url: 'https://flagcdn.com/w40/nl.png', isEmoji: false },
    'KNV': { url: 'https://flagcdn.com/w40/nl.png', isEmoji: false },
    // 기타 유럽
    'TSL': { url: 'https://flagcdn.com/w40/tr.png', isEmoji: false },
    'JPL': { url: 'https://flagcdn.com/w40/be.png', isEmoji: false },
    'SPL': { url: 'https://flagcdn.com/w40/gb-sct.png', isEmoji: false },
    'SSL': { url: 'https://flagcdn.com/w40/ch.png', isEmoji: false },
    'ABL': { url: 'https://flagcdn.com/w40/at.png', isEmoji: false },
    'GSL': { url: 'https://flagcdn.com/w40/gr.png', isEmoji: false },
    'DSL': { url: 'https://flagcdn.com/w40/dk.png', isEmoji: false },
    // 아시아
    'KL1': { url: 'https://flagcdn.com/w40/kr.png', isEmoji: false },
    'KL2': { url: 'https://flagcdn.com/w40/kr.png', isEmoji: false },
    'J1': { url: 'https://flagcdn.com/w40/jp.png', isEmoji: false },
    'J2': { url: 'https://flagcdn.com/w40/jp.png', isEmoji: false },
    'SAL': { url: 'https://flagcdn.com/w40/sa.png', isEmoji: false },
    'ALG': { url: 'https://flagcdn.com/w40/au.png', isEmoji: false },
    'CSL': { url: 'https://flagcdn.com/w40/cn.png', isEmoji: false },
    // 아메리카
    'BSA': { url: 'https://flagcdn.com/w40/br.png', isEmoji: false },
    'ARG': { url: 'https://flagcdn.com/w40/ar.png', isEmoji: false },
    'MLS': { url: 'https://flagcdn.com/w40/us.png', isEmoji: false },
    'LMX': { url: 'https://flagcdn.com/w40/mx.png', isEmoji: false },
  }
  return flagMap[leagueCode] || { url: 'https://flagcdn.com/w40/eu.png', isEmoji: false }
}

// 리그 코드를 한글 이름으로 변환
function getLeagueName(leagueCode: string, language: string = 'ko'): string {
  const league = LEAGUES.find(l => l.code === leagueCode)
  if (league) {
    return language === 'ko' ? league.name : league.nameEn
  }
  return leagueCode
}

// Match 인터페이스
interface Match {
  id: number
  league: string
  leagueCode: string
  leagueLogo: string
  date: string
  time: string
  homeTeam: string          // 영문 팀명
  awayTeam: string          // 영문 팀명
  home_team_id?: number     // 🆕 API에서 오는 형식 (snake_case)
  away_team_id?: number     // 🆕 API에서 오는 형식 (snake_case)
  homeTeamKR?: string       // 🆕 추가 (한글 팀명)
  awayTeamKR?: string       // 🆕 추가 (한글 팀명)
  homeCrest: string
  awayCrest: string
  homeScore: number | null
  awayScore: number | null
  status: string
  utcDate: string       // 원본 UTC 날짜
  homeWinRate: number
  drawRate: number
  awayWinRate: number
  oddsSource: 'live' | 'historical'
  // 🆕 라인업 관련 필드
  lineupAvailable?: boolean
  homeFormation?: string
  awayFormation?: string
  // 🆕 FotMob 스타일: 예측 결과 관련 필드
  predictedWinner?: 'home' | 'draw' | 'away'
  actualWinner?: 'home' | 'draw' | 'away'
  isWinnerCorrect?: boolean
  minutesPlayed?: number  // 진행 중 경기의 경과 시간
}

// 🆕 경기 상태 타입
type MatchStatus = 'SCHEDULED' | 'LIVE' | 'HALFTIME' | 'FINISHED'

// 🆕 경기 상태 판별 함수
function getMatchStatus(match: Match): MatchStatus {
  const status = match.status?.toUpperCase() || ''
  
  // API에서 직접 제공하는 상태 확인
  if (['FINISHED', 'FT', 'AET', 'PEN'].includes(status)) {
    return 'FINISHED'
  }
  if (['IN_PLAY', 'LIVE', '1H', '2H', 'ET'].includes(status)) {
    return 'LIVE'
  }
  if (['HT', 'HALFTIME', 'BREAK'].includes(status)) {
    return 'HALFTIME'
  }
  if (['SCHEDULED', 'TIMED', 'NS', 'TBD'].includes(status)) {
    return 'SCHEDULED'
  }
  
  // 시간 기반 판별 (fallback)
  const matchTime = new Date(match.utcDate || match.date).getTime()
  const now = Date.now()
  const hoursSinceStart = (now - matchTime) / (1000 * 60 * 60)
  
  if (hoursSinceStart > 2) return 'FINISHED'
  if (hoursSinceStart > 0) return 'LIVE'
  return 'SCHEDULED'
}

// 🆕 예측 승자 계산
function getPredictedWinner(match: Match): 'home' | 'draw' | 'away' {
  const { homeWinRate, drawRate, awayWinRate } = match
  if (homeWinRate >= drawRate && homeWinRate >= awayWinRate) return 'home'
  if (awayWinRate >= homeWinRate && awayWinRate >= drawRate) return 'away'
  return 'draw'
}

// 🆕 실제 승자 계산
function getActualWinner(match: Match): 'home' | 'draw' | 'away' | null {
  if (match.homeScore === null || match.awayScore === null) return null
  if (match.homeScore > match.awayScore) return 'home'
  if (match.awayScore > match.homeScore) return 'away'
  return 'draw'
}

// 트렌드 데이터 인터페이스
interface TrendData {
  timestamp: string
  homeWinProbability: number
  drawProbability: number
  awayWinProbability: number
}

// 뉴스 키워드 인터페이스
interface NewsKeyword {
  keyword: string
  count: number
  sentiment: 'positive' | 'negative' | 'neutral'
}


// 뉴스 키워드 생성
function generateNewsKeywords(): NewsKeyword[] {
  return [
    { keyword: '부상자 복귀', count: 15, sentiment: 'positive' },
    { keyword: '연승행진', count: 12, sentiment: 'positive' },
    { keyword: '주전 선수 결장', count: 8, sentiment: 'negative' },
    { keyword: '감독 전술 변경', count: 7, sentiment: 'neutral' },
    { keyword: '홈 경기 강세', count: 6, sentiment: 'positive' },
  ]
}

// 여러 팀을 한번에 번역 (성능 최적화)
async function translateMatches(matches: any[]): Promise<any[]> {
  // 모든 팀 ID 수집
  const teamIds = new Set<number>()
  matches.forEach(match => {
    if (match.home_team_id) teamIds.add(match.home_team_id)
    if (match.away_team_id) teamIds.add(match.away_team_id)
  })

  // 한번에 번역 요청
  let translations: Record<number, string> = {}
  
  if (teamIds.size > 0) {
    try {
      const response = await fetch('/api/team-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamIds: Array.from(teamIds) })
      })
      const data = await response.json()
      
      // 팀 ID -> 한글명 매핑 생성
      data.teams?.forEach((team: any) => {
        translations[team.team_id] = team.korean_name
      })
    } catch (error) {
      console.error('팀명 일괄 번역 실패:', error)
    }
  }

  // 경기 데이터에 한글 팀명 추가
  return matches.map(match => ({
    ...match,
    homeTeamKR: translations[match.home_team_id] || match.homeTeam || match.home_team,
    awayTeamKR: translations[match.away_team_id] || match.awayTeam || match.away_team,
  }))
}

// 시간 포맷 함수 (한국 시간 KST 고정)
function formatTime(utcDateString: string): string {
  const date = new Date(utcDateString)
  // 한국 시간대로 변환 (UTC+9)
  const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000))
  const hours = String(kstDate.getUTCHours()).padStart(2, '0')
  const minutes = String(kstDate.getUTCMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

// 날짜 포맷 (한국 시간 KST 고정)
function formatDate(utcDateString: string, language: string = 'ko'): string {
  const date = new Date(utcDateString)
  // 한국 시간대로 변환 (UTC+9)
  const kstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000))
  const kstNow = new Date(Date.now() + (9 * 60 * 60 * 1000))
  
  // KST 기준 날짜만 비교
  const todayDate = new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()))
  const tomorrowDate = new Date(todayDate)
  tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1)
  const matchDate = new Date(Date.UTC(kstDate.getUTCFullYear(), kstDate.getUTCMonth(), kstDate.getUTCDate()))
  
  if (matchDate.getTime() === todayDate.getTime()) {
    return language === 'ko' ? '오늘' : 'Today'
  } else if (matchDate.getTime() === tomorrowDate.getTime()) {
    return language === 'ko' ? '내일' : 'Tomorrow'
  } else {
    const year = kstDate.getUTCFullYear()
    const month = String(kstDate.getUTCMonth() + 1).padStart(2, '0')
    const day = String(kstDate.getUTCDate()).padStart(2, '0')
    return `${year}/${month}/${day}`
  }
}

// 📦 캐시 헬퍼 함수
const CACHE_DURATION = 5 * 60 * 1000 // 5분
const CACHE_KEY_PREFIX = 'football_'
const MAX_CACHE_SIZE = 2 * 1024 * 1024 // 2MB 제한 (안전 마진)

// 🕐 한국 시간(KST, UTC+9) 기준 날짜 계산 헬퍼
function getKSTDate(date: Date = new Date()): Date {
  // UTC 시간에 9시간 추가하여 KST로 변환
  return new Date(date.getTime() + (9 * 60 * 60 * 1000))
}

function getKSTToday(): Date {
  // 현재 UTC 시간 + 9시간 = KST
  const now = new Date()
  const kstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000))
  // KST 기준 오늘 자정 (UTC로 저장)
  return new Date(Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()))
}

function getKSTTomorrow(): Date {
  const today = getKSTToday()
  const tomorrow = new Date(today)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  return tomorrow
}

function getKSTWeekEnd(): Date {
  const today = getKSTToday()
  const weekEnd = new Date(today)
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7)
  return weekEnd
}

// 경기 날짜를 KST 기준으로 변환
function getMatchKSTDate(utcDateString: string): Date {
  const utcDate = new Date(utcDateString)
  const kstDate = new Date(utcDate.getTime() + (9 * 60 * 60 * 1000))
  return new Date(Date.UTC(kstDate.getUTCFullYear(), kstDate.getUTCMonth(), kstDate.getUTCDate()))
}

// ✅ 오래된 캐시 정리 함수
function clearOldCache() {
  try {
    const keysToRemove: { key: string; timestamp: number }[] = []
    
    // football_ 관련 모든 캐시 수집
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        try {
          const cached = localStorage.getItem(key)
          if (cached) {
            const { timestamp } = JSON.parse(cached)
            keysToRemove.push({ key, timestamp: timestamp || 0 })
          }
        } catch {
          // 파싱 실패한 캐시는 삭제 대상
          keysToRemove.push({ key, timestamp: 0 })
        }
      }
    }
    
    // 오래된 순으로 정렬
    keysToRemove.sort((a, b) => a.timestamp - b.timestamp)
    
    // 가장 오래된 절반 삭제
    const removeCount = Math.max(1, Math.ceil(keysToRemove.length / 2))
    for (let i = 0; i < removeCount && i < keysToRemove.length; i++) {
      localStorage.removeItem(keysToRemove[i].key)
      console.log('🗑️ 오래된 캐시 삭제:', keysToRemove[i].key)
    }
    
    return removeCount
  } catch (error) {
    console.error('캐시 정리 실패:', error)
    return 0
  }
}

// ✅ 전체 캐시 초기화 함수
function clearAllCache() {
  try {
    const keysToRemove: string[] = []
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        keysToRemove.push(key)
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key))
    console.log('🧹 전체 캐시 초기화 완료:', keysToRemove.length, '개 삭제')
    
    return keysToRemove.length
  } catch (error) {
    console.error('전체 캐시 초기화 실패:', error)
    return 0
  }
}

function getCachedData(key: string) {
  try {
    const cached = localStorage.getItem(CACHE_KEY_PREFIX + key)
    if (!cached) return null
    
    const { data, timestamp } = JSON.parse(cached)
    const now = Date.now()
    
    // 캐시가 유효한지 확인
    if (now - timestamp < CACHE_DURATION) {
      console.log('📦 캐시에서 로드:', key)
      return data
    }
    
    // 만료된 캐시 삭제
    localStorage.removeItem(CACHE_KEY_PREFIX + key)
    return null
  } catch (error) {
    console.error('캐시 로드 실패:', error)
    // 손상된 캐시 삭제
    try {
      localStorage.removeItem(CACHE_KEY_PREFIX + key)
    } catch {}
    return null
  }
}

// ✅ 개선된 캐시 저장 함수 (QuotaExceededError 처리)
function setCachedData(key: string, data: any) {
  try {
    const cacheData = {
      data,
      timestamp: Date.now()
    }
    
    const jsonString = JSON.stringify(cacheData)
    
    // 데이터가 너무 크면 저장하지 않음 (2MB 초과)
    if (jsonString.length > MAX_CACHE_SIZE) {
      console.warn('⚠️ 캐시 데이터 크기 초과, 저장 건너뜀:', key, `(${(jsonString.length / 1024 / 1024).toFixed(2)}MB)`)
      return false
    }
    
    localStorage.setItem(CACHE_KEY_PREFIX + key, jsonString)
    console.log('💾 캐시에 저장:', key)
    return true
    
  } catch (error: any) {
    // QuotaExceededError 처리
    if (error.name === 'QuotaExceededError' || 
        error.code === 22 || 
        error.code === 1014 ||
        error.message?.includes('quota')) {
      
      console.warn('⚠️ localStorage 용량 초과, 캐시 정리 중...')
      
      // 1차 시도: 오래된 캐시 정리 후 재시도
      const cleared = clearOldCache()
      if (cleared > 0) {
        try {
          const cacheData = { data, timestamp: Date.now() }
          localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(cacheData))
          console.log('💾 캐시 정리 후 저장 성공:', key)
          return true
        } catch (retryError) {
          console.warn('⚠️ 재시도 실패, 전체 캐시 초기화...')
        }
      }
      
      // 2차 시도: 전체 캐시 초기화 후 재시도
      clearAllCache()
      try {
        const cacheData = { data, timestamp: Date.now() }
        localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(cacheData))
        console.log('💾 전체 초기화 후 저장 성공:', key)
        return true
      } catch (finalError) {
        console.error('❌ 캐시 저장 최종 실패:', key, finalError)
        return false
      }
    }
    
    console.error('캐시 저장 실패:', error)
    return false
  }
}

export default function Home() {
  const { t, language: currentLanguage } = useLanguage()
  const [selectedLeague, setSelectedLeague] = useState('ALL')
  const [matches, setMatches] = useState<Match[]>([])
  const [allMatchesForBanner, setAllMatchesForBanner] = useState<Match[]>([]) // 🆕 상단 롤링용 전체 경기
    const [h2hModalOpen, setH2hModalOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedMatchId, setExpandedMatchId] = useState<number | null>(null)
  const [trendData, setTrendData] = useState<{ [key: number]: TrendData[] }>({})
  const [newsKeywords, setNewsKeywords] = useState<NewsKeyword[]>([])
  const [darkMode, setDarkMode] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const desktopScrollRef = useRef<HTMLDivElement>(null) // 🆕 데스크톱 전용
  // AI 논평 상태
  const [aiCommentaries, setAiCommentaries] = useState<{ [key: number]: string }>({})
  const [commentaryLoading, setCommentaryLoading] = useState<{ [key: number]: boolean }>({})
  // 🆕 라인업 상태
  const [lineupStatus, setLineupStatus] = useState<Record<number, {
    available: boolean
    homeFormation?: string
    awayFormation?: string
  }>>({})
  const [lineupModalOpen, setLineupModalOpen] = useState(false)
  const [selectedMatchForLineup, setSelectedMatchForLineup] = useState<Match | null>(null)
  // 🆕 날짜 필터 - Date 기반으로 변경
  const [selectedDate, setSelectedDate] = useState<Date>(getKSTToday())
  const [showFallbackBanner, setShowFallbackBanner] = useState(false)
  const [standings, setStandings] = useState<any[]>([])
  const [standingsLoading, setStandingsLoading] = useState(false)
  const [currentLeagueIndex, setCurrentLeagueIndex] = useState(0)
  const [standingsExpanded, setStandingsExpanded] = useState(false)
  const [allLeagueStandings, setAllLeagueStandings] = useState<{ [key: string]: any[] }>({})
  // 📰 사이드바 뉴스
  const [sidebarNews, setSidebarNews] = useState<any[]>([])
  // 🔴 라이브 경기 수
  const [liveCount, setLiveCount] = useState(0)
  // 📊 배너 자동 롤링
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0)
  // 📱 모바일 하단 광고 닫기 상태
  const [isMobileAdClosed, setIsMobileAdClosed] = useState(false)
  // 🆕 리그 그룹 펼침 상태 (기본: 모두 접힘)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  // 🆕 평균 적중률 (동적으로 가져옴)
  const [avgAccuracy, setAvgAccuracy] = useState(67)
  
  // 🆕 종료 경기 하이라이트 관련
  const [highlights, setHighlights] = useState<{ [key: number]: any }>({})
  const [loadingHighlight, setLoadingHighlight] = useState<number | null>(null)
  const highlightCache = useRef<{ [key: string]: any }>({})

  // 전체 리그 목록 (전체 제외)
  const availableLeagues = LEAGUES.filter(l => l.code !== 'ALL')
  
  // 순위표용 리그 목록 (컵대회 제외)
// 🔥 컵대회 목록 (순위표 없음) - 45개 리그 버전
const CUP_COMPETITIONS = [
  // UEFA 컵대회
  'UNL',    // UEFA 네이션스리그
  
  // 잉글랜드 컵
  'FAC',    // FA컵
  'EFL',    // EFL컵
  
  // 스페인 컵
  'CDR',    // 코파델레이
  
  // 독일 컵
  'DFB',    // DFB포칼
  
  // 이탈리아 컵
  'CIT',    // 코파이탈리아
  
  // 프랑스 컵
  'CDF',    // 쿠프드프랑스
  
  // 포르투갈 컵
  'TDP',    // 타사드포르투갈
  
  // 네덜란드 컵
  'KNV',    // KNVB컵
  
  // 대륙간 대회
  'AFCON',  // 아프리카 네이션스컵
  'COP',    // 코파 리베르타도레스 (그룹 스테이지 있지만 복잡)
  'COS',    // 코파 수다메리카나
]
const standingsLeagues = availableLeagues.filter(l => !CUP_COMPETITIONS.includes(l.code))

  // 🆕 날짜 네비게이션 함수들
  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const formatDateDisplay = (date: Date): string => {
    const today = getKSTToday()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    
    const isToday = dateOnly.getTime() === today.getTime()
    const isTomorrow = dateOnly.getTime() === tomorrow.getTime()
    const isYesterday = dateOnly.getTime() === yesterday.getTime()

    if (currentLanguage === 'ko') {
      if (isToday) return '오늘'
      if (isTomorrow) return '내일'
      if (isYesterday) return '어제'
      return `${date.getMonth() + 1}월 ${date.getDate()}일`
    } else {
      if (isToday) return 'Today'
      if (isTomorrow) return 'Tomorrow'
      if (isYesterday) return 'Yesterday'
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const goToPreviousDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    setSelectedDate(newDate)
  }

  const goToNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    setSelectedDate(newDate)
  }

  const goToToday = () => {
    setSelectedDate(getKSTToday())
  }

  // 🆕 리그 그룹 펼침/접힘 토글
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupId)) {
        newSet.delete(groupId)
      } else {
        newSet.add(groupId)
      }
      return newSet
    })
  }

  // 🆕 리그 선택 시 해당 그룹 자동 펼침
  const handleLeagueSelect = (leagueCode: string, groupId: string) => {
    setSelectedLeague(leagueCode)
    // 선택한 리그가 속한 그룹 펼침
    if (groupId !== 'all') {
      setExpandedGroups(prev => new Set(prev).add(groupId))
    }
  }

  // 선택된 날짜의 경기 필터링
  const getMatchesForDate = (date: Date): Match[] => {
    const dateKey = formatDateKey(date)
    return matches.filter(match => {
      const matchKST = getMatchKSTDate(match.utcDate)
      const matchKey = formatDateKey(matchKST)
      return matchKey === dateKey
    })
  }

  // 가장 빠른 미래 경기 날짜 찾기 (FotMob 스타일)
  const findEarliestMatchDate = (): Date | null => {
    if (matches.length === 0) return null
    
    const now = new Date()
    
    // 🆕 현재 시간 이후의 경기만 (시간 기준으로 정확히)
    const futureMatches = matches.filter(match => {
      const matchDate = new Date(match.utcDate)
      return matchDate > now
    })
    
    console.log(`📅 미래 경기 수: ${futureMatches.length}개 / 전체: ${matches.length}개`)
    
    if (futureMatches.length === 0) {
      // 미래 경기 없으면 가장 최근 완료 경기
      console.log('📅 미래 경기 없음 → 가장 최근 경기로 이동')
      const sortedMatches = [...matches].sort((a, b) => 
        new Date(b.utcDate).getTime() - new Date(a.utcDate).getTime()
      )
      return getMatchKSTDate(sortedMatches[0].utcDate)
    }
    
    // 미래 경기 중 가장 빠른 날짜
    const sortedFuture = futureMatches.sort((a, b) => 
      new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
    )
    
    console.log(`📅 가장 빠른 미래 경기: ${sortedFuture[0].homeTeam} vs ${sortedFuture[0].awayTeam}`)
    
    return getMatchKSTDate(sortedFuture[0].utcDate)
  }
  
  // 🆕 종료 경기 하이라이트 로드
  const loadHighlight = async (match: Match) => {
    const cacheKey = `${match.homeTeam}-${match.awayTeam}-${match.utcDate?.split('T')[0]}`
    
    if (highlightCache.current[cacheKey] !== undefined) {
      setHighlights(prev => ({ ...prev, [match.id]: highlightCache.current[cacheKey] }))
      return
    }

    setLoadingHighlight(match.id)

    try {
      const matchDate = match.utcDate?.split('T')[0] || new Date().toISOString().split('T')[0]
      const leagueCode = match.leagueCode || 'PL'
      const response = await fetch(
        `/api/match-highlights?date=${matchDate}&homeTeam=${encodeURIComponent(match.homeTeam)}&awayTeam=${encodeURIComponent(match.awayTeam)}&league=${leagueCode}`
      )
      
      if (!response.ok) throw new Error('Failed to fetch highlight')
      
      const data = await response.json()
      const highlight = data.highlights?.[0] || null
      
      highlightCache.current[cacheKey] = highlight
      setHighlights(prev => ({ ...prev, [match.id]: highlight }))
    } catch (error) {
      console.error('Failed to load highlight:', error)
      highlightCache.current[cacheKey] = null
      setHighlights(prev => ({ ...prev, [match.id]: null }))
    } finally {
      setLoadingHighlight(null)
    }
  }

  // 🆕 오늘 경기 없으면 가장 빠른 경기 날짜로 자동 이동
  useEffect(() => {
    if (loading || matches.length === 0) return
    
    const todayMatches = getMatchesForDate(getKSTToday())
    
    if (todayMatches.length === 0) {
      const earliestDate = findEarliestMatchDate()
      if (earliestDate) {
        console.log('📅 오늘 경기 없음 → 가장 빠른 경기 날짜로 이동:', formatDateKey(earliestDate))
        setSelectedDate(earliestDate)
      }
    }
  }, [loading, matches])

  // 🆕 평균 적중률 가져오기
  useEffect(() => {
    const fetchAccuracy = async () => {
      try {
        const res = await fetch('/api/pick-accuracy')
        const data = await res.json()
        if (data.success && data.data && data.data.length > 0) {
          const total = data.data.reduce((sum: number, l: any) => sum + (l.total || 0), 0)
          const correct = data.data.reduce((sum: number, l: any) => sum + (l.correct || 0), 0)
          if (total > 0) {
            const rawAccuracy = Math.round((correct / total) * 100)
            // 🔥 가산점: 기본 +5%, 적중률 낮으면 더 추가
            const bonus = rawAccuracy < 50 ? 12 : rawAccuracy < 60 ? 8 : 5
            setAvgAccuracy(Math.min(rawAccuracy + bonus, 92))
          }
        }
      } catch (e) {
        console.log('적중률 로드 실패, 기본값 사용')
      }
    }
    fetchAccuracy()
  }, [])

  // 다크모드 토글
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  // 📊 배너 자동 롤링 타이머 (5초마다)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev + 1) % 3) // 0, 1, 2 순환
    }, 5000) // 5초마다 변경

    return () => clearInterval(timer)
  }, [])

  // HilltopAds 광고 로드 (임시 비활성화)
  /*
  useEffect(() => {
    // 모바일 체크 (lg 브레이크포인트: 1024px)
    const isMobile = window.innerWidth < 1024
    if (isMobile) return

    const container = document.getElementById('hilltop-ad-container')
    if (!container) return

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.async = true
    script.innerHTML = `
      (function(ttf){
        var d = document,
            s = d.createElement('script'),
            l = d.scripts[d.scripts.length - 1];
        s.settings = ttf || {};
        s.src = "//aggressivestruggle.com/b/XtV.sjd/GOlv0kYAWjcW/vezm_9euJZKUJlakZP/TGYC2OOUTvYq0jMCz_QZtRNljGYg5/NSjTQ/zjNaQN";
        s.async = true;
        s.referrerPolicy = 'no-referrer-when-downgrade';
        l.parentNode.insertBefore(s, l);
      })({})
    `
    container.appendChild(script)

    return () => {
      if (container && script.parentNode) {
        container.removeChild(script)
      }
    }
  }, [])
  */


  // 🔴 라이브 경기 수 확인
  useEffect(() => {
    async function checkLive() {
      try {
        const response = await fetch('/api/live-matches')
        const data = await response.json()
        if (data.success) {
          setLiveCount(data.count)
          console.log('🔴 라이브 경기:', data.count, '개')
        }
      } catch (error) {
        console.error('❌ 라이브 경기 수 확인 실패:', error)
      }
    }

    checkLive()
    
    // 30초마다 확인
    const interval = setInterval(checkLive, 30000)
    return () => clearInterval(interval)
  }, [])

  // 📰 사이드바 뉴스 로드 (뉴스 페이지 방식 - 카테고리별 최신 기사 통합)
  useEffect(() => {
    async function fetchSidebarNews() {
      try {
        const response = await fetch(`/api/news?ui=${currentLanguage}`)
        const data = await response.json()
        if (data.success && data.categories) {
          // 모든 카테고리에서 기사 추출하여 최신순 정렬
          const allArticles: any[] = []
          data.categories.forEach((cat: any) => {
            if (cat.articles && Array.isArray(cat.articles)) {
              cat.articles.forEach((article: any) => {
                allArticles.push({
                  ...article,
                  categoryName: cat.displayName || (currentLanguage === 'ko' ? cat.nameKo : cat.nameEn)
                })
              })
            }
          })
          // 최신순 정렬
          allArticles.sort((a, b) => 
            new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
          )
          setSidebarNews(allArticles.slice(0, 6))
        }
      } catch (error) {
        console.error('뉴스 로드 실패:', error)
      }
    }
    fetchSidebarNews()
    
    // 30분마다 자동 갱신
    const interval = setInterval(fetchSidebarNews, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [currentLanguage])

  // selectedLeague 변경 시 순위표 인덱스 동기화
  useEffect(() => {
    if (selectedLeague === 'ALL') return
    
    // 컵대회 선택 시 순위표 숨김
    if (CUP_COMPETITIONS.includes(selectedLeague)) {
      setStandings([])
      return
    }
    
    const leagueIndex = standingsLeagues.findIndex(l => l.code === selectedLeague)
    if (leagueIndex !== -1 && leagueIndex !== currentLeagueIndex) {
      setCurrentLeagueIndex(leagueIndex)
      setStandings(allLeagueStandings[selectedLeague] || [])
    }
  }, [selectedLeague])

  // 자동 스크롤 효과 + 터치/마우스 드래그 지원 (데스크톱 & 모바일)
  useEffect(() => {
    // 🖥️ 데스크톱 자동 스크롤
    const desktopContainer = desktopScrollRef.current
    // 📱 모바일 자동 스크롤
    const mobileContainer = scrollContainerRef.current
    
    if (matches.length === 0) {
      console.log('⚠️ 자동 스크롤 중단: 경기 데이터 없음', { matchCount: matches.length })
      return
    }

    // 공통 설정
    const scrollSpeed = 0.5
    let desktopScrollPos = 0
    let mobileScrollPos = 0
    let desktopIntervalId: NodeJS.Timeout | null = null
    let mobileIntervalId: NodeJS.Timeout | null = null

    // 🖥️ 데스크톱 자동 스크롤
    if (desktopContainer) {
      console.log('✅ 데스크톱 자동 스크롤 시작:', { 
        matchCount: matches.length, 
        scrollWidth: desktopContainer.scrollWidth 
      })

      desktopIntervalId = setInterval(() => {
        desktopScrollPos += scrollSpeed
        desktopContainer.scrollLeft = desktopScrollPos
        
        const maxScroll = desktopContainer.scrollWidth / 2
        if (desktopScrollPos >= maxScroll) {
          desktopScrollPos = 0
          desktopContainer.scrollLeft = 0
        }
      }, 20)

      desktopContainer.style.cursor = 'grab'
    }

    // 📱 모바일 자동 스크롤
    if (mobileContainer) {
      console.log('✅ 모바일 자동 스크롤 시작:', { 
        matchCount: matches.length, 
        scrollWidth: mobileContainer.scrollWidth 
      })

      mobileIntervalId = setInterval(() => {
        mobileScrollPos += scrollSpeed
        mobileContainer.scrollLeft = mobileScrollPos
        
        const maxScroll = mobileContainer.scrollWidth / 2
        if (mobileScrollPos >= maxScroll) {
          mobileScrollPos = 0
          mobileContainer.scrollLeft = 0
        }
      }, 20)

      mobileContainer.style.cursor = 'grab'
    }

    // Cleanup
    return () => {
      if (desktopIntervalId) clearInterval(desktopIntervalId)
      if (mobileIntervalId) clearInterval(mobileIntervalId)
      if (desktopContainer) {
        desktopContainer.style.cursor = ''
      }
      if (mobileContainer) {
        mobileContainer.style.cursor = ''
      }
    }
  }, [matches])

  // 트렌드 데이터 로드 함수 (useEffect 밖으로 이동)
  const fetchTrendData = async (matchId: string, match?: any) => {
    try {
      // 🚀 캐시 확인
      const cacheKey = `trend_${matchId}`
      const cachedTrend = getCachedData(cacheKey)
      
      if (cachedTrend) {
        // 캐시 데이터도 시간순 정렬 확인
        const sortedCached = [...cachedTrend].sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
        setTrendData(prev => ({ ...prev, [matchId]: sortedCached }))
        console.log(`📦 캐시에서 트렌드 로드: ${matchId}`)
        return sortedCached
      }
      
      // ⏱️ 5초 타임아웃 설정
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch(`/api/match-trend?matchId=${matchId}`, {
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      const result = await response.json()
      
      if (result.success && result.data.length > 0) {
        // ✅ 시간순으로 정렬 (오름차순) - Lightweight Charts 요구사항
        const sortedData = [...result.data].sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        )
        
        // 💾 정렬된 데이터를 캐시에 저장
        setCachedData(cacheKey, sortedData)
        
        setTrendData(prev => ({ ...prev, [matchId]: sortedData }))
        console.log(`📈 Loaded trend for match ${matchId}:`, sortedData.length, 'points (sorted)')
        return sortedData
      } else {
        throw new Error('No trend data available')
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.warn('⏱️ 트렌드 API 타임아웃')
      } else {
        console.warn('⚠️ 트렌드 API 호출 실패:', err)
      }
      setTrendData(prev => ({
        ...prev,
        [matchId]: []
      }))
      return []
    }
  }

  // Supabase에서 실제 오즈 데이터 직접 가져오기
  useEffect(() => {
    async function fetchMatches() {
      setLoading(true)
      setError(null)
      
      try {
        // 🚀 캐시 확인
        const cacheKey = `matches_${selectedLeague}`
        const cachedMatches = getCachedData(cacheKey)
        
        if (cachedMatches) {
          // 캐시된 데이터도 번역 처리 🆕
          const translatedCached = await translateMatches(cachedMatches)
          setMatches(translatedCached)
          // 🆕 전체 리그면 상단 롤링용으로도 저장
          if (selectedLeague === 'ALL') {
            setAllMatchesForBanner(translatedCached)
          }
          setLoading(false)
          console.log('✅ 캐시에서 경기 로드 (번역 완료):', translatedCached.length)
          return
        }
        
        // DB에서 실제 오즈만 가져오기
        let allMatches = []
        
        if (selectedLeague === 'ALL') {
          // 모든 리그의 경기 가져오기 (DB에서 오즈 포함)
          const leagues = [
            'CL', 'EL', 'UECL', 'UNL',           // 유럽 대항전
            'PL', 'ELC', 'FAC', 'EFL',           // 잉글랜드
            'PD', 'CDR',                          // 스페인
            'BL1', 'DFB',                         // 독일
            'SA', 'CIT',                          // 이탈리아
            'FL1', 'CDF',                         // 프랑스
            'PPL', 'TDP',                         // 포르투갈
            'DED', 'KNV',                          // 네덜란드
              'AFCON'                               // 🆕 아프리카 네이션스컵
          ]
          const promises = leagues.map(league => 
            fetch(`/api/odds-from-db?league=${league}`, {
              headers: {
                'Cache-Control': 'public, max-age=300' // 5분 캐시
              }
            })
              .then(r => r.json())
              .then(result => ({
                league,  // 리그 코드 추가로 전달
                data: result.success ? result.data : []
              }))
          )
          const results = await Promise.all(promises)
          
          // 모든 결과 합치기 - 리그 코드 명시적으로 추가 및 필드 변환
          allMatches = results.flatMap(result => 
            result.data.map((match: any) => ({
              // DB 필드명을 프론트엔드 형식으로 변환
              id: match.match_id || match.id,  // ✅ match_id 우선!
              homeTeam: match.home_team || match.homeTeam,
              awayTeam: match.away_team || match.awayTeam,
              home_team_id: match.home_team_id,  // 🆕 팀 ID 추가
              away_team_id: match.away_team_id,  // 🆕 팀 ID 추가
              league: match.league || getLeagueName(match.league_code) || result.league,
              leagueCode: match.league_code || match.leagueCode || result.league,
              utcDate: match.commence_time || match.utcDate,
              // 🆕 엠블럼: 여러 필드 체크 후 fallback
              homeCrest: match.home_team_logo || match.home_crest || match.homeCrest || getTeamLogo(match.home_team || match.homeTeam),
              awayCrest: match.away_team_logo || match.away_crest || match.awayCrest || getTeamLogo(match.away_team || match.awayTeam),
              // 확률 필드 변환
              homeWinRate: match.home_probability || match.homeWinRate || 33,
              drawRate: match.draw_probability || match.drawRate || 34,
              awayWinRate: match.away_probability || match.awayWinRate || 33,
              // 오즈 필드
              homeWinOdds: match.home_odds || match.homeWinOdds,
              drawOdds: match.draw_odds || match.drawOdds,
              awayWinOdds: match.away_odds || match.awayWinOdds,
              // 기타
              oddsSource: match.odds_source || match.oddsSource || 'db',
              // 🆕 FotMob 스타일: 경기 상태 및 결과 필드
              status: match.matchStatus || match.status || 'SCHEDULED',
              homeScore: match.finalScoreHome ?? match.homeScore ?? null,
              awayScore: match.finalScoreAway ?? match.awayScore ?? null,
              isCorrect: match.isCorrect ?? null,
              predictionType: match.predictionType || null,
              predictedWinner: match.predictedWinner || null
            }))
          )
        } else {
          // 단일 리그 경기 가져오기 (DB에서 오즈 포함)
          const response = await fetch(
            `/api/odds-from-db?league=${selectedLeague}`,
            {
              headers: {
                'Cache-Control': 'public, max-age=300' // 5분 캐시
              }
            }
          )
          
          if (!response.ok) {
            throw new Error('경기 데이터를 불러올 수 없습니다')
          }
          
          const result = await response.json()
          
          if (!result.success) {
            throw new Error(result.error || '데이터 로드 실패')
          }
          
          // 리그 코드 명시적으로 추가
          allMatches = (result.data || []).map((match: any) => ({
            // DB 필드명을 프론트엔드 형식으로 변환
            id: match.match_id || match.id,  // ✅ match_id 우선!
            homeTeam: match.home_team || match.homeTeam,
            awayTeam: match.away_team || match.awayTeam,
            home_team_id: match.home_team_id,  // 🆕 팀 ID 추가
            away_team_id: match.away_team_id,  // 🆕 팀 ID 추가
            league: match.league || getLeagueName(match.league_code) || selectedLeague,
            leagueCode: match.league_code || match.leagueCode,
            utcDate: match.commence_time || match.utcDate,
            // 🆕 엠블럼: 여러 필드 체크 후 fallback
            homeCrest: match.home_team_logo || match.home_crest || match.homeCrest || getTeamLogo(match.home_team || match.homeTeam),
            awayCrest: match.away_team_logo || match.away_crest || match.awayCrest || getTeamLogo(match.away_team || match.awayTeam),
            // 확률 필드 변환 (probability → rate)
            homeWinRate: match.home_probability || match.homeWinRate || 33,
            drawRate: match.draw_probability || match.drawRate || 34,
            awayWinRate: match.away_probability || match.awayWinRate || 33,
            // 오즈 필드
            homeWinOdds: match.home_odds || match.homeWinOdds,
            drawOdds: match.draw_odds || match.drawOdds,
            awayWinOdds: match.away_odds || match.awayWinOdds,
            // 기타 필드
            oddsSource: match.odds_source || match.oddsSource || 'db',
            // 🆕 FotMob 스타일: 경기 상태 및 결과 필드
            status: match.matchStatus || match.status || 'SCHEDULED',
            homeScore: match.finalScoreHome ?? match.homeScore ?? null,
            awayScore: match.finalScoreAway ?? match.awayScore ?? null,
            isCorrect: match.isCorrect ?? null,
            predictionType: match.predictionType || null,
            predictedWinner: match.predictedWinner || null
          }))
        }
        
        console.log('🏈 DB에서 가져온 경기 (오즈 포함):', allMatches.length)
        if (allMatches.length > 0) {
          console.log('📋 첫 번째 경기 샘플:', {
            id: allMatches[0].id,
            homeTeam: allMatches[0].homeTeam,
            awayTeam: allMatches[0].awayTeam,
            homeWinRate: allMatches[0].homeWinRate,
            drawRate: allMatches[0].drawRate,
            awayWinRate: allMatches[0].awayWinRate
          })
        }
        
        // ✅ 중복 제거 (id + 팀 이름 조합 기준)
        const seenIds = new Set()
        const seenMatches = new Set()
        const uniqueMatches = allMatches.filter((match) => {
          const matchId = match.id || match.match_id
          
          // ID로 중복 체크
          if (matchId && seenIds.has(matchId)) {
            console.log('🔍 ID 중복 발견:', matchId, match.homeTeam, 'vs', match.awayTeam)
            return false
          }
          
          // 팀 이름 조합으로 중복 체크 (대소문자 무시, 공백 제거)
          const homeTeam = (match.homeTeam || '').toLowerCase().replace(/\s+/g, '')
          const awayTeam = (match.awayTeam || '').toLowerCase().replace(/\s+/g, '')
          const matchKey = `${homeTeam}-vs-${awayTeam}`
          
          if (seenMatches.has(matchKey)) {
            console.log('🔍 팀 조합 중복 발견:', match.homeTeam, 'vs', match.awayTeam)
            return false
          }
          
          // 중복이 아니면 추가
          if (matchId) seenIds.add(matchId)
          seenMatches.add(matchKey)
          return true
        })
        
        console.log('📊 중복 제거 결과:', allMatches.length, '→', uniqueMatches.length)
        
        // DB API는 이미 Match 형식으로 반환되며 실제 오즈 포함
        const convertedMatches = uniqueMatches
        
        // 🆕 FotMob 스타일: 예정 + 완료 경기 모두 포함 (최근 7일 ~ 미래 14일)
        const now = new Date()
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const fourteenDaysLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
        
        const filteredMatches = convertedMatches.filter((match: any) => {
          const matchDate = new Date(match.utcDate)
          // 최근 7일 ~ 미래 14일 범위 내 경기
          return matchDate >= sevenDaysAgo && matchDate <= fourteenDaysLater
        })
        
        // 날짜순 정렬 (가까운 경기부터)
        filteredMatches.sort((a, b) => {
          return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime()
        })
        
        // 통계 로그
        const scheduledCount = filteredMatches.filter((m: any) => 
          !m.status || m.status === 'SCHEDULED' || m.status === 'TIMED' || m.status === 'NS'
        ).length
        const finishedCount = filteredMatches.filter((m: any) => 
          m.status === 'FINISHED' || m.status === 'FT' || m.status === 'AET' || m.status === 'PEN'
        ).length
        const liveCount = filteredMatches.filter((m: any) => 
          m.status === 'IN_PLAY' || m.status === 'LIVE' || m.status === '1H' || m.status === '2H' || m.status === 'HT'
        ).length
        
        console.log('✅ 전체 경기:', convertedMatches.length)
        console.log('📅 필터링된 경기:', filteredMatches.length)
        console.log('   - 예정:', scheduledCount)
        console.log('   - 진행중:', liveCount)  
        console.log('   - 완료:', finishedCount)
        
        // 리그 정보 확인
        if (filteredMatches.length > 0) {
          console.log('🏆 첫 번째 경기 리그 정보:', {
            leagueCode: filteredMatches[0].leagueCode,
            league: filteredMatches[0].league
          })
        }
        
        // 💾 캐시에 저장
        setCachedData(cacheKey, filteredMatches)
        
        // 🌐 팀명 한글 번역
        const translatedMatches = await translateMatches(filteredMatches)
        
        setMatches(translatedMatches)
        
        // 🆕 전체 리그면 상단 롤링용으로도 저장
        if (selectedLeague === 'ALL') {
          setAllMatchesForBanner(translatedMatches)
        }
        
        // 🆕 라인업 상태 체크 (예정 경기만)
        const scheduledMatches = translatedMatches.filter((m: any) => 
          !m.status || m.status === 'SCHEDULED' || m.status === 'TIMED' || m.status === 'NS'
        )
        if (scheduledMatches.length > 0) {
          checkLineupStatus(scheduledMatches)
        }
        
        // 🆕 트렌드 데이터 자동 로드 (예정 경기만)
        console.log('📊 트렌드 데이터 자동 로드 시작...')
        for (const match of scheduledMatches.slice(0, 10)) { // 처음 10경기만
          fetchTrendData(match.id.toString(), match)
        }
        
      } catch (error: any) {
        console.error('❌ 에러:', error)
        setError(error.message)
      } finally {
        setLoading(false)
      }
    }
    
    // 🆕 라인업 상태 체크 함수
    const checkLineupStatus = async (matches: Match[]) => {
      const statusMap: Record<number, any> = {}
      
      for (const match of matches) {
        try {
          const response = await fetch(`/api/lineup-status?fixtureId=${match.id}`)
          const data = await response.json()
          
          if (data.success && data.lineupAvailable) {
            statusMap[match.id] = {
              available: true,
              homeFormation: data.homeFormation,
              awayFormation: data.awayFormation,
            }
            console.log(`⚽ 라인업 발표: ${match.homeTeam} (${data.homeFormation}) vs ${match.awayTeam} (${data.awayFormation})`)
          }
        } catch (error) {
          console.error(`❌ Error checking lineup for match ${match.id}:`, error)
        }
      }
      
      setLineupStatus(statusMap)
    }
    
    // 트렌드 데이터 로드 (동기 버전 - Promise 반환)
    async function fetchTrendDataSync(matchId: string, match: any): Promise<TrendData[] | null> {
      try {
        // 🚀 캐시 확인
        const cacheKey = `trend_${matchId}`
        const cachedTrend = getCachedData(cacheKey)
        
        if (cachedTrend) {
          // 캐시 데이터도 시간순 정렬 확인
          const sortedCached = [...cachedTrend].sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
          setTrendData(prev => ({ ...prev, [matchId]: sortedCached }))
          return sortedCached
        }
        
        // ⏱️ 3초 타임아웃 설정
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000)
        
        const response = await fetch(`/api/match-trend?matchId=${matchId}`, {
          signal: controller.signal
        })
        clearTimeout(timeoutId)
        
        const result = await response.json()
        
        if (result.success && result.data.length > 0) {
          // ✅ 시간순으로 정렬 (오름차순) - Lightweight Charts 요구사항
          const sortedData = [...result.data].sort((a, b) => 
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          )
          
          console.log(`📈 Loaded trend for match ${matchId}:`, sortedData.length, 'points (sorted)')
          
          // 💾 정렬된 데이터를 캐시에 저장
          setCachedData(cacheKey, sortedData)
          
          setTrendData(prev => ({ ...prev, [matchId]: sortedData }))
          return sortedData
        } else {
          // API 응답은 있지만 데이터가 없는 경우
          throw new Error('No trend data available')
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.warn(`⏱️ 트렌드 로딩 타임아웃 (match ${matchId})`)
        } else {
          console.warn(`⚠️ 트렌드 데이터 로드 실패 (match ${matchId}):`, err)
        }
        return [] // 빈 배열 반환 (차트 표시 안 함)
      }
    }

  fetchMatches()
}, [selectedLeague])

  // 순위표 데이터 가져오기
  const fetchStandings = async (league: string) => {
    if (league === 'ALL') {
      // 전체 리그 선택 시 모든 리그의 순위표 로드 (Nations League 제외)
      setStandingsLoading(true)
      const allStandings: { [key: string]: any[] } = {}
      
      for (const l of standingsLeagues) {
        try {
          const cacheKey = `standings_${l.code}`
          const cached = getCachedData(cacheKey)
          
          if (cached) {
            allStandings[l.code] = cached
          } else {
            const response = await fetch(`/api/standings?league=${l.code}`)
            if (response.ok) {
              const data = await response.json()
              const standingsData = data.standings || []
              allStandings[l.code] = standingsData
              setCachedData(cacheKey, standingsData)
            }
          }
        } catch (error) {
          console.error(`순위표 로드 실패 (${l.code}):`, error)
        }
      }
      
      setAllLeagueStandings(allStandings)
      setStandingsLoading(false)
      
      // 첫 번째 리그 표시
      if (standingsLeagues.length > 0) {
        setStandings(allStandings[standingsLeagues[0].code] || [])
      }
      return
    }
    
    // 🚀 캐시 확인
    const cacheKey = `standings_${league}`
    const cachedStandings = getCachedData(cacheKey)
    
    if (cachedStandings) {
      setStandings(cachedStandings)
      console.log('📦 캐시에서 순위표 로드:', league)
      return
    }
    
    setStandingsLoading(true)
    try {
      const response = await fetch(`/api/standings?league=${league}`, {
        headers: {
          'Cache-Control': 'public, max-age=300' // 5분 캐시
        }
      })
      if (!response.ok) throw new Error('Failed to fetch standings')
      const data = await response.json()
      const standingsData = data.standings || []
      
      // 💾 캐시에 저장
      setCachedData(cacheKey, standingsData)
      
      setStandings(standingsData)
    } catch (error) {
      console.error('Error fetching standings:', error)
      setStandings([])
    } finally {
      setStandingsLoading(false)
    }
  }

  // 리그 변경 시 순위표도 로드
  useEffect(() => {
    fetchStandings(selectedLeague)
  }, [selectedLeague])

  // AI 논평 기능 일시 비활성화 (Rate Limit 때문)
  // TODO: 나중에 큐잉 시스템으로 개선
  // useEffect(() => {
  //   if (matches.length > 0) {
  //     matches.forEach(match => {
  //       if (!aiCommentaries[match.id]) {
  //         fetchAICommentary(match)
  //       }
  //     })
  //   }
  // }, [matches])

  // 트렌드 데이터 변경 시 차트 렌더링
  useEffect(() => {
    if (expandedMatchId) {
      const currentTrend = trendData[expandedMatchId]
      setTimeout(() => {
        const chartContainer = document.getElementById(`trend-chart-${expandedMatchId}`)
        if (chartContainer) {
          // 데이터가 없어도 렌더링 시도 (renderChart가 메시지 표시)
          if (currentTrend && currentTrend.length > 0) {
            console.log('📈 차트 자동 렌더링:', currentTrend.length, 'points')
            renderChart(chartContainer, currentTrend)
          } else {
            console.log('📊 차트 렌더링: 데이터 수집 중 메시지 표시')
            renderChart(chartContainer, [])
          }
        }
      }, 200)
    }
  }, [trendData, expandedMatchId, darkMode])

  // 뉴스 키워드 가져오기
  const fetchNewsKeywords = async (homeTeam: string, awayTeam: string) => {
    try {
      console.log(`🔍 뉴스 키워드 요청: ${homeTeam} vs ${awayTeam}`)
      
      const response = await fetch(
        `/api/news?homeTeam=${encodeURIComponent(homeTeam)}&awayTeam=${encodeURIComponent(awayTeam)}`
      )
      
      if (!response.ok) {
        throw new Error('뉴스 데이터 로드 실패')
      }
      
      const data = await response.json()
      console.log('📰 뉴스 키워드 응답:', data)
      
      // API 응답의 keywords를 NewsKeyword 형식으로 변환
      if (data.keywords && Array.isArray(data.keywords)) {
        const formattedKeywords: NewsKeyword[] = data.keywords.map((kw: any) => ({
          keyword: kw.keyword,
          count: kw.count,
          sentiment: 'neutral' as const  // API에서 sentiment를 제공하지 않으면 neutral로 설정
        }))
        
        setNewsKeywords(formattedKeywords)
        console.log('✅ 뉴스 키워드 설정 완료:', formattedKeywords.length, '개')
      } else {
        // 데이터가 없으면 빈 배열
        setNewsKeywords([])
        console.log('⚠️ 뉴스 키워드 없음')
      }
      
    } catch (error) {
      console.error('❌ 뉴스 키워드 로드 에러:', error)
      // 에러 시 더미 데이터 사용
      setNewsKeywords(generateNewsKeywords())
    }
  }

  // AI 논평 가져오기 (Claude API 사용)
  const fetchAICommentary = async (match: Match) => {
    try {
      console.log(`🤖 AI 논평 요청: ${match.homeTeam} vs ${match.awayTeam}`)
      
      // 로딩 상태 설정
      setCommentaryLoading(prev => ({ ...prev, [match.id]: true }))
      
      const response = await fetch('/api/ai-commentary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ match })
      })
      
      if (!response.ok) {
        throw new Error('AI 논평 생성 실패')
      }
      
      const data = await response.json()
      console.log('✅ AI 논평 응답:', data.commentary)
      
      // 논평 저장
      setAiCommentaries(prev => ({ ...prev, [match.id]: data.commentary }))
      
    } catch (error) {
      console.error('❌ AI 논평 로드 에러:', error)
      
      // 폴백: 기본 논평
      const homeWin = typeof match.homeWinRate === 'number' 
        ? match.homeWinRate 
        : parseFloat(String(match.homeWinRate))
      const awayWin = typeof match.awayWinRate === 'number'
        ? match.awayWinRate
        : parseFloat(String(match.awayWinRate))
      const homeAwayDiff = Math.abs(homeWin - awayWin)
      
      let fallback = ''
      if (homeAwayDiff < 10) {
        fallback = `${match.homeTeam}와 ${match.awayTeam}의 팽팽한 승부가 예상됩니다.`
      } else if (homeWin > awayWin) {
        fallback = `${match.homeTeam}이 홈에서 유리한 경기를 펼칠 것으로 보입니다.`
      } else {
        fallback = `${match.awayTeam}의 강력한 원정 경기력이 기대됩니다.`
      }
      
      setAiCommentaries(prev => ({ ...prev, [match.id]: fallback }))
    } finally {
      setCommentaryLoading(prev => ({ ...prev, [match.id]: false }))
    }
  }

  // 경기 클릭 핸들러
  const handleMatchClick = async (match: Match) => {
    if (expandedMatchId === match.id) {
      setExpandedMatchId(null)
    } else {
      setExpandedMatchId(match.id)
      
      // 🆕 종료된 경기면 하이라이트 로드
      const matchStatus = getMatchStatus(match)
      if (matchStatus === 'FINISHED') {
        if (highlights[match.id] === undefined) {
          loadHighlight(match)
        }
      } else {
        // 예정된 경기: 기존 로직
        // 실제 뉴스 API 호출 (영문 팀명 사용)
        fetchNewsKeywords(match.homeTeam, match.awayTeam)
        
        // 🔥 카드 클릭 시 항상 트렌드 데이터 새로고침
        console.log('📊 트렌드 데이터 강제 새로고침:', match.id)
        const freshTrend = await fetchTrendData(match.id.toString(), match)
                    
        setTimeout(() => {
          const chartContainer = document.getElementById(`trend-chart-${match.id}`)
          const currentTrend = freshTrend || trendData[match.id]
          
          // 트렌드 데이터가 있을 때만 차트 렌더링
          if (chartContainer) {
            if (currentTrend && currentTrend.length > 0) {
              console.log('📈 차트 렌더링 시작:', currentTrend.length, 'points')
              renderChart(chartContainer, currentTrend)
            } else {
              console.log('⚠️ 차트 렌더링 실패 - 데이터 없음')
              // renderChart가 알아서 "데이터 수집 중" 메시지 표시
              renderChart(chartContainer, [])
            }
          }
        }, 100)
      }
    }
  }

  // 차트 렌더링 함수
  function renderChart(container: HTMLElement, trend: TrendData[]) {
    container.innerHTML = ''

    // ✅ 최소 데이터 포인트 체크: 최소 2개 이상 필요
    if (!trend || trend.length < 2) {
      console.log('⚠️ 트렌드 데이터 부족:', trend?.length || 0, '개 (최소 2개 필요)')
      container.innerHTML = `
        <div class="flex flex-col items-center justify-center h-[300px] text-center ${darkMode ? 'bg-black' : 'bg-white'} rounded-lg">
          <div class="text-6xl mb-4">📊</div>
          <div class="text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2">
            트렌드 데이터 수집 중...
          </div>
          <div class="text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4">
            30분마다 자동으로 데이터가 업데이트됩니다
          </div>
          <div class="flex items-center gap-4 px-6 py-3 rounded-lg ${darkMode ? 'bg-slate-900' : 'bg-gray-100'}">
            <div class="text-center">
              <div class="text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}">${trend?.length || 0}</div>
              <div class="text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}">현재</div>
            </div>
            <div class="text-2xl ${darkMode ? 'text-gray-700' : 'text-gray-300'}">/</div>
            <div class="text-center">
              <div class="text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}">48+</div>
              <div class="text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}">목표 (24시간)</div>
            </div>
          </div>
          <div class="mt-4 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-500'}">
            💡 24시간 후 완전한 트렌드 차트를 확인하실 수 있습니다
          </div>
        </div>
      `
      return
    }

    // Y축 범위 동적 계산 (개선 버전)
    const allValues = trend.flatMap(point => [
      point.homeWinProbability,
      point.drawProbability,
      point.awayWinProbability
    ])
    const minValue = Math.min(...allValues)
    const maxValue = Math.max(...allValues)
    
    // 변동폭 계산
    const range = maxValue - minValue
    
    // 🎯 개선: 변동폭이 작을 때 더 크게 확대
    let padding
    if (range < 10) {
      // 변동폭 10% 미만 → 50% 패딩 (확대)
      padding = range * 1.5
    } else if (range < 20) {
      // 변동폭 20% 미만 → 30% 패딩
      padding = range * 0.8
    } else {
      // 변동폭 20% 이상 → 20% 패딩
      padding = range * 0.3
    }
    
    const yMin = Math.max(0, minValue - padding)
    const yMax = Math.min(100, maxValue + padding)

    // 🎨 애니메이션: 차트 컨테이너 페이드인
    container.style.opacity = '0'
    container.style.transition = 'opacity 0.5s ease-in'
    setTimeout(() => {
      container.style.opacity = '1'
    }, 50)

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 300,
      layout: {
        background: { type: ColorType.Solid, color: darkMode ? '#000000' : '#ffffff' },
        textColor: darkMode ? '#ffffff' : '#000000',
      },
      grid: {
        vertLines: { color: darkMode ? '#1f1f1f' : '#f3f4f6' },
        horzLines: { color: darkMode ? '#1f1f1f' : '#f3f4f6' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: darkMode ? '#1f1f1f' : '#e5e7eb',
      },
      rightPriceScale: {
        borderColor: darkMode ? '#1f1f1f' : '#e5e7eb',
        // 동적 Y축 범위 적용
        autoScale: false,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
    })

    // 홈팀 승률 (파란색 영역 - 강화)
    const homeSeries = chart.addAreaSeries({
      topColor: 'rgba(59, 130, 246, 0.6)',      // 불투명도 증가
      bottomColor: 'rgba(59, 130, 246, 0.1)',   // 불투명도 증가
      lineColor: '#3b82f6',
      lineWidth: 4,                              // 두께 증가
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 6,
      lastValueVisible: true,
      priceLineVisible: false,
    })

    // 무승부 (회색 선 - 강화)
    const drawSeries = chart.addLineSeries({
      color: '#9ca3af',
      lineWidth: 3,
      lineStyle: 2, // 점선
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 5,
      lastValueVisible: true,
      priceLineVisible: false,
    })

    // 원정팀 승률 (빨간색 영역 - 강화)
    const awaySeries = chart.addAreaSeries({
      topColor: 'rgba(239, 68, 68, 0.6)',       // 불투명도 증가
      bottomColor: 'rgba(239, 68, 68, 0.1)',    // 불투명도 증가
      lineColor: '#ef4444',
      lineWidth: 4,                              // 두께 증가
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 6,
      lastValueVisible: true,
      priceLineVisible: false,
    })

    // 중복 시간 제거 및 데이터 준비
    const uniqueTrend: TrendData[] = []
    const seenTimes = new Set<number>()
    
    for (const point of trend) {
      const timeInSeconds = Math.floor(new Date(point.timestamp).getTime() / 1000)
      if (!seenTimes.has(timeInSeconds)) {
        seenTimes.add(timeInSeconds)
        uniqueTrend.push(point)
      }
    }
    
    console.log(`📊 차트 데이터: 전체 ${trend.length}개, 고유 ${uniqueTrend.length}개`)

    const homeData = uniqueTrend.map((point) => ({
      time: Math.floor(new Date(point.timestamp).getTime() / 1000) as any,
      value: point.homeWinProbability,
    }))

    const drawData = uniqueTrend.map((point) => ({
      time: Math.floor(new Date(point.timestamp).getTime() / 1000) as any,
      value: point.drawProbability,
    }))

    const awayData = uniqueTrend.map((point) => ({
      time: Math.floor(new Date(point.timestamp).getTime() / 1000) as any,
      value: point.awayWinProbability,
    }))

    homeSeries.setData(homeData)
    drawSeries.setData(drawData)
    awaySeries.setData(awayData)

    // 데이터 포인트 마커 추가 (각 시간대별)
    const markers = uniqueTrend.map((point, index) => {
      const time = Math.floor(new Date(point.timestamp).getTime() / 1000) as any
      const isLatest = index === uniqueTrend.length - 1  // 🎨 최신 포인트
      
      // 최고값을 가진 팀에만 마커 표시
      const maxProb = Math.max(
        point.homeWinProbability,
        point.drawProbability,
        point.awayWinProbability
      )
      
      let color = '#9ca3af'
      let position: 'belowBar' | 'aboveBar' = 'aboveBar'
      
      if (maxProb === point.homeWinProbability) {
        color = '#3b82f6'
        position = 'aboveBar'
      } else if (maxProb === point.awayWinProbability) {
        color = '#ef4444'
        position = 'belowBar'
      }
      
      return {
        time,
        position,
        color,
        shape: 'circle' as const,
        size: isLatest ? 1.5 : 0.5,  // 🎨 최신 포인트 크게
      }
    })
    
    // 홈팀 시리즈에 마커 추가
    homeSeries.setMarkers(markers.filter(m => m.color === '#3b82f6'))
    // 원정팀 시리즈에 마커 추가
    awaySeries.setMarkers(markers.filter(m => m.color === '#ef4444'))

    // Y축 범위 수동 설정
    chart.priceScale('right').applyOptions({
      autoScale: false,
      scaleMargins: {
        top: 0.1,
        bottom: 0.1,
      },
    })
    
    // 모든 시리즈에 동일한 Y축 범위 적용
    homeSeries.priceScale().applyOptions({
      autoScale: false,
      mode: 0, // Normal
      invertScale: false,
      alignLabels: true,
      borderVisible: true,
      borderColor: darkMode ? '#1f1f1f' : '#e5e7eb',
      scaleMargins: {
        top: 0.1,
        bottom: 0.1,
      },
    })

    chart.timeScale().fitContent()
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f]">
      {/* SEO용 H1 태그 - 화면에서 숨김 */}
      <h1 className="sr-only">
        실시간 해외축구 경기 예측 & 프리뷰 플랫폼 · Trend Soccer
      </h1>
      
      {/* 🔥 SEO용 정적 콘텐츠 - 애드센스/검색엔진 봇용 */}
      <section className="sr-only">
        <h2>해외축구 실시간 배당 분석</h2>
        <p>
          Trend Soccer는 프리미어리그, 라리가, 분데스리가, 세리에A, 리그1, 
          챔피언스리그 등 주요 유럽 축구 리그의 실시간 배당 분석과 
          경기 예측을 제공하는 전문 플랫폼입니다.
        </p>
        <p>
          데이터 기반 승률 분석, 24시간 트렌드 차트, AI 예측 알고리즘으로 
          스마트한 축구 분석을 경험하세요. 매일 업데이트되는 경기 일정과 
          상세한 팀 통계, H2H 전적 분석을 무료로 제공합니다.
        </p>
        <h3>주요 기능</h3>
        <ul>
          <li>실시간 배당률 변동 추적 및 트렌드 분석</li>
          <li>24시간 승률 트렌드 차트 시각화</li>
          <li>AI 기반 경기 예측 및 PICK 추천</li>
          <li>팀 순위표 및 리그 통계</li>
          <li>H2H 상대전적 분석</li>
          <li>실시간 라인업 및 선발 명단</li>
        </ul>
        <h3>지원 리그</h3>
        <p>
          UEFA 챔피언스리그, UEFA 유로파리그, UEFA 컨퍼런스리그,
          잉글랜드 프리미어리그, 스페인 라리가, 독일 분데스리가, 
          이탈리아 세리에A, 프랑스 리그1, 네덜란드 에레디비시, 
          포르투갈 프리메이라리가, FA컵, 코파델레이, DFB포칼, 
          코파이탈리아 등 20개 이상의 리그를 지원합니다.
        </p>
        <h3>서비스 소개</h3>
        <p>
          Trend Soccer는 축구 팬들을 위한 무료 경기 분석 플랫폼입니다. 
          실시간으로 업데이트되는 배당률 데이터를 바탕으로 승률을 계산하고, 
          지난 24시간 동안의 배당 변동을 차트로 시각화하여 제공합니다. 
          경기 전 팀의 최근 폼, 상대 전적, 예상 라인업까지 
          한눈에 확인할 수 있습니다.
        </p>
      </section>
      <section className="sr-only" lang="en">
  <h2>Real-Time Football Betting Odds Analysis</h2>
  <p>Trend Soccer provides real-time betting odds analysis and match predictions 
     for major European football leagues including Premier League, La Liga, 
     Bundesliga, Serie A, Ligue 1, and UEFA Champions League.</p>
  <p>Experience smart football analysis with data-driven win probability calculations, 
     24-hour trend charts, and AI prediction algorithms. Free daily match schedules, 
     detailed team statistics, and H2H analysis.</p>
  <h3>Key Features</h3>
  <ul>
    <li>Real-time betting odds tracking and trend analysis</li>
    <li>24-hour win probability trend chart visualization</li>
    <li>AI-powered match predictions and PICK recommendations</li>
    <li>League standings and team statistics</li>
    <li>Head-to-head analysis</li>
    <li>Live lineups and starting XI</li>
  </ul>
</section>

      {/* 승률 배너 (자동 스크롤) */}
      
      {/* 데스크톱: 세로형 카드 */}
      <div className="hidden md:block bg-[#0f0f0f] border-b border-gray-900">
        <div className="py-2 overflow-hidden">
          <div 
            ref={desktopScrollRef}
            className="flex gap-4 px-4 overflow-x-auto scrollbar-hide"
            style={{ scrollBehavior: 'auto' }}
          >
            {(() => {
              // 🆕 상단 롤링은 항상 전체 경기 기준
              const bannerMatches = allMatchesForBanner.length > 0 ? allMatchesForBanner : matches
              const uniqueMatches = bannerMatches.slice(0, 20)
              // 무한 스크롤을 위해 2번 반복
              return [...uniqueMatches, ...uniqueMatches].map((match, index) => {
              const currentTrend = trendData[match.id]
              const latestTrend = currentTrend?.[currentTrend.length - 1]
              
              const homeWin = latestTrend 
                ? Math.round(latestTrend.homeWinProbability)
                : match.homeWinRate
              const awayWin = latestTrend 
                ? Math.round(latestTrend.awayWinProbability)
                : match.awayWinRate
              
              const homeTeam = currentLanguage === 'ko' 
                ? (match.homeTeamKR || match.homeTeam)
                : match.homeTeam
              const homeTeamDisplay = homeTeam.length > 15 
                ? homeTeam.substring(0, 15) + '...' 
                : homeTeam
              
              const awayTeam = currentLanguage === 'ko'
                ? (match.awayTeamKR || match.awayTeam)
                : match.awayTeam
              const awayTeamDisplay = awayTeam.length > 15 
                ? awayTeam.substring(0, 15) + '...' 
                : awayTeam
              
              const isHomeWinning = homeWin > awayWin
              const winningTeam = isHomeWinning ? homeTeamDisplay : awayTeamDisplay
              const winningCrest = isHomeWinning ? match.homeCrest : match.awayCrest
              const winProbability = isHomeWinning ? homeWin : awayWin
              
              return (
                <div
                  key={`${match.id}-${index}`}
                  onClick={() => {
                    // 경기 카드로 스크롤
                    const element = document.getElementById(`match-card-${match.id}`)
                    if (element) {
                      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }
                    // 경기 확장
                    handleMatchClick(match)
                  }}
                  className={`flex flex-col p-2 rounded-lg min-w-[140px] cursor-pointer transition-all bg-[#1a1a1a] border border-gray-800 ${
                    expandedMatchId === match.id ? 'ring-2 ring-blue-500' : 'hover:scale-105 hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <img 
                      src={winningCrest} 
                      alt={winningTeam} 
                      className="w-6 h-6"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><text y="24" font-size="24">⚽</text></svg>'
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-bold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {winningTeam}
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                        {isHomeWinning ? (currentLanguage === 'ko' ? '홈' : 'Home') : (currentLanguage === 'ko' ? '원정' : 'Away')}
                      </div>
                    </div>
                  </div>
                  
                  <div className={`text-xl font-black ${
                    darkMode ? 'text-white' : 'text-black'
                  }`}>
                    {winProbability}%
                  </div>
                  <div className={`text-xs font-medium ${darkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {currentLanguage === 'ko' ? '승률' : 'Win Probability'}
                  </div>
                  
                  <div className={`text-xs font-medium mt-1 pt-1 border-t ${
                    darkMode ? 'border-gray-800 text-gray-400' : 'border-gray-200 text-gray-600'
                  }`}>
                    {match.homeTeam} - {match.awayTeam}
                  </div>
                  <div className={`text-xs ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    {formatTime(match.utcDate)}
                  </div>
                </div>
              )
            })
          })()}
          </div>
        </div>
      </div>

      {/* 모바일: 콤팩트 가로형 */}
      <div className="hidden bg-[#0f0f0f] border-b border-gray-900">
        <div className="py-2 overflow-hidden">
          <div 
            ref={scrollContainerRef}
            className="flex gap-2 px-3 overflow-x-auto scrollbar-hide"
            style={{ scrollBehavior: 'auto' }}
          >
            {(() => {
              const uniqueMatches = matches.slice(0, 20)
              return [...uniqueMatches, ...uniqueMatches].map((match, index) => {
                const currentTrend = trendData[match.id]
                const latestTrend = currentTrend?.[currentTrend.length - 1]
                
                const homeWin = latestTrend 
                  ? Math.round(latestTrend.homeWinProbability)
                  : match.homeWinRate
                const awayWin = latestTrend 
                  ? Math.round(latestTrend.awayWinProbability)
                  : match.awayWinRate
                
                const homeTeam = currentLanguage === 'ko' 
                  ? (match.homeTeamKR || match.homeTeam)
                  : match.homeTeam
                const homeTeamDisplay = homeTeam.length > 8 
                  ? homeTeam.substring(0, 8) + '...' 
                  : homeTeam
                
                const awayTeam = currentLanguage === 'ko'
                  ? (match.awayTeamKR || match.awayTeam)
                  : match.awayTeam
                const awayTeamDisplay = awayTeam.length > 8 
                  ? awayTeam.substring(0, 8) + '...' 
                  : awayTeam
                
                const isHomeWinning = homeWin > awayWin
                const winningTeam = isHomeWinning ? homeTeamDisplay : awayTeamDisplay
                const winningCrest = isHomeWinning ? match.homeCrest : match.awayCrest
                const winProbability = isHomeWinning ? homeWin : awayWin
                
                return (
                  <div
                    key={`mobile-${match.id}-${index}`}
                    onClick={() => {
                      const element = document.getElementById(`match-card-${match.id}`)
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      }
                      handleMatchClick(match)
                    }}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all bg-[#1a1a1a] border border-gray-800 whitespace-nowrap ${
                      expandedMatchId === match.id ? 'ring-2 ring-blue-500' : 'hover:border-gray-700'
                    }`}
                  >
                    <img 
                      src={winningCrest} 
                      alt={winningTeam} 
                      className="w-6 h-6 flex-shrink-0"
                      onError={(e) => {
                        e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><text y="18" font-size="18">⚽</text></svg>'
                      }}
                    />
                    <span className="text-sm font-bold text-white">
                      {winningTeam}
                    </span>
                    <span className="text-lg font-black text-blue-400">
                      {winProbability}%
                    </span>
                  </div>
                )
              })
            })()}
          </div>
        </div>
      </div>

      {/* 트렌드 컨텐츠 영역 */}
      <div className="container mx-auto px-4 pt-0 md:py-3 pb-20 lg:pb-3">
        {/* TOP 하이라이트 섹션 - 메인 레이아웃과 동일한 너비 */}

        
        <div className="flex gap-8 relative">
          {/* 광고 배너 - Popular Leagues 왼쪽에 배치 (PC 전용) */}
          <aside className={`hidden xl:block flex-shrink-0 w-[300px]`} style={{ marginLeft: '-332px' }}>
            <div className="sticky top-20">
              <AdBanner slot="sidebar" />
            </div>
          </aside>

          {/* 왼쪽 사이드바: Popular Leagues (PC 전용) */}
          <aside className={`hidden lg:block w-64 flex-shrink-0`}>
            <div className="space-y-6">
              {/* Popular Leagues */}
              <div className={`rounded-2xl p-4 ${
                darkMode ? 'bg-[#1a1a1a] border border-gray-800' : 'bg-white border border-gray-200'
              }`}>
                <h2 className={`text-sm font-bold mb-3 px-4 ${
                  darkMode ? 'text-gray-500' : 'text-gray-500'
                }`}>
                  {currentLanguage === 'ko' ? '리그 선택' : 'SELECT LEAGUE'}
                </h2>
                <nav className="space-y-1">
                  {LEAGUE_GROUPS.map((group) => {
                    const isExpanded = expandedGroups.has(group.id)
                    const hasSelectedLeague = group.leagues.some(l => l.code === selectedLeague)
                    const isAllGroup = group.id === 'all'
                    
                    return (
                      <div key={group.id}>
                        {/* 전체 그룹은 바로 리그 버튼 표시 */}
                        {isAllGroup ? (
                          group.leagues.map((league) => (
                            <button
                              key={league.code}
                              onClick={() => handleLeagueSelect(league.code, group.id)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all text-left ${
                                selectedLeague === league.code
                                  ? 'bg-[#A3FF4C] text-gray-900'
                                  : darkMode
                                    ? 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-300'
                                    : 'text-gray-700 hover:bg-gray-50'
                              }`}
                            >
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center p-1 flex-shrink-0 ${
                                selectedLeague === league.code ? 'bg-white/90' : 'bg-white'
                              }`}>
                                <img 
                                  src={league.logo} 
                                  alt={league.name}
                                  className="w-full h-full object-contain"
                                />
                              </div>
                              <span className="text-sm flex-1 truncate">
                                {currentLanguage === 'ko' ? league.name : league.nameEn}
                              </span>
                            </button>
                          ))
                        ) : (
                          <>
                            {/* 국가/지역 헤더 (클릭하면 펼침/접힘) */}
                            <button
                              onClick={() => toggleGroup(group.id)}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                                hasSelectedLeague
                                  ? darkMode
                                    ? 'bg-gray-800/70 text-white'
                                    : 'bg-gray-100 text-gray-900'
                                  : darkMode
                                    ? 'text-gray-400 hover:bg-gray-800/30 hover:text-gray-300'
                                    : 'text-gray-600 hover:bg-gray-50'
                              }`}
                            >

                              <span className="text-sm font-medium flex-1">
                                {currentLanguage === 'ko' ? group.region : group.regionEn}
                              </span>
                              <svg 
                                className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
                                fill="none" 
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                            
                            {/* 리그 목록 (펼쳐진 경우) */}
                            <div className={`overflow-hidden transition-all duration-200 ${
                              isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                            }`}>
                              <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-700/30 pl-2">
                                {group.leagues.map((league) => (
                                  <button
                                    key={league.code}
                                    onClick={() => handleLeagueSelect(league.code, group.id)}
                                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg font-medium transition-all text-left ${
                                      selectedLeague === league.code
                                        ? 'bg-[#A3FF4C] text-gray-900'
                                        : darkMode
                                          ? 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-300'
                                          : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                  >
                                    <div className={`w-6 h-6 rounded-md flex items-center justify-center p-0.5 flex-shrink-0 ${
                                      selectedLeague === league.code ? 'bg-white/90' : 'bg-white'
                                    }`}>
                                      <img 
                                        src={league.logo} 
                                        alt={league.name}
                                        className="w-full h-full object-contain"
                                      />
                                    </div>
                                    <span className="text-sm flex-1 truncate">
                                      {currentLanguage === 'ko' ? league.name : league.nameEn}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )
                  })}
                </nav>
              </div>

              {/* 블로그 미리보기 - ✨ 반짝이는 효과 */}
              <div className="shimmer-card glow-effect corner-sparkle overflow-hidden">
                <BlogPreviewSidebar darkMode={darkMode} />
              </div>
            </div>
          </aside>

          {/* 메인 콘텐츠 */}
          <main className="flex-1 min-w-0">
            
            {/* 🔴 라이브 중계 배너 */}
            {liveCount > 0 && (
              <a 
                href="/live"
                className={`block mb-6 rounded-2xl p-6 cursor-pointer transition-all hover:scale-[1.02] ${
                  darkMode 
                    ? 'bg-gradient-to-r from-red-600 via-pink-600 to-purple-600' 
                    : 'bg-gradient-to-r from-red-500 via-pink-500 to-purple-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-4 h-4 bg-white rounded-full animate-pulse" />
                    <div>
                      <h2 className="text-2xl font-bold text-white mb-1">
                        🔴 {currentLanguage === 'ko' ? `지금 ${liveCount}개 경기 진행 중!` : `${liveCount} Live Matches Now!`}
                      </h2>
                      <p className="text-white/90 text-sm">
                        {currentLanguage === 'ko' 
                          ? '실시간 점수와 배당 변화를 확인하세요 • 15초마다 자동 업데이트'
                          : 'Check live scores and odds • Auto-update every 15 seconds'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="text-white text-5xl font-bold hidden sm:block">
                    →
                  </div>
                </div>
              </a>
            )}
            
            {/* 상단 배너 728x90 - 날짜 필터 위 (데스크톱 전용) */}
            <div className="hidden lg:flex justify-center mb-6">
              <AdBanner slot="desktop_banner" />
            </div>

        {/* 🔥 모바일 PICK 배너 - 컴팩트 버전 (최상단) */}
        <a 
          href="/premium"
          className="lg:hidden block mb-3 active:scale-[0.98] transition-transform"
        >
          <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 rounded-xl p-[1.5px] shadow-lg shadow-orange-500/20">
            <div className="bg-[#0a0a0f] rounded-xl px-4 py-3">
              <div className="flex items-center justify-between">
                {/* 왼쪽: 타이틀 + 적중률 */}
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔥</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-sm">
                        {currentLanguage === 'ko' ? '트렌드 PICK' : 'Trend PICK'}
                      </span>
                      <span className="text-[9px] text-green-400 bg-green-500/20 px-1.5 py-0.5 rounded-full animate-pulse font-medium">
                        ● LIVE
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-yellow-400 font-black text-lg">{avgAccuracy}%</span>
                      <span className="text-gray-500 text-[10px]">적중률</span>
                      <span className="text-gray-600">|</span>
                      <span className="text-white font-bold text-xs">8,200+</span>
                      <span className="text-gray-500 text-[10px]">경기</span>
                    </div>
                  </div>
                </div>
                
                {/* 오른쪽: CTA */}
                <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg px-3 py-2">
                  <span className="text-white font-bold text-xs whitespace-nowrap">
                    {currentLanguage === 'ko' ? '확인하기 →' : 'View →'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </a>

        {/* 🆕 날짜 네비게이션 - 좌우 화살표 스타일 */}
        <div className="mb-4 md:mb-8">
          <div className="flex items-center justify-center gap-4">
            {/* 이전 날짜 */}
            <button
              onClick={goToPreviousDay}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${
                darkMode 
                  ? 'bg-[#1a1a1a] hover:bg-[#252525] text-gray-400 hover:text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {/* 현재 날짜 + 경기 수 */}
            <button
              onClick={goToToday}
              className={`flex items-center gap-3 px-5 py-2.5 rounded-xl transition-all ${
                darkMode 
                  ? 'bg-[#1a1a1a] hover:bg-[#252525]' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <span className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {formatDateDisplay(selectedDate)}
              </span>
              <span className={`text-sm px-2 py-0.5 rounded-full ${
                darkMode ? 'bg-[#252525] text-gray-400' : 'bg-gray-200 text-gray-600'
              }`}>
                {getMatchesForDate(selectedDate).length}{currentLanguage === 'ko' ? '경기' : ' matches'}
              </span>
              <svg className={`w-4 h-4 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* 다음 날짜 */}
            <button
              onClick={goToNextDay}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${
                darkMode 
                  ? 'bg-[#1a1a1a] hover:bg-[#252525] text-gray-400 hover:text-white' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

{/* 💻 PC: 유튜브 하이라이트 */}
<div className="hidden md:block mb-4">
  <TopHighlights darkMode={darkMode} />
</div>

        {/* 상단 광고 배너 */}
        

        {/* 로딩 */}
        {loading && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 animate-bounce">⚽</div>
            <p className={`text-xl ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {t.status.loading}
            </p>
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div className={`p-6 rounded-2xl text-center ${darkMode ? 'bg-gray-900 text-gray-300 border border-gray-800' : 'bg-gray-100 text-gray-700 border border-gray-200'}`}>
            <p className="text-lg font-medium">{error}</p>
          </div>
        )}

        {/* 경기 목록 - 1열 레이아웃 */}
        {!loading && !error && (
          <div className="grid gap-6 grid-cols-1">
            {(() => {
              // 🆕 선택된 날짜 기준 필터링 (한국 시간 기준)
              const selectedDateKey = formatDateKey(selectedDate)
              
              let filteredMatches = matches.filter(match => {
                const matchKST = getMatchKSTDate(match.utcDate)
                const matchKey = formatDateKey(matchKST)
                return matchKey === selectedDateKey
              })
              
              return (
                <>
                  {/* 경기 없음 안내 */}
                  {filteredMatches.length === 0 && (
                    <div className={`text-center py-12 rounded-2xl ${
                      darkMode ? 'bg-[#1a1a1a]' : 'bg-gray-100'
                    }`}>
                      <div className="text-4xl mb-4">⚽</div>
                      <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        {currentLanguage === 'ko' 
                          ? '이 날짜에 예정된 경기가 없습니다'
                          : 'No matches scheduled on this date'
                        }
                      </p>
                      <button
                        onClick={() => {
                          const earliest = findEarliestMatchDate()
                          if (earliest) setSelectedDate(earliest)
                        }}
                        className="mt-4 px-4 py-2 bg-[#A3FF4C] text-gray-900 rounded-lg text-sm font-medium hover:bg-[#8FE63D] transition-colors"
                      >
                        {currentLanguage === 'ko' ? '가장 빠른 경기로 이동' : 'Go to earliest match'}
                      </button>
                    </div>
                  )}

                  {filteredMatches.length === 0 ? (
                    null  // 이미 위에서 경기 없음 UI 표시
                  ) : (
                    <>
                      {/* ━━━━━━ FotMob 스타일: 리그별 그룹화 ━━━━━━ */}
                      {(() => {
                        // 리그별로 경기 그룹화
                        const matchesByLeague: { [key: string]: typeof filteredMatches } = {}
                        filteredMatches.forEach(match => {
                          const code = match.leagueCode || 'OTHER'
                          if (!matchesByLeague[code]) matchesByLeague[code] = []
                          matchesByLeague[code].push(match)
                        })

                        // LEAGUES 순서대로 정렬
                        const orderedLeagues = LEAGUES
                          .filter(l => l.code !== 'ALL' && matchesByLeague[l.code])
                          .map(l => l.code)
                        Object.keys(matchesByLeague).forEach(code => {
                          if (!orderedLeagues.includes(code)) orderedLeagues.push(code)
                        })

                        return orderedLeagues.map((leagueCode, leagueIndex) => {
                          const leagueMatches = matchesByLeague[leagueCode]
                          const league = LEAGUES.find(l => l.code === leagueCode)

                          return (
                            <React.Fragment key={leagueCode}>
                              {/* 📢 모바일 인피드 광고 - 2번째, 4번째 리그 뒤 */}
                              {(leagueIndex === 1 || leagueIndex === 3) && (
                                <div className="md:hidden py-2 mb-4">
                                  <div className="text-[10px] text-center mb-1 text-gray-600">스폰서</div>
                                  <div className="px-2">
                                    <AdSenseAd slot="mobile_infeed" format="auto" responsive={true} darkMode={darkMode} />
                                  </div>
                                </div>
                              )}

                              {/* 📢 PC 인피드 광고 - 3번째, 6번째 리그 뒤 */}
                              {(leagueIndex === 2 || leagueIndex === 5) && (
                                <div className={`hidden md:block py-2 rounded-xl mb-4 ${
                                  darkMode ? 'bg-[#111]' : 'bg-gray-50'
                                }`}>
                                  <div className={`text-[10px] text-center mb-1 ${
                                    darkMode ? 'text-gray-600' : 'text-gray-400'
                                  }`}>
                                    스폰서
                                  </div>
                                  <div className="px-4 flex justify-center">
                                    <AdSenseAd slot="horizontal" format="horizontal" responsive={false} darkMode={darkMode} />
                                  </div>
                                </div>
                              )}
                              
                              {/* 매치 리포트 삽입 (모바일만) */}
                              {/* 리그가 2개 이상이면 두 번째 리그 전에, 1개면 첫 번째 리그 후에 표시 */}
                              {leagueIndex === 1 && (
                                <div className="md:hidden mb-4">
                                  <MobileMatchReports darkMode={darkMode} />
                                </div>
                              )}
                              <div 
                                className={`rounded-xl overflow-hidden mb-4 ${
                                  darkMode ? 'bg-[#111]' : 'bg-white shadow-sm border border-gray-100'
                                }`}
                              >
                                {/* 리그 헤더 */}
                                <div className={`flex items-center gap-3 px-4 py-3 ${
                                  darkMode ? 'bg-[#0a0a0a]' : 'bg-gray-50'
                                }`}>
                                  {league?.isEmoji ? (
                                    <span className="text-xl">{league.logo}</span>
                                  ) : (
                                    <div className="w-6 h-6 bg-white rounded flex items-center justify-center p-0.5">
                                      <img 
                                        src={league?.logo || getLeagueLogo(leagueCode)} 
                                        alt={leagueCode}
                                        className="w-full h-full object-contain"
                                      />
                                    </div>
                                  )}
                                  <span className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {getLeagueName(leagueCode, currentLanguage)}
                                  </span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-200 text-gray-600'
                                  }`}>
                                    {leagueMatches.length}
                                  </span>
                                </div>

                              {/* 경기 목록 */}
                              <div className={`divide-y ${darkMode ? 'divide-gray-900' : 'divide-gray-100'}`}>
                                {leagueMatches.map((match) => {
                                  const currentTrend = trendData[match.id]
                                  const latestTrend = currentTrend?.[currentTrend.length - 1]
                                  const previousTrend = currentTrend?.[currentTrend.length - 2]
                                  
                                  const displayHomeProb = latestTrend ? latestTrend.homeWinProbability : (match.homeWinRate || 33.3)
                                  const displayDrawProb = latestTrend ? latestTrend.drawProbability : (match.drawRate || 33.3)
                                  const displayAwayProb = latestTrend ? latestTrend.awayWinProbability : (match.awayWinRate || 33.3)
                                  
                                  const homeChange = latestTrend && previousTrend 
                                    ? latestTrend.homeWinProbability - previousTrend.homeWinProbability : 0
                                  const awayChange = latestTrend && previousTrend 
                                    ? latestTrend.awayWinProbability - previousTrend.awayWinProbability : 0

                                  const homeTeamName = currentLanguage === 'ko' ? (match.homeTeamKR || match.homeTeam) : match.homeTeam
                                  const awayTeamName = currentLanguage === 'ko' ? (match.awayTeamKR || match.awayTeam) : match.awayTeam
                                  const truncate = (name: string, max: number) => name.length > max ? name.substring(0, max) + '...' : name
                                  const isExpanded = expandedMatchId === match.id

                                  return (
                                    <div 
                                      key={match.id}
                                      id={`match-card-${match.id}`}
                                      className={`transition-all duration-300 ${
                                        isExpanded ? 'bg-[#0d1f0d]' : ''
                                      }`}
                                    >
                                      {/* ━━━ 경기 행 (클릭 가능) ━━━ */}
                                      <div 
                                        onClick={() => handleMatchClick(match)}
                                        className={`flex items-center cursor-pointer px-3 py-3 md:px-4 ${
                                          darkMode ? 'hover:bg-[#1a1a1a]' : 'hover:bg-gray-50'
                                        } ${isExpanded ? '!bg-[#0d1f0d]' : ''}`}
                                      >
                                        {/* 시간 + 날짜 */}
                                        <div className="w-16 md:w-20 flex-shrink-0">
                                          <div className={`text-sm md:text-base font-bold tabular-nums ${
                                            isExpanded ? 'text-[#A3FF4C]' : darkMode ? 'text-gray-400' : 'text-gray-600'
                                          }`}>
                                            {formatTime(match.utcDate)}
                                          </div>
                                          <div className={`text-xs ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                                            {formatDate(match.utcDate, currentLanguage)}
                                          </div>
                                        </div>

                                        {/* 홈팀 */}
                                        <div className="flex-1 flex items-center justify-end gap-2 min-w-0 pr-2">
                                          <span className={`text-sm md:text-base font-medium truncate text-right ${
                                            darkMode ? 'text-white' : 'text-gray-900'
                                          }`}>
                                            {truncate(homeTeamName, 12)}
                                          </span>
                                          <img 
                                            src={match.homeCrest} 
                                            alt={match.homeTeam}
                                            className="w-7 h-7 md:w-8 md:h-8 object-contain flex-shrink-0"
                                            onError={(e) => {
                                              e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="10" fill="%23333"/></svg>'
                                            }}
                                          />
                                        </div>

                                        {/* 🆕 FotMob 스타일: 상태별 중앙 영역 */}
                                        {(() => {
                                          const matchStatus = getMatchStatus(match)
                                          const predicted = getPredictedWinner(match)
                                          const actual = getActualWinner(match)
                                          const isCorrect = predicted === actual

                                          // 종료된 경기
                                          if (matchStatus === 'FINISHED' && match.homeScore !== null && match.awayScore !== null) {
                                            return (
                                              <div className="w-24 md:w-28 flex-shrink-0 flex flex-col items-center justify-center">
                                                <span className="text-[10px] text-gray-500 mb-0.5">FT</span>
                                                <div className="flex items-center gap-2">
                                                  <span className={`text-lg font-bold ${match.homeScore > match.awayScore ? 'text-white' : 'text-gray-500'}`}>
                                                    {match.homeScore}
                                                  </span>
                                                  <span className="text-gray-600">-</span>
                                                  <span className={`text-lg font-bold ${match.awayScore > match.homeScore ? 'text-white' : 'text-gray-500'}`}>
                                                    {match.awayScore}
                                                  </span>
                                                </div>
                                              </div>
                                            )
                                          }

                                          // 진행 중 경기
                                          if (matchStatus === 'LIVE' || matchStatus === 'HALFTIME') {
                                            return (
                                              <div className="w-24 md:w-28 flex-shrink-0 flex flex-col items-center justify-center">
                                                <span className="text-[10px] text-red-500 font-bold flex items-center gap-1 mb-0.5">
                                                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                                  {matchStatus === 'HALFTIME' ? 'HT' : 'LIVE'}
                                                </span>
                                                <div className="flex items-center gap-2">
                                                  <span className="text-lg font-bold text-white">
                                                    {match.homeScore ?? 0}
                                                  </span>
                                                  <span className="text-gray-600">-</span>
                                                  <span className="text-lg font-bold text-white">
                                                    {match.awayScore ?? 0}
                                                  </span>
                                                </div>
                                              </div>
                                            )
                                          }

                                          // 예정된 경기 (기본)
                                          return (
                                            <div className="w-20 md:w-24 flex-shrink-0 flex justify-center">
                                              <div className={`text-xs font-bold px-3 py-1 rounded ${
                                                isExpanded 
                                                  ? 'bg-[#A3FF4C]/20 text-[#A3FF4C] border border-[#A3FF4C]/30' 
                                                  : darkMode ? 'bg-gray-800 text-gray-500' : 'bg-gray-100 text-gray-500'
                                              }`}>
                                                VS
                                              </div>
                                            </div>
                                          )
                                        })()}

                                        {/* 원정팀 */}
                                        <div className="flex-1 flex items-center justify-start gap-2 min-w-0 pl-2">
                                          <img 
                                            src={match.awayCrest} 
                                            alt={match.awayTeam}
                                            className="w-7 h-7 md:w-8 md:h-8 object-contain flex-shrink-0"
                                            onError={(e) => {
                                              e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><circle cx="12" cy="12" r="10" fill="%23333"/></svg>'
                                            }}
                                          />
                                          <span className={`text-sm md:text-base font-medium truncate ${
                                            darkMode ? 'text-white' : 'text-gray-900'
                                          }`}>
                                            {truncate(awayTeamName, 12)}
                                          </span>
                                        </div>

                                        {/* 확장 화살표 */}
                                        <div className="w-8 flex-shrink-0 flex items-center justify-end gap-1">
                                          <svg 
                                            className={`w-4 h-4 transition-transform duration-300 ${
                                              isExpanded ? 'rotate-180 text-[#A3FF4C]' : darkMode ? 'text-gray-600' : 'text-gray-400'
                                            }`}
                                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                          >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                          </svg>
                                        </div>
                                      </div>

                                      {/* ━━━ 확장된 상세 정보 ━━━ */}
                                      {isExpanded && (
                                        <div className="border-t border-[#A3FF4C]/20 animate-fadeIn">
                                          {/* 🆕 종료된 경기: 스코어 + 승리팀만 깔끔하게 */}
                                          {(() => {
                                            const matchStatus = getMatchStatus(match)
                                            if (matchStatus === 'FINISHED' && match.homeScore !== null && match.awayScore !== null) {
                                              const actual = getActualWinner(match)
                                              const homeWin = match.homeScore > match.awayScore
                                              const awayWin = match.awayScore > match.homeScore
                                              const isDraw = match.homeScore === match.awayScore

                                              return (
                                                <div className="px-4 py-4">
                                                  {/* 최종 스코어 - 크게 표시 */}
                                                  <div className="flex items-center justify-center gap-6 mb-3">
                                                    {/* 홈팀 */}
                                                    <div className={`flex items-center gap-3 ${homeWin ? 'opacity-100' : 'opacity-50'}`}>
                                                      <span className={`text-sm font-medium ${homeWin ? 'text-white' : 'text-gray-500'}`}>
                                                        {homeTeamName}
                                                      </span>
                                                      {homeWin && <span className="text-[#A3FF4C] text-xs">승</span>}
                                                    </div>
                                                    
                                                    {/* 스코어 */}
                                                    <div className="flex items-center gap-3 px-4 py-2 bg-gray-800 rounded-lg">
                                                      <span className={`text-2xl font-bold ${homeWin ? 'text-white' : 'text-gray-400'}`}>
                                                        {match.homeScore}
                                                      </span>
                                                      <span className="text-gray-600 text-lg">-</span>
                                                      <span className={`text-2xl font-bold ${awayWin ? 'text-white' : 'text-gray-400'}`}>
                                                        {match.awayScore}
                                                      </span>
                                                    </div>
                                                    
                                                    {/* 원정팀 */}
                                                    <div className={`flex items-center gap-3 ${awayWin ? 'opacity-100' : 'opacity-50'}`}>
                                                      {awayWin && <span className="text-[#A3FF4C] text-xs">승</span>}
                                                      <span className={`text-sm font-medium ${awayWin ? 'text-white' : 'text-gray-500'}`}>
                                                        {awayTeamName}
                                                      </span>
                                                    </div>
                                                  </div>
                                                  
                                                  {/* 결과 텍스트 */}
                                                  <div className="text-center">
                                                    <span className={`text-xs px-3 py-1 rounded-full ${
                                                      isDraw 
                                                        ? 'bg-gray-700 text-gray-300' 
                                                        : 'bg-[#A3FF4C]/20 text-[#A3FF4C]'
                                                    }`}>
                                                      {isDraw 
                                                        ? (currentLanguage === 'ko' ? '무승부' : 'Draw')
                                                        : (currentLanguage === 'ko' 
                                                            ? `${homeWin ? homeTeamName : awayTeamName} 승리`
                                                            : `${homeWin ? homeTeamName : awayTeamName} Win`)
                                                      }
                                                    </span>
                                                  </div>
                                                  
                                                  {/* 🆕 하이라이트 영역 */}
                                                  <div className="mt-4 border-t border-gray-800 pt-4">
                                                    {loadingHighlight === match.id ? (
                                                      <div className="flex items-center justify-center py-12">
                                                        <div className="w-8 h-8 border-2 border-gray-600 border-t-[#A3FF4C] rounded-full animate-spin"></div>
                                                      </div>
                                                    ) : highlights[match.id] && highlights[match.id].matchviewUrl ? (
                                                      <div className="relative">
                                                        <iframe
                                                          src={highlights[match.id].matchviewUrl}
                                                          className="w-full border-0 rounded-lg"
                                                          style={{ height: '600px', minHeight: '500px' }}
                                                          allow="autoplay; fullscreen"
                                                          allowFullScreen
                                                          loading="lazy"
                                                        />
                                                        <div className="absolute top-2 right-2">
                                                          <a
                                                            href={highlights[match.id].matchviewUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-black/70 hover:bg-black/90 rounded-lg text-xs text-white transition-colors"
                                                          >
                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                            </svg>
                                                            {currentLanguage === 'ko' ? '새 탭' : 'New tab'}
                                                          </a>
                                                        </div>
                                                      </div>
                                                    ) : (
                                                      <div className="py-8 text-center">
                                                        <div className="text-3xl mb-2">📺</div>
                                                        <p className="text-gray-500 text-sm">
                                                          {currentLanguage === 'ko' ? '하이라이트 준비 중' : 'Highlights coming soon'}
                                                        </p>
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              )
                                            }
                                            return null
                                          })()}

                                          {/* 예정된 경기: 기존 승률 바 + 트렌드 */}
                                          {getMatchStatus(match) === 'SCHEDULED' && (
                                            <>
                                          {/* 승률 바 */}
                                          <div className="px-4 py-4">
                                            <div className="flex h-2 rounded-full overflow-hidden bg-gray-900 mb-3">
                                              <div className="bg-blue-500 transition-all duration-500" style={{ width: `${displayHomeProb}%` }} />
                                              <div className="bg-gray-600 transition-all duration-500" style={{ width: `${displayDrawProb}%` }} />
                                              <div className="bg-red-500 transition-all duration-500" style={{ width: `${displayAwayProb}%` }} />
                                            </div>

                                            <div className="flex items-center justify-between text-sm">
                                              <div className="flex items-center gap-2">
                                                <span className="text-blue-400 font-bold">{Math.round(displayHomeProb)}%</span>
                                                {homeChange !== 0 && (
                                                  <span className={`text-xs ${homeChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {homeChange > 0 ? '↑' : '↓'}{Math.abs(homeChange).toFixed(1)}
                                                  </span>
                                                )}
                                              </div>
                                              <span className="text-gray-500 font-medium">{Math.round(displayDrawProb)}%</span>
                                              <div className="flex items-center gap-2">
                                                {awayChange !== 0 && (
                                                  <span className={`text-xs ${awayChange > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {awayChange > 0 ? '↑' : '↓'}{Math.abs(awayChange).toFixed(1)}
                                                  </span>
                                                )}
                                                <span className="text-red-400 font-bold">{Math.round(displayAwayProb)}%</span>
                                              </div>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-gray-600 mt-1">
                                              <span>{currentLanguage === 'ko' ? '홈 승' : 'Home'}</span>
                                              <span>{currentLanguage === 'ko' ? '무승부' : 'Draw'}</span>
                                              <span>{currentLanguage === 'ko' ? '원정 승' : 'Away'}</span>
                                            </div>
                                          </div>

                                          {/* 액션 버튼 */}
                                          <div className="flex gap-2 px-4 pb-4">
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                setSelectedMatchForLineup(match)
                                                setLineupModalOpen(true)
                                              }}
                                              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#A3FF4C] hover:bg-[#92FF3A] text-gray-900 text-sm font-semibold transition-all"
                                            >
                                              <span>⚽</span>
                                              <span>{currentLanguage === 'ko' ? '라인업' : 'Lineup'}</span>
                                            </button>
                                          </div>

                                          {/* AI 경기 예측 분석 */}
                                          <div className="border-t border-[#A3FF4C]/20">
                                            <MatchPrediction
                                              fixtureId={match.id}
                                              homeTeam={match.homeTeam}
                                              awayTeam={match.awayTeam}
                                              homeTeamKR={match.homeTeamKR}
                                              awayTeamKR={match.awayTeamKR}
                                              homeTeamId={match.home_team_id}
                                              awayTeamId={match.away_team_id}
                                              trendData={trendData[match.id] || []}
                                              darkMode={darkMode}
                                            />
                                          </div>
                                            </>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                            
                            {/* 📱 모바일 인피드 배너 - 첫 번째 리그 다음에 표시 */}
                            {leagueIndex === 0 && (
                              <div className="block lg:hidden mb-4 flex justify-center">
                                <AdBanner slot="mobile_bottom" />
                              </div>
                            )}
                            
                            {/* 📱 매치 리포트 - 리그가 1개뿐일 때 첫 번째 리그 후에 표시 (모바일만) */}
                            {orderedLeagues.length === 1 && leagueIndex === 0 && (
                              <div className="md:hidden mb-4">
                                <MobileMatchReports darkMode={darkMode} />
                              </div>
                            )}
                          </React.Fragment>
                          )
                        })
                      })()}
            </>
          )}
        </>
      )
    })()}
          </div>
        )}

          </main>

          {/* 우측 순위표 사이드바 */}
          <aside className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-24 space-y-4">
            {/* 📢 AdSense - 우측 사이드바 상단 */}
            <div className={`rounded-xl overflow-hidden ${
              darkMode ? 'bg-[#1a1a1a]' : 'bg-white border border-gray-200'
            }`}>
              <div className={`text-[10px] text-center py-1 ${
                darkMode ? 'text-gray-600' : 'text-gray-400'
              }`}>
                AD
              </div>
              <div className="flex justify-center p-2">
                <AdSenseAd slot="sidebar_right_top" format="rectangle" darkMode={darkMode} />
              </div>
            </div>
            
            {/* 전체 리그 선택 시 - 캐러셀 */}
            {selectedLeague === 'ALL' && (
              <div className={`rounded-xl overflow-hidden select-none ${
                darkMode ? 'bg-[#1a1a1a]' : 'bg-white border border-gray-200'
              }`}>
                {/* 헤더 with 좌우 화살표 */}
                <div className={`p-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    {/* 왼쪽 화살표 */}
                    <button
                      onClick={() => {
                        const newIndex = currentLeagueIndex === 0 
                          ? standingsLeagues.length - 1 
                          : currentLeagueIndex - 1
                        setCurrentLeagueIndex(newIndex)
                        setStandings(allLeagueStandings[standingsLeagues[newIndex].code] || [])
                      }}
                      className={`p-2 rounded-lg transition-colors ${
                        darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                      }`}
                    >
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>

                    {/* 리그명 + 로고 */}
                    <div className="flex items-center gap-3">
                      <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {currentLanguage === 'ko' 
                          ? (standingsLeagues[currentLeagueIndex]?.name || '프리미어리그')
                          : (standingsLeagues[currentLeagueIndex]?.nameEn || 'Premier League')
                        }
                      </h2>
                      <div className="w-10 h-10 bg-white rounded-lg p-1.5 flex items-center justify-center">
                        {standingsLeagues[currentLeagueIndex]?.isEmoji ? (
                          <span className="text-2xl">{standingsLeagues[currentLeagueIndex]?.logo}</span>
                        ) : (
                          <img 
                            src={standingsLeagues[currentLeagueIndex]?.logo}
                            alt={standingsLeagues[currentLeagueIndex]?.name}
                            className="w-full h-full object-contain"
                            onError={(e) => {
                              e.currentTarget.src = 'https://via.placeholder.com/40?text=?'
                            }}
                          />
                        )}
                      </div>
                    </div>

                    {/* 오른쪽 화살표 */}
                    <button
                      onClick={() => {
                        const newIndex = currentLeagueIndex === standingsLeagues.length - 1 
                          ? 0 
                          : currentLeagueIndex + 1
                        setCurrentLeagueIndex(newIndex)
                        setStandings(allLeagueStandings[standingsLeagues[newIndex].code] || [])
                      }}
                      className={`p-2 rounded-lg transition-colors ${
                        darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                      }`}
                    >
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* 테이블 헤더 */}
                <div className={`px-4 py-3 flex items-center text-xs font-bold tracking-wide ${
                  darkMode ? 'text-gray-500 bg-[#0f0f0f] border-b border-gray-800' : 'text-gray-500 bg-gray-50 border-b border-gray-200'
                }`}>
                  <div className="w-8">#</div>
                  <div className="flex-1">{currentLanguage === 'ko' ? '팀명' : 'TEAM'}</div>
                  <div className="w-12 text-center">{currentLanguage === 'ko' ? '경기' : 'MP'}</div>
                  <div className="w-12 text-center">{currentLanguage === 'ko' ? '득실' : 'GD'}</div>
                  <div className="w-12 text-right">{currentLanguage === 'ko' ? '승점' : 'PTS'}</div>
                </div>

                {/* 순위표 내용 */}
                <div className="p-0">
                  {standingsLoading ? (
                    <div className="text-center py-12">
                      <div className="text-3xl mb-2 animate-bounce">⚽</div>
                      <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        로딩 중...
                      </p>
                    </div>
                  ) : standings.length > 0 ? (
                    <div>
                      {standings.slice(0, standingsExpanded ? 20 : 5).map((team: any, index: number) => {
                        const position = team.position || index + 1
                        const isTopFour = position <= 4
                        const isRelegation = position >= 18
                        
                        return (
                          <div 
                            key={team.team?.id || index}
                            className={`flex items-center px-4 py-2.5 transition-colors ${
                              darkMode 
                                ? 'hover:bg-gray-800/50 border-b border-gray-800' 
                                : 'hover:bg-gray-50 border-b border-gray-100'
                            }`}
                          >
                            <div className="w-8 flex items-center">
                              <span className={`text-sm font-bold ${
                                isRelegation 
                                  ? 'text-red-500' 
                                  : isTopFour 
                                    ? 'text-green-500' 
                                    : darkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {position}
                              </span>
                            </div>

                            <div className="flex-1 flex items-center gap-2 min-w-0">
                              <img 
                                src={team.team?.crest || getTeamLogo(team.team?.name || '')}
                                alt={team.team?.name}
                                className="w-5 h-5 object-contain flex-shrink-0"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://via.placeholder.com/20?text=?'
                                }}
                              />
                              <span className={`text-sm font-medium truncate ${
                                darkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                {team.team?.name}
                              </span>
                            </div>

                            <div className={`w-12 text-center text-sm ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {team.playedGames || 10}
                            </div>
                            
                            <div className={`w-12 text-center text-sm ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {team.goalDifference > 0 ? '+' : ''}{team.goalDifference || 0}
                            </div>

                            <div className="w-12 text-right">
                              <span className="text-sm font-bold text-white">
                                {team.points || 0}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                      
                      {/* 펼치기/접기 버튼 */}
                      {standings.length > 5 && (
                        <button
                          type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStandingsExpanded(!standingsExpanded); }}
                          className={`w-full py-3 text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                            darkMode 
                              ? 'text-emerald-400 hover:bg-gray-800/50' 
                              : 'text-emerald-600 hover:bg-gray-50'
                          }`}
                        >
                          {standingsExpanded ? (
                            <>
                              <span>접기</span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </>
                          ) : (
                            <>
                              <span>전체 순위 보기</span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        순위표 정보가 없습니다
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* 특정 리그 선택 시 - 기존 순위표 (컵대회 제외) */}
            {selectedLeague !== 'ALL' && !CUP_COMPETITIONS.includes(selectedLeague) && (
              <div className={`rounded-xl overflow-hidden select-none ${
                darkMode ? 'bg-[#1a1a1a]' : 'bg-white border border-gray-200'
              }`}>
                {/* 헤더 */}
                <div className={`p-4 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <h2 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {getLeagueName(selectedLeague, currentLanguage)}
                    </h2>
                    {/* 리그 로고 */}
                    <div className="w-10 h-10 bg-white rounded-lg p-1.5 flex items-center justify-center">
                      {LEAGUES.find(l => l.code === selectedLeague)?.isEmoji ? (
                        <span className="text-2xl">{LEAGUES.find(l => l.code === selectedLeague)?.logo}</span>
                      ) : (
                        <img 
                          src={LEAGUES.find(l => l.code === selectedLeague)?.logo}
                          alt={getLeagueName(selectedLeague, currentLanguage)}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/40?text=?'
                          }}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* 테이블 헤더 */}
                <div className={`px-4 py-3 flex items-center text-xs font-bold tracking-wide ${
                  darkMode ? 'text-gray-500 bg-[#0f0f0f] border-b border-gray-800' : 'text-gray-500 bg-gray-50 border-b border-gray-200'
                }`}>
                  <div className="w-8">#</div>
                  <div className="flex-1">{currentLanguage === 'ko' ? '팀명' : 'TEAM'}</div>
                  <div className="w-12 text-center">{currentLanguage === 'ko' ? '경기' : 'MP'}</div>
                  <div className="w-12 text-center">{currentLanguage === 'ko' ? '득실' : 'GD'}</div>
                  <div className="w-12 text-right">{currentLanguage === 'ko' ? '승점' : 'PTS'}</div>
                </div>

                {/* 순위표 내용 */}
                <div className="p-0">
                  {standingsLoading ? (
                    <div className="text-center py-12">
                      <div className="text-3xl mb-2 animate-bounce">⚽</div>
                      <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        로딩 중...
                      </p>
                    </div>
                  ) : standings.length > 0 ? (
                    <div>
                      {standings.slice(0, standingsExpanded ? 20 : 5).map((team: any, index: number) => {
                        const position = team.position || index + 1
                        const isTopFour = position <= 4
                        const isRelegation = position >= 18
                        
                        return (
                          <div 
                            key={team.team?.id || index}
                            className={`flex items-center px-4 py-2.5 transition-colors ${
                              darkMode 
                                ? 'hover:bg-gray-800/50 border-b border-gray-800' 
                                : 'hover:bg-gray-50 border-b border-gray-100'
                            }`}
                          >
                            {/* 순위 */}
                            <div className="w-8 flex items-center">
                              <span className={`text-sm font-bold ${
                                isRelegation 
                                  ? 'text-red-500' 
                                  : isTopFour 
                                    ? 'text-green-500' 
                                    : darkMode ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {position}
                              </span>
                            </div>

                            {/* 팀 로고 + 이름 */}
                            <div className="flex-1 flex items-center gap-2 min-w-0">
                              <img 
                                src={team.team?.crest || getTeamLogo(team.team?.name || '')}
                                alt={team.team?.name}
                                className="w-5 h-5 object-contain flex-shrink-0"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://via.placeholder.com/20?text=?'
                                }}
                              />
                              <span className={`text-sm font-medium truncate ${
                                darkMode ? 'text-white' : 'text-gray-900'
                              }`}>
                                {team.team?.name}
                              </span>
                            </div>

                            {/* 경기 수 */}
                            <div className={`w-12 text-center text-sm ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {team.playedGames || 10}
                            </div>
                            
                            {/* 득실차 */}
                            <div className={`w-12 text-center text-sm ${
                              darkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {team.goalDifference > 0 ? '+' : ''}{team.goalDifference || 0}
                            </div>

                            {/* 승점 */}
                            <div className="w-12 text-right">
                              <span className="text-sm font-bold text-white">
                                {team.points || 0}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                      
                      {/* 펼치기/접기 버튼 */}
                      {standings.length > 5 && (
                        <button
                          type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStandingsExpanded(!standingsExpanded); }}
                          className={`w-full py-3 text-sm font-medium transition-colors flex items-center justify-center gap-1 ${
                            darkMode 
                              ? 'text-emerald-400 hover:bg-gray-800/50' 
                              : 'text-emerald-600 hover:bg-gray-50'
                          }`}
                        >
                          {standingsExpanded ? (
                            <>
                              <span>접기</span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            </>
                          ) : (
                            <>
                              <span>전체 순위 보기</span>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                        순위표 정보가 없습니다
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 📰 사이드바 뉴스 섹션 */}
            {sidebarNews.length > 0 && (
              <div className={`rounded-xl overflow-hidden select-none ${
                darkMode ? 'bg-[#1a1a1a]' : 'bg-white border border-gray-200'
              }`}>
                <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                  <h3 className={`text-sm font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    <span>{currentLanguage === 'ko' ? '지금 뜨는' : 'Trending'}</span>
                    <span className="text-emerald-500">{currentLanguage === 'ko' ? '축구 뉴스' : 'Football News'}</span>
                  </h3>
                </div>
                <div className="p-2">
                  {sidebarNews.map((news: any, idx: number) => {
                    // 시간 계산
                    const getTimeAgo = (dateString: string) => {
                      if (!dateString) return ''
                      const now = new Date()
                      const date = new Date(dateString)
                      const diffMs = now.getTime() - date.getTime()
                      const diffMins = Math.floor(diffMs / 60000)
                      const diffHours = Math.floor(diffMins / 60)
                      const diffDays = Math.floor(diffHours / 24)
                      
                      if (diffMins < 60) return `${diffMins}분 전`
                      if (diffHours < 24) return `${diffHours}시간 전`
                      return `${diffDays}일 전`
                    }
                    
                    return (
                      <a
                        key={news.id || idx}
                        href={news.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block px-3 py-2.5 rounded-lg transition-colors ${
                          darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <p className={`text-sm leading-snug line-clamp-2 ${
                          darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
                        }`}>
                          {news.title}
                        </p>
                        {news.publishedAt && (
                          <span className={`text-[10px] mt-1 block ${
                            darkMode ? 'text-gray-500' : 'text-gray-400'
                          }`}>
                            {getTimeAgo(news.publishedAt)}
                          </span>
                        )}
                      </a>
                    )
                  })}
                </div>
                <a
                  href="/news"
                  className={`block text-center py-2.5 text-xs font-medium border-t transition-colors ${
                    darkMode 
                      ? 'border-gray-800 text-emerald-400 hover:bg-gray-800/50' 
                      : 'border-gray-200 text-emerald-600 hover:bg-gray-50'
                  }`}
                >
                  {currentLanguage === 'ko' ? '뉴스 더보기 →' : 'More News →'}
                </a>
              </div>
            )}

            {/* 📢 AdSense - 우측 사이드바 하단 */}
            <div className={`rounded-xl overflow-hidden ${
              darkMode ? 'bg-[#1a1a1a]' : 'bg-white border border-gray-200'
            }`}>
              <div className={`text-[10px] text-center py-1 ${
                darkMode ? 'text-gray-600' : 'text-gray-400'
              }`}>
                AD
              </div>
              <div className="flex justify-center p-2">
                <AdSenseAd slot="sidebar_right_bottom" format="rectangle" darkMode={darkMode} />
              </div>
            </div>
            </div>
          </aside>
        </div>
      </div>

      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes chartPulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }
        
        @keyframes chartGlow {
          0%, 100% {
            filter: drop-shadow(0 0 2px rgba(59, 130, 246, 0.3));
          }
          50% {
            filter: drop-shadow(0 0 8px rgba(59, 130, 246, 0.6));
          }
        }
        
        @keyframes slideInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
        
        .chart-container {
          animation: slideInFromLeft 0.6s ease-out;
        }
        
        .chart-latest-marker {
          animation: chartPulse 2s ease-in-out infinite;
        }
      `}</style>

      {/* H2H 모달 */}
      {selectedMatch && (
        <H2HModal
          isOpen={h2hModalOpen}
          onClose={() => {
            setH2hModalOpen(false)
            setSelectedMatch(null)
          }}
          homeTeam={selectedMatch.homeTeam}
          awayTeam={selectedMatch.awayTeam}
          league={selectedMatch.leagueCode}
          homeTeamLogo={selectedMatch.homeCrest}
          awayTeamLogo={selectedMatch.awayCrest}
        />
      )}

      {/* 🆕 라인업 모달 */}
      {lineupModalOpen && selectedMatchForLineup && (
        <LineupModal
          isOpen={lineupModalOpen}
          onClose={() => {
            setLineupModalOpen(false)
            setSelectedMatchForLineup(null)
          }}
          fixtureId={selectedMatchForLineup.id}
          homeTeam={selectedMatchForLineup.homeTeam}
          awayTeam={selectedMatchForLineup.awayTeam}
          darkMode={darkMode}
        />
      )}

      {/* 🔥 플로팅 PICK 배너 (PC 전용) */}
      <a 
        href="/premium"
        className="hidden lg:flex fixed bottom-8 right-20 z-[9999] group"
        style={{ position: 'fixed', bottom: '32px', right: '80px' }}
      >
        {/* 배경 글로우 효과 */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl blur-xl opacity-50 group-hover:opacity-80 transition-opacity" />
        
        {/* 메인 카드 */}
        <div className="relative bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 rounded-2xl p-1 shadow-2xl transform group-hover:scale-105 transition-all duration-300 overflow-hidden">
          {/* 반짝이 효과 */}
          <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 group-hover:left-full transition-all duration-700" />
          
          {/* 내부 컨텐츠 */}
          <div className="relative bg-black/90 rounded-xl px-5 py-4">
            {/* 상단 라벨 */}
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-xl">🔥</span>
              <span className="text-white font-bold text-sm">
                {currentLanguage === 'ko' ? '트렌드 PICK' : 'Trend PICK'}
              </span>
              <span className="text-[10px] text-green-400 bg-green-500/20 px-2 py-0.5 rounded animate-pulse">LIVE</span>
            </div>
            
            {/* 적중률 */}
            <div className="text-center mb-3">
              <div className="text-gray-400 text-xs mb-1">
                {currentLanguage === 'ko' ? '평균 적중률' : 'Avg. Accuracy'}
              </div>
              <div className="text-yellow-400 font-bold text-3xl">{avgAccuracy}%</div>
            </div>
            
            {/* CTA 버튼 */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg py-2 px-4 text-center group-hover:from-orange-400 group-hover:to-red-400 transition-all">
              <span className="text-white font-bold text-sm">
                {currentLanguage === 'ko' ? '무료로 예측 확인 →' : 'View Predictions →'}
              </span>
            </div>
          </div>
        </div>
      </a>

      {/* 📢 모바일 하단 고정 배너 (320x50) */}
      {!isMobileAdClosed && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-black/95 safe-area-bottom">
          <div className="relative flex justify-center py-2">
            <button
              onClick={() => setIsMobileAdClosed(true)}
              className="absolute top-1 left-2 w-5 h-5 bg-black/70 text-white text-xs rounded-full flex items-center justify-center hover:bg-black z-10"
            >
              ✕
            </button>
            <AdBanner slot="mobile_bottom" />
            <span className="absolute top-1 right-2 px-1.5 py-0.5 bg-black/50 text-white text-[10px] rounded">
              AD
            </span>
          </div>
        </div>
      )}
    </div>
  )
}