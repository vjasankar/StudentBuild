// ========================================
// StudentBuild Messages Page
// ========================================

let currentStudentUser = null;
let activeProjectId = null;
let activeProjectTitle = "";
let adminId = null;
let pageRealtimeChannel = null;
let isSendingMessage = false;


// ========================================
// Initialize Messages Page
// ========================================

async function initMessagesPage() {

    console.log("Messages page initializing...");

    const {
        data: { user },
        error: userError
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
        console.error("User authentication error:", userError);
        window.location.href = "login.html";
        return;
    }

    console.log("Current user:", user.id);

    // ========================================
    // Load Current Student Profile
    // ========================================

    const {
        data: profile,
        error: profileError
    } = await supabaseClient
        .from("profiles")
        .select(
            "full_name, email, phone, college, department, year, role"
        )
        .eq("id", user.id)
        .single();

    if (profileError || !profile) {

        console.error(
            "Profile error:",
            profileError
        );

        window.location.href = "login.html";
        return;
    }

    // ========================================
    // Redirect Admin
    // ========================================

    if (profile.role === "admin") {

        window.location.href =
            "admin-dashboard.html";

        return;
    }

    currentStudentUser = user;

    // ========================================
    // Header Profile
    // ========================================

    const name =
        profile.full_name || "Student";

    const userName =
        document.getElementById("userName");

    const userAvatarCircle =
        document.getElementById("userAvatarCircle");

    const userSubDetail =
        document.getElementById("userSubDetail");

    if (userName) {
        userName.textContent = name;
    }

    if (userAvatarCircle) {
        userAvatarCircle.textContent =
            name.charAt(0).toUpperCase();
    }

    if (userSubDetail) {

        const yrText =
            profile.year
                ? `${profile.year}th Year`
                : "Student";

        userSubDetail.textContent =
            profile.department
                ? `${yrText} · ${profile.department}`
                : yrText;
    }

    // ========================================
    // No Admin Profile Lookup
    // ========================================

    adminId = null;

    await loadProjectConversations();

    await loadNotifications(user.id);

    document.body.style.visibility = "visible";

    console.log("Messages page initialized successfully.");
}


// ========================================
// Load Student Projects
// ========================================

async function loadProjectConversations() {

    const listElem =
        document.getElementById(
            "projectConversationsList"
        );

    if (!listElem) {
        console.error(
            "projectConversationsList not found."
        );
        return;
    }

    const {
        data: projects,
        error
    } = await supabaseClient
        .from("projects")
        .select(
            "id, title, status, created_at"
        )
        .eq(
            "student_id",
            currentStudentUser.id
        )
        .order(
            "created_at",
            {
                ascending: false
            }
        );

    if (
        error ||
        !projects ||
        projects.length === 0
    ) {

        listElem.innerHTML = `
            <div
                class="widget-msg-item"
                style="cursor: default;"
            >
                <div class="msg-info">
                    <div class="msg-snippet">
                        No projects submitted yet.
                        Submit a project to start messaging.
                    </div>
                </div>
            </div>
        `;

        return;
    }

    listElem.innerHTML = "";

    projects.forEach(
        (proj, index) => {

            const div =
                document.createElement("div");

            div.className =
                "widget-msg-item";

            div.style.padding = "12px";

            div.style.borderRadius =
                "var(--radius-md)";

            div.style.border =
                "1px solid var(--border-subtle)";

            div.style.marginBottom =
                "8px";

            div.dataset.projectId =
                proj.id;

            div.innerHTML = `
                <div class="msg-avatar">
                    📄
                </div>

                <div class="msg-info">

                    <div class="msg-top-line">

                        <span
                            class="msg-sender"
                            style="font-size: 13.5px;"
                        >
                            ${escapeHtml(proj.title)}
                        </span>

                    </div>

                    <div
                        class="msg-snippet"
                        style="
                            font-size: 11.5px;
                            color: var(--accent-coral);
                        "
                    >
                        Status:
                        ${escapeHtml(
                proj.status || "In Review"
            )}
                    </div>

                </div>
            `;

            div.addEventListener(
                "click",
                async () => {

                    document
                        .querySelectorAll(
                            "#projectConversationsList .widget-msg-item"
                        )
                        .forEach(item => {

                            item.style.borderColor =
                                "var(--border-subtle)";

                            item.style.background =
                                "transparent";
                        });

                    div.style.borderColor =
                        "var(--border-coral)";

                    div.style.background =
                        "rgba(255, 107, 80, 0.08)";

                    await selectConversation(
                        proj.id,
                        proj.title
                    );
                }
            );

            listElem.appendChild(div);

            // Automatically select first project
            if (index === 0) {
                div.click();
            }
        }
    );
}


// ========================================
// Select Conversation
// ========================================

