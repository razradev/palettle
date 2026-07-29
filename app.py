import requests
from flask import Flask, redirect, render_template, request, url_for

app = Flask(__name__)


@app.route("/draw")
def draw():
    response = requests.get("https://lospec.com/palette-list/f-l-y.json")
    palette = ["ERROR"]
    if response.ok:
        palette = response.json()["colors"]
        palette = ["#" + color for color in palette]

    return render_template("draw.html", prompt="Mario", palette=palette)


@app.route("/submit-art")
def submit_art():
    image_data = request.form.get("image_data")
    print(image_data)
    return redirect(url_for("draw"))


if __name__ == "__main__":
    app.run(debug=True, port=3000)
