"use strict";

/* ================================================================
   HABIT TRACKER — LOGIC LAYER
   The HTML/CSS are untouched. This file only wires behavior to the
   DOM elements that already exist.

   Architecture — one direction of data flow, always:

       user action -> state mutation -> commit() -> save + render()

   `state.tasks` is the single source of truth. Nothing outside
   commit() calls render(), and render() never mutates state or
   calls commit(). That one rule is what prevents re-render loops
   and the state/UI drift the previous version had.
   ================================================================ */

document.addEventListener("DOMContentLoaded", () => {

    /* ------------------------------------------------------------
       STORAGE LAYER
       The only two functions allowed to touch localStorage.
       ------------------------------------------------------------ */

    const STORAGE_KEY = "tasks";

    function loadTasksFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            console.error("Could not read tasks from localStorage:", err);
            return [];
        }
    }

    function saveTasksToStorage(tasks) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        } catch (err) {
            console.error("Could not save tasks to localStorage:", err);
        }
    }

    /* ------------------------------------------------------------
       STATE LAYER
       Task shape: { id, title, description, completed, dateCreated, dateCompleted }
       ------------------------------------------------------------ */

    const state = {
        tasks: loadTasksFromStorage(),
    };

    // Tracks which task (by id, never by array index) the Add/Edit
    // modal is currently editing. `null` means "adding a new task".
    // Using an id instead of an index is what fixes the old bug where
    // deleting/reordering tasks while the modal was open could edit
    // the wrong task.
    let editingTaskId = null;

    function generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    }

    function addTask(title, description) {
        state.tasks.push({
            id: generateId(),
            title,
            description,
            completed: false,
            dateCreated: Date.now(),
            dateCompleted: null,
        });
        commit();
    }

    function updateTask(id, title, description) {
        const task = state.tasks.find((t) => t.id === id);
        if (!task) return;
        task.title = title;
        task.description = description;
        commit();
    }

    function deleteTask(id) {
        state.tasks = state.tasks.filter((t) => t.id !== id);
        commit();
    }

    function toggleTask(id) {
        const task = state.tasks.find((t) => t.id === id);
        if (!task) return;
        task.completed = !task.completed;
        task.dateCompleted = task.completed ? Date.now() : null;
        commit();
    }

    function clearAllTasks() {
        state.tasks = [];
        commit();
    }

    /**
     * The ONLY function that both persists and re-renders. Every
     * mutation above ends by calling this once. render() itself
     * never calls commit(), so there's exactly one path from
     * "state changed" to "UI updated" — no loop is possible.
     */
    function commit() {
        saveTasksToStorage(state.tasks);
        render();
    }

    function render() {
        renderTaskList();
        renderEditList();
        renderProductivity();
    }


    /* ================================================================
       GOALS CARD — main task list (#goals)
       ================================================================ */

    const taskListEl = document.querySelector(".task-list");
    const emptyMsgEl = document.getElementById("empty-msg");

    function renderTaskList() {
        taskListEl.innerHTML = "";

        if (state.tasks.length === 0) {
            emptyMsgEl.style.display = "block";
            return;
        }
        emptyMsgEl.style.display = "none";

        const fragment = document.createDocumentFragment();
        state.tasks.forEach((task) => fragment.appendChild(buildTaskElement(task)));
        taskListEl.appendChild(fragment);

        if (window.lucide) window.lucide.createIcons();
    }

    function buildTaskElement(task) {
        const li = document.createElement("li");
        li.className = "task-item";
        li.dataset.taskId = task.id;

        const content = document.createElement("div");
        content.className = "task-content";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "task-checkbox";
        checkbox.checked = task.completed;
        checkbox.addEventListener("change", () => toggleTask(task.id));

        const title = document.createElement("span");
        title.className = "task-title";
        title.textContent = task.title; // textContent, not innerHTML — safe against any characters in user input

        const toggleDescBtn = document.createElement("button");
        toggleDescBtn.type = "button";
        toggleDescBtn.className = "toggle-desc";
        toggleDescBtn.innerHTML = '<i data-lucide="chevron-right"></i>';

        content.append(checkbox, title, toggleDescBtn);

        const description = document.createElement("div");
        description.className = "task-description";
        description.textContent = task.description;

        toggleDescBtn.addEventListener("click", () => {
            description.classList.toggle("show");
            toggleDescBtn.classList.toggle("open");
        });

        li.append(content, description);
        return li;
    }


    /* ================================================================
       EDIT MODAL — #edit-modal
       The "clear all" header is built once (it's static chrome, not
       per-task data) and inserted before the existing <ul class="edit-task-list">.
       Only the <ul>'s children are rebuilt on every render — the ul
       element itself, already in your HTML, is left in place.
       ================================================================ */

    const editModal = document.getElementById("edit-modal");
    const editModeBtn = document.getElementById("edit-task-mode-btn");
    const cancelEditBtn = document.getElementById("cancel-edit-btn");
    const editScrollContainer = document.querySelector(".edit-scroll-container");
    const editTaskListEl = document.querySelector(".edit-task-list");

    const editHeader = document.createElement("div");
    editHeader.className = "edit-header";
    editHeader.innerHTML = `
        <button type="button" class="clear-all" title="Remove All Tasks">
            <i data-lucide="trash"></i>
        </button>`;
    editScrollContainer.insertBefore(editHeader, editTaskListEl);

    const clearAllBtn = editHeader.querySelector(".clear-all");
    clearAllBtn.addEventListener("click", () => {
        if (state.tasks.length === 0) return;
        if (confirm("Remove all tasks?")) clearAllTasks();
    });

    function renderEditList() {
        editTaskListEl.innerHTML = "";
        clearAllBtn.disabled = state.tasks.length === 0;

        if (state.tasks.length === 0) {
            const emptyItem = document.createElement("li");
            emptyItem.className = "empty-msg";
            emptyItem.textContent = "No Task Available to Edit";
            editTaskListEl.appendChild(emptyItem);
            return;
        }

        const fragment = document.createDocumentFragment();
        state.tasks.forEach((task) => fragment.appendChild(buildEditTaskElement(task)));
        editTaskListEl.appendChild(fragment);

        if (window.lucide) window.lucide.createIcons();
    }

    function buildEditTaskElement(task) {
        const li = document.createElement("li");
        li.className = "edit-task-items";
        li.dataset.taskId = task.id;

        const titleSpan = document.createElement("span");
        titleSpan.className = "edit-task-title";
        titleSpan.innerHTML = '<i data-lucide="dot"></i>';
        titleSpan.append(task.title); // text node, not innerHTML — safe against user input

        const actions = document.createElement("div");
        actions.className = "edit-actions";

        const editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "edit-task-btn";
        editBtn.title = "Edit Task";
        editBtn.innerHTML = '<i data-lucide="pen"></i>';
        editBtn.addEventListener("click", () => openEditTaskForm(task.id));

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "clear-task-btn";
        deleteBtn.title = "Remove Task";
        deleteBtn.innerHTML = '<i data-lucide="trash"></i>';
        deleteBtn.addEventListener("click", () => {
            if (confirm("Remove this task?")) deleteTask(task.id);
        });

        actions.append(editBtn, deleteBtn);
        li.append(titleSpan, actions);
        return li;
    }

    function showEditModal() {
        editModal.classList.add("show");
        document.body.style.overflow = "hidden";
    }

    function hideEditModal() {
        editModal.classList.remove("show");
        document.body.style.overflow = "auto";
    }

    editModeBtn.addEventListener("click", showEditModal);
    cancelEditBtn.addEventListener("click", hideEditModal);
    editModal.addEventListener("click", (e) => {
        if (e.target === editModal) hideEditModal();
    });


    /* ================================================================
       ADD / EDIT TASK MODAL — #task-modal
       One modal, one form, serving both flows. `editingTaskId` decides
       which path submit() takes.
       ================================================================ */

    const taskModal = document.getElementById("task-modal");
    const taskForm = document.getElementById("task-form");
    const titleInput = document.getElementById("task-title-input");
    const descInput = document.getElementById("task-desc-input");
    const modalTitleEl = taskModal.querySelector("h2");
    const saveTaskBtn = document.getElementById("save-task-btn");
    const cancelTaskBtn = document.getElementById("cancel-task-btn");
    const addTaskBtn = document.getElementById("add-task-btn");

    function showTaskModal() {
        taskModal.classList.add("show");
        document.body.style.overflow = "hidden";
        titleInput.focus();
    }

    function hideTaskModal() {
        taskModal.classList.remove("show");
        document.body.style.overflow = "auto";
    }

    addTaskBtn.addEventListener("click", () => {
        editingTaskId = null;
        modalTitleEl.textContent = "Add New Goal";
        saveTaskBtn.textContent = "Save";
        taskForm.reset();
        showTaskModal();
    });

    function openEditTaskForm(id) {
        const task = state.tasks.find((t) => t.id === id);
        if (!task) return;

        editingTaskId = id;
        titleInput.value = task.title;
        descInput.value = task.description;
        modalTitleEl.textContent = "Edit Task";
        saveTaskBtn.textContent = "Update";

        hideEditModal();
        showTaskModal();
    }

    cancelTaskBtn.addEventListener("click", () => {
        taskForm.reset();
        hideTaskModal();
    });

    taskModal.addEventListener("click", (e) => {
        if (e.target === taskModal) {
            taskForm.reset();
            hideTaskModal();
        }
    });

    taskForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const title = titleInput.value.trim();
        const description = descInput.value.trim();
        if (!title) return;

        if (editingTaskId) {
            updateTask(editingTaskId, title, description);
        } else {
            addTask(title, description);
        }

        editingTaskId = null;
        taskForm.reset();
        hideTaskModal();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (taskModal.classList.contains("show")) {
                taskForm.reset();
                hideTaskModal();
            }
            if (editModal.classList.contains("show")) {
                hideEditModal();
            }
        }
        if (taskModal.classList.contains("show") && e.key === "Enter") {
            if (e.target.tagName === "TEXTAREA" && !e.shiftKey) return;
            e.preventDefault();
            taskForm.requestSubmit();
        }
    });


    /* ================================================================
       PRODUCTIVITY CARD
       Purely derived from state.tasks — no DOM-counting, no separate
       localStorage read, so it can never disagree with the task list.
       Values are set directly (no animation loop), which is what
       removes the risk of stacked/looping requestAnimationFrame calls
       from the earlier version.
       ================================================================ */

    const completedCountEl = document.getElementById("completed-count");
    const remainingCountEl = document.getElementById("remaining-count");
    const percentEl = document.getElementById("productivity-percent");
    const statusEl = document.getElementById("productivity-status-value");
    const quoteEl = document.getElementById("productivity-quote");
    const ringTrackEl = document.querySelector(".ring-track");
    const ringProgressEl = document.querySelector(".ring-progress");

    const RING_RADIUS = 70;
    const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
    const RING_ARC = RING_CIRCUMFERENCE * (240 / 360); // matches the 240° arc drawn in the SVG

    if (ringTrackEl && ringProgressEl) {
        ringTrackEl.style.strokeDasharray = `${RING_ARC} ${RING_CIRCUMFERENCE}`;
        ringProgressEl.style.strokeDasharray = `${RING_ARC} ${RING_CIRCUMFERENCE}`;
    }

    const QUOTES = [
        "Start small, finish strong.",
        "Consistency beats intensity.",
        "Today's progress is tomorrow's habit.",
        "Keep going — routines become results.",
        "Small wins add up fast.",
    ];

    function renderProductivity() {
        const total = state.tasks.length;
        const completed = state.tasks.filter((t) => t.completed).length;
        const remaining = total - completed;
        const percent = total ? Math.round((completed / total) * 100) : 0;

        if (completedCountEl) completedCountEl.textContent = completed;
        if (remainingCountEl) remainingCountEl.textContent = remaining;
        if (percentEl) percentEl.textContent = `${percent}%`;

        if (statusEl) {
            statusEl.textContent =
                total === 0 ? "Starting" :
                    percent === 0 ? "Just starting" :
                        percent < 40 ? "Warming up" :
                            percent < 70 ? "On track" :
                                "Crushing it";
        }

        if (quoteEl) {
            quoteEl.textContent =
                total === 0 ? "Add your first habit and begin." :
                    percent === 100 ? "Excellent work — keep the streak alive!" :
                        QUOTES[completed % QUOTES.length];
        }

        if (ringProgressEl) {
            ringProgressEl.style.strokeDashoffset = RING_ARC * (1 - percent / 100);
        }
    }


    /* ================================================================
       TIME BAR — the sliver showing how much of today has elapsed.
       Fully independent of task state (it's driven by the clock, not
       by tasks), so it's kept separate from render() entirely — it
       cannot be affected by, or interfere with, task rendering.
       The existing static .time-stamp example in your HTML is left
       exactly as-is; per-task timestamps aren't implemented yet, so
       nothing here touches or removes it.
       ================================================================ */

    const timeBarEl = document.getElementById("time-bar");
    let timeBarFillEl = timeBarEl.querySelector(".time-bar-fill");
    if (!timeBarFillEl) {
        timeBarFillEl = document.createElement("div");
        timeBarFillEl.className = "time-bar-fill";
        timeBarEl.insertBefore(timeBarFillEl, timeBarEl.firstChild);
    }

    function getDayFraction() {
        const now = new Date();
        return (now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds()) / 86400;
    }

    function updateTimeBarFill() {
        timeBarFillEl.style.width = (getDayFraction() * 100).toFixed(2) + "%";
    }

    updateTimeBarFill();
    setInterval(updateTimeBarFill, 60_000);


    /* ================================================================
       THEME TOGGLE
       Self-contained: it never reads or writes task state, so it
       can't affect — or be affected by — list rendering.
       ================================================================ */

    const themeToggleBtn = document.getElementById("theme-toggle");

    function setThemeIcon(isDark) {
        themeToggleBtn.innerHTML = isDark
            ? '<i data-lucide="sun"></i>'
            : '<i data-lucide="moon"></i>';
        themeToggleBtn.title = isDark ? "Light Mode" : "Dark Mode";
        if (window.lucide) window.lucide.createIcons();
    }

    const startDark = localStorage.getItem("theme") === "dark";
    document.body.classList.toggle("dark-mode", startDark);
    setThemeIcon(startDark);

    themeToggleBtn.addEventListener("click", () => {
        themeToggleBtn.classList.add("fade");
        setTimeout(() => {
            const isDark = !document.body.classList.contains("dark-mode");
            document.body.classList.toggle("dark-mode", isDark);
            localStorage.setItem("theme", isDark ? "dark" : "light");
            setThemeIcon(isDark);
            themeToggleBtn.classList.remove("fade");
        }, 175);
    });


    /* ================================================================
       INITIAL RENDER
       ================================================================ */

    render();

});