async function selectConversation(
    projectId,
    projectTitle
) {

    console.log(
        "Selecting project:",
        projectId,
        projectTitle
    );

    activeProjectId =
        projectId;

    activeProjectTitle =
        projectTitle;

    adminId = null;

    const titleHeader =
        document.getElementById(
            "activeProjectTitleHeader"
        );

    const subtitle =
        document.getElementById(
            "activeProjectSubtitle"
        );

    const input =
        document.getElementById(
            "pageMessageInput"
        );

    const sendButton =
        document.getElementById(
            "sendPageMessageBtn"
        );

    if (titleHeader) {
        titleHeader.textContent =
            `Technical Support: ${projectTitle}`;
    }

    if (subtitle) {
        subtitle.textContent =
            "Direct project channel with StudentBuild Technical Team";
    }

    if (input) {
        input.disabled = false;
    }

    if (sendButton) {
        sendButton.disabled = false;
    }

    await loadMessagesForProject(projectId);

    await markMessagesRead(projectId);

    // ========================================
    // Realtime Subscription
    // ========================================

    if (pageRealtimeChannel) {

        supabaseClient.removeChannel(
            pageRealtimeChannel
        );

        pageRealtimeChannel = null;
    }

    try {

        pageRealtimeChannel =
            supabaseClient
                .channel(
                    `page-chat-${projectId}`
                )
                .on(
                    "postgres_changes",
                    {
                        event: "INSERT",
                        schema: "public",
                        table: "messages",
                        filter:
                            `project_id=eq.${projectId}`
                    },
                    payload => {

                        const newMsg =
                            payload.new;

                        console.log(
                            "Realtime message received:",
                            newMsg
                        );

                        if (
                            newMsg.sender_id !==
                            currentStudentUser.id
                        ) {

                            adminId =
                                newMsg.sender_id;

                            console.log(
                                "Admin ID from realtime:",
                                adminId
                            );
                        }

                        appendMessageBubble(
                            newMsg
                        );

                        if (
                            newMsg.receiver_id ===
                            currentStudentUser.id
                        ) {

                            markMessagesRead(
                                projectId
                            );
                        }
                    }
                )
                .subscribe();

    } catch (rtErr) {

        console.warn(
            "Realtime subscription note:",
            rtErr
        );
    }
}


// ========================================
// Load Messages For Project
// ========================================

async function loadMessagesForProject(
    projectId
) {

    const container =
        document.getElementById(
            "pageMessagesContainer"
        );

    if (!container) {
        return;
    }

    container.innerHTML = `
        <div class="chat-empty-state">
            <p>Loading messages...</p>
        </div>
    `;

    const {
        data: messages,
        error
    } = await supabaseClient
        .from("messages")
        .select("*")
        .eq(
            "project_id",
            projectId
        )
        .order(
            "created_at",
            {
                ascending: true
            }
        );

    if (error) {

        console.error(
            "Error loading messages:",
            error
        );

        container.innerHTML = `
            <div class="chat-empty-state">
                <p>
                    Unable to load messages.
                </p>
            </div>
        `;

        return;
    }

    // ========================================
    // Find Admin From Existing Conversation
    // ========================================

    if (
        messages &&
        messages.length > 0
    ) {

        const adminMessage =
            messages.find(
                msg =>
                    msg.sender_id !==
                    currentStudentUser.id
            );

        if (adminMessage) {

            adminId =
                adminMessage.sender_id;

            console.log(
                "Admin ID found:",
                adminId
            );
        }
    }

    // ========================================
    // No Messages
    // ========================================

    if (
        !messages ||
        messages.length === 0
    ) {

        container.innerHTML = `
            <div class="chat-empty-state">

                <img
                    src="assets/illustrations/empty-messages.png"
                    alt="No Messages"
                    class="empty-state-img"
                    style="
                        max-width: 140px;
                        margin: 0 auto 12px;
                    "
                >

                <p>
                    No messages yet for
                    "${escapeHtml(activeProjectTitle)}".
                    Send your question below!
                </p>

            </div>
        `;

        return;
    }

    // ========================================
    // Render Messages
    // ========================================

    container.innerHTML = "";

    messages.forEach(msg => {

        renderMessageBubble(msg);

    });

    container.scrollTop =
        container.scrollHeight;
}


// ========================================
// Render Message Bubble
// ========================================

