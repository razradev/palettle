import random
from datetime import datetime

import pandas as pd
import requests
from flask import Flask, jsonify, redirect, render_template, request, url_for

import daily

app = Flask(__name__)
app.config["SECRET_KEY"] = "palettle"
USERS_DATABASE = "sqlite:///users.db"
ART_DATABASE = "sqlite:///art.db"
INTERACTIONS_DATABASE = "sqlite:///interactions.db"


@app.route("/")
def home():
    art_df = pd.read_sql(
        "SELECT * FROM art ORDER BY date_created DESC LIMIT 5", con=ART_DATABASE
    )

    interactions_df = pd.read_sql(
        "SELECT * FROM interactions", con=INTERACTIONS_DATABASE
    )
    if not interactions_df.empty:
        likes = (
            pd.crosstab(
                index=[art_df["prompt"], art_df["author"]],
                columns=interactions_df["liked"],
            )
            .reindex(columns=["like", "dislike"], fill_value=0)
            .reset_index()
        )
        likes = likes.rename(columns={"like": "likes", "dislike": "dislikes"})

        likes.columns.name = None

        art_df = pd.merge(art_df, likes, on=["prompt", "author"], how="left")

    art = art_df.to_dict("records")

    return render_template("index.html", art=art)


@app.route("/interact", methods=["POST"])
def interact():
    username = request.form.get("username")
    author = request.form.get("author")
    prompt = request.form.get("prompt")
    like = request.form.get("like")

    interactions_df = pd.read_sql(
        "SELECT * FROM interactions",
        con=INTERACTIONS_DATABASE,
    )

    existing_interaction = interactions_df[
        (interactions_df["author"] == author)
        & (interactions_df["prompt"] == prompt)
        & (interactions_df["username"] == username)
    ]
    if not existing_interaction.empty:
        interactions_df = interactions_df.drop(existing_interaction.index)

    if (
        existing_interaction.empty
        or existing_interaction.to_dict("records")[0]["liked"] != like
    ):
        new_interaction = pd.DataFrame(
            [
                {
                    "username": username,
                    "author": author,
                    "prompt": prompt,
                    "liked": like,
                }
            ]
        )

        interactions_df = pd.concat(
            [interactions_df, new_interaction], ignore_index=True
        )
    interactions_df.to_sql(
        "interactions",
        con=INTERACTIONS_DATABASE,
        if_exists="replace",
        index=False,
    )
    return redirect("/art/" + author)


@app.route("/verify/<fail>", methods=["POST"])
def verify(fail):
    client_data = request.json.get("key")
    if (
        len(
            pd.read_sql(
                f"SELECT * FROM users WHERE key = '{client_data}'",
                con=USERS_DATABASE,
            )
        )
        > 0
    ):
        return jsonify({"status": "success"})
    return jsonify({"redirect": fail})


@app.route("/sign-up", methods=["POST", "GET"])
def sign_up():
    error = None
    if request.method == "POST":
        username = request.form.get("newUsername")
        pin = request.form.get("pin")
        key = request.form.get("key")
        try:
            users_df = pd.read_sql("SELECT * FROM users", con=USERS_DATABASE)
        except Exception:
            users_df = pd.DataFrame(columns=["username", "pin", "key"])
        match = users_df[users_df["username"] == username]
        if not match.empty:
            existing_pin = match.iloc[0]["pin"]
            if str(existing_pin) != str(pin):
                error = "Error: Try another username or pin"
            else:
                users_df.loc[users_df["username"] == username, "key"] = key
                users_df.to_sql(
                    "users", con=USERS_DATABASE, if_exists="replace", index=False
                )
                return redirect(url_for("draw"))
        else:
            new_user = pd.DataFrame([{"username": username, "pin": pin, "key": key}])
            users_df = pd.concat([users_df, new_user], ignore_index=True)
            users_df.to_sql(
                "users", con=USERS_DATABASE, if_exists="replace", index=False
            )
            return redirect(url_for("draw"))
    return render_template("sign-up.html", error=error)


