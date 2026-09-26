const userName = document.getElementById("userName");
const welcomeName = document.getElementById("welcomeName");
const logoutBtn = document.getElementById("logoutBtn");
const projectsList = document.getElementById("projectsList");

let currentStudentUser = null;
let currentStudentProfile = null;

async function loadDashboard() {

    const {
        data: { user },
        error: userError
    } = await supabaseClient.auth.getUser();

    // No logged-in user
    if (userError || !user) {
        window.location.href = "login.html";
        return;
    }

    // Get user profile including phone, college, department, year
    const { data: profile, error: profileError } =
        await supabaseClient
            .from("profiles")
            .select("full_name, email, phone, college, department, year, role")
            .eq("id", user.id)
            .single();

    // Profile could not be loaded
    if (profileError || !profile) {
        console.error("Profile error:", profileError);

        if (userName) userName.textContent = user.email || "Student";
        if (welcomeName) welcomeName.textContent = "Student";

        document.body.style.visibility = "visible";
        return;
    }

    // Admin should use the admin dashboard
    if (profile.role === "admin") {
        window.location.href = "admin-dashboard.html";
        return;
    }

    // Display student name and profile info
    const name = profile.full_name || "Student";

    if (userName) userName.textContent = name;
    if (welcomeName) welcomeName.textContent = name;

    const userAvatarCircle = document.getElementById("userAvatarCircle");
    if (userAvatarCircle) {
        userAvatarCircle.textContent = name.charAt(0).toUpperCase();
    }

    const userSubDetail = document.getElementById("userSubDetail");
    if (userSubDetail) {
        const yrText = profile.year ? `${profile.year}${getOrdinalSuffix(profile.year)} Year` : "Student";
        const deptText = profile.department ? profile.department : "";
        userSubDetail.textContent = deptText ? `${yrText} · ${deptText}` : yrText;
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

    // Store student user & profile
    currentStudentUser = user;
    currentStudentProfile = profile;

    // Set today's date formatted in header widget
    const currentDateText = document.getElementById("currentDateText");
    if (currentDateText) {
        const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        currentDateText.textContent = new Date().toLocaleDateString('en-GB', options);
    }

    // Load student's projects and unread message counts
    await loadProjects(user.id);
    await loadNotifications(user.id);
    await loadRecentMessagesWidget(user.id);

    document.body.style.visibility = "visible";
}

function getOrdinalSuffix(i) {
    const j = i % 10, k = i % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
}

// Load student's projects
async function loadProjects(userId) {

    let { data: projects, error } =
        await supabaseClient
            .from("projects")
            .select(`
                *,
                student:profiles!projects_student_id_fkey (
                    id,
                    full_name,
                    email,
                    phone,
                    college,
                    department,
                    year
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

    // Update Stat Counters
    const totalCount = projects ? projects.length : 0;
    let inReviewCount = 0;
    let acceptedCount = 0;
    let rejectedCount = 0;

    if (projects) {
        projects.forEach(p => {
            const st = String(p.status || "").trim().toLowerCase();
            if (st === "accepted") acceptedCount++;
            else if (st === "rejected") rejectedCount++;
            else inReviewCount++;
        });
    }

    const statTotalProjects = document.getElementById("statTotalProjects");
    const statInReview = document.getElementById("statInReview");
    const statAccepted = document.getElementById("statAccepted");
    const statRejected = document.getElementById("statRejected");

    if (statTotalProjects) statTotalProjects.textContent = totalCount;
    if (statInReview) statInReview.textContent = inReviewCount;
    if (statAccepted) statAccepted.textContent = acceptedCount;
    if (statRejected) statRejected.textContent = rejectedCount;

    // Update Upcoming Deadline Widget
    updateDeadlineWidget(projects);

    // Update Recent Activity Widget
    updateRecentActivityWidget(projects);

    // No projects
    if (!projects || projects.length === 0) {

        projectsList.innerHTML = `
            <div class="empty-projects">

                <h3>No projects yet</h3>

                <p>
                    Submit your first project to get started with StudentBuild technical support.
                </p>

                <a href="submit-project.html" class="btn-new-project">
                    Submit Your Project
                </a>

            </div>
        `;

        return;
    }

    // Fetch unread message counts for all student's projects
    const { data: unreadMessages } = await supabaseClient
        .from("messages")
        .select("id, project_id")
        .eq("receiver_id", userId)
        .eq("is_read", false);

    const unreadCountByProject = {};
    if (unreadMessages) {
        unreadMessages.forEach(msg => {
            unreadCountByProject[msg.project_id] = (unreadCountByProject[msg.project_id] || 0) + 1;
        });
    }

    // Display projects
    projectsList.innerHTML = "";

    projects.forEach(project => {

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

        // Determine Domain Icon & Styling
        let domainIcon = "📁";
        let domainIconClass = "teal";

        const domLower = String(project.domain || "").toLowerCase();
        if (domLower.includes("iot")) {
            domainIcon = "📶";
            domainIconClass = "green";
        } else if (domLower.includes("ai") || domLower.includes("ml") || domLower.includes("machine")) {
            domainIcon = "🌿";
            domainIconClass = "purple";
        } else if (domLower.includes("web")) {
            domainIcon = "💻";
            domainIconClass = "coral";
        } else if (domLower.includes("app")) {
            domainIcon = "📱";
            domainIconClass = "teal";
        } else if (domLower.includes("data")) {
            domainIcon = "📊";
            domainIconClass = "purple";
        } else if (domLower.includes("embedded")) {
            domainIcon = "⚡";
            domainIconClass = "coral";
        }

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
            </div>

            <div class="student-details">
                <h4>👤 Student Contact Info</h4>
                <div class="student-detail-grid">
                    <p><strong>Name:</strong> ${escapeHtml(studentName)}</p>
                    <p><strong>Phone:</strong> ${escapeHtml(studentPhone)}</p>
                    ${studentEmail ? `<p><strong>Email:</strong> ${escapeHtml(studentEmail)}</p>` : ''}
                </div>
            </div>

            <div class="project-card-actions">
                <button type="button" class="contact-button message student-chat-btn" data-project-id="${project.id}" data-project-title="${escapeHtml(project.title)}">
                    💬 Messages ${unreadCount > 0 ? `<span class="unread-count-badge" id="unread-badge-${project.id}">${unreadCount}</span>` : `<span class="unread-count-badge" id="unread-badge-${project.id}"></span>`}
                </button>
            </div>
        `;

        projectsList.appendChild(projectCard);

    });

}

