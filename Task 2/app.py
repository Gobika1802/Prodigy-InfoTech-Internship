import os
import io
import base64
import secrets
import hashlib

from pathlib import Path
from functools import wraps

from flask import (
    Flask,
    render_template,
    request,
    send_file,
    session,
    abort
)

from PIL import Image, ImageOps, UnidentifiedImageError


# --------------------------------------------------
# FLASK CONFIGURATION
# --------------------------------------------------

app = Flask(__name__)

app.secret_key = os.environ.get(
    "FLASK_SECRET_KEY",
    secrets.token_hex(32)
)

app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
MAX_PIXELS = 4_000_000

# Store images on the server, NOT in session cookies.
UPLOAD_FOLDER = Path(app.instance_path) / "pixelvault"
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)


# --------------------------------------------------
# HELPER FUNCTIONS
# --------------------------------------------------

def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in ALLOWED_EXTENSIONS
    )


def get_user_folder():
    """Create a separate storage folder for each browser session."""

    user_id = session.get("user_id")

    if not user_id:
        user_id = secrets.token_urlsafe(24)
        session["user_id"] = user_id

    folder = UPLOAD_FOLDER / user_id
    folder.mkdir(parents=True, exist_ok=True)

    return folder


def get_image_path(image_type):
    """Return a safe image path inside the current session folder."""

    filenames = {
        "original": "original.png",
        "encrypted": "encrypted.png",
        "decrypted": "decrypted.png",
    }

    if image_type not in filenames:
        abort(400, description="Invalid image type.")

    return get_user_folder() / filenames[image_type]


def image_to_base64(image):
    """Convert an image to a base64 preview for HTML."""

    buffer = io.BytesIO()
    image.save(buffer, format="PNG")

    return base64.b64encode(
        buffer.getvalue()
    ).decode("utf-8")


def key_hash(key):
    """Create a hash to verify the encryption key."""

    return hashlib.sha256(
        key.encode("utf-8")
    ).hexdigest()


def encryption_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):

        encrypted_path = get_image_path("encrypted")

        if not encrypted_path.is_file():
            return render_template(
                "index.html",
                error="Please upload and encrypt an image first."
            ), 400

        if not session.get("image_key_hash"):
            return render_template(
                "index.html",
                error="Encryption information is missing. Please encrypt again."
            ), 400

        return func(*args, **kwargs)

    return wrapper


# --------------------------------------------------
# IMAGE ENCRYPTION
# --------------------------------------------------

def encrypt_image(image, key_bytes):
    """
    Educational pixel-manipulation demonstration.

    XOR is reversible with the same key bytes.
    This is NOT secure encryption for confidential images.
    """

    if not key_bytes:
        raise ValueError("Encryption key cannot be empty.")

    image = image.convert("RGB")

    width, height = image.size
    pixels = bytearray(image.tobytes())

    for i in range(len(pixels)):
        pixels[i] ^= key_bytes[i % len(key_bytes)]

    return Image.frombytes(
        "RGB",
        (width, height),
        bytes(pixels)
    )


# --------------------------------------------------
# HOME PAGE
# --------------------------------------------------

@app.route("/")
def index():
    return render_template("index.html")


# --------------------------------------------------
# ENCRYPT IMAGE
# --------------------------------------------------

@app.route("/encrypt", methods=["POST"])
def encrypt():

    uploaded_file = request.files.get("image")
    key = request.form.get("key", "").strip()

    if not uploaded_file or not uploaded_file.filename:
        return render_template(
            "index.html",
            error="Please select an image."
        )

    if not allowed_file(uploaded_file.filename):
        return render_template(
            "index.html",
            error="Upload PNG, JPG, JPEG, or WEBP images only."
        )

    if not 8 <= len(key) <= 128:
        return render_template(
            "index.html",
            error="Your encryption key must contain 8 to 128 characters."
        )

    try:
        uploaded_file.stream.seek(0)

        with Image.open(uploaded_file.stream) as source:

            if source.width * source.height > MAX_PIXELS:
                return render_template(
                    "index.html",
                    error="Image is too large. Use an image below 4 megapixels."
                )

            source.load()

            original = ImageOps.exif_transpose(
                source
            ).convert("RGB")

        folder = get_user_folder()

        original_path = get_image_path("original")
        encrypted_path = get_image_path("encrypted")
        decrypted_path = get_image_path("decrypted")

        # Save the original image.
        original.save(original_path, format="PNG")

        # Convert the user's key to bytes.
        key_bytes = key.encode("utf-8")

        # Encrypt image pixel data.
        encrypted = encrypt_image(original, key_bytes)

        # Save encrypted image on the server.
        encrypted.save(encrypted_path, format="PNG")

        # Remove an older decrypted image, if present.
        if decrypted_path.exists():
            decrypted_path.unlink()

        # Store only small values in the session.
        session["image_key_hash"] = key_hash(key)
        session["encrypted_ready"] = True
        session["decrypted_ready"] = False

        return render_template(
            "index.html",
            original_preview=image_to_base64(original),
            encrypted_preview=image_to_base64(encrypted),
            success="Image encrypted successfully!",
            encrypted_ready=True,
            download_ready=False
        )

    except (UnidentifiedImageError, OSError, ValueError):
        app.logger.exception("Image processing failed")

        return render_template(
            "index.html",
            error="Unable to process this image. Please choose another image."
        )

    except Exception:
        app.logger.exception("Unexpected encryption error")

        return render_template(
            "index.html",
            error="An unexpected error occurred while encrypting the image."
        )


