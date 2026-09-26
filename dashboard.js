const userName = document.getElementById("userName");
const welcomeName = document.getElementById("welcomeName");
const logoutBtn = document.getElementById("logoutBtn");
const projectsList = document.getElementById("projectsList");


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

        userName.textContent = user.email || "Student";
        welcomeName.textContent = "Student";

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

    userName.textContent = name;
    welcomeName.textContent = name;

    const profileBar = document.getElementById("studentProfileBar");
    if (profileBar) {
        document.getElementById("profileName").textContent = name;
        document.getElementById("profilePhone").textContent = profile.phone || "Not provided";
        document.getElementById("profileEmail").textContent = profile.email || user.email || "";
        profileBar.style.display = "flex";
    }

    // Store student user & profile
    currentStudentUser = user;
    currentStudentProfile = profile;

    // Load student's projects and unread message counts
    await loadProjects(user.id);
    await loadNotifications(user.id);

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


    // No projects
    if (!projects || projects.length === 0) {

        projectsList.innerHTML = `
            <div class="empty-projects">

                <h3>No projects yet</h3>

                <p>
                    Submit your first project to get started.
                </p>

                <a href="submit-project.html" class="dashboard-button">
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
        let statusText = "Submitted";
        if (rawStatus === "accepted") statusText = "Accepted";
        else if (rawStatus === "rejected") statusText = "Rejected";
        else if (rawStatus === "needs_details") statusText = "Needs More Details";

        const unreadCount = unreadCountByProject[project.id] || 0;

        const student = project.student || currentStudentProfile || {};
        const studentName = student.full_name || currentStudentProfile?.full_name || "Student";
        const studentPhone = student.phone || currentStudentProfile?.phone || "Not provided";
        const studentEmail = student.email || currentStudentProfile?.email || (currentStudentUser ? currentStudentUser.email : "");

        projectCard.innerHTML = `
            <div class="project-card-header">

                <h3>${escapeHtml(project.title)}</h3>

                <span class="project-status status-${rawStatus}">
                    ${escapeHtml(statusText)}
                </span>

            </div>

            <p>${escapeHtml(project.description)}</p>

            <div class="project-details">

                <span>
                    <strong>Department:</strong>
                    ${escapeHtml(project.department)}
                </span>

                <span>
                    <strong>Domain:</strong>
                    ${escapeHtml(project.domain)}
                </span>

                <span>
                    <strong>Type:</strong>
                    ${escapeHtml(project.project_type)}
                </span>

            </div>

            <div class="student-details" style="margin-top: 18px; padding: 14px 18px; background: rgba(11, 15, 23, 0.5); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm);">
                <div class="student-detail-grid" style="display: flex; flex-wrap: wrap; gap: 16px; font-size: 13.5px; color: var(--text-secondary);">
                    <span>
                        <strong style="color: var(--text-primary);">👤 Student Name:</strong>
                        ${escapeHtml(studentName)}
                    </span>
                    <span>
                        <strong style="color: var(--text-primary);">📞 Phone Number:</strong>
                        ${escapeHtml(studentPhone)}
                    </span>
                    ${studentEmail ? `
                    <span>
                        <strong style="color: var(--text-primary);">✉ Email:</strong>
                        ${escapeHtml(studentEmail)}
                    </span>
                    ` : ''}
                </div>
            </div>

            <div class="project-card-actions" style="margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border-subtle); display: flex; justify-content: flex-end;">
                <button type="button" class="dashboard-button secondary student-chat-btn" data-project-id="${project.id}" data-project-title="${escapeHtml(project.title)}">
                    💬 Messages ${unreadCount > 0 ? `<span class="unread-count-badge" id="unread-badge-${project.id}">${unreadCount}</span>` : `<span class="unread-count-badge" id="unread-badge-${project.id}"></span>`}
                </button>
            </div>
        `;


        projectsList.appendChild(projectCard);

    });

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



// Logout
logoutBtn.addEventListener("click", async () => {

    const { error } = await supabaseClient.auth.signOut();

    if (error) {

        console.error("Logout error:", error);

        return;
    }

    window.location.href = "login.html";

});


// ========================================
// Student Chat & Messaging System
// ========================================

let currentStudentUser = null;
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


// Start dashboard
loadDashboard();
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

    notificationArea.innerHTML = `
        <div class="notification-wrapper">

            <button id="notificationButton" class="notification-button">
                🔔 Notifications
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

    const notificationButton =
        document.getElementById("notificationButton");

    const notificationDropdown =
        document.getElementById("notificationDropdown");

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