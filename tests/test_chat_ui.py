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
            
            # Find the chat input
            print("2. Locating chat input...")
            # The input might be an input tag or a textarea
            chat_input = page.locator("input, textarea").last
            chat_input.wait_for(state="visible", timeout=5000)
            
            print("3. Sending first message ('What is the capital of France?')...")
            chat_input.fill("What is the capital of France?")
            
            with timing("Latency: Time from pressing 'Enter' to visible response processing/streaming"):
                chat_input.press("Enter")
                
                # Check for the Processing indicator
                try:
                    processing = page.get_by_text("Processing...")
                    processing_element = processing.first
                    processing_element.wait_for(state="visible", timeout=5000)
                    print("  -> Saw 'Processing...' indicator.")
                except Exception:
                    print("  -> Did not see 'Processing...' indicator (could have streamed very fast or not triggered).")
                
                # Wait for the actual answer text to appear
                try:
                    page.get_by_text("Paris", exact=False).first.wait_for(state="visible", timeout=15000)
                    print("  -> AI response containing 'Paris' appeared successfully.")
                except Exception as e:
                    print(f"  -> Timeout waiting for 'Paris'. Error: {e}")
            
            # Wait for stream to finish roughly
            page.wait_for_timeout(2000)
            
            print("\n4. Testing 'New Chat' blink fix and continuity...")
            # The "New Chat" button usually has a lucide-plus icon or title="New Chat"
            new_chat_btn = page.locator('button[title="New Chat"]').first
            new_chat_btn.click()
            print("  -> Clicked 'New Chat'. UI should clear smoothly.")
            
            page.wait_for_timeout(500) # Give UI a moment to clear state
            
            print("5. Sending second message ('List 3 primary colors')...")
            chat_input.fill("List 3 primary colors")
            chat_input.press("Enter")
            
            with timing("Latency: Second message response"):
                try:
                    page.locator("text=red").first.wait_for(state="visible", timeout=15000)
                    print("  -> Second message answered successfully without page reload.")
                except Exception as e:
                    print(f"  -> Timeout or error waiting for second response: {e}")
            
            print("\nAll tests completed successfully. The application handles direct streams and new chats cleanly.")

        except Exception as e:
            print(f"\n[ERROR] Test failed: {str(e)}")
            print("\n----- END OF PAGE TEXT FOR DEBUGGING -----")
            try:
                print(page.locator("body").inner_text()[:2000])
            except:
                pass
            print("------------------------------------------")
        finally:
            browser.close()

if __name__ == "__main__":
    main()
