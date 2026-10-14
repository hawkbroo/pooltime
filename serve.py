#!/usr/bin/env python3
"""Local server for Pool Time site + admin save/upload."""
from __future__ import annotations

import json
import mimetypes
import re
import uuid
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parent
CONTENT = ROOT / "content.json"
UPLOADS = ROOT / "uploads"
HOST = "127.0.0.1"
PORT = 5560


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        if self.path == "/api/save":
            return self._save_content()
        if self.path == "/api/upload":
            return self._upload()
        self.send_error(404)

    def _read_body(self) -> bytes:
        length = int(self.headers.get("Content-Length", 0))
        return self.rfile.read(length)

    def _json(self, code: int, payload: dict):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _save_content(self):
        try:
            data = json.loads(self._read_body().decode("utf-8"))
            CONTENT.write_text(
                json.dumps(data, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            self._json(200, {"ok": True})
        except Exception as e:
            self._json(400, {"ok": False, "error": str(e)})

    def _parse_multipart(self, body: bytes, boundary: str):
        boundary = boundary.strip().strip('"')
        sep = b"--" + boundary.encode("utf-8", errors="ignore")
        fields: dict[str, str] = {}
        file_bytes = None
        filename = "upload.bin"

        for raw in body.split(sep):
            if not raw or raw in (b"--", b"--\r\n"):
                continue
            if raw.startswith(b"--"):
                continue
            if raw.startswith(b"\r\n"):
                raw = raw[2:]
            if raw.endswith(b"\r\n"):
                raw = raw[:-2]
            head, sep2, content = raw.partition(b"\r\n\r\n")
            if not sep2:
                continue
            head_txt = head.decode("utf-8", errors="ignore")
            if "Content-Disposition" not in head_txt:
                continue
            name_m = re.search(r'name="([^"]+)"', head_txt)
            if not name_m:
                continue
            name = name_m.group(1)
            if name == "file":
                fn = re.search(r'filename="([^"]*)"', head_txt)
                if fn and fn.group(1):
                    filename = unquote(fn.group(1))
                file_bytes = content
            else:
                fields[name] = content.decode("utf-8", errors="ignore").strip()
        return fields, file_bytes, filename

    def _upload(self):
        try:
            content_type = self.headers.get("Content-Type", "")
            if "multipart/form-data" not in content_type:
                return self._json(400, {"ok": False, "error": "expected multipart"})

            boundary = content_type.split("boundary=", 1)[-1].strip()
            body = self._read_body()
            fields, file_bytes, filename = self._parse_multipart(body, boundary)

            if not file_bytes:
                return self._json(400, {"ok": False, "error": "no file"})

            folder = re.sub(r"[^a-zA-Z0-9_-]", "", fields.get("folder", "promo")) or "promo"
            dest_dir = UPLOADS / folder
            dest_dir.mkdir(parents=True, exist_ok=True)
            ext = Path(filename).suffix.lower()[:8] or ".bin"
            if ext not in {".jpg", ".jpeg", ".png", ".webp", ".gif", ".mp4", ".webm", ".bin"}:
                ext = ".bin"
            name = f"{uuid.uuid4().hex}{ext}"
            path = dest_dir / name
            path.write_bytes(file_bytes)
            rel = f"uploads/{folder}/{name}".replace("\\", "/")
            self._json(200, {"ok": True, "path": rel})
        except Exception as e:
            self._json(500, {"ok": False, "error": str(e)})

    def log_message(self, fmt, *args):
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))


def main():
    UPLOADS.mkdir(parents=True, exist_ok=True)
    (UPLOADS / "tables").mkdir(exist_ok=True)
    (UPLOADS / "promo").mkdir(exist_ok=True)
    (UPLOADS / "gallery").mkdir(exist_ok=True)
    mimetypes.add_type("application/javascript", ".js")
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"POOL TIME http://{HOST}:{PORT}/")
    print(f"Admin     http://{HOST}:{PORT}/admin/")
    print("Admin password: pooltime2026")
    server.serve_forever()


if __name__ == "__main__":
    main()
