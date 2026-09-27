# StudentBuild

### Your Project. Our Technical Support.

StudentBuild is a technical project support platform designed to help students transform their project ideas into practical, working solutions.

Many students have innovative project ideas but may not have sufficient technical knowledge or experience to implement them. StudentBuild provides a structured platform where students can submit their project requirements, communicate with technical support, and track the status of their project requests.

---

## 🚀 Overview

StudentBuild connects students who need technical assistance with a structured project-support workflow.

The current platform provides:

- Student registration and authentication
- Google OAuth login
- Student profile management
- Project submission
- Project status tracking
- Admin project review
- Accept / Reject / Request More Details workflow
- Student notifications
- Project-specific messaging
- My Projects section
- Profile management
- Help and Support section
- Responsive and premium user interface

The current version focuses on the core project submission, review, communication, and notification workflow.

---

## 🎯 Problem Statement

Engineering students often have project ideas but face difficulties with:

- Selecting appropriate technologies
- Understanding implementation requirements
- Designing project architecture
- Developing software components
- Integrating different technologies
- Testing and debugging projects
- Communicating technical requirements clearly

StudentBuild aims to provide a centralized platform where students can submit their project requirements and receive structured technical support.

---

## 💡 Proposed Solution

StudentBuild provides a simple and structured workflow:

```text
Student
   |
   v
Create Account
   |
   v
Complete Profile
   |
   v
Submit Project
   |
   v
Technical Review
   |
   +-------------------+
   |                   |
   v                   v
Accepted          More Details
   |                   |
   |                   v
   |              Student Responds
   |                   |
   +---------+---------+
             |
             v
      Communication
             |
             v
      Project Support
## ✨ Key Features

### 👨‍🎓 Student Features

#### Authentication

* Email and password registration
* Email and password login
* Google authentication
* Supabase authentication
* Automatic profile creation

#### Profile Management

Students can manage:

* Full Name
* Email
* Phone Number
* College
* Department
* Year

#### Project Submission

Students can submit project details including:

* Project Title
* Project Description
* Department
* Domain
* Project Type
* Budget Range
* Expected Deadline

#### Project Tracking

Students can view their submitted projects and their current status:

* Submitted
* Accepted
* Rejected
* Needs Details

#### Notifications

Students receive notifications when action is required on their projects.

For example:

> More details are required for your project.

#### Project Messaging

Students can communicate with the administrator through project-specific messaging.

This allows technical requirements, clarifications, and project-related discussions to be handled within the platform.

---

## 🛠️ Admin Features

Administrators have a dedicated dashboard for managing submitted projects.

Admin can:

* View all submitted projects
* View student information
* Review project descriptions
* Accept projects
* Reject projects
* Request additional details
* Communicate with students
* Send project-related notifications

---

## 🔄 Project Review Workflow

```text
                  +---------------------+
                  |  Student Submits    |
                  |      Project        |
                  +----------+----------+
                             |
                             v
                  +---------------------+
                  |   Admin Reviews     |
                  |      Project        |
                  +----------+----------+
                             |
             +---------------+---------------+
             |               |               |
             v               v               v
       +-----------+   +-----------+   +-------------+
       | Accepted  |   | Rejected  |   | Need Details|
       +-----------+   +-----------+   +------+------+
                                             |
                                             v
                                    +----------------+
                                    |  Notification  |
                                    +-------+--------+
                                            |
                                            v
                                    +----------------+
                                    | Student Update |
                                    +-------+--------+
                                            |
                                            v
                                    +----------------+
                                    | Communication  |
                                    +----------------+
```

---

## 🏗️ System Architecture

```text
+-----------------------------+
|           Student           |
|       Web Application       |
+--------------+--------------+
               |
               v
+-----------------------------+
|        HTML / CSS / JS      |
|        Frontend Layer       |
+--------------+--------------+
               |
               v
