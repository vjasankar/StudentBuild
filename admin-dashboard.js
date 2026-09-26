const adminName = document.getElementById("adminName");
const submittedCount = document.getElementById("submittedCount");
const totalCount = document.getElementById("totalCount");
const adminProjectsList = document.getElementById("adminProjectsList");
const logoutBtn = document.getElementById("logoutBtn");


// ========================================
// Check Admin Authentication
// ========================================

async function checkAdmin() {

    const {
        data: { user },
        error: userError
    } = await supabaseClient.auth.getUser();

    console.log("Logged-in user:", user);

    // No logged-in user
    if (userError || !user) {
        window.location.href = "login.html";
        return null;
    }

    // Get profile
    const { data: profile, error: profileError } =
        await supabaseClient
            .from("profiles")
            .select("full_name, email, role")
            .eq("id", user.id)
            .single();

    console.log("Admin profile:", profile);
    console.log("Profile error:", profileError);

    if (profileError || !profile) {
        console.error("Profile error:", profileError);
        window.location.href = "login.html";
        return null;
    }

    // Check role
    if (profile.role !== "admin") {
        alert("Access denied. Admin access required.");
        window.location.href = "dashboard.html";
        return null;
    }

    // Display admin name
    adminName.textContent = profile.full_name || "Admin";

    // Unhide page body
    document.body.style.visibility = "visible";

    return user;
}


// ========================================
// Load All Projects
// ========================================

