import random
from datetime import datetime

import pandas as pd
import requests
from flask import Flask, jsonify, redirect, render_template, request, url_for

import daily

app = Flask(__name__)

USERS_DATABASE = "sqlite:///users.db"
ART_DATABASE = "sqlite:///art.db"


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/verify", methods=["POST"])
def verify():
    client_data = request.json.get("key")

    if (
        len(
            pd.read_sql(
                f"SELECT * FROM users WHERE key LIKE '%{client_data}%'",
                con=USERS_DATABASE,
            )
        )
        > 0
    ):
        return jsonify({"status": "success"})
    return jsonify({"redirect": url_for("start")})


@app.route("/sign-up", methods=["POST", "GET"])
def sign_up():
    if request.method == "POST":
        username = request.form.get("username")
        key = request.form.get("key")

        print(username)

        new_user = pd.DataFrame([{"username": username, "key": key}])
        new_user.to_sql("users", con=USERS_DATABASE, if_exists="replace", index=False)

        return redirect(url_for("draw"))
    else:
        return render_template("sign-up.html")


@app.route("/draw")
def draw():
    return render_template("draw.html", prompt=prompt, palette=palette)


@app.route("/gallery")
def gallery():
    art = pd.read_sql("SELECT * FROM art", con=ART_DATABASE).to_dict("records")
    return render_template("gallery.html", art=art, palette=palette)


@app.route("/art/<author>")
def art_details(author):
    art = pd.read_sql(
        f"SELECT * FROM art WHERE author LIKE '%{author}%'", con=ART_DATABASE
    ).to_dict("records")
    return render_template("art.html", art=art, palette=palette)


@app.route("/submit-art", methods=["POST"])
def submit_art():
    image_data = request.form.get("image_data[]")
    author = request.form.get("username")
    today = datetime.now()
    image_data = image_data.replace(",0,", ",,")
    new_art = pd.DataFrame(
        [
            {
                "image_data": image_data,
                "author": author,
                "date_created": f"{today.month}/{today.day}/{today.year}",
                "prompt": prompt,
                "likes": 0,
                "dislikes": 0,
            }
        ]
    )

    new_art.to_sql("art", con=ART_DATABASE, if_exists="replace", index=False)

    return redirect(url_for("gallery"))


if __name__ == "__main__":
    global prompt, palette

    art_data = {
        "image_data": [],
        "author": [],
        "date_created": [],
        "prompt": [],
        "likes": [],
        "dislikes": [],
    }
    art_df = pd.DataFrame(art_data)
    art_df.to_sql("art", con="sqlite:///art.db", if_exists="replace", index=False)

    user_data = {
        "username": [],
        "key": [],
    }
    user_df = pd.DataFrame(user_data)
    user_df.to_sql("users", con="sqlite:///users.db", if_exists="replace", index=False)

    palette_name = random.choice(daily.palettes)
    response = requests.get(f"https://lospec.com/palette-list/{palette_name}.json")
    palette = ["ERROR"]
    if response.ok:
        palette = response.json()["colors"]
        palette = ["#" + color for color in palette]

    prompt = random.choice(daily.prompts)

    app.run(debug=True, port=3000)
