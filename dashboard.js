const userName = document.getElementById("userName");
const welcomeName = document.getElementById("welcomeName");
const logoutBtn = document.getElementById("logoutBtn");
const projectsList = document.getElementById("projectsList");

let currentStudentUser = null;
let currentStudentProfile = null;
let allStudentProjects = [];

async function loadDashboard() {

    const {
        data: { user },
        error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        window.location.href = "login.html";
        return;
    }

    const { data: profile, error: profileError } =
        await supabaseClient
            .from("profiles")
            .select("full_name, email, phone, college, department, year, role")
            .eq("id", user.id)
            .single();

    if (profileError || !profile) {
        console.error("Profile error:", profileError);
        if (userName) userName.textContent = user.email || "Student";
        if (welcomeName) welcomeName.textContent = "Student";
        document.body.style.visibility = "visible";
        return;
    }

    if (profile.role === "admin") {
        window.location.href = "admin-dashboard.html";
        return;
    }

    const name = profile.full_name || "Student";
    if (userName) userName.textContent = name;
    if (welcomeName) welcomeName.textContent = name;

    const userAvatarCircle = document.getElementById("userAvatarCircle");
    if (userAvatarCircle) {
        userAvatarCircle.textContent = name.charAt(0).toUpperCase();
    }

    const userSubDetail = document.getElementById("userSubDetail");
    if (userSubDetail) {
        const yrText = profile.year ? `${profile.year}th Year` : "Student";
        userSubDetail.textContent = profile.department ? `${yrText} · ${profile.department}` : yrText;
    }

    const profileBar = document.getElementById("studentProfileBar");
    if (profileBar) {
        const profileName = document.getElementById("profileName");
        const profilePhone = document.getElementById("profilePhone");
        const profileEmail = document.getElementById("profileEmail");
        if (profileName) profileName.textContent = name;
        if (profilePhone) profilePhone.textContent = profile.phone || "Not provided";
        if (profileEmail) profileEmail.textContent = profile.email || user.email || "";
        profileBar.style.display = "flex";
    }

    currentStudentUser = user;
    currentStudentProfile = profile;

    const currentDateText = document.getElementById("currentDateText");
    if (currentDateText) {
        const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        currentDateText.textContent = new Date().toLocaleDateString('en-GB', options);
    }

    await loadProjects(user.id);
    await loadNotifications(user.id);
    await loadRecentMessagesWidget(user.id);

    document.body.style.visibility = "visible";
}

// Load student's projects
async function loadProjects(userId) {

    let { data: projects, error } =
        await supabaseClient
            .from("projects")
            .select(`
                *,
                student:profiles!projects_student_id_fkey (
                    id, full_name, email, phone, college, department, year
                )
            `)
            .eq("student_id", userId)
            .order("created_at", { ascending: false });

    if (error) {
        console.warn("Projects join query note, using direct project query:", error);
        const { data: fallbackProjects, error: fallbackError } =
            await supabaseClient
                .from("projects")
                .select("*")
                .eq("student_id", userId)
                .order("created_at", { ascending: false });

        if (fallbackError) {
            console.error("Projects error:", fallbackError);
            return;
        }
        projects = fallbackProjects;
    }

    allStudentProjects = projects || [];

    // Stat Counters
    const totalCount = allStudentProjects.length;
    let inReviewCount = 0;
    let acceptedCount = 0;
    let rejectedCount = 0;

    allStudentProjects.forEach(p => {
        const st = String(p.status || "").trim().toLowerCase();
        if (st === "accepted") acceptedCount++;
        else if (st === "rejected") rejectedCount++;
        else inReviewCount++;
    });

    const statTotalProjects = document.getElementById("statTotalProjects");
    const statInReview = document.getElementById("statInReview");
    const statAccepted = document.getElementById("statAccepted");
    const statRejected = document.getElementById("statRejected");

    function animateStatNumber(elem, targetVal, duration = 650) {
        if (!elem) return;
        const end = parseInt(targetVal) || 0;
        if (end === 0) { elem.textContent = "0"; return; }
        const startTime = performance.now();
        function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            elem.textContent = Math.floor(progress * end);
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                elem.textContent = end;
            }
        }
        requestAnimationFrame(updateCounter);
    }

    if (statTotalProjects) animateStatNumber(statTotalProjects, totalCount);
    if (statInReview) animateStatNumber(statInReview, inReviewCount);
    if (statAccepted) animateStatNumber(statAccepted, acceptedCount);
    if (statRejected) animateStatNumber(statRejected, rejectedCount);

    updateDeadlineWidget(allStudentProjects);
    updateRecentActivityWidget(allStudentProjects);
    renderDashboardProjects(allStudentProjects);
}

