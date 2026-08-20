#!/usr/bin/env node
// scripts/prepare-font.mjs
//
// Pretendard 를 remotion/assets/ 로 복사한다. 최초 1회만 실행하면 된다.
//   npm i pretendard
//   node scripts/prepare-font.mjs
//
// 한글 완성형까지 서브셋한 파일(Pretendard-subset.woff2)을 이미 커밋해 뒀다면
// 이 스크립트를 실행할 필요는 없다. 폰트를 바꾸고 싶을 때만 쓴다.

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(ROOT, 'node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2')
const DEST = path.join(ROOT, 'remotion/assets/Pretendard-subset.woff2')

await fs.mkdir(path.dirname(DEST), { recursive: true })
await fs.copyFile(SRC, DEST)
const { size } = await fs.stat(DEST)
console.log(`✓ ${DEST} (${(size / 1024 / 1024).toFixed(2)} MB)`)
console.log('※ 용량을 줄이려면 fonttools 로 서브셋하세요:')
console.log('   pip install fonttools brotli')
console.log('   pyftsubset <src> --flavor=woff2 --unicodes=U+0020-007F,U+AC00-D7A3,U+3130-318F,U+2000-206F,U+2600-26FF')
