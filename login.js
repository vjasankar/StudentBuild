// ========================================
// Redirect already logged-in users
// ========================================

async function checkExistingSession() {
    const {
        data: { user }
    } = await supabaseClient.auth.getUser();

    if (!user) {
        return;
    }

    const { data: profile, error } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (error || !profile) {
        console.error("Profile check error:", error);
        return;
    }

    if (profile.role === "admin") {
        window.location.href = "admin-dashboard.html";
    } else {
        window.location.href = "dashboard.html";
    }
}

checkExistingSession();
const loginForm = document.getElementById("loginForm");
const loginMessage = document.getElementById("loginMessage");

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const submitBtn = loginForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    loginMessage.textContent = "Logging in...";
    loginMessage.className = "auth-message loading";


    // Login with Supabase Auth
    const { data, error } =
        await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });


    // Login error
    if (error) {

        console.error("Login error:", error);

        loginMessage.textContent = error.message;
        loginMessage.className = "auth-message error";
        if (submitBtn) submitBtn.disabled = false;

        return;
    }


    console.log("Login successful:", data);


    // Get logged-in user
    const user = data.user;


    // Get user's profile and role
    const { data: profile, error: profileError } =
        await supabaseClient
            .from("profiles")
            .select("full_name, email, role")
            .eq("id", user.id)
            .single();


    // Profile error
    if (profileError || !profile) {

        console.error("Profile error:", profileError);

        loginMessage.textContent =
            "Login successful, but profile could not be loaded.";

        loginMessage.className = "auth-message error";

        return;
    }


    console.log("User profile:", profile);


    loginMessage.textContent =
        "Login successful! Redirecting...";

    loginMessage.className =
        "auth-message success";


    // Redirect based on role
    setTimeout(() => {

        if (profile.role === "admin") {

            window.location.href = "admin-dashboard.html";

        } else {

            window.location.href = "dashboard.html";

        }

    }, 700);

});