+-----------------------------+
|       Supabase Client       |
|      Authentication + API   |
+--------------+--------------+
               |
        +------+------+
        |             |
        v             v
+-------------+  +--------------+
|  Supabase   |  |   Supabase   |
|    Auth     |  |  PostgreSQL  |
+-------------+  +--------------+
                       |
              +--------+--------+
              |        |        |
              v        v        v
          Profiles  Projects  Messages
                                |
                                v
                          Notifications
```

---

## 🧰 Technology Stack

### Frontend

* HTML5
* CSS3
* JavaScript
* Responsive Web Design

### Backend and Database

* Supabase
* PostgreSQL
* Supabase Authentication
* Row Level Security (RLS)

### Authentication

* Email / Password Authentication
* Google OAuth

### Development and Deployment

* Git
* GitHub
* Vercel

---

## 📁 Project Structure

```text
StudentBuild/
|
|-- index.html
|-- login.html
|-- signup.html
|-- dashboard.html
|-- submit-project.html
|-- admin-dashboard.html
|-- complete-profile.html
|-- messages.html
|-- my-projects.html
|-- notifications.html
|-- profile.html
|-- help-support.html
|
|-- style.css
|
|-- script.js
|-- signup.js
|-- login.js
|-- dashboard.js
|-- submit-project.js
|-- admin-dashboard.js
|-- complete-profile.js
|-- messages.js
|-- my-projects.js
|-- notifications.js
|-- profile.js
|
|-- supabase-config.js
|
|-- assets/
|   |
|   |-- backgrounds/
|   |   |-- bg-texture.png
|   |   |-- corner-accent.png
|   |   |-- dashboard-glow.png
|   |   |-- gold-glow.png
|   |   |-- hero-background.png
|   |   |-- particles-overlay.png
|   |   |-- purple-glow.png
|   |   |-- section-wave.png
|   |   `-- star-line.png
|   |
|   `-- logo/
|       |-- favicon.png
|       |-- studentbuild-horizontal.png
|       `-- studentbuild-mark.png
|
`-- README.md
```

---

## 🗄️ Database Design

StudentBuild uses Supabase PostgreSQL as its database.

### Profiles

Stores student and administrator profile information.

```text
profiles
|
|-- id
|-- full_name
|-- email
|-- phone
|-- college
|-- department
|-- year
|-- role
`-- created_at
```

### Projects

Stores student project submissions.

```text
projects
|
|-- id
|-- student_id
|-- title
|-- description
|-- department
|-- domain
|-- project_type
|-- budget_range
|-- deadline
|-- status
`-- created_at
```

### Project Requirements

Stores additional requirements related to projects.

```text
project_requirements
|
|-- id
|-- project_id
|-- requirement
`-- created_at
```

### Messages

Stores project-specific communication between students and administrators.

```text
messages
|
|-- id
|-- project_id
|-- sender_id
|-- receiver_id
|-- message
|-- is_read
`-- created_at
```

### Notifications

Stores project-related notifications.

```text
notifications
|
|-- id
|-- user_id
|-- project_id
|-- message
|-- type
|-- is_read
`-- created_at
```

---

## 🔐 Security

StudentBuild uses Supabase Row Level Security (RLS) to control access to application data.

Security measures include:

* Students can access their own projects.
* Students can create their own projects.
* Students cannot directly modify project status.
* Administrators can review and update projects.
* Users can access their own notifications.
* Project messages are restricted to the involved users.
* User roles are protected at the database level.

Sensitive credentials such as service-role keys, OAuth secrets, and private API keys should never be exposed in frontend source code or committed to GitHub.

---

## 🎨 UI and Design

StudentBuild uses a premium dark interface designed around:

* Black backgrounds
* Gold accents
* White typography
* Subtle purple highlights
* Emerald success indicators
* Ruby error indicators
* Amber warning indicators

The interface is designed to provide a modern SaaS-style experience while keeping the application simple and easy to navigate.

---

## 🔑 Authentication Flow

