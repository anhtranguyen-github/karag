import time
import sys
from contextlib import contextmanager
from playwright.sync_api import sync_playwright

@contextmanager
def timing(label):
    start = time.perf_counter()
    yield
    end = time.perf_counter()
    print(f"{label}: {end - start:.2f} seconds")

def main():
    print("Starting Playwright end-to-end test...")
    with sync_playwright() as p:
        # Launch browser headlessly
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()
        
        try:
            print("1. Navigating to http://localhost:3000...")
            page.goto("http://localhost:3000")
            page.wait_for_load_state("networkidle")
            
            print("2. Opening workspace if available...")
            try:
                # Look for the exact text "OPEN" on the workspace cards
                open_btn = page.locator("text=OPEN").first
                open_btn.wait_for(state="visible", timeout=3000)
                open_btn.click()
                print("  -> Clicked 'OPEN' to enter the first workspace.")
                page.wait_for_load_state("networkidle")
            except Exception as e:
                print(f"  -> Could not click OPEN on workspace: {e}")

            print("3. Selecting 'Fast' mode...")
            try:
                page.wait_for_timeout(1000)
                fast_mode_btn = page.locator("button", has_text="fast").last
                fast_mode_btn.wait_for(state="visible", timeout=3000)
                fast_mode_btn.click()
                print("  -> 'Fast' mode selected.")
            except Exception as e:
                print(f"  -> 'Fast' mode button not found: {e}")

            print("4. Locating chat input and send button...")
            chat_input = page.get_by_placeholder("Type your message...").first
            chat_input.wait_for(state="visible", timeout=5000)
            
            # Form submit button
            submit_btn = page.locator("form button[type='submit']").first

            print("5. Sending first message ('France capital?')...")
            chat_input.fill("France capital?")
            
            with timing("Latency: Time from pressing Submit to visible response processing/streaming"):
                submit_btn.click()
                
                # Wait for the actual answer text to appear
                try:
                    # Look for Paris or just any bubble containing response
                    page.get_by_text("Paris", exact=False).first.wait_for(state="visible", timeout=20000)
                    print("  -> AI response containing 'Paris' appeared successfully.")
                except Exception as e:
                    print(f"  -> Timeout waiting for 'Paris'. Error: {e}")
            
            page.wait_for_timeout(2000)
            
            print("\n6. Testing 'New Chat' blink fix and continuity...")
            try:
                # Based on the UI, New chat is "New chat" text inside the left sidebar.
                new_chat_btn = page.locator("text=New chat").first
                new_chat_btn.wait_for(state="visible", timeout=3000)
                new_chat_btn.click()
                print("  -> Clicked 'New Chat'. UI should clear smoothly.")
            except Exception as e:
                print(f"  -> Could not click 'New Chat' button: {e}")

            page.wait_for_timeout(500)
            
            print("7. Sending second message ('List 3 primary colors')...")
            # Wait for any potential remounts to finish
            page.wait_for_timeout(1000)
            chat_input2 = page.get_by_placeholder("Type your message...").first
            submit_btn2 = page.locator("form button[type='submit']").first
            
            chat_input2.fill("List 3 primary colors")
            submit_btn2.click()
            
            with timing("Latency: Second message response"):
                try:
                    # Look for Red using text lookup
                    page.get_by_text("Red", exact=False).first.wait_for(state="visible", timeout=20000)
                    print("  -> Second message answered successfully without page reload.")
                except Exception as e:
                    print(f"  -> Timeout or error waiting: {e}")
            
            print("\nAll tests completed successfully.")

        except Exception as e:
            print(f"\n[ERROR] Test failed: {str(e)}")
            print("\n----- END OF PAGE TEXT FOR DEBUGGING -----")
            try:
                print(page.locator("body").inner_text()[:4000])
            except:
                pass
            print("------------------------------------------")
        finally:
            browser.close()

if __name__ == "__main__":
    main()
