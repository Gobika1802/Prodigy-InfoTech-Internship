from flask import Flask, render_template, request

app = Flask(__name__)


def caesar_cipher(text, shift):
    result = ""

    for char in text:
        if char.isalpha():

            if char.isupper():
                start = ord('A')
            else:
                start = ord('a')

            new_char = chr(
                (ord(char) - start + shift) % 26 + start
            )

            result += new_char

        else:
            result += char

    return result


@app.route("/", methods=["GET", "POST"])
def home():

    result = ""
    message = ""
    shift = ""

    if request.method == "POST":

        message = request.form.get("message", "")
        shift = request.form.get("shift", "0")
        action = request.form.get("action")

        try:
            shift = int(shift)

            if action == "encrypt":
                result = caesar_cipher(message, shift)

            elif action == "decrypt":
                result = caesar_cipher(message, -shift)

        except ValueError:
            result = "Please enter a valid shift value."

    return render_template(
        "index.html",
        result=result,
        message=message,
        shift=shift
    )


if __name__ == "__main__":
    app.run(debug=True)