function renderMessageBubble(msg) {

    const container =
        document.getElementById(
            "pageMessagesContainer"
        );

    if (!container) {
        return;
    }

    const isSelf =
        msg.sender_id ===
        currentStudentUser.id;

    const bubble =
        document.createElement("div");

    bubble.className =
        `message-bubble ${isSelf
            ? "sent"
            : "received"
        }`;

    bubble.dataset.messageId =
        msg.id;

    const timeStr =
        msg.created_at
            ? new Date(
                msg.created_at
            ).toLocaleTimeString(
                [],
                {
                    hour: "2-digit",
                    minute: "2-digit"
                }
            )
            : "";

    bubble.innerHTML = `
        <div class="message-sender-tag">
            ${isSelf
            ? "You"
            : "Technical Support Admin"
        }
        </div>

        <div class="message-text">
            ${escapeHtml(msg.message)}
        </div>

        <div class="message-time">
            ${timeStr}
        </div>
    `;

    container.appendChild(
        bubble
    );

    container.scrollTop =
        container.scrollHeight;
}


// ========================================
// Append Realtime Message
// ========================================

function appendMessageBubble(msg) {

    const container =
        document.getElementById(
            "pageMessagesContainer"
        );

    if (!container) {
        return;
    }

    if (
        document.querySelector(
            `[data-message-id="${msg.id}"]`
        )
    ) {
        return;
    }

    const empty =
        container.querySelector(
            ".chat-empty-state"
        );

    if (empty) {
        container.innerHTML = "";
    }

    renderMessageBubble(msg);
}


// ========================================
// Mark Messages Read
// ========================================

async function markMessagesRead(
    projectId
) {

    try {

        await supabaseClient
            .from("messages")
            .update({
                is_read: true
            })
            .eq(
                "project_id",
                projectId
            )
            .eq(
                "receiver_id",
                currentStudentUser.id
            )
            .eq(
                "is_read",
                false
            );

    } catch (err) {

        console.error(
            "Mark read error:",
            err
        );
    }
}


// ========================================
// SEND MESSAGE
// ========================================

async function sendMessage() {

    console.log("========== SEND CLICKED ==========");

    if (isSendingMessage) {
        console.log("Already sending. Ignoring duplicate click.");
        return;
    }

    const input =
        document.getElementById(
            "pageMessageInput"
        );

    const sendBtn =
        document.getElementById(
            "sendPageMessageBtn"
        );

    console.log(
        "Input found:",
        !!input
    );

    console.log(
        "Button found:",
        !!sendBtn
    );

    console.log(
        "Active project:",
        activeProjectId
    );

    console.log(
        "Admin ID:",
        adminId
    );

    if (!input) {
        console.error(
            "pageMessageInput not found."
        );
        return;
    }

    if (!sendBtn) {
        console.error(
            "sendPageMessageBtn not found."
        );
        return;
    }

    const messageText =
        input.value.trim();

    console.log(
        "Message text:",
        messageText
    );

    if (!messageText) {
        console.log(
            "Message is empty."
        );
        return;
    }

    if (!activeProjectId) {

        alert(
            "Please select a project first."
        );

        return;
    }

    // ========================================
    // Admin ID
    // ========================================

    if (!adminId) {

        console.warn(
            "No admin ID available."
        );

        alert(
            "Technical admin contact is currently unavailable for this project."
        );

        return;
    }

    isSendingMessage = true;

    sendBtn.disabled = true;
    input.disabled = true;

    try {

        console.log(
            "Sending message to:",
            adminId
        );

        // ========================================
        // Insert Message
        // ========================================

        const {
            data: newMsgs,
            error
        } = await supabaseClient
            .from("messages")
            .insert({
                project_id:
                    activeProjectId,

                sender_id:
                    currentStudentUser.id,

                receiver_id:
                    adminId,

                message:
                    messageText,

                is_read:
                    false
            })
            .select();

        console.log(
            "Supabase insert response:",
            {
                newMsgs,
                error
            }
        );

        if (error) {

            console.error(
                "Message insert error:",
                error
            );

            alert(
                "Error sending message: " +
                error.message
            );

            return;
        }

        // ========================================
        // Add Message To UI
        // ========================================

        const newMsg =
            newMsgs &&
                newMsgs.length > 0
                ? newMsgs[0]
                : null;

        if (newMsg) {

            console.log(
                "Message successfully inserted:",
                newMsg
            );

            input.value = "";

            appendMessageBubble(
                newMsg
            );

        } else {

            console.warn(
                "Message inserted but no returned row."
            );
        }

        // ========================================
        // Admin Notification
        // ========================================

        if (adminId) {
        }

    } catch (err) {

        console.error(
            "Send message exception:",
            err
        );

        alert(
            "Something went wrong while sending the message."
        );

    } finally {

        isSendingMessage = false;

        sendBtn.disabled = false;
        input.disabled = false;

        input.focus();

        console.log(
            "========== SEND FINISHED =========="
        );
    }
}


// ========================================
// FORM SUBMIT HANDLER
// ========================================

const pageMessageForm =
    document.getElementById(
        "pageMessageForm"
    );

if (pageMessageForm) {

    pageMessageForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            console.log(
                "FORM SUBMIT EVENT FIRED"
            );

            await sendMessage();
        }
    );

} else {

    console.error(
        "pageMessageForm NOT FOUND"
    );
}


