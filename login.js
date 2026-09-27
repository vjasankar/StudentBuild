// ========================================
// StudentBuild Login
// ========================================


// ========================================
// Get User Profile & Redirect
// ========================================

async function handleAuthenticatedUser(user) {

    if (!user) {
        return;
    }

    const { data: profile, error } =
        await supabaseClient
            .from("profiles")
            .select(
                "full_name, email, phone, college, department, year, role"
            )
            .eq("id", user.id)
            .single();

    if (error || !profile) {

        console.error(
            "Profile check error:",
            error
        );

        return;
    }


    // ========================================
    // Check whether this is a Google user
    // ========================================

    const isGoogleUser =
        user.app_metadata?.provider === "google" ||
        user.identities?.some(
            identity => identity.provider === "google"
        );


    // ========================================
    // Check whether student profile is complete
    // ========================================

    const profileIncomplete =
        !profile.phone ||
        !profile.college ||
        !profile.department ||
        !profile.year;


    // ========================================
    // Google student with incomplete profile
    // ========================================

    if (
        isGoogleUser &&
        profileIncomplete &&
        profile.role !== "admin"
    ) {

        window.location.href =
            "complete-profile.html";

        return;
    }


    // ========================================
    // Admin
    // ========================================

    if (profile.role === "admin") {

        window.location.href =
            "admin-dashboard.html";

        return;
    }


    // ========================================
    // Student
    // ========================================

    window.location.href =
        "dashboard.html";
}


// ========================================
// Check Existing Session
// ========================================

async function checkExistingSession() {

    const {
        data: { session },
        error
    } = await supabaseClient.auth.getSession();

    if (error) {

        console.error(
            "Session error:",
            error
        );

        return;
    }

    if (!session?.user) {
        return;
    }


    await handleAuthenticatedUser(
        session.user
    );
}


// ========================================
// Listen for Authentication Changes
// ========================================

supabaseClient.auth.onAuthStateChange(
    async (event, session) => {

        console.log(
            "Auth event:",
            event
        );


        // Google OAuth returns with SIGNED_IN
        if (
            event === "SIGNED_IN" &&
            session?.user
        ) {

            await handleAuthenticatedUser(
                session.user
            );
        }
    }
);


// Check for an already existing session
checkExistingSession();


// ========================================
// Email + Password Login
// ========================================

const loginForm =
    document.getElementById("loginForm");

const loginMessage =
    document.getElementById("loginMessage");


loginForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        const submitBtn =
            loginForm.querySelector(
                'button[type="submit"]'
            );


        if (submitBtn) {

            submitBtn.disabled = true;
        }


        const email =
            document
                .getElementById("email")
                .value
                .trim();


        const password =
            document
                .getElementById("password")
                .value;


        loginMessage.textContent =
            "Logging in...";

        loginMessage.className =
            "auth-message loading";


        // ========================================
        // Supabase Email Login
        // ========================================

        const {
            data,
            error
        } =
            await supabaseClient.auth
                .signInWithPassword({
                    email: email,
                    password: password
                });


        // ========================================
        // Login Error
        // ========================================

        if (error) {

            console.error(
                "Login error:",
                error
            );

            loginMessage.textContent =
                error.message;

            loginMessage.className =
                "auth-message error";


            if (submitBtn) {

                submitBtn.disabled = false;
            }


            return;
        }


        console.log(
            "Email login successful:",
            data
        );


        loginMessage.textContent =
            "Login successful! Redirecting...";

        loginMessage.className =
            "auth-message success";


        // ========================================
        // Handle authenticated user
        // ========================================

        await handleAuthenticatedUser(
            data.user
        );
    }
);


// ========================================
// Google Login
// ========================================

const googleLoginButton =
    document.getElementById(
        "googleLoginButton"
    );


if (googleLoginButton) {

    googleLoginButton.addEventListener(
        "click",
        async () => {

            googleLoginButton.disabled =
                true;


            googleLoginButton.innerHTML =
                `
                <span class="google-icon">G</span>
                <span>Connecting to Google...</span>
                `;


            try {

                const {
                    error
                } =
                    await supabaseClient.auth
                        .signInWithOAuth({

                            provider: "google",

                            options: {

                                redirectTo:
                                    window.location.hostname === "localhost" ||
                                        window.location.hostname === "127.0.0.1"
                                        ? `${window.location.origin}/login.html`
                                        : "https://studentbuild.vercel.app/login.html"
                            }
                        });


                if (error) {

                    console.error(
                        "Google login error:",
                        error
                    );


                    loginMessage.textContent =
                        error.message;

                    loginMessage.className =
                        "auth-message error";


                    googleLoginButton.disabled =
                        false;


                    googleLoginButton.innerHTML =
                        `
                        <span class="google-icon">G</span>
                        <span>Continue with Google</span>
                        `;

                    return;
                }

                // Supabase will redirect the browser
                // to Google automatically.

            } catch (error) {

                console.error(
                    "Unexpected Google login error:",
                    error
                );


                loginMessage.textContent =
                    "Unable to connect to Google. Please try again.";

                loginMessage.className =
                    "auth-message error";


                googleLoginButton.disabled =
                    false;


                googleLoginButton.innerHTML =
                    `
                    <span class="google-icon">G</span>
                    <span>Continue with Google</span>
                    `;
            }
        }
    );
}