import http.server
import socketserver
import os

PORT = 8000

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

os.chdir(r'C:/academy')
print('NO-CACHE SERVER started at http://127.0.0.1:' + str(PORT))
with socketserver.TCPServer(('', PORT), NoCacheHandler) as httpd:
    httpd.serve_forever()