// Helper: Update Upcoming Deadline Widget
function updateDeadlineWidget(projects) {
    const deadlineProjectTitle = document.getElementById("deadlineProjectTitle");
    const deadlineDateText = document.getElementById("deadlineDateText");

    if (!deadlineProjectTitle || !deadlineDateText) return;

    if (!projects || projects.length === 0) {
        deadlineProjectTitle.textContent = "No upcoming deadlines";
        deadlineDateText.textContent = "Submit a project to set dates";
        return;
    }

    const projectsWithDeadline = projects.filter(p => p.deadline).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    if (projectsWithDeadline.length > 0) {
        const topDeadline = projectsWithDeadline[0];
        deadlineProjectTitle.textContent = topDeadline.title;
        const d = new Date(topDeadline.deadline);
        deadlineDateText.textContent = isNaN(d) ? topDeadline.deadline : d.toLocaleDateString("en-GB", { day: '2-digit', month: 'short', year: 'numeric' });
    } else {
        deadlineProjectTitle.textContent = projects[0].title;
        deadlineDateText.textContent = "In Review";
    }
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
            openStudentChat(msg.project_id, projTitle);
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

// Basic HTML escaping
function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// Logout handler
async function handleLogout() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        console.error("Logout error:", error);
        return;
    }
    window.location.href = "login.html";
}

if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogout);
}

const sidebarLogoutLink = document.getElementById("sidebarLogoutLink");
if (sidebarLogoutLink) {
    sidebarLogoutLink.addEventListener("click", handleLogout);
}

