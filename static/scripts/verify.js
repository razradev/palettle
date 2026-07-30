document.addEventListener("DOMContentLoaded", () => {
  const userData = localStorage.getItem("key");

  fetch(`/verify/${fail}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: userData }),
  })
    .then((response) => response.json())
    .then((data) => {
      if (data.redirect) {
        localStorage.clear();
        window.location.href = data.redirect;
      } else {
        document.querySelector("main").hidden = false;
      }
    });
});
