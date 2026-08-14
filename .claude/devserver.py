#!/usr/bin/env python3
"""Threaded static server for local preview.

http.server's single-threaded default stalls (and dies) when the browser
aborts one of the multi-megabyte soundfont requests mid-flight.
"""
import functools
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8931


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # No HTTP caching locally — the only cache in play should be the
        # service worker's, so stale assets have exactly one explanation
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


if __name__ == '__main__':
    handler = functools.partial(Handler, directory=ROOT)
    ThreadingHTTPServer(('127.0.0.1', PORT), handler).serve_forever()