### Email and Password

```text
Student
   |
   v
Signup
   |
   v
Supabase Authentication
   |
   v
Profile Created
   |
   v
Student Dashboard
```

### Google OAuth

```text
Student
   |
   v
Google Login
   |
   v
Supabase Authentication
   |
   v
Profile Creation
   |
   v
Complete Profile
   |
   v
Student Dashboard
```

---

## 📊 Project Status System

StudentBuild currently supports four project states:

| Status          | Description                                          |
| --------------- | ---------------------------------------------------- |
| `submitted`     | Project has been submitted and is waiting for review |
| `accepted`      | Project has been accepted by the administrator       |
| `rejected`      | Project has been rejected                            |
| `needs_details` | Additional project information is required           |

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/vjasankar/StudentBuild.git
```

### 2. Navigate to the Project

```bash
cd StudentBuild
```

### 3. Configure Supabase

Create a Supabase project and configure:

* Authentication
* Google OAuth
* PostgreSQL tables
* Row Level Security policies
* Required database triggers and functions

Configure the frontend with the appropriate Supabase project URL and public client key.

> Never use a Supabase service-role key in frontend code.

### 4. Run Locally

StudentBuild is a frontend web application and can be run using a local development server.

For example, using VS Code Live Server:

```text
http://127.0.0.1:5500
```

Open:

```text
index.html
```

---

## 🌐 Deployment

StudentBuild can be deployed using platforms such as Vercel.

The general deployment workflow is:

```text
Local Development
       |
       v
      Git
       |
       v
    GitHub
       |
       v
     Vercel
       |
       v
 Live StudentBuild
```

---

## 🧪 Testing Checklist

### Student

* [ ] Signup
* [ ] Login
* [ ] Google Login
* [ ] Complete Profile
* [ ] Dashboard
* [ ] Submit Project
* [ ] View My Projects
* [ ] View Project Status
* [ ] Receive Notifications
* [ ] Send Messages
* [ ] Receive Messages
* [ ] Update Profile
* [ ] Logout

### Administrator

* [ ] Admin Login
* [ ] Admin Dashboard
* [ ] View Projects
* [ ] View Student Details
* [ ] Accept Project
* [ ] Reject Project
* [ ] Request More Details
* [ ] Send Messages
* [ ] Receive Messages

---

## 🛣️ Future Enhancements

The current version focuses on the core project submission, review, notification, and communication workflow.

Future versions may include:

* Project quotation system
* Online payment integration
* Development lifecycle tracking
* Project milestones
* File and document uploads
* Advanced project requirement management
* Automated email notifications
* Admin analytics dashboard
* Student feedback and ratings
* Technical team assignment
* Project progress tracking
* AI-assisted project requirement analysis
* Automated project recommendations
* Production-ready notification services

---

## 📌 Current Version

### Version 1.0

The current StudentBuild version provides:

```text
Authentication
      +
Student Profiles
      +
Project Submission
      +
Admin Review
      +
Project Status
      +
Notifications
      +
Project Messaging
```

---

## 🤝 Contributing

Contributions are welcome.

To contribute:

1. Fork the repository.
2. Create a new branch.

```bash
git checkout -b feature/your-feature
```

3. Make your changes.
4. Test the application.
5. Commit your changes.

```bash
git commit -m "Add your feature"
```

6. Push the branch.

```bash
git push origin feature/your-feature
```

7. Open a Pull Request.

---

## 📄 License

This project is currently maintained as a StudentBuild project.

License information can be added when the project is released under a specific open-source or proprietary license.

---

## 👨‍💻 Project

# StudentBuild By Vijayasankar.C

### Your Project. Our Technical Support.

Built to help students transform project ideas into practical technical solutions.

---

⭐ If you find StudentBuild interesting, consider giving the repository a star.

GitHub Repository:

[https://github.com/vjasankar/StudentBuild](https://github.com/vjasankar/StudentBuild)

```
```
