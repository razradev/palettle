import random
from datetime import datetime

import pandas as pd
import requests
from flask import Flask, jsonify, redirect, render_template, request, url_for

import daily

app = Flask(__name__)

# Secret app key (placeholder)
app.config["SECRET_KEY"] = "palettle"

# Different SQL databases used
USERS_DATABASE = "sqlite:///users.db"
ART_DATABASE = "sqlite:///art.db"
INTERACTIONS_DATABASE = "sqlite:///interactions.db"

prompt = None
palette = []


@app.route("/")
def home():
    art_df = pd.read_sql(
        "SELECT * FROM art ORDER BY date_created DESC LIMIT 5", con=ART_DATABASE
    )  # Get 5 newest images from the gallery
    return render_template("index.html", art=get_with_likes(art_df))


@app.route("/sign-up", methods=["POST", "GET"])
def sign_up():
    error = None
    if request.method == "POST":
        # Data from form
        username = request.form.get("newUsername")
        pin = request.form.get("pin")
        key = request.form.get("key")

        users_df = pd.DataFrame(columns=["username", "pin", "key"])

        # Check if username in database
        match = users_df[users_df["username"] == username]
        if not match.empty:
            # Check if pin matches username
            existing_pin = match.iloc[0]["pin"]

            # Failed login with incorrect pin
            if str(existing_pin) != str(pin):
                error = "Error: Try another username or pin"
            else:
                # Update new random key in credentials
                users_df.loc[users_df["username"] == username, "key"] = key

                # Add user to database
                users_df.to_sql(
                    "users", con=USERS_DATABASE, if_exists="replace", index=False
                )

                return redirect(url_for("draw"))
        else:
            new_user = pd.DataFrame([{"username": username, "pin": pin, "key": key}])

            # Add user to database
            users_df = pd.concat([users_df, new_user], ignore_index=True)
            users_df.to_sql(
                "users", con=USERS_DATABASE, if_exists="replace", index=False
            )
            return redirect(url_for("draw"))

    return render_template("sign-up.html", error=error)


@app.route("/draw", methods=["POST", "GET"])
def draw():
    get_daily()  # Reload prompt and palette every time to keep up to date with the day

    if request.method == "POST":
        # Get username and date
        username = request.json.get("username")
        today = datetime.now()
        today_formatted = f"{today.month}/{today.day}/{today.year}"

        # Check for existing art
        existing = pd.read_sql(
            f"SELECT * FROM art WHERE author = '{username}' AND date_created = '{today_formatted}'",
            con=ART_DATABASE,
        )

        # Return if it exists
        if not existing.empty:
            return jsonify({"status": "success", "existing": existing})

        return jsonify({"status": "fail"})

    return render_template("draw.html", prompt=prompt, palette=palette)


@app.route("/gallery")
def gallery():
    art_df = pd.read_sql(
        "SELECT * FROM art ORDER BY date_created DESC", con=ART_DATABASE
    )

    return render_template("gallery.html", art=get_with_likes(art_df), palette=palette)


@app.route("/art/<author>")
def art_details(author):
    art_df = pd.read_sql(
        f"SELECT * FROM art WHERE author = '{author}' ORDER BY date_created DESC",
        con=ART_DATABASE,
    )  # Find all art by user

    # Return all people who liked the art
    user_likes = pd.read_sql(
        f"SELECT * FROM interactions WHERE author = '{author}'",
        con=INTERACTIONS_DATABASE,
    ).to_dict("records")

    return render_template(
        "art.html", art=get_with_likes(art_df), user_likes=user_likes, palette=palette
    )


@app.route("/submit-art", methods=["POST"])
def submit_art():
    # Get information from form
    image_data = request.form.get("image_data[]")
    author = request.form.get("username")
    today = datetime.now()
    today_formatted = f"{today.month}/{today.day}/{today.year}"
    image_data = image_data.replace(",0,", ",,")
    palette_formatted = ",".join(palette)

    art_df = pd.read_sql("SELECT * FROM art", con=ART_DATABASE)

    # Create new row
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
    )  # Remove existing art for same day by same person

    # Add new art
    art_df = pd.concat([art_df, new_art], ignore_index=True)
    art_df.to_sql("art", con=ART_DATABASE, if_exists="replace", index=False)

    return redirect(url_for("gallery"))


