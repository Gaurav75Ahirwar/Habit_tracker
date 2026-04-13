document.addEventListener("DOMContentLoaded", () => {

    // ═══════════════════════════════════════════════════════════════════════════
    //  THEME TOGGLE
    // ═══════════════════════════════════════════════════════════════════════════

    const toggleBtn = document.getElementById("theme-toggle");

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

    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
    }

    setIcon();

    toggleBtn.addEventListener("click", () => {
        toggleBtn.classList.add("fade");
        setTimeout(() => {
            document.body.classList.toggle("dark-mode");
            localStorage.setItem("theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
            setIcon();
            toggleBtn.classList.remove("fade");
        }, 175);
    });


    // ═══════════════════════════════════════════════════════════════════════════
    //  PROGRESS RING
    //  All ring code is at the top so updateProductivity() (defined below) can
    //  safely call updateRing() without any forward-reference issues.
    // ═══════════════════════════════════════════════════════════════════════════

    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    // 240° arc — the visible portion of the ring
    const arcLength = circumference * (240 / 360);

    const trackEl = document.querySelector(".ring-track");
    const progressEl = document.querySelector(".ring-progress");

    // Stamp the 240° dasharray on both circles so only that arc is visible
    trackEl.style.strokeDasharray = `${arcLength} ${circumference}`;
    progressEl.style.strokeDasharray = `${arcLength} ${circumference}`;
    // Begin fully empty (dashoffset = full arc length → nothing painted)
    progressEl.style.strokeDashoffset = arcLength;

    // ── SVG gradient ─────────────────────────────────────────────────────────

    function createGradient() {
        const svg = document.querySelector(".progress-ring");
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

        const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
        gradient.setAttribute("id", "ringGradient");
        // Diagonal direction gives a visual sweep feel as the arc fills
        gradient.setAttribute("x1", "0%");
        gradient.setAttribute("y1", "100%");
        gradient.setAttribute("x2", "100%");
        gradient.setAttribute("y2", "0%");

        // Dim tail (start of arc) → bright head (current progress point)
        const stopTail = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stopTail.setAttribute("offset", "0%");
        stopTail.setAttribute("stop-opacity", "0.45");

        const stopHead = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stopHead.setAttribute("offset", "100%");
        stopHead.setAttribute("stop-opacity", "1");

        gradient.appendChild(stopTail);
        gradient.appendChild(stopHead);
        defs.appendChild(gradient);
        svg.appendChild(defs);

        // Point the progress circle's stroke at this gradient
        progressEl.setAttribute("stroke", "url(#ringGradient)");
    }

    // Resolve a CSS custom property to its actual colour string
    function resolveCSSVar(varName) {
        return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    }

    // Swap the gradient colour based on completion tier
    function updateRingGradient(percent) {
        const stops = document.querySelectorAll("#ringGradient stop");
        if (!stops.length) return;

        let color;
        if (percent < 40) color = resolveCSSVar("--ring-low");
        else if (percent < 70) color = resolveCSSVar("--ring-medium");
        else color = resolveCSSVar("--ring-high");

        stops[0].setAttribute("stop-color", color);
        stops[1].setAttribute("stop-color", color);
    }

    // ── Smooth ring sweep ─────────────────────────────────────────────────────

    let currentOffset = arcLength; // tracks the live dashoffset value
    let animationID = null;

    function animateRingTo(targetOffset) {
        if (animationID) cancelAnimationFrame(animationID);

        const startOffset = currentOffset;
        const delta = targetOffset - startOffset;
        const duration = 600; // ms
        const startTime = performance.now();

        function step(now) {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            // Cubic ease-in-out
            const eased = t < 0.5
                ? 4 * t * t * t
                : 1 - Math.pow(-2 * t + 2, 3) / 2;

            currentOffset = startOffset + delta * eased;
            progressEl.style.strokeDashoffset = currentOffset;

            if (t < 1) {
                animationID = requestAnimationFrame(step);
            } else {
                currentOffset = targetOffset; // land exactly on target
                animationID = null;
            }
        }

        animationID = requestAnimationFrame(step);
    }

    //        to animateRingTo(). Now correctly passes the computed value.
    function updateRing(percent) {
        const targetOffset = arcLength * (1 - percent / 100);
        animateRingTo(targetOffset);
    }

    // ── Smooth stat counters ──────────────────────────────────────────────────

    // Remembers the last displayed value so mid-animation interruptions start
    // from the correct position rather than jumping back to 0.
    const counterState = {};

    function animateCounter(elementId, targetValue) {
        const el = document.getElementById(elementId);
        if (!el) return;

        const startValue = counterState[elementId] ?? 0;
        counterState[elementId] = targetValue;
        if (startValue === targetValue) return;

        const duration = 500;
        const startTime = performance.now();

        function step(now) {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic

            const current = Math.round(startValue + (targetValue - startValue) * eased);
            el.textContent = (elementId === "productivity-percent")
                ? current + "%"
                : current;

            if (t < 1) requestAnimationFrame(step);
        }

        requestAnimationFrame(step);
    }

    // Initialise the gradient once on load
    createGradient();


    // ═══════════════════════════════════════════════════════════════════════════
    //  TIME BAR
    //
    //  The bar represents the full 24-hour day (00:00 → 23:59).
    //  • A fill div (.time-bar-fill) grows from left to right as time passes,
    //    coloured with --productivity-card-pri.
    //  • Every time a checkbox is CHECKED (not unchecked) a thin stamp line
    //    (.time-stamp) appears at the corresponding time position.
    //  • Stamps are persisted in localStorage under "time-stamps" so they
    //    survive page reloads.  They are cleared automatically when the day
    //    changes (date mismatch vs saved date).
    // ═══════════════════════════════════════════════════════════════════════════

    const timeBarEl = document.getElementById("time-bar");

    //          so the bar is fully driven by JS from this point onward.
    timeBarEl.querySelectorAll(".time-stamp").forEach(s => s.remove());

    // Inject the fill element that represents elapsed time.
    //        It must sit BELOW the stamps in the DOM so stamps render on top.
    const timeBarFill = document.createElement("div");
    timeBarFill.className = "time-bar-fill";
    // Insert as the first child so stamps appended later render above it
    timeBarEl.insertBefore(timeBarFill, timeBarEl.firstChild);

    /**
     * Returns the fraction of the current day elapsed, in the range [0, 1].
     * Midnight → 0, 23:59:59 → ≈ 1.
     */
    function getDayFraction() {
        const now = new Date();
        const seconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
        return seconds / 86400; // 86400 s in a day
    }

    /**
     * Grows the fill bar to reflect how far through the day we are.
     * Called on page load, then every 60 seconds automatically.
     */
    function updateTimeBarFill() {
        const pct = getDayFraction() * 100;
        timeBarFill.style.width = pct.toFixed(3) + "%";
    }

    updateTimeBarFill();
    // Refresh every 60 seconds so the fill tracks real time
    setInterval(updateTimeBarFill, 60_000);

    // ── Stamp helpers ─────────────────────────────────────────────────────────

    /**
     * Draws a single stamp DOM element inside the time bar.
     * @param {string} left  - CSS left percentage, e.g. "47.230%"
     * @param {string} title - Tooltip shown on hover, e.g. "Buy groceries — 14:32"
     */
    function renderStamp(left, title) {
        const stamp = document.createElement("div");
        stamp.className = "time-stamp";
        stamp.style.left = left;
        stamp.title = title;
        timeBarEl.appendChild(stamp);
    }

    /**
     * Loads all saved stamps from localStorage and re-draws them.
     * Also clears stale stamps from a previous day.
     */
    function loadStamps() {
        // Remove existing stamp elements before re-drawing
        timeBarEl.querySelectorAll(".time-stamp").forEach(s => s.remove());

        const today = new Date().toDateString();
        const savedDate = localStorage.getItem("time-stamps-date");

        // If the saved stamps are from a previous day, wipe them
        if (savedDate && savedDate !== today) {
            localStorage.removeItem("time-stamps");
            localStorage.setItem("time-stamps-date", today);
            return; // nothing to draw
        }

        const stamps = JSON.parse(localStorage.getItem("time-stamps")) || [];
        stamps.forEach(({ left, title }) => renderStamp(left, title));
    }

    /**
     * Records a new stamp at the current time, saves it, and draws it.
     * @param {string} taskTitle - The title of the task that was just checked
     */
    function addStamp(taskTitle) {
        const now = new Date();
        const left = (getDayFraction() * 100).toFixed(3) + "%";
        const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const title = `${taskTitle} — ${timeStr}`;

        // Persist stamp + today's date key
        const stamps = JSON.parse(localStorage.getItem("time-stamps")) || [];
        stamps.push({ left, title });
        localStorage.setItem("time-stamps", JSON.stringify(stamps));
        localStorage.setItem("time-stamps-date", now.toDateString());

        // Draw immediately — no need to reload all stamps
        renderStamp(left, title);
    }

    // Draw any stamps from the current session on page load
    loadStamps();


    // ═══════════════════════════════════════════════════════════════════════════
    //  PRODUCTIVITY CONTROLLER
    //  Must be defined before loadTasks() / the initial call at the bottom.
    // ═══════════════════════════════════════════════════════════════════════════

    function updateProductivity() {
        const allBoxes = document.querySelectorAll(".task-checkbox");
        const total = allBoxes.length;
        const completed = document.querySelectorAll(".task-checkbox:checked").length;
        const remaining = total - completed;
        const percent = total ? Math.round((completed / total) * 100) : 0;

        updateRing(percent);
        updateRingGradient(percent);
        animateCounter("completed-count", completed);
        animateCounter("remaining-count", remaining);
        animateCounter("productivity-percent", percent);
    }

    // Single delegated listener covers all dynamically rendered checkboxes
    document.addEventListener("change", (e) => {
        if (!e.target.classList.contains("task-checkbox")) return;

        updateProductivity();

        // Stamp the time bar only when checking (not unchecking) a task
        if (e.target.checked) {
            const taskItem = e.target.closest(".task-item");
            const rawTitle = taskItem?.querySelector(".task-title")?.textContent ?? "Task";
            addStamp(rawTitle.trim());
        }
    });


    // ═══════════════════════════════════════════════════════════════════════════
    //  TASK LIST
    // ═══════════════════════════════════════════════════════════════════════════

    const taskForm = document.getElementById("task-form");
    const taskList = document.querySelector(".task-list");
    const emptyMessage = document.getElementById("empty-msg");

    function loadTasks() {
        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];

        // Only remove task-item elements; leave the empty-msg paragraph in place
        taskList.querySelectorAll(".task-item").forEach(t => t.remove());

        if (tasks.length === 0) {
            emptyMessage.style.display = "block";
            return;
        }

        emptyMessage.style.display = "none";
        tasks.forEach(task => renderTask(task.title, task.description));
    }

    function renderTask(title, description) {
        const li = document.createElement("li");
        li.className = "task-item";
        li.innerHTML = `
            <div class="task-content">
                <input type="checkbox" class="task-checkbox">
                <span class="task-title">${title}</span>
                <button class="toggle-desc">
                    <i data-lucide="chevron-right"></i>
                </button>
            </div>
            <div class="task-description">${description}</div>
        `;
        taskList.appendChild(li);
        lucide.createIcons();

        li.querySelector(".toggle-desc").addEventListener("click", () => {
            li.querySelector(".task-description").classList.toggle("show");
            li.querySelector(".toggle-desc").classList.toggle("open");
        });
    }


    // ═══════════════════════════════════════════════════════════════════════════
    //  ADD / EDIT TASK MODAL
    // ═══════════════════════════════════════════════════════════════════════════

    const addTaskBtn = document.getElementById("add-task-btn");
    const modal = document.getElementById("task-modal");
    const cancelBtn = document.getElementById("cancel-task-btn");

    let editingTaskIndex = null;

    addTaskBtn.addEventListener("click", () => {
        modal.classList.add("show");
        document.body.style.overflow = "hidden";
        document.getElementById("task-title-input").focus();
    });

    cancelBtn.addEventListener("click", () => {
        taskForm.reset();
        modal.classList.remove("show");
        document.body.style.overflow = "auto";
    });

    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            taskForm.reset();
            modal.classList.remove("show");
            document.body.style.overflow = "auto";
        }
    });

    taskForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const title = document.getElementById("task-title-input").value.trim();
        const description = document.getElementById("task-desc-input").value.trim();
        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];

        if (editingTaskIndex !== null) {
            tasks[editingTaskIndex] = { title, description };
            editingTaskIndex = null;
            document.querySelector("#task-modal h2").textContent = "Add New Goal";
            document.getElementById("save-task-btn").textContent = "Save";
        } else {
            tasks.push({ title, description });
        }

        localStorage.setItem("tasks", JSON.stringify(tasks));
        loadTasks();
        updateProductivity();

        taskForm.reset();
        modal.classList.remove("show");
        document.body.style.overflow = "auto";
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
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
        if (modal.classList.contains("show") && e.key === "Enter") {
            if (e.target.tagName === "TEXTAREA" && !e.shiftKey) return;
            e.preventDefault();
            taskForm.requestSubmit();
        }
    });


    // ═══════════════════════════════════════════════════════════════════════════
    //  EDIT MODAL
    // ═══════════════════════════════════════════════════════════════════════════

    const editModeBtn = document.getElementById("edit-task-mode-btn");
    const editModal = document.getElementById("edit-modal");
    const cancelEditBtn = document.getElementById("cancel-edit-btn");

    editModeBtn.addEventListener("click", () => {
        renderEditTasks();
        editModal.classList.add("show");
        document.body.style.overflow = "hidden";
    });

    cancelEditBtn.addEventListener("click", () => {
        editModal.classList.remove("show");
        document.body.style.overflow = "auto";
    });

    editModal.addEventListener("click", (e) => {
        if (e.target === editModal) {
            editModal.classList.remove("show");
            document.body.style.overflow = "auto";
        }
    });

    function renderEditTasks() {
        const editList = document.querySelector(".edit-scroll-container");
        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        editList.innerHTML = "";

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
            lucide.createIcons();
        });
    }

    // Open the add/edit modal pre-filled
    document.addEventListener("click", (e) => {
        const editBtn = e.target.closest(".edit-task-btn");
        if (!editBtn) return;

        const index = parseInt(editBtn.dataset.index);
        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        const task = tasks[index];
        if (!task) return;

        editingTaskIndex = index;
        document.getElementById("task-title-input").value = task.title;
        document.getElementById("task-desc-input").value = task.description;
        document.querySelector("#task-modal h2").textContent = "Edit Task";
        document.getElementById("save-task-btn").textContent = "Update";
        editModal.classList.remove("show");
        modal.classList.add("show");
        document.body.style.overflow = "hidden";
    });

    // Delete a single task
    document.addEventListener("click", (e) => {
        const deleteBtn = e.target.closest(".clear-task-btn");
        if (!deleteBtn) return;

        const index = parseInt(deleteBtn.dataset.index);
        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        if (!confirm("Remove this task?")) return;

        tasks.splice(index, 1);
        localStorage.setItem("tasks", JSON.stringify(tasks));
        loadTasks();
        updateProductivity();
        renderEditTasks();
    });

    // Clear all tasks
    document.addEventListener("click", (e) => {
        const clearAllBtn = e.target.closest(".clear-all");
        if (!clearAllBtn) return;
        if (!confirm("Remove all tasks?")) return;

        localStorage.removeItem("tasks");
        loadTasks();
        updateProductivity();
        renderEditTasks();
    });


    // ═══════════════════════════════════════════════════════════════════════════
    //  INITIAL LOAD
    //  loadTasks() first so checkbox elements exist before updateProductivity()
    //  counts them.
    // ═══════════════════════════════════════════════════════════════════════════

    loadTasks();
    updateProductivity();

});