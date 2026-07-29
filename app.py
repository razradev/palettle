from flask import Flask, render_template

app = Flask(__name__)


@app.route("/draw")
def draw():
    return render_template(
        "draw.html", prompt="Mario", palette=["red", "green", "blue"]
    )


if __name__ == "__main__":
    app.run(debug=True)
