let currentStudentUser = null;

async function initNotificationsPage() {
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
        console.error("Profile error:", profileError);
        window.location.href = "login.html";
        return;
    }

    if (profile.role === "admin") {
        window.location.href = "admin-dashboard.html";
        return;
    }

    currentStudentUser = user;

    // Header Profile
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

    await loadFullNotifications();
    document.body.style.visibility = "visible";
}

async function loadFullNotifications() {
    const container = document.getElementById("notificationsContainer");

    const { data: notifications, error } = await supabaseClient
        .from("notifications")
        .select("*")
        .eq("user_id", currentStudentUser.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error loading notifications:", error);
        container.innerHTML = `
            <div class="empty-projects">
                <h3>Error loading notifications</h3>
                <p>${escapeHtml(error.message)}</p>
            </div>
        `;
        return;
    }

    if (!notifications || notifications.length === 0) {
        container.innerHTML = `
            <div class="empty-projects">
                <img src="assets/illustrations/empty-notifications.png" alt="No Notifications" class="empty-state-img">
                <h3>No notifications</h3>
                <p>You have no project updates or messages yet.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = "";

    notifications.forEach(n => {
        const item = document.createElement("div");
        item.className = "project-card";
        item.style.borderLeft = n.is_read ? "1px solid var(--border-subtle)" : "4px solid var(--accent-coral)";

        const dateStr = n.created_at ? new Date(n.created_at).toLocaleString() : "";

        item.innerHTML = `
            <div class="project-card-header" style="align-items: center;">
                <div class="project-card-main-info" style="align-items: center;">
                    <div class="project-domain-icon-box coral">🔔</div>
                    <div class="project-title-group">
                        <h3 style="font-size: 15px;">${escapeHtml(n.message)}</h3>
                        <p style="font-size: 12px; color: var(--text-muted);">${dateStr}</p>
                    </div>
                </div>
                ${!n.is_read ? `<span class="project-status status-needs_details">New</span>` : `<span class="project-status" style="background: rgba(255,255,255,0.05); color: var(--text-muted);">Read</span>`}
            </div>
        `;

        if (!n.is_read) {
            item.style.cursor = "pointer";
            item.addEventListener("click", async () => {
                await supabaseClient.from("notifications").update({ is_read: true }).eq("id", n.id);
                loadFullNotifications();
            });
        }

        container.appendChild(item);
    });
}

// Mark all as read handler
const markAllReadBtn = document.getElementById("markAllReadBtn");
if (markAllReadBtn) {
    markAllReadBtn.addEventListener("click", async () => {
        await supabaseClient.from("notifications").update({ is_read: true }).eq("user_id", currentStudentUser.id);
        loadFullNotifications();
    });
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// Logout & Navigation Handlers
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

initNotificationsPage();
