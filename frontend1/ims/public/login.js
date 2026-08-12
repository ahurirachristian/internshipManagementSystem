(function () {
    const API_BASE = "http://localhost:8082";

    const form = document.getElementById("loginForm");
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const roleSelect = document.getElementById("role");
    const loginBtn = document.getElementById("loginBtn");
    const alertBox = document.getElementById("alertBox");
    const togglePassword = document.getElementById("togglePassword");
    const csrfInput = document.getElementById("csrfToken");

    function showAlert(message, type) {
        alertBox.className = "alert show " + (type === "success" ? "alert-success" : "alert-error");
        alertBox.textContent = message;
    }

    function clearAlert() {
        alertBox.className = "alert";
        alertBox.textContent = "";
    }

    function getCookie(name) {
        const match = document.cookie.match("(?:^|; )" + name + "=([^;]*)");
        return match ? decodeURIComponent(match[1]) : null;
    }

    if (csrfInput && !csrfInput.value) {
        csrfInput.value = getCookie("XSRF-TOKEN") || "";
    }

    togglePassword.addEventListener("click", function () {
        const isHidden = passwordInput.type === "password";
        passwordInput.type = isHidden ? "text" : "password";
        const icon = this.querySelector("i");
        icon.className = isHidden ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
        this.setAttribute("aria-label", isHidden ? "Hide password" : "Show password");
    });

    (function handleRedirectParams() {
        const params = new URLSearchParams(window.location.search);
        if (params.get("error")) {
            showAlert("Invalid username or password.", "error");
        } else if (params.get("logout")) {
            showAlert("You have been logged out.", "success");
        }
    })();

    form.addEventListener("submit", async function (e) {
        e.preventDefault();
        clearAlert();

        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        const role = roleSelect ? roleSelect.value : "STUDENT";

        if (!username || !password || !role) {
            showAlert("Please enter username, password, and role.", "error");
            return;
        }

        const body = new URLSearchParams(new FormData(form));
        if (!body.get("_csrf") && csrfInput) {
            body.append("_csrf", csrfInput.value);
        }

        loginBtn.disabled = true;
        loginBtn.textContent = "Signing in...";

        try {
            const response = await fetch(API_BASE + "/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
                credentials: "include",
                body: body.toString()
            });

            const data = await response.json().catch(() => ({}));

            if (response.ok) {
                if (data.redirect) {
                    window.location.href = data.redirect;
                } else {
                    window.location.href = "/";
                }
                return;
            }

            if (data.error) {
                showAlert(data.error, "error");
            } else {
                showAlert("Invalid username or password.", "error");
            }
        } catch (error) {
            showAlert("Cannot reach the server. Make sure the backend is running on " + API_BASE + ".", "error");
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = "Sign In";
        }
    });
})();