function renderDashboardProjects(projects) {
    const searchVal = (document.getElementById("dashboardSearchInput")?.value || "").toLowerCase().trim();

    const filtered = projects.filter(p => {
        if (!searchVal) return true;
        const title = (p.title || "").toLowerCase();
        const desc = (p.description || "").toLowerCase();
        const dom = (p.domain || "").toLowerCase();
        const dept = (p.department || "").toLowerCase();
        return title.includes(searchVal) || desc.includes(searchVal) || dom.includes(searchVal) || dept.includes(searchVal);
    });

    if (filtered.length === 0) {
        projectsList.innerHTML = `
            <div class="empty-projects">
                <img src="assets/illustrations/empty-projects.png" alt="No Projects" class="empty-state-img">
                <h3>${allStudentProjects.length === 0 ? "No projects yet" : "No matching projects"}</h3>
                <p>${allStudentProjects.length === 0 ? "Submit your first project to get started with StudentBuild technical support." : "Try adjusting your search query."}</p>
                ${allStudentProjects.length === 0 ? `<a href="submit-project.html" class="btn-sidebar-cta" style="display: inline-flex; width: auto; margin-top: 14px; padding: 10px 24px;">+ Submit Your Project</a>` : ""}
            </div>
        `;
        return;
    }

    // Fetch unread message counts
    supabaseClient
        .from("messages")
        .select("id, project_id")
        .eq("receiver_id", currentStudentUser.id)
        .eq("is_read", false)
        .then(({ data: unreadMessages }) => {
            const unreadCountByProject = {};
            if (unreadMessages) {
                unreadMessages.forEach(msg => {
                    unreadCountByProject[msg.project_id] = (unreadCountByProject[msg.project_id] || 0) + 1;
                });
            }

            projectsList.innerHTML = "";

            filtered.forEach(project => {
                const projectCard = document.createElement("div");
                projectCard.className = "project-card";

                const rawStatus = String(project.status || "").trim().replace(/^['"]|['"]$/g, "").toLowerCase();
                let statusText = "In Review";
                if (rawStatus === "accepted") statusText = "Accepted";
                else if (rawStatus === "rejected") statusText = "Rejected";
                else if (rawStatus === "needs_details") statusText = "Needs Details";

                const unreadCount = unreadCountByProject[project.id] || 0;
                const student = project.student || currentStudentProfile || {};
                const studentName = student.full_name || currentStudentProfile?.full_name || "Student";
                const studentPhone = student.phone || currentStudentProfile?.phone || "Not provided";
                const studentEmail = student.email || currentStudentProfile?.email || (currentStudentUser ? currentStudentUser.email : "");

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
                            <span class="project-date-text">Submitted ${dateFormatted}</span>
                        </div>
                    </div>

                    <div class="project-tags-row">
                        <span class="project-tag">${escapeHtml(project.domain || "Technical")}</span>
                        <span class="project-tag">${escapeHtml(project.project_type || "Prototype")}</span>
                        <span class="project-tag">${escapeHtml(project.department || "Engineering")}</span>
                        ${project.budget_range ? `<span class="project-tag" style="color: var(--accent-coral);">Budget: ${escapeHtml(project.budget_range)}</span>` : ''}
                    </div>

                    <div class="student-details">
                        <h4>Contact Details</h4>
                        <div class="student-detail-grid">
                            <p><strong>Name:</strong> ${escapeHtml(studentName)}</p>
                            <p><strong>Phone:</strong> ${escapeHtml(studentPhone)}</p>
                            ${studentEmail ? `<p><strong>Email:</strong> ${escapeHtml(studentEmail)}</p>` : ''}
                        </div>
                    </div>

                    <div class="project-card-actions">
                        <button type="button" class="contact-button message student-chat-btn" data-project-id="${project.id}" data-project-title="${escapeHtml(project.title)}">
                            Messages ${unreadCount > 0 ? `<span class="unread-count-badge" id="unread-badge-${project.id}">${unreadCount}</span>` : `<span class="unread-count-badge" id="unread-badge-${project.id}"></span>`} 💬
                        </button>
                    </div>
                `;

                projectsList.appendChild(projectCard);
            });
        });
}

// Search input listener
const dashboardSearchInput = document.getElementById("dashboardSearchInput");
if (dashboardSearchInput) {
    dashboardSearchInput.addEventListener("input", () => {
        renderDashboardProjects(allStudentProjects);
    });
}

// Helper: Update Upcoming Deadline Widget
function updateDeadlineWidget(projects) {
    const deadlineWidgetCard = document.getElementById("upcomingDeadlineWidget");
    if (!deadlineWidgetCard) return;

    const contentArea = document.getElementById("deadlineCardContent");
    if (!contentArea) return;

    if (!projects || projects.length === 0) {
        contentArea.innerHTML = `
            <div>
                <div class="deadline-title" style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">No upcoming deadlines</div>
                <div class="deadline-date" style="font-size: 11.5px; color: var(--text-muted);">Submit a project to set dates</div>
            </div>
            <span style="color: var(--text-muted); font-size: 14px;">➔</span>
        `;
        return;
    }

    const projectsListShow = projects.slice(0, 2);
    contentArea.innerHTML = projectsListShow.map(p => {
        const d = p.deadline ? new Date(p.deadline) : null;
        const dateStr = (d && !isNaN(d)) ? d.toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' }) : "In Review";
        const budgetStr = p.budget_range ? ` • ${escapeHtml(p.budget_range)}` : "";
        const st = String(p.status || "").trim().toLowerCase();
        let dotColor = "#E3A84B";
        if (st === "accepted") dotColor = "#4CCB91";
        else if (st === "rejected") dotColor = "#E76A6A";

        return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.04);">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="width: 8px; height: 8px; border-radius: 50%; background: ${dotColor}; display: inline-block; flex-shrink: 0;"></span>
                    <div>
                        <div class="deadline-title" style="font-size: 13.5px; font-weight: 700; color: var(--text-primary);">${escapeHtml(p.title)}</div>
                        <div class="deadline-date" style="font-size: 11.5px; color: var(--text-muted);">${dateStr}${budgetStr}</div>
                    </div>
                </div>
                <span style="color: var(--text-muted); font-size: 13px;">❯</span>
            </div>
        `;
    }).join("");
}

// Helper: Update Recent Activity Widget
function updateRecentActivityWidget(projects) {
    const activityList = document.getElementById("recentActivityList");
    if (!activityList) return;

    if (!projects || projects.length === 0) {
        activityList.innerHTML = `
            <div class="activity-item">
                <div class="activity-dot amber"></div>
                <div class="activity-text">No recent activity</div>
                <div class="activity-time">Now</div>
            </div>
        `;
        return;
    }

    activityList.innerHTML = "";
    projects.slice(0, 3).forEach(project => {
        const st = String(project.status || "").trim().toLowerCase();
        let dotClass = "amber";
        let statusPhrase = "is under review";

        if (st === "accepted") {
            dotClass = "green";
            statusPhrase = "has been accepted!";
        } else if (st === "rejected") {
            dotClass = "red";
            statusPhrase = "has been rejected";
        } else if (st === "needs_details") {
            dotClass = "amber";
            statusPhrase = "requires more details";
        }

        const dateStr = project.created_at ? getRelativeTimeString(new Date(project.created_at)) : "Recently";

        const item = document.createElement("div");
        item.className = "activity-item";
        item.innerHTML = `
            <div class="activity-dot ${dotClass}"></div>
            <div class="activity-text">Your project "<strong>${escapeHtml(project.title)}</strong>" ${statusPhrase}.</div>
            <div class="activity-time">${dateStr}</div>
        `;
        activityList.appendChild(item);
    });
}

// Helper: Load Recent Messages Widget
async function loadRecentMessagesWidget(userId) {
    const listElem = document.getElementById("recentMessagesList");
    if (!listElem) return;

    const { data: messages, error } = await supabaseClient
        .from("messages")
        .select("id, project_id, sender_id, message, created_at, projects(title)")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false })
        .limit(3);

    if (error || !messages || messages.length === 0) {
        listElem.innerHTML = `
            <div class="widget-msg-item" style="cursor: default;">
                <div class="msg-avatar">A</div>
                <div class="msg-info">
                    <div class="msg-top-line">
                        <span class="msg-sender">Admin Support</span>
                        <span class="msg-time">--</span>
                    </div>
                    <div class="msg-snippet">No recent messages yet</div>
                </div>
            </div>
        `;
        return;
    }

    listElem.innerHTML = "";
    messages.forEach(msg => {
        const isSelf = msg.sender_id === userId;
        const senderName = isSelf ? "You" : "Admin Team";
        const projTitle = msg.projects?.title || "Project";
        const timeStr = getRelativeTimeString(new Date(msg.created_at));

        const div = document.createElement("div");
        div.className = "widget-msg-item";
        div.setAttribute("data-project-id", msg.project_id);
        div.setAttribute("data-project-title", projTitle);
        div.innerHTML = `
            <div class="msg-avatar">${isSelf ? 'S' : 'A'}</div>
            <div class="msg-info">
                <div class="msg-top-line">
                    <span class="msg-sender">${senderName}</span>
                    <span class="msg-time">${timeStr}</span>
                </div>
                <div class="msg-snippet">${escapeHtml(msg.message)}</div>
            </div>
        `;

        div.addEventListener("click", () => {
            window.location.href = "messages.html";
        });

        listElem.appendChild(div);
    });
}

function getRelativeTimeString(date) {
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 60) return "Just now";
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString("en-GB", { day: '2-digit', month: 'short' });
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
const sendStudentChatBtn = document.getElementById("sendStudentChatBtn");
const closeStudentChatBtn = document.getElementById("closeStudentChatBtn");

async function openStudentChat(projectId, projectTitle) {
    if (!currentStudentUser) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        currentStudentUser = user;
        if (!currentStudentUser) return;
    }

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
        studentChatMessagesContainer.innerHTML = `<div class="chat-empty-state"><p>No messages yet. Ask technical support anything!</p></div>`;
        return;
    }

    studentChatMessagesContainer.innerHTML = "";
    messages.forEach(msg => {
        const isSelf = currentStudentUser && msg.sender_id === currentStudentUser.id;
        const bubble = document.createElement("div");
        bubble.className = `message-bubble ${isSelf ? "sent" : "received"}`;
        bubble.innerHTML = `
            <div class="message-sender-tag">${isSelf ? "You" : "Technical Support Admin"}</div>
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

projectsList.addEventListener("click", (e) => {
    const btn = e.target.closest(".student-chat-btn");
    if (!btn) return;
    openStudentChat(btn.dataset.projectId, btn.dataset.projectTitle);
});

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

loadDashboard();