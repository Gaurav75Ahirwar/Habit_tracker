document.addEventListener("DOMContentLoaded", () => {

    // ═══════════════════════════════════════════════════════════════════════════
    //  DAY RESET SYSTEM
    //
    //  Two-pronged approach:
    //    1. LOAD-TIME CHECK  — compare saved "app-date" to today's date string.
    //       If they differ the user has opened the app on a new day → wipe data.
    //    2. LIVE TIMER       — schedule a setTimeout for the exact ms remaining
    //       until the next midnight so the reset fires even if the tab stays
    //       open overnight. After the first midnight hit, repeat every 24 h.
    //
    //  Keys owned by the daily cycle:
    //    "app-date"    → today's dateString, e.g. "Mon Apr 14 2026"
    //    "tasks"       → array of task objects
    //    "time-stamps" → array of stamp objects
    //  "theme" is intentionally never touched by the reset.
    // ═══════════════════════════════════════════════════════════════════════════

    const TODAY = new Date().toDateString();

    // Load-time stale-date wipe (helpers called at bottom after they are defined)
    if (localStorage.getItem("app-date") !== TODAY) {
        localStorage.removeItem("tasks");
        localStorage.removeItem("time-stamps");
        localStorage.setItem("app-date", TODAY);
    }

    /**
     * Full midnight reset: clears storage, re-renders every daily UI piece.
     * Called by the live timer and — indirectly — by performDayReset().
     */
    function performDayReset() {
        localStorage.removeItem("tasks");
        localStorage.removeItem("time-stamps");
        localStorage.setItem("app-date", new Date().toDateString());

        loadTasks();           // empties goal card, shows empty-msg
        loadStamps();          // removes all stamp DOM nodes, resets fill to 0
        updateProductivity();  // resets ring + all counters back to 0
    }

    /**
     * Returns milliseconds from right now until the next 00:00:00.000.
     */
    function msUntilMidnight() {
        const now = new Date();
        const next = new Date(now);
        next.setHours(24, 0, 0, 0); // tomorrow at midnight
        return next - now;
    }

    // Fire once at midnight, then every 24 h while the tab stays open
    setTimeout(() => {
        performDayReset();
        setInterval(performDayReset, 24 * 60 * 60 * 1000);
    }, msUntilMidnight());


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
    //  Defined first so updateProductivity() (used everywhere below) can
    //  safely call updateRing() without forward-reference issues.
    // ═══════════════════════════════════════════════════════════════════════════

    const radius = 70;
    const circumference = 2 * Math.PI * radius;
    const arcLength = circumference * (240 / 360); // 240° arc

    const trackEl = document.querySelector(".ring-track");
    // FIXED: renamed from "progress" to "progressEl" — "progress" is a reserved
    //        HTML element name and caused silent confusion in earlier versions.
    const progressEl = document.querySelector(".ring-progress");

    trackEl.style.strokeDasharray = `${arcLength} ${circumference}`;
    progressEl.style.strokeDasharray = `${arcLength} ${circumference}`;
    progressEl.style.strokeDashoffset = arcLength; // start empty

    // ── Gradient ─────────────────────────────────────────────────────────────

    function createGradient() {
        const svg = document.querySelector(".progress-ring");
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

        const gradient = document.createElementNS("http://www.w3.org/2000/svg", "linearGradient");
        gradient.setAttribute("id", "ringGradient");
        gradient.setAttribute("x1", "0%");
        gradient.setAttribute("y1", "100%");
        gradient.setAttribute("x2", "100%");
        gradient.setAttribute("y2", "0%");

        const stopTail = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stopTail.setAttribute("offset", "0%");
        stopTail.setAttribute("stop-opacity", "0.45"); // dim trailing end

        // FIXED: was setAttribute("off-stop", 1) — wrong attribute → head was
        //        transparent. Corrected to "stop-opacity" with value "1".
        const stopHead = document.createElementNS("http://www.w3.org/2000/svg", "stop");
        stopHead.setAttribute("offset", "100%");
        stopHead.setAttribute("stop-opacity", "1");

        gradient.appendChild(stopTail);
        gradient.appendChild(stopHead);
        defs.appendChild(gradient);
        svg.appendChild(defs);
        progressEl.setAttribute("stroke", "url(#ringGradient)");
    }

    function resolveCSSVar(varName) {
        return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    }

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

    // ── Smooth sweep animation ────────────────────────────────────────────────

    let currentOffset = arcLength;
    let animationID = null;

    function animateRingTo(targetOffset) {
        if (animationID) cancelAnimationFrame(animationID);

        const startOffset = currentOffset;
        const delta = targetOffset - startOffset;
        const duration = 600;
        const startTime = performance.now();

        function step(now) {
            const elapsed = now - startTime;
            const t = Math.min(elapsed / duration, 1);
            const eased = t < 0.5
                ? 4 * t * t * t
                : 1 - Math.pow(-2 * t + 2, 3) / 2;

            currentOffset = startOffset + delta * eased;
            progressEl.style.strokeDashoffset = currentOffset;

            if (t < 1) {
                animationID = requestAnimationFrame(step);
            } else {
                currentOffset = targetOffset;
                animationID = null;
            }
        }

        animationID = requestAnimationFrame(step);
    }

    // FIXED: previously had `animateRingTo(targetOffset)` where `targetOffset`
    //        was never declared — undefined was passed → ring never moved.
    function updateRing(percent) {
        const targetOffset = arcLength * (1 - percent / 100);
        animateRingTo(targetOffset);
    }

    // ── Smooth number counters ────────────────────────────────────────────────

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
            const eased = 1 - Math.pow(1 - t, 3);

            const current = Math.round(startValue + (targetValue - startValue) * eased);
            el.textContent = (elementId === "productivity-percent")
                ? current + "%"
                : current;

            if (t < 1) requestAnimationFrame(step);
        }

        requestAnimationFrame(step);
    }

    createGradient();


    // ═══════════════════════════════════════════════════════════════════════════
    //  TIME BAR
    //
    //  #time-bar contains (in DOM order, bottom → top visually):
    //    .time-bar-fill   animated width = fraction of day elapsed
    //    .time-stamp(s)   thin lines, one per completed checkbox
    //
    //  Each stamp has a data-task-id attribute that matches the task's unique id.
    //  This lets removeStamp() pinpoint exactly which stamp to delete when a
    //  checkbox is unchecked, even when multiple stamps exist.
    //
    //  localStorage["time-stamps"] schema:
    //    Array<{ taskId: string, left: string, title: string }>
    // ═══════════════════════════════════════════════════════════════════════════

    const timeBarEl = document.getElementById("time-bar");

    // Remove the static example stamp that was hardcoded in index.html
    timeBarEl.querySelectorAll(".time-stamp").forEach(s => s.remove());

    // ADDED: .time-bar-fill — a child div whose width% mirrors time of day.
    // Inserted as first child so stamp elements appended later render above it.
    const timeBarFill = document.createElement("div");
    timeBarFill.className = "time-bar-fill";
    timeBarEl.insertBefore(timeBarFill, timeBarEl.firstChild);

    // ── Time fraction ─────────────────────────────────────────────────────────

    /** Fraction of the current day elapsed: 0 (midnight) → ~1 (23:59:59). */
    function getDayFraction() {
        const n = new Date();
        return (n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds()) / 86400;
    }

    /**
     * Sets fill bar width to the current time percentage.
     * Called on load, every 60 s, and after a day reset (goes back to ~0%).
     */
    function updateTimeBarFill() {
        timeBarFill.style.width = (getDayFraction() * 100).toFixed(3) + "%";
    }

    updateTimeBarFill();
    setInterval(updateTimeBarFill, 60_000); // tick every minute

    // ── Stamp helpers ─────────────────────────────────────────────────────────

    /** Draws one stamp in the bar DOM. Does not touch localStorage. */
    function renderStamp(taskId, left, title) {
        const el = document.createElement("div");
        el.className = "time-stamp";
        el.style.left = left;
        el.title = title;
        el.dataset.taskId = taskId; // used by removeStamp() to find this element
        timeBarEl.appendChild(el);
    }

    /**
     * Clears all stamp DOM nodes and redraws from localStorage.
     * Called on page load and at midnight reset.
     * After a reset localStorage["time-stamps"] is already empty,
     * so this effectively zeroes the bar.
     */
    function loadStamps() {
        timeBarEl.querySelectorAll(".time-stamp").forEach(s => s.remove());
        const stamps = JSON.parse(localStorage.getItem("time-stamps")) || [];
        stamps.forEach(({ taskId, left, title }) => renderStamp(taskId, left, title));
    }

    /**
     * Records + draws a new stamp when a task checkbox is CHECKED.
     * @param {string} taskId    — stable id of the task
     * @param {string} taskTitle — task title shown in the tooltip
     */
    function addStamp(taskId, taskTitle) {
        const now = new Date();
        const left = (getDayFraction() * 100).toFixed(3) + "%";
        const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        const title = `${taskTitle} — ${timeStr}`;

        const stamps = JSON.parse(localStorage.getItem("time-stamps")) || [];
        stamps.push({ taskId, left, title });
        localStorage.setItem("time-stamps", JSON.stringify(stamps));

        renderStamp(taskId, left, title);
    }

    /**
     * Removes the most-recent stamp for a task when its checkbox is UNCHECKED.
     * Handles the edge case of a task being checked > once by targeting only
     * the last matching stamp.
     * @param {string} taskId — id of the task being unchecked
     */
    function removeStamp(taskId) {
        // DOM: remove last matching stamp element
        const nodes = [...timeBarEl.querySelectorAll(`.time-stamp[data-task-id="${taskId}"]`)];
        if (nodes.length) nodes[nodes.length - 1].remove();

        // localStorage: remove last matching entry
        const stamps = JSON.parse(localStorage.getItem("time-stamps")) || [];
        const lastIdx = stamps.map(s => s.taskId).lastIndexOf(taskId);
        if (lastIdx !== -1) stamps.splice(lastIdx, 1);
        localStorage.setItem("time-stamps", JSON.stringify(stamps));
    }

    loadStamps(); // draw any stamps saved from earlier this session


    // ═══════════════════════════════════════════════════════════════════════════
    //  PRODUCTIVITY CONTROLLER
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

    // Single delegated listener handles all dynamically rendered checkboxes
    document.addEventListener("change", (e) => {
        if (!e.target.classList.contains("task-checkbox")) return;

        updateProductivity();

        // Identify which task this checkbox belongs to via its parent li
        const taskItem = e.target.closest(".task-item");
        const taskId = taskItem?.dataset.taskId ?? "unknown";
        const rawTitle = taskItem?.querySelector(".task-title")?.textContent ?? "Task";

        if (e.target.checked) {
            addStamp(taskId, rawTitle.trim());    // CHECKED  → add stamp
        } else {
            removeStamp(taskId);                  // UNCHECKED → remove stamp
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
        taskList.querySelectorAll(".task-item").forEach(t => t.remove());

        if (tasks.length === 0) {
            emptyMessage.style.display = "block";
            return;
        }

        emptyMessage.style.display = "none";
        // CHANGED: renderTask now receives the whole task object (not title+desc)
        //          so it can stamp data-task-id onto the li element.
        tasks.forEach(task => renderTask(task));
    }

    /**
     * CHANGED: accepts a task object instead of (title, description) pair.
     * Stamps data-task-id on the li so the checkbox change handler can resolve
     * which task was checked/unchecked for stamp management.
     */
    function renderTask(task) {
        const li = document.createElement("li");
        li.className = "task-item";
        li.dataset.taskId = task.id; // ADDED: links this DOM node to its stamp
        li.innerHTML = `
            <div class="task-content">
                <input type="checkbox" class="task-checkbox">
                <span class="task-title">${task.title}</span>
                <button class="toggle-desc">
                    <i data-lucide="chevron-right"></i>
                </button>
            </div>
            <div class="task-description">${task.description}</div>
        `;
        taskList.appendChild(li);
        lucide.createIcons();

        li.querySelector(".toggle-desc").addEventListener("click", () => {
            li.querySelector(".task-description").classList.toggle("show");
            li.querySelector(".toggle-desc").classList.toggle("open");
        });
    }

    /** Generates a short unique id for new tasks. */
    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
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
            // Preserve the original id — existing stamps must stay linked
            tasks[editingTaskIndex] = { ...tasks[editingTaskIndex], title, description };
            editingTaskIndex = null;
            document.querySelector("#task-modal h2").textContent = "Add New Goal";
            document.getElementById("save-task-btn").textContent = "Save";
        } else {
            // ADDED: every new task gets a generateId() unique id
            tasks.push({ id: generateId(), title, description });
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

    // Open add/edit modal pre-filled
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

    // Delete a single task + all its stamps
    document.addEventListener("click", (e) => {
        const deleteBtn = e.target.closest(".clear-task-btn");
        if (!deleteBtn) return;

        const index = parseInt(deleteBtn.dataset.index);
        const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
        if (!confirm("Remove this task?")) return;

        // ADDED: remove every stamp tied to the deleted task
        const deletedId = tasks[index]?.id;
        if (deletedId) {
            let stamps = JSON.parse(localStorage.getItem("time-stamps")) || [];
            stamps = stamps.filter(s => s.taskId !== deletedId);
            localStorage.setItem("time-stamps", JSON.stringify(stamps));
            timeBarEl.querySelectorAll(`.time-stamp[data-task-id="${deletedId}"]`)
                .forEach(s => s.remove());
        }

        tasks.splice(index, 1);
        localStorage.setItem("tasks", JSON.stringify(tasks));
        loadTasks();
        updateProductivity();
        renderEditTasks();
    });

    // Clear all tasks + all stamps
    document.addEventListener("click", (e) => {
        const clearAllBtn = e.target.closest(".clear-all");
        if (!clearAllBtn) return;
        if (!confirm("Remove all tasks?")) return;

        // ADDED: wipe stamps when clearing all tasks
        localStorage.removeItem("tasks");
        localStorage.removeItem("time-stamps");
        timeBarEl.querySelectorAll(".time-stamp").forEach(s => s.remove());

        loadTasks();
        updateProductivity();
        renderEditTasks();
    });


    // ═══════════════════════════════════════════════════════════════════════════
    //  INITIAL LOAD
    //  loadTasks() before updateProductivity() — checkboxes must exist in DOM
    //  before we count them.
    // ═══════════════════════════════════════════════════════════════════════════

    loadTasks();
    updateProductivity();

});