// ========================================
// DIRECT BUTTON CLICK HANDLER
// ========================================

const sendPageMessageBtn =
    document.getElementById(
        "sendPageMessageBtn"
    );

if (sendPageMessageBtn) {

    sendPageMessageBtn.addEventListener(
        "click",
        async event => {

            console.log(
                "SEND BUTTON CLICK EVENT FIRED"
            );

            event.preventDefault();

            await sendMessage();
        }
    );

} else {

    console.error(
        "sendPageMessageBtn NOT FOUND"
    );
}


// ========================================
// Escape HTML
// ========================================

function escapeHtml(value) {

    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}


// ========================================
// Notifications Loader
// ========================================

async function loadNotifications(
    userId
) {

    const notificationArea =
        document.getElementById(
            "notificationArea"
        );

    if (!notificationArea) {
        return;
    }

    const {
        data: notifications,
        error
    } = await supabaseClient
        .from("notifications")
        .select("*")
        .eq(
            "user_id",
            userId
        )
        .eq(
            "is_read",
            false
        )
        .order(
            "created_at",
            {
                ascending: false
            }
        );

    if (error) {

        console.warn(
            "Notification loading note:",
            error.message
        );
    }

    const count =
        notifications
            ? notifications.length
            : 0;

    notificationArea.innerHTML = `
        <div class="notification-wrapper">

            <button
                id="notificationButton"
                class="notification-button"
            >
                🔔

                ${count > 0
            ? `
                            <span class="notification-badge">
                                ${count}
                            </span>
                        `
            : ""
        }

            </button>

            <div
                id="notificationDropdown"
                class="notification-dropdown"
            >

                ${count === 0

            ? `
                            <div class="no-notifications">
                                <p>
                                    No new notifications
                                </p>
                            </div>
                        `

            : `
                            <div
                                class="notification-dropdown-header"
                            >
                                <strong>
                                    Notifications
                                </strong>

                                <span>
                                    ${count} new
                                </span>
                            </div>

                            ${notifications
                .map(
                    n =>
                        `
                                            <div
                                                class="notification-item"
                                            >
                                                <div
                                                    class="notification-content"
                                                >
                                                    <div
                                                        class="notification-message"
                                                    >
                                                        ${escapeHtml(
                            n.message
                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            `
                )
                .join("")
            }
                        `
        }

            </div>

        </div>
    `;

    const notificationButton =
        document.getElementById(
            "notificationButton"
        );

    const notificationDropdown =
        document.getElementById(
            "notificationDropdown"
        );

    if (
        notificationButton &&
        notificationDropdown
    ) {

        notificationButton.addEventListener(
            "click",
            e => {

                e.stopPropagation();

                notificationDropdown.classList.toggle(
                    "show"
                );
            }
        );
    }
}


// ========================================
// Logout
// ========================================

async function handleLogout() {

    await supabaseClient.auth.signOut();

    window.location.href =
        "login.html";
}


const logoutBtn =
    document.getElementById(
        "logoutBtn"
    );

if (logoutBtn) {

    logoutBtn.addEventListener(
        "click",
        handleLogout
    );
}


const dropdownLogoutBtn =
    document.getElementById(
        "dropdownLogoutBtn"
    );

if (dropdownLogoutBtn) {

    dropdownLogoutBtn.addEventListener(
        "click",
        handleLogout
    );
}


const sidebarLogoutLink =
    document.getElementById(
        "sidebarLogoutLink"
    );

if (sidebarLogoutLink) {

    sidebarLogoutLink.addEventListener(
        "click",
        handleLogout
    );
}


// ========================================
// Mobile Sidebar Toggle
// ========================================

const mobileToggleBtn =
    document.getElementById(
        "mobileToggleBtn"
    );

const appSidebar =
    document.getElementById(
        "appSidebar"
    );

if (
    mobileToggleBtn &&
    appSidebar
) {

    mobileToggleBtn.addEventListener(
        "click",
        () => {

            appSidebar.classList.toggle(
                "show-mobile"
            );
        }
    );
}


// ========================================
// Profile Dropdown
// ========================================

const headerProfileDropdownToggle =
    document.getElementById(
        "headerProfileDropdownToggle"
    );

const profileDropdownMenu =
    document.getElementById(
        "profileDropdownMenu"
    );

if (
    headerProfileDropdownToggle &&
    profileDropdownMenu
) {

    headerProfileDropdownToggle.addEventListener(
        "click",
        e => {

            e.stopPropagation();

            profileDropdownMenu.classList.toggle(
                "show"
            );
        }
    );

    document.addEventListener(
        "click",
        () => {

            profileDropdownMenu.classList.remove(
                "show"
            );
        }
    );
}


// ========================================
// Start Messages Page
// ========================================

initMessagesPage();