async function loadProjects() {

    const { data: projects, error } =
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
            .order("created_at", { ascending: false });

    if (error) {

        console.error("Projects error:", error);

        adminProjectsList.innerHTML = `
            <div class="empty-projects">
                <h3>Unable to load projects</h3>
                <p>${escapeHtml(error.message)}</p>
            </div>
        `;

        return;
    }

    console.log("Projects with student details:", projects);


    // ========================================
    // Statistics
    // ========================================

    totalCount.textContent =
        projects ? projects.length : 0;

    const submittedProjects =
        projects
            ? projects.filter(project => {

                const status = String(project.status || "")
                    .trim()
                    .replace(/^['"]|['"]$/g, "")
                    .toLowerCase();

                return status === "submitted";

            })
            : [];

    submittedCount.textContent =
        submittedProjects.length;


    // ========================================
    // No projects
    // ========================================

    if (!projects || projects.length === 0) {

        adminProjectsList.innerHTML = `
            <div class="empty-projects">
                <h3>No projects yet</h3>
                <p>
                    Student project submissions will appear here.
                </p>
            </div>
        `;

        return;
    }


    // ========================================
    // Display Projects
    // ========================================

    adminProjectsList.innerHTML = "";

    projects.forEach(project => {

        const card =
            document.createElement("div");

        card.className = "project-card";


        // Normalize status
        const normalizedStatus =
            String(project.status || "")
                .trim()
                .replace(/^['"]|['"]$/g, "")
                .toLowerCase();


        // Student information
        const student = project.student || {};

        const studentName =
            student.full_name || "Not provided";

        const studentEmail =
            student.email || "";

        const studentPhone =
            student.phone || "";

        const studentCollege =
            student.college || "Not provided";

        const studentDepartment =
            student.department || "Not provided";

        const studentYear =
            student.year || "Not provided";


        // ========================================
        // Project Card
        // ========================================

        card.innerHTML = `

            <div class="project-card-header">

                <h3>
                    ${escapeHtml(project.title)}
                </h3>

                <span class="project-status">
                    ${escapeHtml(
            normalizedStatus || "Unknown"
        )}
                </span>

            </div>


            <p>
                ${escapeHtml(project.description)}
            </p>


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

                <span>
                    <strong>Budget:</strong>
                    ${escapeHtml(
            project.budget_range || "Not specified"
        )}
                </span>

                <span>
                    <strong>Deadline:</strong>
                    ${escapeHtml(
            project.deadline || "Not specified"
        )}
                </span>

            </div>


            <!-- ========================================
                 Student Details
            ========================================= -->

            <div class="student-details">

                <h4>👤 Student Details</h4>

                <div class="student-detail-grid">

                    <p>
                        <strong>Name:</strong>
                        ${escapeHtml(studentName)}
                    </p>

                    <p>
                        <strong>Email:</strong>
                        ${escapeHtml(
            studentEmail || "Not provided"
        )}
                    </p>

                    <p>
                        <strong>Phone:</strong>
                        ${escapeHtml(
            studentPhone || "Not provided"
        )}
                    </p>

                    <p>
                        <strong>College:</strong>
                        ${escapeHtml(studentCollege)}
                    </p>

                    <p>
                        <strong>Department:</strong>
                        ${escapeHtml(studentDepartment)}
                    </p>

                    <p>
                        <strong>Year:</strong>
                        ${escapeHtml(studentYear)}
                    </p>

                </div>


                <!-- ========================================
                     Contact Actions
                ========================================= -->

                <div class="student-contact-actions">

                    ${studentEmail
                ? `
                                <a
                                    href="mailto:${encodeURIComponent(studentEmail)}"
                                    class="contact-button email"
                                >
                                    ✉ Email Student
                                </a>
                              `
                : ""
            }


                    ${studentPhone
                ? `
                                <a
                                    href="tel:${encodeURIComponent(studentPhone)}"
                                    class="contact-button call"
                                >
                                    ☎ Call Student
                                </a>
                              `
                : ""
            }


                    <button
                        type="button"
                        class="contact-button message"
                        data-project-id="${project.id}"
                        data-student-id="${student.id || ""}"
                    >
                        💬 Message Student
                    </button>

                </div>

            </div>


            <!-- ========================================
                 Admin Project Actions
            ========================================= -->

            <div class="admin-project-actions">

                ${["submitted", "needs_details"].includes(
                normalizedStatus
            )

                ? `

                            <button
                                class="admin-action accept"
                                data-id="${project.id}"
                                data-action="accepted"
                            >
                                ✓ Accept
                            </button>


                            <button
                                class="admin-action reject"
                                data-id="${project.id}"
                                data-action="rejected"
                            >
                                ✕ Reject
                            </button>


                            ${normalizedStatus === "submitted"

                    ? `
                                        <button
                                            class="admin-action details"
                                            data-id="${project.id}"
                                            data-action="needs_details"
                                        >
                                            ? Request More Details
                                        </button>
                                      `

                    : ""
                }

                          `

                : `

                            <span class="project-action-status">
                                ${escapeHtml(
                    normalizedStatus
                )}
                            </span>

                          `
            }

            </div>
        `;


        adminProjectsList.appendChild(card);

    });

}


// ========================================
// HTML Safety
// ========================================

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


// ========================================
// Admin Chat & Messaging System
// ========================================

let currentAdminUser = null;
let activeAdminChatProjectId = null;
let activeAdminChatStudentId = null;
let activeAdminChatStudentName = "";
let activeAdminChatProjectTitle = "";
let adminChatRealtimeChannel = null;

const adminChatModal = document.getElementById("adminChatModal");
const chatModalStudentName = document.getElementById("chatModalStudentName");
const chatModalProjectTitle = document.getElementById("chatModalProjectTitle");
const adminChatMessagesContainer = document.getElementById("adminChatMessagesContainer");
const adminChatForm = document.getElementById("adminChatForm");
const adminChatInput = document.getElementById("adminChatInput");
const sendAdminChatBtn = document.getElementById("sendAdminChatBtn");
const closeAdminChatBtn = document.getElementById("closeAdminChatBtn");

async function openAdminChat(projectId, studentId, studentName, projectTitle) {
    if (!currentAdminUser) {
        currentAdminUser = await checkAdmin();
        if (!currentAdminUser) return;
    }

    activeAdminChatProjectId = projectId;
    activeAdminChatStudentId = studentId;
    activeAdminChatStudentName = studentName || "Student";
    activeAdminChatProjectTitle = projectTitle || "Project";

    if (chatModalStudentName) chatModalStudentName.textContent = activeAdminChatStudentName;
    if (chatModalProjectTitle) chatModalProjectTitle.textContent = `Project: ${activeAdminChatProjectTitle}`;

    if (adminChatModal) adminChatModal.classList.add("active");

    await loadAdminChatMessages();
    await markAdminMessagesAsRead();

    // Subscribe to Realtime messages for this project
    if (adminChatRealtimeChannel) {
        supabaseClient.removeChannel(adminChatRealtimeChannel);
    }

    try {
        adminChatRealtimeChannel = supabaseClient
            .channel(`admin-chat-${projectId}`)
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
                    appendMessageToAdminChat(newMsg);
                    if (newMsg.receiver_id === currentAdminUser.id) {
                        markAdminMessagesAsRead();
                    }
                }
            )
            .subscribe();
    } catch (rtErr) {
        console.warn("Realtime subscription note:", rtErr);
    }
}

function closeAdminChat() {
    if (adminChatModal) adminChatModal.classList.remove("active");
    activeAdminChatProjectId = null;
    activeAdminChatStudentId = null;

    if (adminChatRealtimeChannel) {
        supabaseClient.removeChannel(adminChatRealtimeChannel);
        adminChatRealtimeChannel = null;
    }
}

if (closeAdminChatBtn) {
    closeAdminChatBtn.addEventListener("click", closeAdminChat);
}

if (adminChatModal) {
    adminChatModal.addEventListener("click", (e) => {
        if (e.target === adminChatModal) {
            closeAdminChat();
        }
    });
}

async function markAdminMessagesAsRead() {
    if (!currentAdminUser || !activeAdminChatProjectId) return;

    try {
        await supabaseClient
            .from("messages")
            .update({ is_read: true })
            .eq("project_id", activeAdminChatProjectId)
            .eq("receiver_id", currentAdminUser.id)
            .eq("is_read", false);
    } catch (err) {
        console.error("Mark read error:", err);
    }
}

async function loadAdminChatMessages() {
    if (!activeAdminChatProjectId) return;

    adminChatMessagesContainer.innerHTML = `
        <div class="chat-empty-state">
            <span>⌛</span>
            <p>Loading conversation...</p>
        </div>
    `;

    const { data: messages, error } = await supabaseClient
        .from("messages")
        .select("*")
        .eq("project_id", activeAdminChatProjectId)
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Error loading chat messages:", error);
        adminChatMessagesContainer.innerHTML = `
            <div class="chat-empty-state">
                <span>⚠️</span>
                <p>Unable to load messages. Please try again.</p>
            </div>
        `;
        return;
    }

    if (!messages || messages.length === 0) {
        adminChatMessagesContainer.innerHTML = `
            <div class="chat-empty-state">
                <span>💬</span>
                <p>No messages yet. Start the conversation with ${escapeHtml(activeAdminChatStudentName)}!</p>
            </div>
        `;
        return;
    }

    adminChatMessagesContainer.innerHTML = "";
    messages.forEach((msg) => {
        renderMessageBubbleAdmin(msg);
    });

    adminChatMessagesContainer.scrollTop = adminChatMessagesContainer.scrollHeight;
}

function renderMessageBubbleAdmin(msg) {
    const isSentByAdmin = currentAdminUser && msg.sender_id === currentAdminUser.id;
    const bubble = document.createElement("div");
    bubble.className = `message-bubble ${isSentByAdmin ? "sent" : "received"}`;
    bubble.dataset.messageId = msg.id;

    const timeStr = msg.created_at
        ? new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "";

    const senderTag = isSentByAdmin ? "You (Admin)" : escapeHtml(activeAdminChatStudentName);

    bubble.innerHTML = `
        <div class="message-sender-tag">${senderTag}</div>
        <div class="message-text">${escapeHtml(msg.message)}</div>
        <div class="message-time">${timeStr}</div>
    `;

    adminChatMessagesContainer.appendChild(bubble);
    adminChatMessagesContainer.scrollTop = adminChatMessagesContainer.scrollHeight;
}

function appendMessageToAdminChat(msg) {
    // Avoid duplicate message bubble if already rendered
    if (document.querySelector(`[data-message-id="${msg.id}"]`)) {
        return;
    }

    const emptyState = adminChatMessagesContainer.querySelector(".chat-empty-state");
    if (emptyState) {
        adminChatMessagesContainer.innerHTML = "";
    }

    renderMessageBubbleAdmin(msg);
}

if (adminChatForm) {
    adminChatForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const messageText = adminChatInput.value.trim();
        if (!messageText || !activeAdminChatProjectId || !activeAdminChatStudentId) {
            return;
        }

        if (!currentAdminUser) {
            currentAdminUser = await checkAdmin();
            if (!currentAdminUser) return;
        }

        sendAdminChatBtn.disabled = true;
        adminChatInput.disabled = true;

        try {
            const { data: newMsg, error } = await supabaseClient
                .from("messages")
                .insert({
                    project_id: activeAdminChatProjectId,
                    sender_id: currentAdminUser.id,
                    receiver_id: activeAdminChatStudentId,
                    message: messageText,
                    is_read: false
                })
                .select()
                .single();

            if (error) {
                console.error("Message send error:", error);
                alert("Unable to send message: " + error.message);
                return;
            }

            adminChatInput.value = "";
            appendMessageToAdminChat(newMsg);

            // Create notification for student
            const notificationMsg = `New message from Admin for project "${activeAdminChatProjectTitle}": ${messageText.substring(0, 60)}${messageText.length > 60 ? "..." : ""}`;
            await supabaseClient
                .from("notifications")
                .insert({
                    user_id: activeAdminChatStudentId,
                    project_id: activeAdminChatProjectId,
                    message: notificationMsg,
                    type: "new_message"
                });

        } catch (err) {
            console.error("Error sending admin chat message:", err);
            alert("Unable to send message. Please try again.");
        } finally {
            sendAdminChatBtn.disabled = false;
            adminChatInput.disabled = false;
            adminChatInput.focus();
        }
    });
}

