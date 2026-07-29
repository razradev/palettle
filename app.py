from datetime import datetime

import pandas as pd
import requests
from flask import Flask, redirect, render_template, request, url_for

app = Flask(__name__)


# art_data = {
#     "image_data": [],
#     "author": [],
#     "date_created": [],
#     "likes": [],
#     "dislikes": [],
# }
# art_df = pd.DataFrame(art_data)
# art_df.to_sql("art", con="sqlite:///art.db", if_exists="replace", index=False)

DATABASE = "sqlite:///art.db"

palette_name = "f-l-y"
response = requests.get(f"https://lospec.com/palette-list/{palette_name}.json")
palette = ["ERROR"]
if response.ok:
    palette = response.json()["colors"]
    palette = ["#" + color for color in palette]


@app.route("/draw")
def draw():
    return render_template("draw.html", prompt="Mario", palette=palette)


@app.route("/gallery")
def gallery():
    art = pd.read_sql("SELECT * FROM art", con=DATABASE).to_dict("records")
    return render_template("gallery.html", art=art, palette=palette)


@app.route("/art/<author>")
def art_details(author):
    art = pd.read_sql(
        f"SELECT * FROM art WHERE author LIKE '%{author}%'", con=DATABASE
    ).to_dict("records")
    return render_template("art.html", art=art, palette=palette)


@app.route("/submit-art", methods=["POST"])
def submit_art():
    image_data = request.form.get("image_data[]")
    print(image_data)
    author = request.form.get("username")
    today = datetime.now()
    new_art = pd.DataFrame(
        [
            {
                "image_data": image_data,
                "author": author,
                "date_created": f"{today.month}/{today.day}/{today.year}",
                "likes": 0,
                "dislikes": 0,
            }
        ]
    )

    new_art.to_sql("art", con=DATABASE, if_exists="replace", index=False)

    return redirect(url_for("gallery"))


if __name__ == "__main__":
    app.run(debug=True, port=3000)
