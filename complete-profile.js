// ========================================
// Complete Profile
// ========================================

const completeProfileForm =
    document.getElementById("completeProfileForm");

const profileMessage =
    document.getElementById("profileMessage");


// ========================================
// Load authenticated user's information
// ========================================

async function loadUserProfile() {

    const {
        data: { user },
        error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {

        console.error("User error:", userError);

        window.location.href = "login.html";

        return;
    }


    // Get existing profile
    const { data: profile, error: profileError } =
        await supabaseClient
            .from("profiles")
            .select(
                "full_name, email, phone, college, department, year, role"
            )
            .eq("id", user.id)
            .single();


    if (profileError || !profile) {

        console.error(
            "Profile loading error:",
            profileError
        );

        profileMessage.textContent =
            "Unable to load your profile. Please try again.";

        profileMessage.className =
            "auth-message error";

        return;
    }


    // Admins should never use this page
    if (profile.role === "admin") {

        window.location.href =
            "admin-dashboard.html";

        return;
    }


    // Fill Google-provided information
    document.getElementById("fullName").value =
        profile.full_name ||
        user.user_metadata?.full_name ||
        "";

    document.getElementById("email").value =
        profile.email ||
        user.email ||
        "";


    // If some details already exist, show them
    document.getElementById("phone").value =
        profile.phone || "";

    document.getElementById("college").value =
        profile.college || "";

    document.getElementById("department").value =
        profile.department || "";

    document.getElementById("year").value =
        profile.year ? String(profile.year) : "";
}


// ========================================
// Save profile
// ========================================

completeProfileForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        const phone =
            document.getElementById("phone")
                .value
                .trim();

        const college =
            document.getElementById("college")
                .value
                .trim();

        const department =
            document.getElementById("department")
                .value
                .trim();

        const year =
            document.getElementById("year")
                .value;


        // Validate phone
        if (!/^[0-9]{10}$/.test(phone)) {

            profileMessage.textContent =
                "Please enter a valid 10-digit phone number.";

            profileMessage.className =
                "auth-message error";

            return;
        }


        // Validate required fields
        if (!college) {

            profileMessage.textContent =
                "Please enter your college name.";

            profileMessage.className =
                "auth-message error";

            return;
        }


        if (!department) {

            profileMessage.textContent =
                "Please enter your department.";

            profileMessage.className =
                "auth-message error";

            return;
        }


        if (!year) {

            profileMessage.textContent =
                "Please select your year.";

            profileMessage.className =
                "auth-message error";

            return;
        }


        const submitButton =
            completeProfileForm.querySelector(
                'button[type="submit"]'
            );

        if (submitButton) {

            submitButton.disabled = true;

            submitButton.textContent =
                "Saving Profile...";
        }


        profileMessage.textContent =
            "Saving your profile...";

        profileMessage.className =
            "auth-message loading";


        // Get authenticated user
        const {
            data: { user },
            error: userError
        } = await supabaseClient.auth.getUser();


        if (userError || !user) {

            console.error(
                "Authentication error:",
                userError
            );

            profileMessage.textContent =
                "Your session has expired. Please login again.";

            profileMessage.className =
                "auth-message error";

            if (submitButton) {

                submitButton.disabled = false;

                submitButton.textContent =
                    "Complete Profile ➔";
            }

            return;
        }


        // Update ONLY the authenticated user's profile
        const { error: updateError } =
            await supabaseClient
                .from("profiles")
                .update({
                    phone: phone,
                    college: college,
                    department: department,
                    year: Number(year)
                })
                .eq("id", user.id);


        if (updateError) {

            console.error(
                "Profile update error:",
                updateError
            );

            profileMessage.textContent =
                "Unable to save your profile. Please try again.";

            profileMessage.className =
                "auth-message error";

            if (submitButton) {

                submitButton.disabled = false;

                submitButton.textContent =
                    "Complete Profile ➔";
            }

            return;
        }


        // Success
        profileMessage.textContent =
            "Profile completed successfully! Redirecting...";

        profileMessage.className =
            "auth-message success";


        setTimeout(() => {

            window.location.href =
                "dashboard.html";

        }, 800);
    }
);


// ========================================
// Start
// ========================================

loadUserProfile();