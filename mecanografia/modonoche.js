document.addEventListener('DOMContentLoaded', function() {
    var toggleButton = document.getElementById("toggleDarkMode");
    if (toggleButton) {
        toggleButton.addEventListener("click", function() {
            document.documentElement.classList.toggle("dark-mode");
            localStorage.setItem("darkMode", document.documentElement.classList.contains("dark-mode"));
        });
    }
});