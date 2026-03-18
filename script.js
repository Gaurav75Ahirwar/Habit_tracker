const toggleBtn = document.getElementById("theme-toggle");

// Load saved theme
if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    toggleBtn.textContent = "☀️";
} else {
    toggleBtn.textContent = "🌙";
}

toggleBtn.addEventListener("click", () => {
    // fade out
    toggleBtn.classList.add("fade");

    setTimeout(() => {
        // toggle theme
        document.body.classList.toggle("dark-mode");

        if (document.body.classList.contains("dark-mode")) {
            localStorage.setItem("theme", "dark");
            toggleBtn.textContent = "☀️";
        } else {
            localStorage.setItem("theme", "light");
            toggleBtn.textContent = "🌙";
        }

        // fade back in
        toggleBtn.classList.remove("fade");

    }, 175); // delay matches transition
});