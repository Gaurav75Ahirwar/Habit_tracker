document.addEventListener("DOMContentLoaded", () => {
    // Get the Theme-toggle button 
    const toggleBtn = document.getElementById("theme-toggle");

    // Function for toggle theme 
    function setIcon() {
        if (document.body.classList.contains("dark-mode")) {
            toggleBtn.innerHTML = '<i data-lucide="sun"></i>';
        } else {
            toggleBtn.innerHTML = '<i data-lucide="moon"></i>';
        }
        lucide.createIcons();
    }

    // Load the saved theme
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
    }

    setIcon();

    // Change Theme on click 
    toggleBtn.addEventListener("click", () => {
        toggleBtn.classList.add("fade");

        setTimeout(() => {
            document.body.classList.toggle("dark-mode");

            if (document.body.classList.contains("dark-mode")) {
                localStorage.setItem("theme", "dark");
            } else {
                localStorage.setItem("theme", "light");
            }

            setIcon();
            toggleBtn.classList.remove("fade");

        }, 175);
    });


    // Task description toggle button 
    document.querySelectorAll(".toggle-desc").forEach(button => {
        button.addEventListener("click", () => {

            const description = button.closest(".task-item").querySelector(".task-description");

            description.classList.toggle("show");

            button.classList.toggle("open");
        });
    });

});