@app.route("/draw", methods=["POST", "GET"])
def draw():
    if request.method == "POST":
        username = request.json.get("username")
        today = datetime.now()
        today_formatted = f"{today.month}/{today.day}/{today.year}"
        existing = pd.read_sql(
            f"SELECT * FROM art WHERE author = '{username}' AND date_created = '{today_formatted}'",
            con=ART_DATABASE,
        ).to_dict("records")
        if len(existing) > 0:
            return jsonify({"status": "success", "existing": existing})
        return jsonify({"status": "fail"})
    return render_template("draw.html", prompt=prompt, palette=palette)


@app.route("/gallery")
def gallery():
    art_df = pd.read_sql(
        "SELECT * FROM art ORDER BY date_created DESC", con=ART_DATABASE
    )
    interactions_df = pd.read_sql(
        "SELECT * FROM interactions", con=INTERACTIONS_DATABASE
    )
    if not interactions_df.empty:
        likes = (
            pd.crosstab(
                index=[art_df["prompt"], art_df["author"]],
                columns=interactions_df["liked"],
            )
            .reindex(columns=["like", "dislike"], fill_value=0)
            .reset_index()
        )
        likes = likes.rename(columns={"like": "likes", "dislike": "dislikes"})

        likes.columns.name = None

        art_df = pd.merge(art_df, likes, on=["prompt", "author"], how="left")

    art = art_df.to_dict("records")

    return render_template("gallery.html", art=art, palette=palette)


@app.route("/art/<author>")
def art_details(author):
    art_df = pd.read_sql(
        f"SELECT * FROM art WHERE author = '{author}' ORDER BY date_created DESC",
        con=ART_DATABASE,
    )
    interactions_df = pd.read_sql(
        "SELECT * FROM interactions", con=INTERACTIONS_DATABASE
    )
    if not interactions_df.empty:
        likes = (
            pd.crosstab(
                index=[art_df["prompt"], art_df["author"]],
                columns=interactions_df["liked"],
            )
            .reindex(columns=["like", "dislike"], fill_value=0)
            .reset_index()
        )
        likes = likes.rename(columns={"like": "likes", "dislike": "dislikes"})

        likes.columns.name = None

        art_df = pd.merge(art_df, likes, on=["prompt", "author"], how="left")

    art = art_df.to_dict("records")

    return render_template("art.html", art=art, palette=palette)


@app.route("/delete/<username>/<art>", methods=["POST"])
def delete_art(username, art):
    key = request.json.get("key")

    user = pd.read_sql(
        f"SELECT * FROM users WHERE username = '{username}' AND key = '{key}'",
        con=USERS_DATABASE,
    ).to_dict("records")

    if len(user) > 0 and key == user[0]["key"]:
        art_df = pd.read_sql("SELECT * FROM art", con=ART_DATABASE)
        art_df = art_df.drop(
            art_df[(art_df["author"] == username) & (art_df["prompt"] == art)].index
        )
        art_df.to_sql("art", con=ART_DATABASE, if_exists="replace", index=False)

        return jsonify({"status": "success"})

    return jsonify({"status": "fail"})


@app.route("/submit-art", methods=["POST"])
def submit_art():
    image_data = request.form.get("image_data[]")
    author = request.form.get("username")
    today = datetime.now()
    today_formatted = f"{today.month}/{today.day}/{today.year}"
    image_data = image_data.replace(",0,", ",,")
    palette_formatted = ",".join(palette)
    art_df = pd.read_sql("SELECT * FROM art", con=ART_DATABASE)

    new_art = pd.DataFrame(
        [
            {
                "image_data": image_data,
                "author": author,
                "date_created": today_formatted,
                "prompt": prompt,
                "palette": palette_formatted,
            }
        ]
    )

    art_df = art_df.drop(
        art_df[
            (art_df["date_created"] == today_formatted) & (art_df["author"] == author)
        ].index
    )
    art_df = pd.concat([art_df, new_art], ignore_index=True)
    art_df.to_sql("art", con=ART_DATABASE, if_exists="replace", index=False)
    return redirect(url_for("gallery"))


if __name__ == "__main__":
    global prompt, palette
    today = datetime.now()
    random.seed(int(str(today.day) + str(today.month) + str(today.year)))

    palette_name = random.choice(daily.palettes)
    response = requests.get(f"https://lospec.com/palette-list/{palette_name}.json")
    palette = ["ERROR"]
    if response.ok:
        palette = response.json()["colors"]
        palette = ["#" + color for color in palette]
    prompt = random.choice(daily.prompts)
    app.run(debug=True, port=3000)
