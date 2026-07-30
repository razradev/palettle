document.addEventListener("DOMContentLoaded", () => {
  // Gets locally stored key
  const userData = localStorage.getItem("key");

  // Checks if account is valid and redirects to another page if not
  fetch(`/verify/${fail}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: userData }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.redirect) {
        // Clears bad credentials
        localStorage.clear();
        window.location.href = data.redirect;
      } else {
        // Shows content
        document.querySelector("main").hidden = false;
      }
    });
});
