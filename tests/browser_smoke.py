"""Exercise the payment ledger at a project subpath in Chromium."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import shutil
import tempfile
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


def main():
    screenshots = ROOT / "browser-checks"
    screenshots.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory() as temporary:
        shutil.copytree(ROOT / "dist", Path(temporary) / "example-tool")
        server = ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=temporary))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch()
                page = browser.new_page(viewport={"width": 1280, "height": 1000})
                errors = []
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.goto(f"http://127.0.0.1:{server.server_port}/example-tool/?period=2026-10")
                page.wait_for_selector("#results:visible")
                assert "172,555" in page.locator(".card").first.inner_text()
                page.select_option("#measure", "share")
                page.wait_for_function("document.querySelector('.big').textContent === '2.28%'")
                page.select_option("#second", "")
                page.wait_for_function("document.querySelectorAll('.card').length === 1")
                page.locator("summary").click()
                assert page.locator("#rows tr").count() == 24
                with page.expect_download() as download:
                    page.click("#download")
                assert download.value.suggested_filename.endswith("2026-10.csv")
                page.screenshot(path=str(screenshots / "desktop.png"))
                page.set_viewport_size({"width": 390, "height": 844})
                assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
                page.screenshot(path=str(screenshots / "mobile.png"))
                assert not errors, errors
                browser.close()
            print("Browser checks passed: published OAS row, comparison, share, export and mobile layout")
        finally:
            server.shutdown()


if __name__ == "__main__":
    main()