// Mobile sidebar toggle
const mobileToggleBtn = document.getElementById("mobileToggleBtn");
const appSidebar = document.getElementById("appSidebar");
if (mobileToggleBtn && appSidebar) {
    mobileToggleBtn.addEventListener("click", () => {
        appSidebar.classList.toggle("show-mobile");
    });
}

// Contact Support Button
const contactSupportBtn = document.getElementById("contactSupportBtn");
if (contactSupportBtn) {
    contactSupportBtn.addEventListener("click", async () => {
        // Open chat for first project or fallback
        const { data: projects } = await supabaseClient
            .from("projects")
            .select("id, title")
            .limit(1);

        if (projects && projects.length > 0) {
            openStudentChat(projects[0].id, projects[0].title);
        } else {
            alert("Please submit a project first to contact support.");
        }
    });
}

// View All Messages
const viewAllMessagesBtn = document.getElementById("viewAllMessagesBtn");
const sidebarMessagesLink = document.getElementById("sidebarMessagesLink");
function openFirstProjectChat() {
    const firstChatBtn = document.querySelector(".student-chat-btn");
    if (firstChatBtn) {
        firstChatBtn.click();
    } else {
        alert("No active project messages yet. Submit a project to start chatting.");
    }
}
if (viewAllMessagesBtn) viewAllMessagesBtn.addEventListener("click", openFirstProjectChat);
if (sidebarMessagesLink) sidebarMessagesLink.addEventListener("click", openFirstProjectChat);

// ========================================
// Student Chat & Messaging System
// ========================================

let activeStudentChatProjectId = null;
let activeStudentChatProjectTitle = "";
let activeStudentChatAdminId = null;
let studentChatRealtimeChannel = null;

const studentChatModal = document.getElementById("studentChatModal");
const studentChatProjectTitle = document.getElementById("studentChatProjectTitle");
const studentChatMessagesContainer = document.getElementById("studentChatMessagesContainer");
const studentChatForm = document.getElementById("studentChatForm");
const studentChatInput = document.getElementById("studentChatInput");
const sendStudentChatBtn = document.getElementById("sendStudentChatBtn");
const closeStudentChatBtn = document.getElementById("closeStudentChatBtn");

async function getAdminId() {
    if (activeStudentChatAdminId) return activeStudentChatAdminId;

    try {
        const { data: adminProf } = await supabaseClient
            .from("profiles")
            .select("id")
            .eq("role", "admin")
            .limit(1)
            .single();

        if (adminProf) {
            activeStudentChatAdminId = adminProf.id;
            return adminProf.id;
        }
    } catch (err) {
        console.warn("Could not query admin profile directly:", err);
    }

    return null;
}

