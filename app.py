from flask import Flask, render_template, request

app = Flask(__name__)


# Caesar Cipher encryption and decryption logic
def caesar_cipher(text, shift):
    result = ""

    # Keep the shift within the alphabet range
    shift = shift % 26

    for char in text:

        # Shift English alphabet letters only
        if char.isalpha() and char.isascii():

            # Identify uppercase or lowercase letters
            if char.isupper():
                start = ord("A")
            else:
                start = ord("a")

            # Calculate the shifted character
            new_char = chr(
                (ord(char) - start + shift) % 26 + start
            )

            result += new_char

        else:
            # Preserve spaces, numbers, and symbols
            result += char

    return result


# Main application route
@app.route("/", methods=["GET", "POST"])
def home():

    message = ""
    result = ""
    shift = 3
    action_done = ""
    error = ""

    # Process the submitted form
    if request.method == "POST":

        message = request.form.get("message", "")
        shift_value = request.form.get("shift", "3")
        action_done = request.form.get("action", "")

        try:
            shift = int(shift_value)

            # Validate shift value
            if not 0 <= shift <= 25:
                error = "Shift value must be between 0 and 25."

            elif action_done == "encrypt":
                result = caesar_cipher(message, shift)

            elif action_done == "decrypt":
                result = caesar_cipher(message, -shift)

            else:
                error = "Please choose Encrypt or Decrypt."

        except (ValueError, TypeError):
            shift = 3
            error = "Please enter a valid whole-number shift value."

    # Send data to the HTML page
    return render_template(
        "index.html",
        message=message,
        result=result,
        shift=shift,
        action_done=action_done,
        error=error
    )


# Run the Flask application
if __name__ == "__main__":
    app.run(debug=True)