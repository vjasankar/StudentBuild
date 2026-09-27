let currentStudentUser = null;
let currentStudentProfile = null;
let userProjects = [];
let activeFilter = "all";

async function initMyProjects() {
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
    currentStudentProfile = profile;

    // Header profile text
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

    await loadStudentProjects();
    await loadNotifications(user.id);

    document.body.style.visibility = "visible";
}

async function loadStudentProjects() {
    const container = document.getElementById("myProjectsContainer");

    const { data: projects, error } = await supabaseClient
        .from("projects")
        .select("*")
        .eq("student_id", currentStudentUser.id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching projects:", error);
        container.innerHTML = `
            <div class="empty-projects">
                <h3>Error loading projects</h3>
                <p>${escapeHtml(error.message)}</p>
            </div>
        `;
        return;
    }

    userProjects = projects || [];
    updateFilterCounts();
    renderProjects();
}

function updateFilterCounts() {
    let countSubmitted = 0;
    let countAccepted = 0;
    let countNeedsDetails = 0;
    let countRejected = 0;

    userProjects.forEach(p => {
        const st = String(p.status || "").trim().toLowerCase();
        if (st === "accepted") countAccepted++;
        else if (st === "rejected") countRejected++;
        else if (st === "needs_details") countNeedsDetails++;
        else countSubmitted++;
    });

    document.getElementById("countAll").textContent = userProjects.length;
    document.getElementById("countSubmitted").textContent = countSubmitted;
    document.getElementById("countAccepted").textContent = countAccepted;
    document.getElementById("countNeedsDetails").textContent = countNeedsDetails;
    document.getElementById("countRejected").textContent = countRejected;
}