# --------------------------------------------------
# DECRYPT IMAGE
# --------------------------------------------------

@app.route("/decrypt", methods=["POST"])
@encryption_required
def decrypt():

    key = request.form.get("key", "").strip()

    if not key:
        return render_template(
            "index.html",
            error="Please enter your encryption key."
        )

    if not secrets.compare_digest(
        key_hash(key),
        session.get("image_key_hash", "")
    ):
        return render_template(
            "index.html",
            error="Incorrect key! Enter the same key used for encryption."
        )

    try:
        encrypted_path = get_image_path("encrypted")
        decrypted_path = get_image_path("decrypted")

        with Image.open(encrypted_path) as source:
            source.load()
            encrypted_image = source.convert("RGB")

        # Apply XOR again to restore the pixel bytes.
        decrypted = encrypt_image(
            encrypted_image,
            key.encode("utf-8")
        )

        # Save the restored image.
        decrypted.save(decrypted_path, format="PNG")

        session["decrypted_ready"] = True

        return render_template(
            "index.html",
            decrypted_preview=image_to_base64(decrypted),
            success="Image decrypted successfully!",
            encrypted_ready=True,
            download_ready=True
        )

    except Exception:
        app.logger.exception("Image decryption failed")

        return render_template(
            "index.html",
            error="Unable to decrypt the image. Please try again."
        )


# --------------------------------------------------
# DOWNLOAD IMAGE
# --------------------------------------------------

@app.route("/download/<image_type>")
def download(image_type):

    if image_type not in {"encrypted", "decrypted"}:
        abort(400, description="Invalid download type.")

    if image_type == "encrypted":
        if not session.get("encrypted_ready"):
            abort(404, description="Please encrypt an image first.")

    if image_type == "decrypted":
        if not session.get("decrypted_ready"):
            abort(404, description="Please decrypt the image first.")

    image_path = get_image_path(image_type)

    if not image_path.is_file():
        abort(404, description="Image file not found. Please process the image again.")

    return send_file(
        image_path,
        mimetype="image/png",
        as_attachment=True,
        download_name=f"{image_type}_image.png"
    )


# --------------------------------------------------
# SAVE DECRYPTED IMAGE
# Compatibility with the existing HTML frontend
# --------------------------------------------------

@app.route("/save-decrypted", methods=["POST"])
@encryption_required
def save_decrypted():

    key = request.form.get("key", "").strip()

    if not key:
        return "Please enter your encryption key.", 400

    if not secrets.compare_digest(
        key_hash(key),
        session.get("image_key_hash", "")
    ):
        return "Incorrect encryption key.", 403

    try:
        encrypted_path = get_image_path("encrypted")
        decrypted_path = get_image_path("decrypted")

        with Image.open(encrypted_path) as source:
            source.load()
            encrypted_image = source.convert("RGB")

        decrypted = encrypt_image(
            encrypted_image,
            key.encode("utf-8")
        )

        decrypted.save(decrypted_path, format="PNG")

        session["decrypted_ready"] = True

        return "OK"

    except Exception:
        app.logger.exception("Unable to save decrypted image")

        return "Unable to process the image.", 500


# --------------------------------------------------
# ERROR HANDLERS
# --------------------------------------------------

@app.errorhandler(413)
def file_too_large(error):
    return render_template(
        "index.html",
        error="File is too large. Please upload an image under 10 MB."
    ), 413


# --------------------------------------------------
# RUN APPLICATION
# --------------------------------------------------

if __name__ == "__main__":
    app.run(debug=True)