@app.route("/delete/<username>/<art>", methods=["POST"])
def delete_art(username, art):
    # Check key is valid to validate deletion
    key = request.json.get("key")

    # Find user
    user = pd.read_sql(
        f"SELECT * FROM users WHERE username = '{username}' AND key = '{key}'",
        con=USERS_DATABASE,
    ).to_dict("records")

    # Check that user exists and key is valid
    if len(user) > 0 and key == user[0]["key"]:
        # Get art from database and remove requested image
        art_df = pd.read_sql("SELECT * FROM art", con=ART_DATABASE)
        art_df = art_df.drop(
            art_df[(art_df["author"] == username) & (art_df["prompt"] == art)].index
        )
        art_df.to_sql("art", con=ART_DATABASE, if_exists="replace", index=False)

        return jsonify({"status": "success"})

    return jsonify({"status": "fail"})


@app.route("/interact", methods=["POST"])
def interact():
    # Form inputs
    username = request.form.get("username")
    author = request.form.get("author")
    prompt = request.form.get("prompt")
    like = request.form.get("like")

    interactions_df = pd.read_sql(
        "SELECT * FROM interactions",
        con=INTERACTIONS_DATABASE,
    )

    # Check if user already interacted
    existing_interaction = interactions_df[
        (interactions_df["author"] == author)
        & (interactions_df["prompt"] == prompt)
        & (interactions_df["username"] == username)
    ]

    if not existing_interaction.empty:
        # Remove any existing interactions
        interactions_df = interactions_df.drop(existing_interaction.index)

    if (
        existing_interaction.empty  # No prior interaction
        or existing_interaction.to_dict("records")[0]["liked"]
        != like  # Disliking previously liked or liking previously disliked
    ):
        # Create new row
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

        # Add interaction to database
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
    # Get key from localstorage
    client_data = request.json.get("key")

    if (
        len(
            pd.read_sql(
                f"SELECT * FROM users WHERE key = '{client_data}'",
                con=USERS_DATABASE,
            )
        )
        > 0
    ):  # Check if user exists in database
        return jsonify({"status": "success"})

    # Redirect to page
    return jsonify({"redirect": fail})


def get_daily():  # Chooses random prompt and palette from daily.py
    global prompt, palette
    today = datetime.now()
    random.seed(
        int(str(today.day) + str(today.month) + str(today.year))
    )  # Seed based on day

    palette_name = random.choice(daily.palettes)
    response = requests.get(
        f"https://lospec.com/palette-list/{palette_name}.json"
    )  # Get palettes from lospec.com

    palette = ["ERROR"]
    if response.ok:
        palette = response.json()["colors"]
        palette = ["#" + color for color in palette]
    prompt = random.choice(daily.prompts)


def get_with_likes(art_df):
    interactions_df = pd.read_sql(
        "SELECT * FROM interactions", con=INTERACTIONS_DATABASE
    )  # Read all interactions
    if not interactions_df.empty:
        likes = (
            pd.crosstab(
                index=[interactions_df["prompt"], interactions_df["author"]],
                columns=interactions_df["liked"],
            )
            .reindex(columns=["like", "dislike"], fill_value=0)
            .reset_index()
            .rename(columns={"like": "likes", "dislike": "dislikes"})
        )  # Count likes and dislikes

        likes.columns.name = None

        art_df = art_df.drop(
            columns=["likes", "dislikes"], errors="ignore"
        )  # Remove any existing like/dislike data
        art_df = pd.merge(
            art_df, likes, on=["prompt", "author"], how="left"
        )  # Merge likes and dislikes with art datagram

    art = art_df.to_dict("records")
    return art


if __name__ == "__main__":
    get_daily()  # Get daily prompt/palette
    app.run(debug=True)  # host="0.0.0.0"