function renderProjects() {
    const container = document.getElementById("myProjectsContainer");
    const searchVal = (document.getElementById("projectsSearchInput")?.value || "").toLowerCase().trim();

    const filtered = userProjects.filter(p => {
        const st = String(p.status || "").trim().toLowerCase();

        // Status filter
        if (activeFilter === "submitted" && st !== "submitted") return false;
        if (activeFilter === "accepted" && st !== "accepted") return false;
        if (activeFilter === "needs_details" && st !== "needs_details") return false;
        if (activeFilter === "rejected" && st !== "rejected") return false;

        // Search query
        if (searchVal) {
            const title = (p.title || "").toLowerCase();
            const desc = (p.description || "").toLowerCase();
            const dom = (p.domain || "").toLowerCase();
            const dept = (p.department || "").toLowerCase();
            return title.includes(searchVal) || desc.includes(searchVal) || dom.includes(searchVal) || dept.includes(searchVal);
        }

        return true;
    });

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-projects">
                <img src="assets/illustrations/empty-projects.png" alt="No Projects" class="empty-state-img">
                <h3>No projects found</h3>
                <p>${userProjects.length === 0 ? "You haven't submitted any projects yet." : "No projects match your selected filter."}</p>
                ${userProjects.length === 0 ? `<a href="submit-project.html" class="btn-sidebar-cta" style="display: inline-flex; width: auto; margin-top: 14px; padding: 10px 24px;">+ Submit Project</a>` : ""}
            </div>
        `;
        return;
    }

    container.innerHTML = "";

    filtered.forEach(project => {
        const projectCard = document.createElement("div");
        projectCard.className = "project-card";

        const rawStatus = String(project.status || "").trim().replace(/^['"]|['"]$/g, "").toLowerCase();
        let statusText = "In Review";
        if (rawStatus === "accepted") statusText = "Accepted";
        else if (rawStatus === "rejected") statusText = "Rejected";
        else if (rawStatus === "needs_details") statusText = "Needs Details";

        let domainIcon = "📁";
        let domainIconClass = "teal";
        const domLower = String(project.domain || "").toLowerCase();
        if (domLower.includes("iot")) { domainIcon = "📶"; domainIconClass = "green"; }
        else if (domLower.includes("ai") || domLower.includes("ml")) { domainIcon = "🌿"; domainIconClass = "purple"; }
        else if (domLower.includes("web")) { domainIcon = "💻"; domainIconClass = "coral"; }
        else if (domLower.includes("app")) { domainIcon = "📱"; domainIconClass = "teal"; }

        const dateFormatted = project.created_at
            ? new Date(project.created_at).toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' })
            : "Recently";

        projectCard.innerHTML = `
            <div class="project-card-header">
                <div class="project-card-main-info">
                    <div class="project-domain-icon-box ${domainIconClass}">
                        ${domainIcon}
                    </div>
                    <div class="project-title-group">
                        <h3>${escapeHtml(project.title)}</h3>
                        <p>${escapeHtml(project.description)}</p>
                    </div>
                </div>

                <div class="project-status-group">
                    <span class="project-status status-${rawStatus}">
                        ${escapeHtml(statusText)}
                    </span>
                    <span class="project-date-text">Submitted on ${dateFormatted}</span>
                </div>
            </div>

            <div class="project-tags-row">
                <span class="project-tag">${escapeHtml(project.domain || "Technical")}</span>
                <span class="project-tag">${escapeHtml(project.project_type || "Prototype")}</span>
                <span class="project-tag">${escapeHtml(project.department || "Engineering")}</span>
                ${project.budget_range ? `<span class="project-tag" style="color: var(--accent-coral);">Budget: ${escapeHtml(project.budget_range)}</span>` : ''}
                ${project.deadline ? `<span class="project-tag">Deadline: ${escapeHtml(project.deadline)}</span>` : ''}
            </div>

            <div class="project-card-actions">
                <button type="button" class="contact-button message student-chat-btn" data-project-id="${project.id}" data-project-title="${escapeHtml(project.title)}">
                    💬 Messages with Admin
                </button>
            </div>
        `;

        container.appendChild(projectCard);
    });
}

// Filter tab clicks
document.querySelectorAll(".project-filter-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".project-filter-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activeFilter = btn.dataset.filter;
        renderProjects();
    });
});

// Search input listener
const projectsSearchInput = document.getElementById("projectsSearchInput");
if (projectsSearchInput) {
    projectsSearchInput.addEventListener("input", renderProjects);
}

// HTML Safety Helper
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

// ========================================
// Student Chat Modal Logic
// ========================================

let activeStudentChatProjectId = null;
let activeStudentChatProjectTitle = "";
let activeStudentChatAdminId = null;

const studentChatModal = document.getElementById("studentChatModal");
const studentChatProjectTitle = document.getElementById("studentChatProjectTitle");
const studentChatMessagesContainer = document.getElementById("studentChatMessagesContainer");
const studentChatForm = document.getElementById("studentChatForm");
const studentChatInput = document.getElementById("studentChatInput");
const closeStudentChatBtn = document.getElementById("closeStudentChatBtn");

async function openStudentChat(projectId, projectTitle) {
    activeStudentChatProjectId = projectId;
    activeStudentChatProjectTitle = projectTitle || "Project";

    if (studentChatProjectTitle) studentChatProjectTitle.textContent = `Project: ${activeStudentChatProjectTitle}`;
    if (studentChatModal) studentChatModal.classList.add("active");

    await loadStudentChatMessages();
}

function closeStudentChat() {
    if (studentChatModal) studentChatModal.classList.remove("active");
    activeStudentChatProjectId = null;
}

if (closeStudentChatBtn) closeStudentChatBtn.addEventListener("click", closeStudentChat);
if (studentChatModal) studentChatModal.addEventListener("click", (e) => { if (e.target === studentChatModal) closeStudentChat(); });

async function loadStudentChatMessages() {
    if (!activeStudentChatProjectId) return;
    studentChatMessagesContainer.innerHTML = `<div class="chat-empty-state"><p>Loading messages...</p></div>`;

    const { data: messages } = await supabaseClient
        .from("messages")
        .select("*")
        .eq("project_id", activeStudentChatProjectId)
        .order("created_at", { ascending: true });

    if (!messages || messages.length === 0) {
        studentChatMessagesContainer.innerHTML = `<div class="chat-empty-state"><p>No messages yet. Ask admin anything!</p></div>`;
        return;
    }

    studentChatMessagesContainer.innerHTML = "";
    messages.forEach(msg => {
        const isSelf = msg.sender_id === currentStudentUser.id;
        const bubble = document.createElement("div");
        bubble.className = `message-bubble ${isSelf ? "sent" : "received"}`;
        bubble.innerHTML = `
            <div class="message-sender-tag">${isSelf ? "You" : "Admin Support"}</div>
            <div class="message-text">${escapeHtml(msg.message)}</div>
            <div class="message-time">${msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</div>
        `;
        studentChatMessagesContainer.appendChild(bubble);
    });
    studentChatMessagesContainer.scrollTop = studentChatMessagesContainer.scrollHeight;
}

if (studentChatForm) {
    studentChatForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const text = studentChatInput.value.trim();
        if (!text || !activeStudentChatProjectId) return;

        const { data: adminProf } = await supabaseClient.from("profiles").select("id").eq("role", "admin").limit(1).single();
        const adminId = adminProf ? adminProf.id : null;
        if (!adminId) { alert("Admin contact unavailable."); return; }

        await supabaseClient.from("messages").insert({
            project_id: activeStudentChatProjectId,
            sender_id: currentStudentUser.id,
            receiver_id: adminId,
            message: text,
            is_read: false
        });

        studentChatInput.value = "";
        await loadStudentChatMessages();
    });
}

document.getElementById("myProjectsContainer").addEventListener("click", (e) => {
    const btn = e.target.closest(".student-chat-btn");
    if (!btn) return;
    openStudentChat(btn.dataset.projectId, btn.dataset.projectTitle);
});

initMyProjects();
