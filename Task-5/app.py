
from flask import Flask, jsonify, render_template, request
from packet_analyzer import analyzer

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/interfaces", methods=["GET"])
def interfaces():
    return jsonify({
        "interfaces": analyzer.get_interfaces()
    })


@app.route("/api/status", methods=["GET"])
def status():
    return jsonify(analyzer.get_snapshot())


@app.route("/api/start", methods=["POST"])
def start_capture():
    data = request.get_json(silent=True) or {}
    interface = data.get("interface", "").strip()

    if interface not in analyzer.get_interfaces():
        return jsonify({
            "success": False,
            "message": "Please select a valid network interface."
        }), 400

    success, message = analyzer.start_capture(interface)

    return jsonify({
        "success": success,
        "message": message
    }), 200 if success else 400


@app.route("/api/stop", methods=["POST"])
def stop_capture():
    success, message = analyzer.stop_capture()

    return jsonify({
        "success": success,
        "message": message
    })


@app.route("/api/clear", methods=["POST"])
def clear_packets():
    analyzer.clear_packets()

    return jsonify({
        "success": True,
        "message": "Packet statistics cleared."
    })


if __name__ == "__main__":
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False,
        threaded=True
    )
