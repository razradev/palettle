import pandas as pd

USERS_DATABASE = "sqlite:///users.db"
ART_DATABASE = "sqlite:///art.db"

if __name__ == "__main__":
    art_data = {
        "image_data": [],
        "author": [],
        "date_created": [],
        "prompt": [],
        "likes": [],
        "dislikes": [],
        "palette": [],
    }
    art_df = pd.DataFrame(art_data)
    art_df.to_sql("art", con=ART_DATABASE, if_exists="replace", index=False)

    user_data = {"username": [], "key": [], "pin": []}
    user_df = pd.DataFrame(user_data)
    user_df.to_sql("users", con=USERS_DATABASE, if_exists="replace", index=False)
