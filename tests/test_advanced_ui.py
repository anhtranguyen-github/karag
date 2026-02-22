import time
import sys
from playwright.sync_api import sync_playwright

def main():
    print("Starting Advanced Playwright Test: Streaming & UI Stability...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()
        
        try:
            print("1. Navigating to http://localhost:3000...")
            page.goto("http://localhost:3000")
            page.wait_for_load_state("networkidle")
            
            # Add a custom marker to the body to detect full page reloads
            page.evaluate("document.body.setAttribute('data-test-marker', 'no-reload')")
            
            print("2. Opening workspace if available...")
            try:
                open_btn = page.locator("text=OPEN").first
                open_btn.wait_for(state="visible", timeout=3000)
                open_btn.click()
                page.wait_for_load_state("networkidle")
            except Exception:
                pass

            print("3. Testing Streaming Output...")
            chat_input = page.get_by_placeholder("Type your message...").first
            submit_btn = page.locator("form button[type='submit']").first
            
            chat_input.fill("Write a detailed paragraph about the history of artificial intelligence.")
            submit_btn.click()
            
            # Watch the response bubble text length grow to verify TRUE streaming
            last_length = 0
            growth_events = 0
            
            # Wait for AI message bubble to appear (group/text indicates main content bubble)
            # The user's bubble has bg-indigo-500, assistant has bg-card
            response_bubble = page.locator(".bg-card.group\\/text .whitespace-pre-wrap").last
            
            print("  -> Waiting for response to begin streaming...")
            for _ in range(50):
                if response_bubble.is_visible():
                    current_text = response_bubble.inner_text()
                    current_length = len(current_text)
                    if current_length > last_length:
                        growth_events += 1
                        print(f"  -> Stream Chunk Received. Total Length: {current_length} characters")
                        last_length = current_length
                    
                    if growth_events >= 3:
                        break # Successfully confirmed it's streaming in chunks
                time.sleep(0.2)
                
            if growth_events >= 3:
                print("  => SUCCESS: Verified text is arriving in streamed chunks (token-by-token)!")
            else:
                print("  => FAIL: Did not detect continuous streaming chunks.")
                
            print("\n4. Testing Sidebar Stability (No Blinks/Destruction)...")
            # Get an existing thread to click on
            threads = page.locator(".lucide-message-square + span")
            thread_count = threads.count()
            
            if thread_count > 0:
                print(f"  -> Found {thread_count} threads in sidebar.")
                threads.first.click()
                print("  -> Switched thread.")
                
                # Check marker to ensure no hard reload occurred
                marker = page.evaluate("document.body.getAttribute('data-test-marker')")
                if marker == "no-reload":
                    print("  => SUCCESS: Page did not hard-reload (No white flashes).")
                else:
                    print("  => FAIL: Context was lost, meaning a full page reload occurred!")
                    
                # New chat click
                new_chat_btn = page.locator("text=New chat").first
                new_chat_btn.click()
                print("  -> Clicked 'New Chat' again.")
                
                marker = page.evaluate("document.body.getAttribute('data-test-marker')")
                if marker == "no-reload":
                    print("  => SUCCESS: New Chat initialized cleanly without hard-reload.")
                else:
                    print("  => FAIL: Hard page reload on New Chat.")
            else:
                print("  -> No threads found to switch between. Skipping switch test.")

        except Exception as e:
            print(f"\n[ERROR] Test failed: {str(e)}")
        finally:
            browser.close()

if __name__ == "__main__":
    main()