// Click listener for Message Student buttons
adminProjectsList.addEventListener("click", (event) => {
    const messageButton = event.target.closest(".contact-button.message");
    if (!messageButton) {
        return;
    }

    const projectId = messageButton.dataset.projectId;
    const studentId = messageButton.dataset.studentId;

    if (!studentId) {
        alert("Student information could not be loaded for this project.");
        return;
    }

    // Find card elements to extract student name and project title
    const card = messageButton.closest(".project-card");
    const projectTitle = card ? card.querySelector("h3")?.textContent.trim() : "Project";
    const studentNameElem = card ? card.querySelector(".student-detail-grid p") : null;
    const studentName = studentNameElem ? studentNameElem.textContent.replace("Name:", "").trim() : "Student";

    openAdminChat(projectId, studentId, studentName, projectTitle);
});


// ========================================
// Logout
// ========================================

logoutBtn.addEventListener("click", async () => {

    const { error } =
        await supabaseClient.auth.signOut();

    if (error) {

        console.error("Logout error:", error);

        return;
    }

    window.location.href = "login.html";

});


// ========================================
// Start Admin Dashboard
// ========================================

async function startAdminDashboard() {

    const user = await checkAdmin();

    if (!user) {
        return;
    }

    await loadProjects();

}

startAdminDashboard();


