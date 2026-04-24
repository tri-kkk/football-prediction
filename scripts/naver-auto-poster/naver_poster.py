"""
네이버 블로그 자동 포스팅 (undetected-chromedriver)
SE ONE 에디터 HTML 구조 기반 (debug_editor.py로 분석)

핵심 셀렉터:
- 제목: .se-title-text .se-text-paragraph
- 본문: .se-component[data-a11y-title="본문"] .se-text-paragraph
- 정렬: button[data-name="align-drop-down-with-justify"]
- 카테고리: button[data-click-area="tpb*i.category"]
- 발행: button[data-click-area="tpb.publish"]
"""
import os
import time
import random
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from config import NAVER_BLOG_ID, NAVER_ID, NAVER_PW
import pyperclip


class NaverBlogPoster:
    def __init__(self, headless=False):
        self.blog_id = NAVER_BLOG_ID
        self.driver = None
        self.headless = headless

    def _create_driver(self):
        """이미 열린 Chrome(9222포트)에 연결. 없으면 새로 생성."""
        from selenium import webdriver

        # 방법 1: 이미 열린 Chrome에 연결
        try:
            options = webdriver.ChromeOptions()
            options.debugger_address = "127.0.0.1:9222"
            self.driver = webdriver.Chrome(options=options)
            self.driver.implicitly_wait(5)
            print("    🔗 기존 Chrome에 연결 완료")
            return
        except Exception as e:
            print(f"    ⚠️ 기존 Chrome 연결 실패: {e}")
            print("    📌 open_chrome.bat으로 Chrome을 먼저 열어주세요")

        # 방법 2: 새 Chrome 생성 (fallback — 로그인 필요)
        print("    🆕 새 Chrome 생성 (로그인 필요할 수 있음)")
        options = uc.ChromeOptions()
        if self.headless:
            options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--window-size=1400,900")
        options.add_argument("--lang=ko-KR")
        self.driver = uc.Chrome(options=options)
        self.driver.implicitly_wait(5)

    def _delay(self, min_s=1.0, max_s=3.0):
        time.sleep(random.uniform(min_s, max_s))

    def _clipboard_paste(self, text: str):
        """클립보드에 텍스트 복사 후 Ctrl+V 붙여넣기"""
        self.driver.execute_script(
            "navigator.clipboard.writeText(arguments[0]);", text
        )
        self._delay(0.3, 0.5)
        ActionChains(self.driver).key_down(Keys.CONTROL).send_keys('v').key_up(Keys.CONTROL).perform()
        self._delay(0.5, 1)

    def ensure_login(self) -> bool:
        """로그인 상태 확인 → 안 되어있으면 자동 로그인 시도"""
        if not self.driver:
            self._create_driver()

        # 현재 페이지에서 쿠키 확인 (이미 네이버에 있을 수 있음)
        current = self.driver.current_url
        if "naver.com" not in current:
            self.driver.get("https://www.naver.com")
            self._delay(2, 3)

        cookies = self.driver.get_cookies()
        cookie_names = [c["name"] for c in cookies]

        if any(name in cookie_names for name in ["NID_AUT", "NID_SES", "nid_inf"]):
            print("    ✅ 로그인 확인됨")
            return True

        # 쿠키 없음 → 자동 로그인 시도
        print("    🔑 로그인 안 됨 — 자동 로그인 시도...")
        return self._login_auto()

    def _login_auto(self) -> bool:
        """pyperclip으로 ID/PW 붙여넣기 자동 로그인"""
        if not NAVER_ID or not NAVER_PW:
            print("    ❌ .env에 NAVER_ID / NAVER_PW 설정 필요")
            return False

        try:
            # 1. 네이버 로그인 페이지 이동
            self.driver.get("https://nid.naver.com/nidlogin.login")
            self._delay(3, 5)

            # 2. ID 입력 — 클릭 → pyperclip 복사 → Ctrl+V
            id_input = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "#id"))
            )
            id_input.click()
            self._delay(0.5, 1)

            pyperclip.copy(NAVER_ID)
            ActionChains(self.driver).key_down(Keys.CONTROL).send_keys('v').key_up(Keys.CONTROL).perform()
            self._delay(1, 2)

            # 3. PW 입력 — 클릭 → pyperclip 복사 → Ctrl+V
            pw_input = self.driver.find_element(By.CSS_SELECTOR, "#pw")
            pw_input.click()
            self._delay(0.5, 1)

            pyperclip.copy(NAVER_PW)
            ActionChains(self.driver).key_down(Keys.CONTROL).send_keys('v').key_up(Keys.CONTROL).perform()
            self._delay(1, 2)

            # 4. 로그인 버튼 클릭
            login_btn = self.driver.find_element(By.CSS_SELECTOR, "#log\\.login, .btn_login, button[type='submit']")
            login_btn.click()
            print("    🔑 로그인 버튼 클릭")
            self._delay(5, 8)

            # 5. 로그인 성공 확인
            cookies = self.driver.get_cookies()
            cookie_names = [c["name"] for c in cookies]

            if any(name in cookie_names for name in ["NID_AUT", "NID_SES", "nid_inf"]):
                print("    ✅ 자동 로그인 성공!")
                # 보안: 클립보드 비우기
                pyperclip.copy("")
                return True

            # 캡차/2차인증 등으로 실패 가능
            current_url = self.driver.current_url
            if "nidlogin" in current_url:
                print("    ⚠️ 로그인 페이지에 머물러 있음 (캡차/2차인증 확인 필요)")
            else:
                print(f"    ⚠️ 로그인 후 이동: {current_url}")

            # 보안: 클립보드 비우기
            pyperclip.copy("")
            return False

        except Exception as e:
            print(f"    ❌ 자동 로그인 실패: {e}")
            pyperclip.copy("")
            return False

    # ═══════════════════════════════════════════════════
    # 포스팅 메인
    # ═══════════════════════════════════════════════════

    def post_blog(self, title: str, html_content: str, tags: list,
                  league: str = "", thumbnail_url: str = "") -> bool:
        try:
            print(f"    📝 포스팅: {title}")

            # 썸네일 URL이 있으면 HTML 본문 맨 앞에 img 태그 삽입
            if thumbnail_url:
                thumb_html = f'<div style="text-align:center;margin-bottom:20px;"><img src="{thumbnail_url}" style="max-width:100%;" alt="경기 카드"></div>'
                html_content = thumb_html + html_content
                print(f"    🎴 VS 카드 이미지 삽입: {thumbnail_url[:60]}...")

            # 글쓰기 페이지
            self.driver.get(f"https://blog.naver.com/{self.blog_id}/postwrite")
            self._delay(5, 8)
            print(f"    📍 URL: {self.driver.current_url}")

            # 에디터 대기
            self._wait_editor()

            # 1. 제목
            self._type_title(title)
            self._delay(1, 2)

            # 2. 본문 (썸네일 img 태그 포함)
            self._paste_content(html_content)
            self._delay(2, 3)

            # 4. 가운데 정렬
            self._align_center()
            self._delay(1, 2)

            # 5. 발행 패널 열기
            self._click_publish_open()
            self._delay(2, 3)

            # 6. 카테고리
            self._pick_category(league)
            self._delay(1, 2)

            # 7. 최종 발행
            self._click_publish_confirm()

            print(f"    ✅ 발행 완료!")
            return True

        except Exception as e:
            print(f"    ❌ 포스팅 실패: {e}")
            try:
                path = os.path.join(os.path.dirname(__file__), f"error_{int(time.time())}.png")
                self.driver.save_screenshot(path)
                print(f"    📸 스크린샷: {path}")
            except:
                pass
            return False

    # ═══════════════════════════════════════════════════
    # 에디터 대기
    # ═══════════════════════════════════════════════════

    def _wait_editor(self):
        # iframe#mainFrame 존재 시 전환 (참고 코드: Playwright frame_locator)
        try:
            iframe = self.driver.find_element(By.CSS_SELECTOR, "iframe#mainFrame")
            self.driver.switch_to.frame(iframe)
            print("    📋 iframe#mainFrame 전환 완료")
        except:
            print("    📋 iframe 없음 (직접 접근)")

        try:
            WebDriverWait(self.driver, 30).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, ".se-title-text"))
            )
            print("    📋 에디터 로드 완료")
        except:
            print("    ⚠️ 에디터 대기 중 (10초)...")
            time.sleep(10)

    # ═══════════════════════════════════════════════════
    # 썸네일 이미지 업로드 (VS 카드)
    # ═══════════════════════════════════════════════════

    # (썸네일은 HTML 본문에 img 태그로 삽입 — _upload_thumbnail 불필요)

    # ═══════════════════════════════════════════════════
    # 제목 입력 — Selenium find_element + send_keys
    # ═══════════════════════════════════════════════════

    def _type_title(self, title: str):
        """제목 p 태그를 찾아 클릭 후 send_keys"""
        # .se-title-text > p.se-text-paragraph
        title_p = self.driver.find_element(By.CSS_SELECTOR, ".se-title-text .se-text-paragraph")
        title_p.click()
        self._delay(0.5, 1)

        # ActionChains로 실제 키 입력
        ActionChains(self.driver).send_keys(title).perform()
        self._delay(0.5, 1)

        # 확인
        text = self.driver.execute_script(
            "return document.querySelector('.se-title-text').textContent.trim().substring(0,30);"
        )
        print(f"    ✏️ 제목: '{text}'")

    # ═══════════════════════════════════════════════════
    # 본문 입력 — 시스템 클립보드 HTML 복사 → 진짜 Ctrl+V
    # ═══════════════════════════════════════════════════

    def _paste_content(self, html_content: str):
        """본문 입력: 클립보드에 HTML 복사 후 실제 Ctrl+V 붙여넣기 (서식 보존)"""

        # 1. CDP로 클립보드 권한 부여
        try:
            self.driver.execute_cdp_cmd('Browser.grantPermissions', {
                'permissions': ['clipboardReadWrite', 'clipboardSanitizedWrite']
            })
            print("    📋 클립보드 권한 OK")
        except Exception as e:
            print(f"    ⚠️ CDP 권한: {e}")

        # 2. Clipboard API로 HTML을 시스템 클립보드에 쓰기
        clipboard_ok = False
        try:
            result = self.driver.execute_async_script("""
                var html = arguments[0];
                var callback = arguments[arguments.length - 1];
                var plain = html.replace(/<[^>]*>/g, '');
                navigator.clipboard.write([
                    new ClipboardItem({
                        'text/html': new Blob([html], {type: 'text/html'}),
                        'text/plain': new Blob([plain], {type: 'text/plain'})
                    })
                ]).then(function() { callback('ok'); })
                  .catch(function(e) { callback('error:' + e.message); });
            """, html_content)
            clipboard_ok = (result == 'ok')
            print(f"    📋 Clipboard API: {result}")
        except Exception as e:
            print(f"    ⚠️ Clipboard API 실패: {e}")

        # 2-1. Fallback: hidden div + execCommand('copy')
        if not clipboard_ok:
            try:
                result2 = self.driver.execute_script("""
                    var html = arguments[0];
                    var temp = document.createElement('div');
                    temp.innerHTML = html;
                    temp.contentEditable = true;
                    temp.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0.01;';
                    document.body.appendChild(temp);
                    temp.focus();

                    var range = document.createRange();
                    range.selectNodeContents(temp);
                    var sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(range);

                    var ok = document.execCommand('copy');
                    document.body.removeChild(temp);
                    return ok ? 'copied' : 'copy_failed';
                """, html_content)
                clipboard_ok = (result2 == 'copied')
                print(f"    📋 execCommand copy: {result2}")
            except Exception as e:
                print(f"    ⚠️ execCommand 실패: {e}")

        # 3. 본문 영역 클릭
        try:
            body_p = self.driver.find_element(
                By.CSS_SELECTOR,
                '.se-component[data-a11y-title="본문"] .se-text-paragraph'
            )
        except:
            paras = self.driver.find_elements(By.CSS_SELECTOR, '.se-text-paragraph')
            body_p = paras[1] if len(paras) > 1 else paras[0]

        body_p.click()
        self._delay(1, 2)

        # 4. 진짜 Ctrl+V 붙여넣기 (SE ONE이 네이티브로 처리)
        ActionChains(self.driver).key_down(Keys.CONTROL).send_keys('v').key_up(Keys.CONTROL).perform()
        print("    📋 Ctrl+V 실행")
        self._delay(3, 5)

        # 5. 입력 확인
        body_text = self.driver.execute_script("""
            var c = document.querySelector('.se-component[data-a11y-title="본문"]');
            if (!c) return '';
            return c.textContent.trim().substring(0, 80);
        """) or ""

        if body_text and len(body_text) > 10:
            print(f"    ✅ 본문 입력 완료: '{body_text[:50]}...'")
        else:
            print(f"    ⚠️ 본문 확인: '{body_text}' (클립보드={clipboard_ok})")

    # ═══════════════════════════════════════════════════
    # 가운데 정렬
    # ═══════════════════════════════════════════════════

    def _align_center(self):
        try:
            # Ctrl+A 전체 선택
            ActionChains(self.driver).key_down(Keys.CONTROL).send_keys('a').key_up(Keys.CONTROL).perform()
            self._delay(0.5, 1)

            # 정렬 드롭다운 열기
            align_btn = self.driver.find_element(
                By.CSS_SELECTOR, 'button[data-name="align-drop-down-with-justify"]'
            )
            align_btn.click()
            self._delay(0.5, 1)

            # 가운데 정렬 옵션 클릭
            center = self.driver.execute_script("""
                var btns = document.querySelectorAll('button[class*="align-center"]');
                for (var i = 0; i < btns.length; i++) {
                    if (btns[i].offsetParent !== null) { btns[i].click(); return 'ok'; }
                }
                // data-value로도 시도
                var btns2 = document.querySelectorAll('button[data-value="center"]');
                for (var i = 0; i < btns2.length; i++) {
                    if (btns2[i].offsetParent !== null) { btns2[i].click(); return 'ok2'; }
                }
                return null;
            """)
            print(f"    📐 가운데 정렬: {center or 'fallback'}")

            if not center:
                # fallback: Ctrl+E
                ActionChains(self.driver).key_down(Keys.CONTROL).send_keys('e').key_up(Keys.CONTROL).perform()
                print("    📐 가운데 정렬 (Ctrl+E)")

        except Exception as e:
            print(f"    ⚠️ 정렬 실패: {e} — 스킵")

    # ═══════════════════════════════════════════════════
    # 발행 패널 열기
    # ═══════════════════════════════════════════════════

    def _click_publish_open(self):
        """발행 패널 열기 — 첫 번째 visible '발행' 버튼 (참고 코드 방식)"""
        result = self.driver.execute_script("""
            var buttons = document.querySelectorAll('button');
            for (var i = 0; i < buttons.length; i++) {
                var text = buttons[i].textContent.trim();
                if (text.includes('발행') && buttons[i].offsetParent !== null) {
                    buttons[i].click();
                    return 'first: ' + buttons[i].className.substring(0, 40);
                }
            }
            return null;
        """)
        if result:
            print(f"    📤 발행 패널 열기: {result}")
        else:
            # fallback: CSS 셀렉터
            btn = self.driver.find_element(By.CSS_SELECTOR, 'button[data-click-area="tpb.publish"]')
            btn.click()
            print("    📤 발행 패널 열기 (fallback)")

    # ═══════════════════════════════════════════════════
    # 카테고리 선택
    # ═══════════════════════════════════════════════════

    def _pick_category(self, league: str):
        """카테고리 선택 (참고 코드: aria-label + label 매칭)"""
        from config import CATEGORY_MAP
        cat_name = CATEGORY_MAP.get(league, "")
        if not cat_name:
            print(f"    ⚠️ 리그 '{league}' 카테고리 없음 — 스킵")
            return

        try:
            # 카테고리 드롭다운 열기 (참고 코드: aria-label="카테고리 목록 버튼")
            try:
                cat_btn = self.driver.find_element(
                    By.CSS_SELECTOR, 'button[aria-label="카테고리 목록 버튼"]'
                )
                print("    📂 카테고리 버튼 찾음 (aria-label)")
            except:
                cat_btn = self.driver.find_element(
                    By.CSS_SELECTOR, 'button[data-click-area="tpb*i.category"]'
                )
                print("    📂 카테고리 버튼 찾음 (data-click-area)")
            cat_btn.click()
            self._delay(2, 3)

            # 카테고리 항목 클릭 (참고 코드: label:has-text → last)
            clicked = self.driver.execute_script("""
                var name = arguments[0];

                // 방법 1: label 요소 (참고 코드 방식 — 마지막 매칭)
                var labels = document.querySelectorAll('label');
                var lastLabel = null;
                for (var i = 0; i < labels.length; i++) {
                    if (labels[i].textContent.trim().includes(name)) {
                        lastLabel = labels[i];
                    }
                }
                if (lastLabel) {
                    lastLabel.click();
                    return 'label: ' + lastLabel.textContent.trim();
                }

                // 방법 2: 가시적 요소 중 가장 구체적인 것
                var all = document.querySelectorAll('li, a, span, div, button, p');
                var candidates = [];
                for (var i = 0; i < all.length; i++) {
                    var el = all[i];
                    var text = el.textContent.trim();
                    if (!text.includes(name) || text.length > 40) continue;
                    var rect = el.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0 && rect.y > 0) {
                        candidates.push({el: el, text: text, len: text.length});
                    }
                }
                candidates.sort(function(a, b) { return a.len - b.len; });
                if (candidates.length > 0) {
                    candidates[0].el.click();
                    return 'element: ' + candidates[0].text;
                }

                return null;
            """, cat_name)

            if clicked:
                print(f"    ✅ 카테고리 선택: {clicked}")
            else:
                print(f"    ❌ '{cat_name}' 카테고리 못 찾음")
                # 디버그: 보이는 항목 출력
                items = self.driver.execute_script("""
                    var result = [];
                    var all = document.querySelectorAll('label, li, [role="option"]');
                    for (var i = 0; i < all.length; i++) {
                        var rect = all[i].getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0) {
                            var t = all[i].textContent.trim();
                            if (t.length > 0 && t.length < 30) result.push(t);
                        }
                    }
                    return result.slice(0, 15);
                """)
                print(f"    📂 보이는 항목: {items}")

        except Exception as e:
            print(f"    ❌ 카테고리 실패: {e}")

    # ═══════════════════════════════════════════════════
    # 최종 발행
    # ═══════════════════════════════════════════════════

    def _click_publish_confirm(self):
        """최종 발행 — 마지막 visible '발행' 버튼 클릭 (참고 코드 방식)"""
        before_url = self.driver.current_url

        # 참고 코드: frame.locator("button:has-text('발행'):visible").last.click()
        result = self.driver.execute_script("""
            var buttons = document.querySelectorAll('button');
            var lastBtn = null;
            for (var i = 0; i < buttons.length; i++) {
                var text = buttons[i].textContent.trim();
                if (text.includes('발행') && buttons[i].offsetParent !== null) {
                    lastBtn = buttons[i];
                }
            }
            if (lastBtn) {
                lastBtn.click();
                return 'last: ' + lastBtn.className.substring(0, 40);
            }
            return null;
        """)
        print(f"    🚀 최종 발행 클릭: {result}")

        # URL 변경 대기
        for attempt in range(15):
            self._delay(2, 3)

            # iframe 안이면 parent frame에서 URL 체크
            try:
                url = self.driver.execute_script("return window.top.location.href;")
            except:
                url = self.driver.current_url

            if url != before_url and "postwrite" not in url:
                print(f"    ✅ 발행 성공! URL: {url}")
                return

            # 팝업 확인/발행 버튼 자동 클릭
            self.driver.execute_script("""
                var btns = document.querySelectorAll('button');
                for (var i = 0; i < btns.length; i++) {
                    var text = btns[i].textContent.trim();
                    if ((text === '확인' || text === '발행') && btns[i].offsetParent !== null) {
                        btns[i].click();
                    }
                }
            """)

            if attempt == 5:
                print("    ⏳ 발행 대기 중... (재시도)")

        # 실패
        path = os.path.join(os.path.dirname(__file__), f"publish_fail_{int(time.time())}.png")
        try:
            self.driver.save_screenshot(path)
            print(f"    📸 발행 실패 스크린샷: {path}")
        except:
            pass
        raise Exception("발행 실패 — URL 변경 안 됨")

    def close(self):
        if self.driver:
            try:
                self.driver.quit()
            except:
                pass
            self.driver = None
