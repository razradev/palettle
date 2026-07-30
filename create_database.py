import pandas as pd

# Databases
USERS_DATABASE = "sqlite:///users.db"
ART_DATABASE = "sqlite:///art.db"
INTERACTIONS_DATABASE = "sqlite:///interactions.db"

if __name__ == "__main__":
    # Art database
    art_data = {
        "image_data": [],
        "author": [],
        "date_created": [],
        "prompt": [],
        "palette": [],
    }
    art_df = pd.DataFrame(art_data)
    art_df.to_sql("art", con=ART_DATABASE, if_exists="replace", index=False)

    # User database
    user_data = {"username": [], "key": [], "pin": []}
    user_df = pd.DataFrame(user_data)
    user_df.to_sql("users", con=USERS_DATABASE, if_exists="replace", index=False)

    # Interaction database
    interaction_data = {"username": [], "prompt": [], "author": [], "liked": []}
    interaction_df = pd.DataFrame(interaction_data)
    interaction_df.to_sql(
        "interactions", con=INTERACTIONS_DATABASE, if_exists="replace", index=False
    )
