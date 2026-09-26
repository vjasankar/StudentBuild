const signupForm = document.getElementById("signupForm");
const signupMessage = document.getElementById("signupMessage");

// Check if user is already logged in
async function checkExistingSession() {
    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) return;

    const { data: profile } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

    if (profile?.role === "admin") {
        window.location.href = "admin-dashboard.html";
    } else {
        window.location.href = "dashboard.html";
    }
}

checkExistingSession();

signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const college = document.getElementById("college").value.trim();
    const department = document.getElementById("department").value.trim();
    const year = document.getElementById("year").value;
    const password = document.getElementById("password").value;
    const confirmPassword =
        document.getElementById("confirmPassword").value;

    signupMessage.textContent = "";
    signupMessage.className = "auth-message";

    // Validate password
    if (password.length < 6) {
        signupMessage.textContent =
            "Password must be at least 6 characters.";
        signupMessage.classList.add("error");
        return;
    }

    if (password !== confirmPassword) {
        signupMessage.textContent =
            "Passwords do not match.";
        signupMessage.classList.add("error");
        return;
    }

    // Validate phone number
    if (!/^[0-9]{10}$/.test(phone)) {
        signupMessage.textContent =
            "Please enter a valid 10-digit phone number.";
        signupMessage.classList.add("error");
        return;
    }

    // Validate year
    if (!year) {
        signupMessage.textContent =
            "Please select your year.";
        signupMessage.classList.add("error");
        return;
    }

    signupMessage.textContent = "Creating your account...";

    const {
        data,
        error
    } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
            data: {
                full_name: fullName,
                phone: phone,
                college: college,
                department: department,
                year: year
            }
        }
    });

    if (error) {
        console.error("Signup error:", error);

        signupMessage.textContent = error.message;
        signupMessage.classList.add("error");
        return;
    }

    console.log("Signup successful:", data);

    signupMessage.textContent =
        "Account created successfully! Redirecting...";

    signupMessage.classList.add("success");

    setTimeout(() => {
        window.location.href = "dashboard.html";
    }, 1000);
});