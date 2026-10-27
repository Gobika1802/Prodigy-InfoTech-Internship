# CyberKey - Keyboard Activity Monitor

A modern cybersecurity educational dashboard for
understanding keyboard events using HTML, CSS and JavaScript.
An optional Flask server is included for serving the static
files over HTTP.

## Features

- Professional dark dashboard UI
- Live session status and clock
- Keyboard event monitoring in a dedicated text area
- Character and special key statistics
- Searchable and filterable activity logs
- Last key pressed preview
- CSV activity report export
- Responsive desktop and mobile design
- Local browser processing; no database, accounts or telemetry

## Tech Stack

- HTML5
- CSS3
- Vanilla JavaScript
- Python 3 and Flask (optional static server only)

## Project Structure

```text
CyberKey/
├── app.py            # Optional Flask static-file server
├── index.html
├── style.css
├── script.js
├── assets/
│   └── favicon.svg
├── README.md
└── .gitignore
```

## How to Run

### Option 1 - Open directly (no installation)

1. Open `index.html` in a modern browser.
2. Click **Start Monitoring**.
3. Type inside the designated text area.
4. Review the activity logs and statistics.
5. Export the report as a CSV file.

No package installation or server is required for this option.

### Option 2 - Flask server (optional)

Requires Python 3.9 or newer.

1. Install Flask:

   ```sh
   python -m pip install flask
   ```

2. Start the server from the project folder:

   ```sh
   python app.py
   ```

3. Open <http://127.0.0.1:5000> in your browser.
4. Stop the server with `Ctrl+C`.

The server binds to `127.0.0.1` and is intended for local
development only. It serves the static files and does not
store or transmit keystroke data. Debug mode is enabled in
`app.py`, so do not expose it to a public network; disable
`debug` before deploying it anywhere else.

## Privacy and Ethics

This project records keyboard events only within its
designated input area after the user starts a session.

It does not capture keystrokes from other applications,
browser tabs or pages.

Events are held in browser memory and are not transmitted
to a server. There is no backend storage. Exported CSV
reports contain the recorded keys and should be handled as
sensitive files.

The dashboard loads its fonts from Google Fonts, which makes
a request to Google's servers. For a fully offline or
privacy-only setup, remove the `@import` rule at the top of
`style.css` or self-host the font files.

Do not collect personal or sensitive information without
explicit consent.

## License

MIT