async function openStudentChat(projectId, projectTitle) {
    if (!currentStudentUser) {
        const { data: { user } } = await supabaseClient.auth.getUser();
        currentStudentUser = user;
        if (!currentStudentUser) return;
    }

    activeStudentChatProjectId = projectId;
    activeStudentChatProjectTitle = projectTitle || "Project";

    if (studentChatProjectTitle) {
        studentChatProjectTitle.textContent = `Project: ${activeStudentChatProjectTitle}`;
    }

    if (studentChatModal) {
        studentChatModal.classList.add("active");
    }

    await getAdminId();
    await loadStudentChatMessages();
    await markStudentMessagesAsRead(projectId);

    // Clear unread badge in UI
    const badge = document.getElementById(`unread-badge-${projectId}`);
    if (badge) {
        badge.textContent = "";
        badge.style.display = "none";
    }

    // Subscribe to Realtime messages for this project
    if (studentChatRealtimeChannel) {
        supabaseClient.removeChannel(studentChatRealtimeChannel);
    }

    try {
        studentChatRealtimeChannel = supabaseClient
            .channel(`student-chat-${projectId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: `project_id=eq.${projectId}`
                },
                (payload) => {
                    const newMsg = payload.new;
                    appendMessageToStudentChat(newMsg);
                    if (newMsg.receiver_id === currentStudentUser.id) {
                        markStudentMessagesAsRead(projectId);
                    }
                }
            )
            .subscribe();
    } catch (rtErr) {
        console.warn("Realtime subscription note:", rtErr);
    }
}

function closeStudentChat() {
    if (studentChatModal) {
        studentChatModal.classList.remove("active");
    }
    activeStudentChatProjectId = null;

    if (studentChatRealtimeChannel) {
        supabaseClient.removeChannel(studentChatRealtimeChannel);
        studentChatRealtimeChannel = null;
    }
}

if (closeStudentChatBtn) {
    closeStudentChatBtn.addEventListener("click", closeStudentChat);
}

if (studentChatModal) {
    studentChatModal.addEventListener("click", (e) => {
        if (e.target === studentChatModal) {
            closeStudentChat();
        }
    });
}

async function markStudentMessagesAsRead(projectId) {
    if (!currentStudentUser || !projectId) return;

    try {
        await supabaseClient
            .from("messages")
            .update({ is_read: true })
            .eq("project_id", projectId)
            .eq("receiver_id", currentStudentUser.id)
            .eq("is_read", false);
    } catch (err) {
        console.error("Error marking student messages read:", err);
    }
}

async function loadStudentChatMessages() {
    if (!activeStudentChatProjectId) return;

    studentChatMessagesContainer.innerHTML = `
        <div class="chat-empty-state">
            <span>⌛</span>
            <p>Loading conversation...</p>
        </div>
    `;

    const { data: messages, error } = await supabaseClient
        .from("messages")
        .select("*")
        .eq("project_id", activeStudentChatProjectId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error loading student chat messages:", error);
        studentChatMessagesContainer.innerHTML = `
            <div class="chat-empty-state">
                <span>⚠️</span>
                <p>Unable to load messages. Please try again.</p>
            </div>
        `;
        return;
    }

    if (!messages || messages.length === 0) {
        studentChatMessagesContainer.innerHTML = `
            <div class="chat-empty-state">
                <span>💬</span>
                <p>No messages yet. Ask our Technical Support team anything!</p>
            </div>
        `;
        return;
    }

    // Try detecting admin ID from existing messages if needed
    if (!activeStudentChatAdminId) {
        const adminMsg = messages.find(m => m.sender_id !== currentStudentUser.id);
        if (adminMsg) {
            activeStudentChatAdminId = adminMsg.sender_id;
        }
    }

    studentChatMessagesContainer.innerHTML = "";
    messages.forEach((msg) => {
        renderMessageBubbleStudent(msg);
    });

    studentChatMessagesContainer.scrollTop = studentChatMessagesContainer.scrollHeight;
}

function renderMessageBubbleStudent(msg) {
    const isSentByStudent = currentStudentUser && msg.sender_id === currentStudentUser.id;
    const bubble = document.createElement("div");
    bubble.className = `message-bubble ${isSentByStudent ? "sent" : "received"}`;
    bubble.dataset.messageId = msg.id;

    const timeStr = msg.created_at
        ? new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "";

    const senderTag = isSentByStudent ? "You" : "Technical Support Admin";

    bubble.innerHTML = `
        <div class="message-sender-tag">${senderTag}</div>
        <div class="message-text">${escapeHtml(msg.message)}</div>
        <div class="message-time">${timeStr}</div>
    `;

    studentChatMessagesContainer.appendChild(bubble);
    studentChatMessagesContainer.scrollTop = studentChatMessagesContainer.scrollHeight;
}

function appendMessageToStudentChat(msg) {
    if (document.querySelector(`[data-message-id="${msg.id}"]`)) {
        return;
    }

    const emptyState = studentChatMessagesContainer.querySelector(".chat-empty-state");
    if (emptyState) {
        studentChatMessagesContainer.innerHTML = "";
    }

    renderMessageBubbleStudent(msg);
}

if (studentChatForm) {
    studentChatForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const messageText = studentChatInput.value.trim();
        if (!messageText || !activeStudentChatProjectId) {
            return;
        }

        if (!currentStudentUser) {
            const { data: { user } } = await supabaseClient.auth.getUser();
            currentStudentUser = user;
            if (!currentStudentUser) return;
        }

        const adminId = await getAdminId();
        if (!adminId) {
            alert("Technical team contact could not be resolved. Please try again later.");
            return;
        }

        sendStudentChatBtn.disabled = true;
        studentChatInput.disabled = true;

        try {
            const { data: newMsg, error } = await supabaseClient
                .from("messages")
                .insert({
                    project_id: activeStudentChatProjectId,
                    sender_id: currentStudentUser.id,
                    receiver_id: adminId,
                    message: messageText,
                    is_read: false
                })
                .select()
                .single();

            if (error) {
                console.error("Error sending student message:", error);
                alert("Unable to send message: " + error.message);
                return;
            }

            studentChatInput.value = "";
            appendMessageToStudentChat(newMsg);

            // Notify Admin
            const notificationMsg = `New student message for project "${activeStudentChatProjectTitle}": ${messageText.substring(0, 60)}${messageText.length > 60 ? "..." : ""}`;
            await supabaseClient
                .from("notifications")
                .insert({
                    user_id: adminId,
                    project_id: activeStudentChatProjectId,
                    message: notificationMsg,
                    type: "new_message"
                });

        } catch (err) {
            console.error("Error sending message:", err);
            alert("Unable to send message. Please try again.");
        } finally {
            sendStudentChatBtn.disabled = false;
            studentChatInput.disabled = false;
            studentChatInput.focus();
        }
    });
}

// Event listener for student chat buttons on project cards
projectsList.addEventListener("click", (event) => {
    const chatBtn = event.target.closest(".student-chat-btn");
    if (!chatBtn) return;

    const projectId = chatBtn.dataset.projectId;
    const projectTitle = chatBtn.dataset.projectTitle;

    openStudentChat(projectId, projectTitle);
});

// Load Notifications
async function loadNotifications(userId) {

    const notificationArea = document.getElementById("notificationArea");

    if (!notificationArea) {
        return;
    }

    const { data: notifications, error } = await supabaseClient
        .from("notifications")
        .select("id, project_id, message, type, is_read, created_at")
        .eq("user_id", userId)
        .eq("is_read", false)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Notification error:", error);
        return;
    }

    const count = notifications ? notifications.length : 0;

    const sidebarNotifBadge = document.getElementById("sidebarNotifBadge");
    if (sidebarNotifBadge) {
        if (count > 0) {
            sidebarNotifBadge.textContent = count;
            sidebarNotifBadge.style.display = "inline-block";
        } else {
            sidebarNotifBadge.style.display = "none";
        }
    }

    notificationArea.innerHTML = `
        <div class="notification-wrapper">

            <button id="notificationButton" class="notification-button">
                🔔
                ${count > 0 ? `<span class="notification-badge">${count}</span>` : ""}
            </button>

            <div id="notificationDropdown" class="notification-dropdown">

                ${count === 0
            ? `
                            <div class="no-notifications">
                                <div class="no-notification-icon">🔔</div>
                                <p>No new notifications</p>
                            </div>
                        `
            : `
                            <div class="notification-dropdown-header">
                                <strong>Notifications</strong>
                                <span>${count} new</span>
                            </div>

                            ${notifications.map(notification => `
                                <div class="notification-item">

                                    <div class="notification-icon">
                                        🔔
                                    </div>

                                    <div class="notification-content">
                                        <div class="notification-message">
                                            ${escapeHtml(notification.message)}
                                        </div>

                                        <div class="notification-time">
                                            ${new Date(notification.created_at).toLocaleString()}
                                        </div>
                                    </div>

                                </div>
                            `).join("")}
                        `
        }

            </div>
        </div>
    `;

    const notificationButton = document.getElementById("notificationButton");
    const notificationDropdown = document.getElementById("notificationDropdown");

    if (notificationButton && notificationDropdown) {
        notificationButton.addEventListener("click", (event) => {
            event.stopPropagation();
            notificationDropdown.classList.toggle("show");
        });

        document.addEventListener("click", (event) => {
            if (!notificationArea.contains(event.target)) {
                notificationDropdown.classList.remove("show");
            }
        });
    }
}

// Start dashboard
loadDashboard();