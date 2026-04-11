document.addEventListener("DOMContentLoaded", () => {
    // Get the Theme-toggle button 
    const toggleBtn = document.getElementById("theme-toggle");

    // Function for toggle theme 
    function setIcon() {
        if (document.body.classList.contains("dark-mode")) {
            toggleBtn.innerHTML = '<i data-lucide="sun"></i>';
            toggleBtn.setAttribute("title", "Light Mode");
        } else {
            toggleBtn.innerHTML = '<i data-lucide="moon"></i>';
            toggleBtn.setAttribute("title", "Dark Mode");
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

        const existingTasks = taskList.querySelectorAll(".task-item");

        existingTasks.forEach(task => task.remove());

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

        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];

        if (editingTaskIndex !== null) {
            tasks[editingTaskIndex] = { title, description };

            editingTaskIndex = null;

            document.querySelector("#task-modal h2").textContent = "Add New Goal";

            document.getElementById("save-task-btn").textContent = "Save";
        }
        else {
            tasks.push({ title, description });
        }

        localStorage.setItem(
            "tasks", JSON.stringify(tasks)
        );

        taskList.innerHTML = "";
        loadTasks();

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
                && !e.shiftKey
            )
                return;

            e.preventDefault();
            taskForm.requestSubmit();

        }

    });

    loadTasks();

    let editingTaskIndex = null;


    // Edit Modal Variables
    const editModeBtn = document.getElementById("edit-task-mode-btn");
    const editModal = document.getElementById("edit-modal");
    const cancelEditBtn = document.getElementById("cancel-edit-btn");


    // Show Edit Modal 
    editModeBtn.addEventListener("click", () => {
        // Render the tasks in edit mode
        renderEditTasks();

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

    document.addEventListener("click", (e) => {
        const editBtn = e.target.closest(".edit-task-btn");

        if (!editBtn) return;

        const index = editBtn.dataset.index;
        startEditingTask(index);
    });

    function startEditingTask(index) {
        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        const task = tasks[index];

        if (!task) return;

        editingTaskIndex = index;

        document.getElementById("task-title-input").value = task.title;
        document.getElementById("task-desc-input").value = task.description;

        document.querySelector("#task-modal h2").textContent = "Edit Task";
        document.getElementById("save-task-btn").textContent = "Update";
        document.getElementById("edit-modal").classList.remove("show");
        document.getElementById("task-modal").classList.add("show");
        document.body.style.overflow = "hidden";
    }

    // Render the tasks in edit mode 
    function renderEditTasks() {
        const editList = document.querySelector(".edit-scroll-container");

        // From local storage 
        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];

        // Clear previous content 
        editList.innerHTML = "";

        // Empty fallback message 
        if (tasks.length === 0) {
            const emptyMsg = document.createElement("p");

            emptyMsg.className = "empty-msg";
            emptyMsg.textContent = "No Task Available to Edit";

            emptyMsg.style.display = "block";

            editList.appendChild(emptyMsg);

            return;
        }

        editList.innerHTML = `
        <div class="edit-header">

                    <button class="clear-all" title="Remove All Tasks">
                        <i data-lucide="trash"></i>
                    </button>

                </div>`;
        // Render Tasks if available 
        tasks.forEach((task, index) => {
            const li = document.createElement("li");

            li.className = "edit-task-items";

            li.innerHTML = `
                        <span class="edit-task-title">
                            <i data-lucide="dot"></i>
                            ${task.title}
                        </span>

                        <div class="edit-actions">

                            <button class="edit-task-btn" data-index="${index}" title="Edit Task">
                                <i data-lucide="pen"></i>
                            </button>

                            <button class="clear-task-btn" data-index="${index}" title="Remove Task">
                                <i data-lucide="trash"></i>
                            </button>

                        </div>
            `;
            editList.appendChild(li);

            // Re-render Icons 
            lucide.createIcons();

        });
    }

    // Delete Task on click 
    document.addEventListener("click", (e) => {
        const deleteBtn = e.target.closest(".clear-task-btn");

        if (!deleteBtn) return;

        const index = deleteBtn.dataset.index;

        deleteTask(index);
    });

    function deleteTask(index) {
        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];

        if (!confirm("Remove this task?")) return;

        tasks.splice(index, 1);

        localStorage.setItem("tasks", JSON.stringify(tasks));

        loadTasks();
        renderEditTasks();
    }

    // --Clear All Tasks 
    document.addEventListener("click", (e) => {
        const clearAllBtn = e.target.closest(".clear-all");

        if (!clearAllBtn) return;

        clearAllTasks();
    });

    function clearAllTasks() {
        if (!confirm("Remove all tasks?")) return;

        localStorage.removeItem("tasks");

        loadTasks();
        renderEditTasks();
    }


    // The progres card 

    // Progress Ring 
    const radius = 70;
    const circumference = 2 * Math.PI * radius;

    // 210deg 
    const arclength = circumference * (240 / 360);
    const track = document.querySelector(".ring-track");
    const progress = document.querySelector(".ring-progress");

    track.style.strokeDasharray = `${arclength} ${circumference}`;
    progress.style.strokeDasharray = `${arclength} ${circumference}`;

    // Progress Animation 
    function updateRing(percent) {
        const offset = arclength - (percent / 100) * arclength;

        progress.style.strokeDashoffset = offset;
    }


});