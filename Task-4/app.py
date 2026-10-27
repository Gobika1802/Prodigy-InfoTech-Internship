from pathlib import Path

from flask import Flask, send_from_directory

BASE_DIR = Path(__file__).resolve().parent
ASSETS_DIR = BASE_DIR / "assets"

app = Flask(__name__)


@app.route("/")
def home():
    return send_from_directory(BASE_DIR, "index.html")


@app.route("/style.css")
def stylesheet():
    return send_from_directory(BASE_DIR, "style.css")


@app.route("/script.js")
def javascript():
    return send_from_directory(BASE_DIR, "script.js")


@app.route("/assets/<path:filename>")
def assets(filename):
    return send_from_directory(ASSETS_DIR, filename)


if __name__ == "__main__":
    print("CyberKey server is starting...")
    print("Open http://127.0.0.1:5000 in your browser")

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=True
    )