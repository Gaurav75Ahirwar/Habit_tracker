document.addEventListener("DOMContentLoaded", () => {
    // Get the Theme-toggle button 
    const toggleBtn = document.getElementById("theme-toggle");

    // Function for toggle theme 
    function setIcon() {
        if (document.body.classList.contains("dark-mode")) {
            toggleBtn.innerHTML = '<i data-lucide="sun"></i>';
        } else {
            toggleBtn.innerHTML = '<i data-lucide="moon"></i>';
        }
        lucide.createIcons();
    }

    // Load the saved theme
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
    }

    setIcon();

    // Change Theme on click 
    toggleBtn.addEventListener("click", () => {
        toggleBtn.classList.add("fade");

        setTimeout(() => {
            document.body.classList.toggle("dark-mode");

            if (document.body.classList.contains("dark-mode")) {
                localStorage.setItem("theme", "dark");
            } else {
                localStorage.setItem("theme", "light");
            }

            setIcon();
            toggleBtn.classList.remove("fade");

        }, 175);
    });


    // Task description toggle button 
    document.querySelectorAll(".toggle-desc").forEach(button => {
        button.addEventListener("click", () => {

            const description = button.closest(".task-item").querySelector(".task-description");

            description.classList.toggle("show");

            button.classList.toggle("open");
        });
    });

    //Add Task Form
    //Modal Elements
    const addTaskBtn = document.getElementById("add-task-btn");
    const modal = document.getElementById("task-modal");
    const cancelbtn = document.getElementById("cancel-task-btn");

    //Open Modal
    addTaskBtn.addEventListener("click", () => {
        modal.classList.add("show");
        document.body.style.overflow = "hidden";
    });

    // Auto Focus on input 
    addTaskBtn.addEventListener("click", () => {
        modal.classList.add("show");
        document.body.style.overflow = "hidden";
        document.getElementById("task-title-input").focus();
    })

    //Close Modal
    cancelbtn.addEventListener("click", () => {
        taskForm.reset(); //Clears the previous inputs
        modal.classList.remove("show");
        document.body.style.overflow = "auto";
    });

    //Close When clicking outside
    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            taskForm.reset();
            modal.classList.remove("show");
            document.body.style.overflow = "auto"; //Prevent background scroling
        }
    });

    // Render & save the Tasks 
    const taskForm = document.getElementById("task-form");
    const taskList = document.querySelector(".task-list");
    const emptyMessage = document.getElementById("empty-msg");

    // Load tasks on page start
    function loadTasks() {
        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];

        if (tasks.length === 0) {
            emptyMessage.style.display = "block";
            return;
        }

        emptyMessage.style.display = "none";

        tasks.forEach(task => {
            renderTask(task.title, task.description);
        });
    }

    // Render Task on screen
    function renderTask(title, description) {
        const li = document.createElement("li");

        li.className = "task-item";

        li.innerHTML = `
            <div class="task-content">

                <input type="checkbox" class="task-checkbox">

                <span class="task-title">
                    ${title}
                </span>
                <button class="toggle-desc">
                    <i data-lucide="chevron-right"></i>
                </button>

            </div>
            <div class="task-description">
                ${description}
            </div>
         `;
        taskList.appendChild(li);
        lucide.createIcons();

        //  Toggle Description 
        const toggleDescBtn = li.querySelector(".toggle-desc");
        toggleDescBtn.addEventListener("click", () => {
            const desc = li.querySelector(".task-description");
            desc.classList.toggle("show");
            toggleDescBtn.classList.toggle("open");
        });
    }

    // Save Task 
    taskForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const title = document.getElementById("task-title-input").value;
        const description = document.getElementById("task-desc-input").value;

        const newTask = { title, description };
        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        tasks.push(newTask);

        localStorage.setItem(
            "tasks", JSON.stringify(tasks)
        );

        renderTask(title, description);
        emptyMessage.style.display = "none";
        taskForm.reset();
        modal.classList.remove("show");
        document.body.style.overflow = "auto";
    });
    document.addEventListener("keydown", (e) => {

        if (e.key === "Escape") {
            // Escaoe to exit form 
            if (modal.classList.contains("show")) {
                taskForm.reset();
                modal.classList.remove("show");
                document.body.style.overflow = "auto";
            }

            if (editModal.classList.contains("show")) {
                editModal.classList.remove("show");
                document.body.style.overflow = "auto";
            }

        }
        // Enter to push the entry 
        if (modal.classList.contains("show")
            && e.key === "Enter") {

            if (
                e.target.tagName === "TEXTAREA"
                && !e.ctrlKey
            )
                return;

            e.preventDefault();
            taskForm.requestSubmit();

        }

    });

    loadTasks();

    // Edit Modal Variables
    const editModeBtn = document.getElementById("edit-task-mode-btn");
    const editModal = document.getElementById("edit-modal");
    const cancelEditBtn = document.getElementById("cancel-edit-btn");

    // Show Edit Modal 
    editModeBtn.addEventListener("click", () => {
        editModal.classList.add("show");
        document.body.style.overflow = "hidden";
    });

    // Close Edit Modal 
    cancelEditBtn.addEventListener("click", () => {
        editModal.classList.remove("show");
        document.body.style.overflow = "auto";
    });
    // When clicking outside the edit modal 
    editModal.addEventListener("click", (e) => {
        if (e.target === editModal) {
            editModal.classList.remove("show");
            document.body.style.overflow = "auto";
        }
    });



});