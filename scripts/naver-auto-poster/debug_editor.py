"""
네이버 블로그 에디터 HTML 구조 분석 (디버그용)
- 글쓰기 페이지에 접속해서 주요 요소의 HTML 태그/클래스/속성을 덤프
- open_chrome.bat으로 띄운 디버그 Chrome(9222)에 연결해서 사용
"""
import os
import time
import json
import pickle
import urllib.request
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from config import NAVER_BLOG_ID, COOKIE_FILE


def _check_chrome_running() -> bool:
    try:
        with urllib.request.urlopen("http://127.0.0.1:9222/json/version", timeout=3) as r:
            json.loads(r.read().decode("utf-8"))
        return True
    except Exception:
        return False


def main():
    print("🔍 네이버 블로그 에디터 HTML 구조 분석")

    if not _check_chrome_running():
        print("\n❌ Chrome이 디버그 모드(9222)로 실행되어 있지 않습니다.")
        print("   open_chrome.bat을 먼저 실행해주세요.")
        return

    # 기존 Chrome(9222)에 연결
    options = webdriver.ChromeOptions()
    options.add_experimental_option("debuggerAddress", "127.0.0.1:9222")
    driver = webdriver.Chrome(service=Service(), options=options)
    driver.implicitly_wait(5)

    # 쿠키 복원 (디버그 Chrome에는 이미 로그인돼 있을 것이므로 보통 불필요)
    if os.path.exists(COOKIE_FILE):
        try:
            driver.get("https://www.naver.com")
            time.sleep(2)
            with open(COOKIE_FILE, "rb") as f:
                cookies = pickle.load(f)
            for cookie in cookies:
                try:
                    driver.add_cookie(cookie)
                except Exception:
                    pass
            print("🍪 쿠키 복원 시도 완료")
        except Exception as e:
            print(f"⚠️ 쿠키 복원 생략: {e}")

    # 글쓰기 페이지 이동
    write_url = f"https://blog.naver.com/{NAVER_BLOG_ID}/postwrite"
    driver.get(write_url)
    print(f"📍 URL: {write_url}")
    time.sleep(8)  # 에디터 로딩 대기

    print(f"📍 현재 URL: {driver.current_url}")

    # ═══════════════════════════════════════
    # 1. 제목 영역 분석
    # ═══════════════════════════════════════
    print("\n" + "="*60)
    print("📝 [제목 영역]")
    print("="*60)

    title_info = driver.execute_script("""
        var result = [];
        // se-title 관련 모든 요소
        var titleEls = document.querySelectorAll('[class*="title"], [class*="Title"]');
        for (var i = 0; i < titleEls.length; i++) {
            var el = titleEls[i];
            result.push({
                tag: el.tagName,
                class: el.className,
                id: el.id || '',
                contentEditable: el.contentEditable,
                placeholder: el.getAttribute('placeholder') || '',
                text: el.textContent.trim().substring(0, 30),
                childCount: el.children.length,
                outerHTML: el.outerHTML.substring(0, 200)
            });
        }
        return result;
    """)
    for item in title_info:
        print(f"\n  tag={item['tag']} class={item['class']}")
        print(f"  id={item['id']} contentEditable={item['contentEditable']}")
        print(f"  placeholder={item['placeholder']} text='{item['text']}'")
        print(f"  outerHTML: {item['outerHTML'][:150]}")

    # ═══════════════════════════════════════
    # 2. contenteditable 요소 분석
    # ═══════════════════════════════════════
    print("\n" + "="*60)
    print("📝 [contenteditable 요소]")
    print("="*60)

    editable_info = driver.execute_script("""
        var result = [];
        var editables = document.querySelectorAll('[contenteditable="true"]');
        for (var i = 0; i < editables.length; i++) {
            var el = editables[i];
            result.push({
                tag: el.tagName,
                class: el.className,
                id: el.id || '',
                placeholder: el.getAttribute('placeholder') || el.getAttribute('data-placeholder') || '',
                text: el.textContent.trim().substring(0, 30),
                parentClass: el.parentElement ? el.parentElement.className : '',
                outerHTML: el.outerHTML.substring(0, 200)
            });
        }
        return result;
    """)
    for i, item in enumerate(editable_info):
        print(f"\n  [{i}] tag={item['tag']} class={item['class']}")
        print(f"  id={item['id']} placeholder={item['placeholder']}")
        print(f"  parentClass={item['parentClass']}")
        print(f"  text='{item['text']}'")
        print(f"  outerHTML: {item['outerHTML'][:150]}")

    # ═══════════════════════════════════════
    # 3. 툴바 버튼 분석 (정렬 관련)
    # ═══════════════════════════════════════
    print("\n" + "="*60)
    print("🔧 [툴바 버튼]")
    print("="*60)

    toolbar_info = driver.execute_script("""
        var result = [];
        var buttons = document.querySelectorAll('button');
        for (var i = 0; i < buttons.length; i++) {
            var btn = buttons[i];
            var title = btn.getAttribute('title') || '';
            var ariaLabel = btn.getAttribute('aria-label') || '';
            var dataAction = btn.getAttribute('data-action') || btn.getAttribute('data-command') || '';
            var text = btn.textContent.trim();
            // 정렬, 발행, 저장 관련 버튼만
            if (title.includes('정렬') || title.includes('align') || title.includes('가운데') ||
                text.includes('발행') || text.includes('저장') ||
                ariaLabel.includes('정렬') || ariaLabel.includes('align') ||
                dataAction.includes('align') || dataAction.includes('justify')) {
                var rect = btn.getBoundingClientRect();
                result.push({
                    tag: 'button',
                    class: btn.className.substring(0, 80),
                    title: title,
                    ariaLabel: ariaLabel,
                    dataAction: dataAction,
                    text: text.substring(0, 20),
                    visible: btn.offsetParent !== null,
                    x: Math.round(rect.x),
                    y: Math.round(rect.y),
                    outerHTML: btn.outerHTML.substring(0, 200)
                });
            }
        }
        return result;
    """)
    for item in toolbar_info:
        print(f"\n  class={item['class']}")
        print(f"  title={item['title']} aria={item['ariaLabel']} data={item['dataAction']}")
        print(f"  text='{item['text']}' visible={item['visible']} pos=({item['x']},{item['y']})")
        print(f"  outerHTML: {item['outerHTML'][:150]}")

    # ═══════════════════════════════════════
    # 4. 발행 버튼 클릭 → 발행 패널 분석
    # ═══════════════════════════════════════
    print("\n" + "="*60)
    print("🚀 [발행 패널 - 발행 버튼 클릭 후]")
    print("="*60)

    # 발행 버튼 클릭
    driver.execute_script("""
        var buttons = document.querySelectorAll('button');
        for (var i = 0; i < buttons.length; i++) {
            if (buttons[i].textContent.trim() === '발행') {
                buttons[i].click();
                break;
            }
        }
    """)
    time.sleep(3)

    # 발행 패널 전체 HTML 덤프
    panel_info = driver.execute_script("""
        var result = {};

        // 카테고리 관련
        result.categoryElements = [];
        var allEls = document.querySelectorAll('*');
        for (var i = 0; i < allEls.length; i++) {
            var el = allEls[i];
            var text = el.textContent.trim();
            if ((text.includes('카테고리') || text.includes('예측') || text.includes('승부'))
                && el.children.length <= 3 && text.length < 40) {
                result.categoryElements.push({
                    tag: el.tagName,
                    class: (el.className || '').substring(0, 80),
                    text: text,
                    childCount: el.children.length,
                    outerHTML: el.outerHTML.substring(0, 300)
                });
            }
        }

        // 발행 관련 버튼
        result.publishButtons = [];
        var buttons = document.querySelectorAll('button');
        for (var i = 0; i < buttons.length; i++) {
            var text = buttons[i].textContent.trim();
            if (text.includes('발행') || text.includes('저장') || text.includes('등록')) {
                var rect = buttons[i].getBoundingClientRect();
                result.publishButtons.push({
                    tag: 'button',
                    class: buttons[i].className.substring(0, 80),
                    text: text,
                    visible: buttons[i].offsetParent !== null,
                    x: Math.round(rect.x), y: Math.round(rect.y),
                    w: Math.round(rect.width), h: Math.round(rect.height),
                    outerHTML: buttons[i].outerHTML.substring(0, 200)
                });
            }
        }

        // 태그 입력 관련
        result.tagInputs = [];
        var inputs = document.querySelectorAll('input');
        for (var i = 0; i < inputs.length; i++) {
            var ph = inputs[i].getAttribute('placeholder') || '';
            if (ph.includes('태그') || inputs[i].className.includes('tag')) {
                result.tagInputs.push({
                    tag: 'input',
                    class: inputs[i].className,
                    placeholder: ph,
                    outerHTML: inputs[i].outerHTML.substring(0, 200)
                });
            }
        }

        return result;
    """)

    print("\n📂 카테고리 관련:")
    for item in panel_info.get('categoryElements', []):
        print(f"\n  tag={item['tag']} class={item['class']}")
        print(f"  text='{item['text']}' children={item['childCount']}")
        print(f"  outerHTML: {item['outerHTML'][:200]}")

    print("\n🚀 발행 버튼:")
    for item in panel_info.get('publishButtons', []):
        print(f"\n  class={item['class']}")
        print(f"  text='{item['text']}' visible={item['visible']} pos=({item['x']},{item['y']}) size=({item['w']}x{item['h']})")
        print(f"  outerHTML: {item['outerHTML'][:150]}")

    print("\n🏷️ 태그 입력:")
    for item in panel_info.get('tagInputs', []):
        print(f"\n  class={item['class']}")
        print(f"  placeholder={item['placeholder']}")
        print(f"  outerHTML: {item['outerHTML'][:150]}")

    # 스크린샷 저장
    screenshot_path = os.path.join(os.path.dirname(__file__), "debug_full.png")
    driver.save_screenshot(screenshot_path)
    print(f"\n📸 스크린샷: {screenshot_path}")

    # 페이지 소스 일부 저장
    source_path = os.path.join(os.path.dirname(__file__), "debug_source.html")
    with open(source_path, "w", encoding="utf-8") as f:
        f.write(driver.page_source)
    print(f"📄 페이지 소스: {source_path}")

    # 기존 Chrome(9222)에 attach한 것이므로 브라우저는 종료하지 않음
    # (세션만 끊어서 사용자가 계속 Chrome을 쓸 수 있게)
    try:
        driver.close()  # 현재 탭만 닫기 (원치 않으면 이 줄 제거)
    except Exception:
        pass
    print("\n[OK] 완료!")


if __name__ == "__main__":
    main()
