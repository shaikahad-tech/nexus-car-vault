#!/usr/bin/env python3
"""NEXUS Car Vault — local dev server.

Serves the project on http://localhost:8080 with proper MIME types
for ES modules (.js as text/javascript).

Usage:
    python3 serve.py
    python3 serve.py --port 3000
"""

import http.server
import socketserver
import argparse
import os
import sys

PORT = 8080
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


class CustomHandler(http.server.SimpleHTTPRequestHandler):
    """Serve .js files as ES modules so import/export works."""

    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript',
        '.mjs': 'text/javascript',
        '.json': 'application/json',
        '.css': 'text/css',
        '.html': 'text/html',
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Allow CORS for local dev
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()


def main():
    parser = argparse.ArgumentParser(description='NEXUS Car Vault dev server')
    parser.add_argument('--port', type=int, default=PORT, help='Port to serve on')
    args = parser.parse_args()

    os.chdir(DIRECTORY)

    with socketserver.TCPServer(('0.0.0.0', args.port), CustomHandler) as httpd:
        print(f'\n  ╔══════════════════════════════════════╗')
        print(f'  ║   NEXUS Car Vault — Dev Server       ║')
        print(f'  ╠══════════════════════════════════════╣')
        print(f'  ║   http://localhost:{args.port:<5}            ║')
        print(f'  ║   Press Ctrl+C to stop               ║')
        print(f'  ╚══════════════════════════════════════╝\n')

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print('\n  Server stopped.')
            sys.exit(0)


if __name__ == '__main__':
    main()