// ========================================
// Admin Project Actions
// ========================================

adminProjectsList.addEventListener("click", async (event) => {

    const button =
        event.target.closest(".admin-action");

    if (!button) {
        return;
    }


    const projectId =
        button.dataset.id;

    const newStatus =
        button.dataset.action;


    console.log("Admin action clicked:", {
        projectId,
        newStatus
    });


    let confirmationMessage;


    if (newStatus === "accepted") {

        confirmationMessage =
            "Accept this project?";

    } else if (newStatus === "rejected") {

        confirmationMessage =
            "Reject this project?";

    } else if (newStatus === "needs_details") {

        confirmationMessage =
            "Request more details from this student?";

    }


    if (!confirm(confirmationMessage)) {
        return;
    }


    button.disabled = true;

    button.textContent = "Updating...";


    // ========================================
    // Update Project Status
    // ========================================

    const {
        data: updatedProject,
        error
    } = await supabaseClient
        .from("projects")
        .update({
            status: newStatus
        })
        .eq("id", projectId)
        .select()
        .single();


    if (error) {

        console.error(
            "Status update error:",
            error
        );

        alert(
            "Unable to update project.\n\n" +
            error.message
        );

        button.disabled = false;

        return;
    }


    console.log(
        "Project updated:",
        updatedProject
    );


    // ========================================
    // Create Notification
    // ========================================

    if (newStatus === "needs_details") {

        const notificationMessage =
            `More details are required for your project "${updatedProject.title}". ` +
            `Please review your project and provide the requested information.`;


        const {
            error: notificationError
        } = await supabaseClient
            .from("notifications")
            .insert({
                user_id: updatedProject.student_id,
                project_id: updatedProject.id,
                message: notificationMessage,
                type: "project_needs_details"
            });


        if (notificationError) {

            console.error(
                "Notification creation error:",
                notificationError
            );

            alert(
                "Project status was updated, " +
                "but the student notification could not be created."
            );

        } else {

            console.log(
                "Student notification created successfully."
            );

        }

    }


    // ========================================
    // Reload Projects
    // ========================================

    await loadProjects();

});