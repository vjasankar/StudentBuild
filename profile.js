let currentStudentUser = null;

async function initProfilePage() {
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        window.location.href = "login.html";
        return;
    }

    const { data: profile, error: profileError } = await supabaseClient
        .from("profiles")
        .select("full_name, email, phone, college, department, year, role")
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {
        console.error("Profile load error:", profileError);
        window.location.href = "login.html";
        return;
    }

    if (profile.role === "admin") {
        window.location.href = "admin-dashboard.html";
        return;
    }

    currentStudentUser = user;

    // Set Header & Summary Card Details
    const name = profile.full_name || "Student";
    const userName = document.getElementById("userName");
    const userAvatarCircle = document.getElementById("userAvatarCircle");
    const userSubDetail = document.getElementById("userSubDetail");

    if (userName) userName.textContent = name;
    if (userAvatarCircle) userAvatarCircle.textContent = name.charAt(0).toUpperCase();
    if (userSubDetail) {
        const yrText = profile.year ? `${profile.year}th Year` : "Student";
        userSubDetail.textContent = profile.department ? `${yrText} · ${profile.department}` : yrText;
    }

    // Set Left Summary Card Elements
    const overviewAvatar = document.getElementById("profileOverviewAvatar");
    const overviewName = document.getElementById("profileOverviewName");
    const overviewEmail = document.getElementById("profileOverviewEmail");
    const overviewDept = document.getElementById("profileOverviewDept");
    const overviewYear = document.getElementById("profileOverviewYear");

    if (overviewAvatar) overviewAvatar.textContent = name.charAt(0).toUpperCase();
    if (overviewName) overviewName.textContent = name;
    if (overviewEmail) overviewEmail.textContent = profile.email || user.email || "";
    if (overviewDept) overviewDept.textContent = profile.department || "Engineering";
    if (overviewYear) overviewYear.textContent = profile.year ? `${profile.year}th Year` : "Student";

    // Populate Profile Form
    document.getElementById("fullName").value = name;
    document.getElementById("email").value = profile.email || user.email || "";
    document.getElementById("phone").value = profile.phone || "";
    document.getElementById("college").value = profile.college || "";
    document.getElementById("department").value = profile.department || "";
    document.getElementById("year").value = profile.year ? String(profile.year) : "";

    await loadNotifications(user.id);
    document.body.style.visibility = "visible";
}

// Profile Form Submit
const profileForm = document.getElementById("profileForm");
const profileUpdateMessage = document.getElementById("profileUpdateMessage");

if (profileForm) {
    profileForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const phone = document.getElementById("phone").value.trim();
        const college = document.getElementById("college").value.trim();
        const department = document.getElementById("department").value.trim();
        const year = document.getElementById("year").value;

        profileUpdateMessage.textContent = "";
        profileUpdateMessage.className = "auth-message";

        if (!/^[0-9]{10}$/.test(phone)) {
            profileUpdateMessage.textContent = "Please enter a valid 10-digit phone number.";
            profileUpdateMessage.className = "auth-message error";
            return;
        }

        const saveBtn = document.getElementById("saveProfileBtn");
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.textContent = "Saving...";
        }

        profileUpdateMessage.textContent = "Updating profile...";
        profileUpdateMessage.className = "auth-message loading";

        const { error: updateError } = await supabaseClient
            .from("profiles")
            .update({
                phone: phone,
                college: college,
                department: department,
                year: Number(year)
            })
            .eq("id", currentStudentUser.id);

        if (updateError) {
            console.error("Error updating profile:", updateError);
            profileUpdateMessage.textContent = "Unable to update profile: " + updateError.message;
            profileUpdateMessage.className = "auth-message error";
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.textContent = "Save Changes ➔";
            }
            return;
        }

        profileUpdateMessage.textContent = "Profile updated successfully!";
        profileUpdateMessage.className = "auth-message success";

        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.textContent = "Save Changes ➔";
        }
    });
}

// Notifications Loader
async function loadNotifications(userId) {
    const notificationArea = document.getElementById("notificationArea");
    if (!notificationArea) return;

    const { data: notifications } = await supabaseClient
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("is_read", false)
        .order("created_at", { ascending: false });

    const count = notifications ? notifications.length : 0;

    notificationArea.innerHTML = `
        <div class="notification-wrapper">
            <button id="notificationButton" class="notification-button">
                🔔
                ${count > 0 ? `<span class="notification-badge">${count}</span>` : ""}
            </button>
            <div id="notificationDropdown" class="notification-dropdown">
                ${count === 0 ? `<div class="no-notifications"><p>No new notifications</p></div>` :
            `<div class="notification-dropdown-header"><strong>Notifications</strong><span>${count} new</span></div>
                    ${notifications.map(n => `<div class="notification-item"><div class="notification-content"><div class="notification-message">${escapeHtml(n.message)}</div></div></div>`).join("")}`}
            </div>
        </div>
    `;

    const notificationButton = document.getElementById("notificationButton");
    const notificationDropdown = document.getElementById("notificationDropdown");
    if (notificationButton && notificationDropdown) {
        notificationButton.addEventListener("click", (e) => {
            e.stopPropagation();
            notificationDropdown.classList.toggle("show");
        });
    }
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// Logout Handlers
async function handleLogout() {
    await supabaseClient.auth.signOut();
    window.location.href = "login.html";
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);

const dropdownLogoutBtn = document.getElementById("dropdownLogoutBtn");
if (dropdownLogoutBtn) dropdownLogoutBtn.addEventListener("click", handleLogout);

const sidebarLogoutLink = document.getElementById("sidebarLogoutLink");
if (sidebarLogoutLink) sidebarLogoutLink.addEventListener("click", handleLogout);

// Mobile Sidebar Toggle
const mobileToggleBtn = document.getElementById("mobileToggleBtn");
const appSidebar = document.getElementById("appSidebar");
if (mobileToggleBtn && appSidebar) {
    mobileToggleBtn.addEventListener("click", () => appSidebar.classList.toggle("show-mobile"));
}

// Profile Dropdown Toggle
const headerProfileDropdownToggle = document.getElementById("headerProfileDropdownToggle");
const profileDropdownMenu = document.getElementById("profileDropdownMenu");
if (headerProfileDropdownToggle && profileDropdownMenu) {
    headerProfileDropdownToggle.addEventListener("click", (e) => {
        e.stopPropagation();
        profileDropdownMenu.classList.toggle("show");
    });
    document.addEventListener("click", () => profileDropdownMenu.classList.remove("show"));
}

initProfilePage();
