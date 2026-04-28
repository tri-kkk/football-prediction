"""
네이버 블로그 자동 포스팅 (순수 Selenium + 기존 Chrome 연결)
SE ONE 에디터 HTML 구조 기반 (debug_editor.py로 분석)

동작 방식:
1. open_chrome.bat으로 디버그 모드 Chrome 실행 (포트 9222)
2. Chrome에서 네이버 수동 로그인
3. python main.py → 이미 열린 Chrome에 붙어서 자동 포스팅

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
import json
import pickle
import urllib.request
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from config import NAVER_BLOG_ID, NAVER_ID, NAVER_PW, COOKIE_FILE
import pyperclip


class NaverBlogPoster:
    def __init__(self, headless=False):
        self.blog_id = NAVER_BLOG_ID
        self.driver = None
        self.headless = headless

    def _check_chrome_running(self):
        """9222 포트에서 Chrome DevTools가 응답하는지 확인"""
        try:
            with urllib.request.urlopen("http://127.0.0.1:9222/json/version", timeout=3) as r:
                return json.loads(r.read().decode("utf-8"))
        except Exception:
            return None

    def _create_driver(self):
        """이미 열린 Chrome(9222포트)에 연결.
        Chrome이 안 떠있으면 open_chrome.bat 실행 안내."""

        # 1. Chrome 헬스체크
        info = self._check_chrome_running()
        if not info:
            raise RuntimeError(
                "\n"
                + "=" * 60 + "\n"
                "[ERROR] Chrome이 디버그 모드로 실행되어 있지 않습니다.\n"
                "\n"
                "   해결 방법:\n"
                "   1) open_chrome.bat 을 더블클릭해서 Chrome 실행\n"
                "   2) 열린 Chrome에서 네이버 로그인까지 완료\n"
                "   3) 그 후 이 스크립트를 다시 실행하세요\n"
                + "=" * 60
            )
        print(f"    [OK] Chrome 감지: {info.get('Browser', 'unknown')}")
        print(f"         User-Agent: {info.get('User-Agent', '')[:80]}...")

        # 2. 기존 Chrome에 연결 (Selenium Manager가 chromedriver 자동 관리)
        options = webdriver.ChromeOptions()
        options.add_experimental_option("debuggerAddress", "127.0.0.1:9222")

        try:
            # Service()는 Selenium Manager에게 적절한 chromedriver 자동 다운로드 위임
            self.driver = webdriver.Chrome(service=Service(), options=options)
            self.driver.implicitly_wait(5)
            print("    [OK] 기존 Chrome에 연결 완료")
        except Exception as e:
            msg = str(e)
            hint = ""
            if "session not created" in msg.lower() or "version" in msg.lower():
                hint = (
                    "\n   -> Chrome/ChromeDriver 버전 불일치 가능성.\n"
                    "     pip install --upgrade selenium\n"
                    "     그래도 안 되면 ~/.cache/selenium/ 폴더 삭제 후 재시도\n"
                )
            elif "cannot connect" in msg.lower() or "refused" in msg.lower():
                hint = (
                    "\n   -> Chrome이 9222 포트에서 응답하지 않습니다.\n"
                    "     open_chrome.bat을 닫고 다시 실행하세요.\n"
                )
            raise RuntimeError(f"Chrome 연결 실패: {e}{hint}") from e

    def _delay(self, min_s=1.0, max_s=3.0):
        time.sleep(random.uniform(min_s, max_s))

    def _clipboard_paste(self, text):
        """클립보드에 텍스트 복사 후 Ctrl+V 붙여넣기"""
        self.driver.execute_script(
            "navigator.clipboard.writeText(arguments[0]);", text
        )
        self._delay(0.3, 0.5)
        ActionChains(self.driver).key_down(Keys.CONTROL).send_keys('v').key_up(Keys.CONTROL).perform()
        self._delay(0.5, 1)

    def login_manual(self):
        """수동 로그인 모드: Chrome을 열고 사용자가 직접 로그인 -> 쿠키 저장
        (main.py --login 에서 호출)
        """
        if not self.driver:
            self._create_driver()

        # 이미 로그인되어 있으면 쿠키만 저장하고 종료
        self.driver.get("https://www.naver.com")
        self._delay(2, 3)
        cookies = self.driver.get_cookies()
        cookie_names = [c["name"] for c in cookies]

        if not any(name in cookie_names for name in ["NID_AUT", "NID_SES", "nid_inf"]):
            # 로그인 페이지로 이동
            self.driver.get("https://nid.naver.com/nidlogin.login")
            print("\n" + "=" * 60)
            print("  [LOGIN] 열린 Chrome에서 네이버 로그인을 완료해주세요.")
            print("          (2차 인증/캡차 등 포함)")
            print("  로그인 완료 후, 이 터미널에서 Enter 를 눌러주세요.")
            print("=" * 60)
            try:
                input()
            except EOFError:
                pass

            cookies = self.driver.get_cookies()
            cookie_names = [c["name"] for c in cookies]

        if any(name in cookie_names for name in ["NID_AUT", "NID_SES", "nid_inf"]):
            # 쿠키 저장
            try:
                with open(COOKIE_FILE, "wb") as f:
                    pickle.dump(cookies, f)
                print(f"    [OK] 쿠키 저장: {COOKIE_FILE}")
            except Exception as e:
                print(f"    [WARN] 쿠키 저장 실패: {e}")
            print("    [OK] 로그인 확인됨. 이제 python main.py 로 포스팅 가능합니다.")
            return True

        print("    [FAIL] 로그인 쿠키를 찾지 못했습니다. Chrome에서 다시 로그인해주세요.")
        return False

    def ensure_login(self):
        """로그인 상태 확인 -> 안 되어있으면 자동 로그인 시도"""
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
            print("    [OK] 로그인 확인됨")
            return True

        # 쿠키 없음 -> 자동 로그인 시도
        print("    [LOGIN] 로그인 안 됨 - 자동 로그인 시도...")
        return self._login_auto()

    def _login_auto(self):
        """pyperclip으로 ID/PW 붙여넣기 자동 로그인"""
        if not NAVER_ID or not NAVER_PW:
            print("    [FAIL] .env에 NAVER_ID / NAVER_PW 설정 필요")
            return False

        try:
            # 1. 네이버 로그인 페이지 이동
            self.driver.get("https://nid.naver.com/nidlogin.login")
            self._delay(3, 5)

            # 2. ID 입력 - 클릭 -> pyperclip 복사 -> Ctrl+V
            id_input = WebDriverWait(self.driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "#id"))
            )
            id_input.click()
            self._delay(0.5, 1)

            pyperclip.copy(NAVER_ID)
            ActionChains(self.driver).key_down(Keys.CONTROL).send_keys('v').key_up(Keys.CONTROL).perform()
            self._delay(1, 2)

            # 3. PW 입력 - 클릭 -> pyperclip 복사 -> Ctrl+V
            pw_input = self.driver.find_element(By.CSS_SELECTOR, "#pw")
            pw_input.click()
            self._delay(0.5, 1)

            pyperclip.copy(NAVER_PW)
            ActionChains(self.driver).key_down(Keys.CONTROL).send_keys('v').key_up(Keys.CONTROL).perform()
            self._delay(1, 2)

            # 4. 로그인 버튼 클릭
            login_btn = self.driver.find_element(By.CSS_SELECTOR, "#log\\.login, .btn_login, button[type='submit']")
            login_btn.click()
            print("    [LOGIN] 로그인 버튼 클릭")
            self._delay(5, 8)

            # 5. 로그인 성공 확인
            cookies = self.driver.get_cookies()
            cookie_names = [c["name"] for c in cookies]

            if any(name in cookie_names for name in ["NID_AUT", "NID_SES", "nid_inf"]):
                print("    [OK] 자동 로그인 성공!")
                # 보안: 클립보드 비우기
                pyperclip.copy("")
                return True

            # 캡차/2차인증 등으로 실패 가능
            current_url = self.driver.current_url
            if "nidlogin" in current_url:
                print("    [WARN] 로그인 페이지에 머물러 있음 (캡차/2차인증 확인 필요)")
            else:
                print(f"    [WARN] 로그인 후 이동: {current_url}")

            pyperclip.copy("")
            return False

        except Exception as e:
            print(f"    [FAIL] 자동 로그인 실패: {e}")
            pyperclip.copy("")
            return False

    # ===============================================
    # 포스팅 메인
    # ===============================================

    def post_blog(self, title, html_content, tags,
                  league="", thumbnail_url=""):
        try:
            print(f"    [POST] 포스팅: {title}")

            # 썸네일 URL이 있으면 HTML 본문 맨 앞에 img 태그 삽입
            if thumbnail_url:
                thumb_html = f'<div style="text-align:center;margin-bottom:20px;"><img src="{thumbnail_url}" style="max-width:100%;" alt="경기 카드"></div>'
                html_content = thumb_html + html_content
                print(f"    [OK] VS 카드 이미지 삽입: {thumbnail_url[:60]}...")

            # 글쓰기 페이지
            self.driver.get(f"https://blog.naver.com/{self.blog_id}/postwrite")
            self._delay(5, 8)
            print(f"    [URL] {self.driver.current_url}")

            # 에디터 대기
            self._wait_editor()

            # 1. 제목
            self._type_title(title)
            self._delay(1, 2)

            # 2. 본문 (썸네일 img 태그 포함)
            self._paste_content(html_content)
            self._delay(2, 3)

            # 3. 가운데 정렬
            self._align_center()
            self._delay(1, 2)

            # 4. 발행 패널 열기
            self._click_publish_open()
            self._delay(2, 3)

            # 5. 카테고리
            self._pick_category(league)
            self._delay(1, 2)

            # 6. 최종 발행
            self._click_publish_confirm()

            print("    [OK] 발행 완료!")
            return True

        except Exception as e:
            print(f"    [FAIL] 포스팅 실패: {e}")
            try:
                path = os.path.join(os.path.dirname(__file__), f"error_{int(time.time())}.png")
                self.driver.save_screenshot(path)
                print(f"    [SHOT] 스크린샷: {path}")
            except Exception:
                pass
            return False

    # ===============================================
    # 에디터 대기
    # ===============================================

    def _wait_editor(self):
        # iframe#mainFrame 존재 시 전환
        try:
            iframe = self.driver.find_element(By.CSS_SELECTOR, "iframe#mainFrame")
            self.driver.switch_to.frame(iframe)
            print("    [OK] iframe#mainFrame 전환 완료")
        except Exception:
            print("    [OK] iframe 없음 (직접 접근)")

        try:
            WebDriverWait(self.driver, 30).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, ".se-title-text"))
            )
            print("    [OK] 에디터 로드 완료")
        except Exception:
            print("    [WARN] 에디터 대기 중 (10초)...")
            time.sleep(10)

    # ===============================================
    # 제목 입력
    # ===============================================

    def _type_title(self, title):
        """제목 p 태그를 찾아 클릭 후 send_keys"""
        title_p = self.driver.find_element(By.CSS_SELECTOR, ".se-title-text .se-text-paragraph")
        title_p.click()
        self._delay(0.5, 1)

        ActionChains(self.driver).send_keys(title).perform()
        self._delay(0.5, 1)

        text = self.driver.execute_script(
            "return document.querySelector('.se-title-text').textContent.trim().substring(0,30);"
        )
        print(f"    [OK] 제목: '{text}'")

    # ===============================================
    # 본문 입력
    # ===============================================

    def _paste_content(self, html_content):
        """본문 입력: 클립보드에 HTML 복사 후 실제 Ctrl+V 붙여넣기 (서식 보존)"""

        # 1. CDP로 클립보드 권한 부여
        try:
            self.driver.execute_cdp_cmd('Browser.grantPermissions', {
                'permissions': ['clipboardReadWrite', 'clipboardSanitizedWrite']
            })
            print("    [OK] 클립보드 권한 OK")
        except Exception as e:
            print(f"    [WARN] CDP 권한: {e}")

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
            print(f"    [OK] Clipboard API: {result}")
        except Exception as e:
            print(f"    [WARN] Clipboard API 실패: {e}")

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
                print(f"    [OK] execCommand copy: {result2}")
            except Exception as e:
                print(f"    [WARN] execCommand 실패: {e}")

        # 3. 본문 영역 클릭
        try:
            body_p = self.driver.find_element(
                By.CSS_SELECTOR,
                '.se-component[data-a11y-title="본문"] .se-text-paragraph'
            )
        except Exception:
            paras = self.driver.find_elements(By.CSS_SELECTOR, '.se-text-paragraph')
            body_p = paras[1] if len(paras) > 1 else paras[0]

        body_p.click()
        self._delay(1, 2)

        # 4. 진짜 Ctrl+V 붙여넣기 (SE ONE이 네이티브로 처리)
        ActionChains(self.driver).key_down(Keys.CONTROL).send_keys('v').key_up(Keys.CONTROL).perform()
        print("    [OK] Ctrl+V 실행")
        self._delay(3, 5)

        # 5. 입력 확인
        body_text = self.driver.execute_script("""
            var c = document.querySelector('.se-component[data-a11y-title="본문"]');
            if (!c) return '';
            return c.textContent.trim().substring(0, 80);
        """) or ""

        if body_text and len(body_text) > 10:
            print(f"    [OK] 본문 입력 완료: '{body_text[:50]}...'")
        else:
            print(f"    [WARN] 본문 확인: '{body_text}' (클립보드={clipboard_ok})")

    # ===============================================
    # 가운데 정렬
    # ===============================================

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
                var btns2 = document.querySelectorAll('button[data-value="center"]');
                for (var i = 0; i < btns2.length; i++) {
                    if (btns2[i].offsetParent !== null) { btns2[i].click(); return 'ok2'; }
                }
                return null;
            """)
            print(f"    [OK] 가운데 정렬: {center or 'fallback'}")

            if not center:
                ActionChains(self.driver).key_down(Keys.CONTROL).send_keys('e').key_up(Keys.CONTROL).perform()
                print("    [OK] 가운데 정렬 (Ctrl+E)")

        except Exception as e:
            print(f"    [WARN] 정렬 실패: {e} - 스킵")

    # ===============================================
    # 발행 패널 열기
    # ===============================================

    def _click_publish_open(self):
        """발행 패널 열기 - 첫 번째 visible '발행' 버튼"""
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
            print(f"    [OK] 발행 패널 열기: {result}")
        else:
            btn = self.driver.find_element(By.CSS_SELECTOR, 'button[data-click-area="tpb.publish"]')
            btn.click()
            print("    [OK] 발행 패널 열기 (fallback)")

    # ===============================================
    # 카테고리 선택
    # ===============================================

    def _pick_category(self, league):
        """카테고리 선택"""
        from config import CATEGORY_MAP
        cat_name = CATEGORY_MAP.get(league, "")
        if not cat_name:
            print(f"    [WARN] 리그 '{league}' 카테고리 없음 - 스킵")
            return

        try:
            # 카테고리 드롭다운 열기
            try:
                cat_btn = self.driver.find_element(
                    By.CSS_SELECTOR, 'button[aria-label="카테고리 목록 버튼"]'
                )
                print("    [OK] 카테고리 버튼 찾음 (aria-label)")
            except Exception:
                cat_btn = self.driver.find_element(
                    By.CSS_SELECTOR, 'button[data-click-area="tpb*i.category"]'
                )
                print("    [OK] 카테고리 버튼 찾음 (data-click-area)")
            cat_btn.click()
            self._delay(2, 3)

            # 카테고리 항목 클릭
            clicked = self.driver.execute_script("""
                var name = arguments[0];

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
                print(f"    [OK] 카테고리 선택: {clicked}")
            else:
                print(f"    [FAIL] '{cat_name}' 카테고리 못 찾음")
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
                print(f"    [DEBUG] 보이는 항목: {items}")

        except Exception as e:
            print(f"    [FAIL] 카테고리 실패: {e}")

    # ===============================================
    # 최종 발행
    # ===============================================

    def _click_publish_confirm(self):
        """최종 발행 - 마지막 visible '발행' 버튼 클릭"""
        before_url = self.driver.current_url

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
        print(f"    [OK] 최종 발행 클릭: {result}")

        # URL 변경 대기
        for attempt in range(15):
            self._delay(2, 3)

            try:
                url = self.driver.execute_script("return window.top.location.href;")
            except Exception:
                url = self.driver.current_url

            if url != before_url and "postwrite" not in url:
                print(f"    [OK] 발행 성공! URL: {url}")
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
                print("    [WAIT] 발행 대기 중... (재시도)")

        # 실패
        path = os.path.join(os.path.dirname(__file__), f"publish_fail_{int(time.time())}.png")
        try:
            self.driver.save_screenshot(path)
            print(f"    [SHOT] 발행 실패 스크린샷: {path}")
        except Exception:
            pass
        raise Exception("발행 실패 - URL 변경 안됨")

    def close(self):
        """WebDriver 세션만 해제 (기존 Chrome 창은 닫지 않음).
        open_chrome.bat으로 띄운 Chrome은 유저가 계속 사용할 수 있도록."""
        if self.driver:
            try:
                self.driver.quit()
            except Exception:
                pass
            self.driver = None
