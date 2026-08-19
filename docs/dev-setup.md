Development setup — ID Card PDF renderer

This project includes a server-side HTML→PDF renderer for Student ID Cards using puppeteer-core. To use it locally and in CI, follow these steps.

1) Install dependencies

  npm install

2) Download Chromium for local development (Windows)

  npm run download-chromium

This will extract Chromium to ./.local-chrome and print the path to chrome.exe.

3) Set the PUPPETEER_EXECUTABLE_PATH environment variable

- Temporary (current PowerShell session):

  $env:PUPPETEER_EXECUTABLE_PATH = "C:\path\to\.local-chrome\chrome-win\chrome.exe"

- Permanent (current user):

  [Environment]::SetEnvironmentVariable('PUPPETEER_EXECUTABLE_PATH', 'C:\path\to\.local-chrome\chrome-win\chrome.exe', 'User')

4) Supabase keys (required for preview and signed URLs)

Set the following env vars in your environment or in your .env.local file used by Next.js:

  SUPABASE_URL=https://your-project.supabase.co
  SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

Note: Keep the service role key secret. Do not commit it to source control.

5) Health check endpoint

Start dev server and hit:

  GET /api/dev/id-card-pdf-check

It returns JSON indicating whether puppeteer-core is available, whether PUPPETEER_EXECUTABLE_PATH exists, and presence of SUPABASE env vars.

6) Generate PDF

From the student directory, click Generate ID Card → Preview → Download PDF. The server endpoint /api/students/[id]/card-pdf will render a PDF sized to the template and return it as an attachment.

Troubleshooting
- If the download endpoint returns an error about PUPPETEER_EXECUTABLE_PATH, ensure chrome.exe exists at the path and the env var is set.
- If images are missing, confirm SUPABASE_SERVICE_ROLE_KEY is set so the server can create signed URLs for design files.
