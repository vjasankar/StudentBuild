const projectForm = document.getElementById("projectForm");
const projectMessage = document.getElementById("projectMessage");
const logoutBtn = document.getElementById("logoutBtn");


// Check whether the student is logged in
async function checkUser() {

    const {
        data: { user },
        error
    } = await supabaseClient.auth.getUser();


    if (error || !user) {

        window.location.href = "login.html";

        return null;
    }


    document.body.style.visibility = "visible";

    return user;
}


// Submit project
projectForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    const submitBtn = projectForm.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    projectMessage.textContent = "Submitting your project...";
    projectMessage.className = "auth-message loading";


    // Get logged-in student
    const user = await checkUser();

    if (!user) {
        if (submitBtn) submitBtn.disabled = false;
        return;
    }


    // Get form values
    const title =
        document.getElementById("title").value.trim();

    const description =
        document.getElementById("description").value.trim();

    const department =
        document.getElementById("department").value;

    const domain =
        document.getElementById("domain").value;

    const projectType =
        document.getElementById("projectType").value;

    const budget =
        document.getElementById("budget").value || null;

    const deadline =
        document.getElementById("deadline").value || null;


    // Insert into Supabase
    const { data, error } = await supabaseClient
        .from("projects")
        .insert([
            {
                student_id: user.id,
                title: title,
                description: description,
                department: department,
                domain: domain,
                project_type: projectType,
                budget_range: budget,
                deadline: deadline
            }
        ])
        .select()
        .single();


    // Handle error
    if (error) {

        console.error("Project submission error:", error);

        projectMessage.textContent =
            "Unable to submit project: " + error.message;

        projectMessage.className = "auth-message error";
        if (submitBtn) submitBtn.disabled = false;

        return;
    }


    // Success
    console.log("Project created:", data);

    projectMessage.textContent =
        "Project submitted successfully! Redirecting...";

    projectMessage.className = "auth-message success";


    // Redirect to dashboard
    setTimeout(() => {

        window.location.href = "dashboard.html";

    }, 1200);

});


// Logout
logoutBtn.addEventListener("click", async () => {

    const { error } =
        await supabaseClient.auth.signOut();


    if (error) {

        console.error("Logout error:", error);

        return;
    }


    window.location.href = "login.html";

});


// Check authentication when page loads
checkUser();