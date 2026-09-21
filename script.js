document.addEventListener('DOMContentLoaded', function () {
    // DOM Elements
    const taskInput = document.getElementById('taskInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');
    const emptyState = document.getElementById('emptyState');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const remainingCount = document.getElementById('remainingCount');
    const clearCompletedBtn = document.getElementById('clearCompleted');
    const prioritySelect = document.getElementById('prioritySelect');
    const dueDateInput = document.getElementById('dueDateInput');
    const searchInput = document.getElementById('searchInput');

    // NEW: Modal DOM Elements
    const dueDateModal = document.getElementById('dueDateModal');
    const modalContent = document.getElementById('modalContent');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const dismissAllModalBtn = document.getElementById('dismissAllModalBtn');

    // Ask for notification permission
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }


    // Initial state
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let currentFilter = 'all';



    const reminderBanner = document.getElementById('reminderBanner');
    let reminderMessages = [];

    // NEW: Function to play a subtle sound
    function playSubtleSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.type = 'sine'; // A clean tone
            oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4 note

            gainNode.gain.setValueAtTime(0.05, audioContext.currentTime); // Very low volume
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5); // Fade out quickly

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5); // Play for 0.5 seconds
        } catch (e) {
            console.warn("Audio playback failed:", e);
            // This might happen if autoplay is blocked or AudioContext is not available
        }
    }


    function checkDueTasks() {
        const today = new Date().toISOString().split('T')[0];
        reminderMessages = []; // Clear previous messages

        tasks.forEach(task => {
            // Show task if it's due today and not completed (no acknowledgment check)
            if (!task.completed && task.dueDate === today) {
                const message = `"${task.text}" is due today!`;
                reminderMessages.push(message);
                showNotification(`Task Reminder: ${message}`);
            }
        });

        if (reminderMessages.length > 0) {
            // Play sound
            playSubtleSound();

            // Populate modal content
            modalContent.innerHTML = reminderMessages.map(msg => `<p class="flex items-center gap-2"><i class="fas fa-calendar-day text-purple-400"></i>${msg}</p>`).join('');

            // Show the modal with animation
            dueDateModal.classList.remove('hidden');
            setTimeout(() => {
                dueDateModal.querySelector('div').classList.remove('scale-95', 'opacity-0');
                dueDateModal.querySelector('div').classList.add('scale-100', 'opacity-100');
            }, 10); // Small delay for transition to work
        } else {
            // Hide the modal if no reminders
            dueDateModal.querySelector('div').classList.remove('scale-100', 'opacity-100');
            dueDateModal.querySelector('div').classList.add('scale-95', 'opacity-0');
            setTimeout(() => {
                dueDateModal.classList.add('hidden');
            }, 300); // Match transition duration
        }

    }


    function showNotification(message) {
        console.log("🔔 Showing Notification:", message);
        if (Notification.permission === 'granted') {
            new Notification('Task Reminder', {
                body: message,
                icon: 'https://cdn-icons-png.flaticon.com/512/863/863684.png'
            });
        }
    }


    // Initialize the app
    function init() {
        renderTaskList();
        updateEmptyState();
        updateTaskCount();
        checkDueTasks(); 
        document.querySelector(`.filter-btn[data-filter="${currentFilter}"]`).classList.remove('bg-gradient-to-r', 'from-blue-50', 'to-purple-50', 'text-purple-600', 'border', 'border-purple-100', 'from-green-50', 'to-emerald-50', 'text-emerald-600', 'border-emerald-100', 'hover:from-blue-100', 'hover:to-purple-100', 'hover:from-green-100', 'hover:to-emerald-100');
        document.querySelector(`.filter-btn[data-filter="${currentFilter}"]`).classList.add('bg-gradient-to-r', 'from-purple-700', 'to-indigo-400', 'text-white');
    }

    // Add a new task
    function addTask(taskText) {
        if (taskText.trim() === '') return;

        const newTask = {
            id: Date.now(),
            text: taskText,
            completed: false,
            createdAt: new Date().toISOString(),
            priority: prioritySelect.value,
            dueDate: dueDateInput.value || null
        };
        prioritySelect.value = 'medium';
        dueDateInput.value = '';

        tasks.unshift(newTask);
        saveTasks();
        renderTaskList();
        updateEmptyState();
        updateTaskCount();
        taskInput.value = '';
        taskInput.focus();
    }

    // Delete a task
    function deleteTask(id) {
        tasks = tasks.filter(task => task.id !== id);
        saveTasks();
        renderTaskList();
        updateEmptyState();
        updateTaskCount();
    }

    // Toggle task complete status
    function toggleTaskComplete(id) {
        tasks = tasks.map(task => {
            if (task.id === id) {
                return { ...task, completed: !task.completed };
            }
            return task;
        });

        saveTasks();
        renderTaskList();
        updateTaskCount();
    }

    // Edit task text
    function editTask(id, newText) {
        if (newText.trim() === '') {
            deleteTask(id);
            return;
        }

        tasks = tasks.map(task => {
            if (task.id === id) {
                return { ...task, text: newText };
            }
            return task;
        });

        saveTasks();
    }

    // Clear all completed tasks
    function clearCompletedTasks() {
        tasks = tasks.filter(task => !task.completed);
        saveTasks();
        renderTaskList();
        updateEmptyState();
        updateTaskCount();
    }

    // Save tasks to localStorage
    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }

    // Filter tasks based on current filter
    function getFilteredTasks() {
        const term = searchInput.value.toLowerCase();
        return tasks.filter(task => {
            const matchesFilter =
                currentFilter === 'all' ||
                (currentFilter === 'active' && !task.completed) ||
                (currentFilter === 'completed' && task.completed);
            return matchesFilter && task.text.toLowerCase().includes(term);
        });
    }


    // Render the task list
    function renderTaskList() {
        const filteredTasks = getFilteredTasks();

        taskList.innerHTML = '';

        filteredTasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = 'task-enter p-3 sm:p-4 hover:bg-purple-50/50 transition-all flex items-start gap-3 sm:gap-4 backdrop-blur-sm hover:scale-[1.01]';

            taskElement.innerHTML = `
                        <label class="checkbox-container">
                            <input type="checkbox" ${task.completed ? 'checked' : ''} data-id="${task.id}">
                            <span class="checkmark"></span>
                        </label>
                        
                        <div class="flex-1 min-w-0">
                          <p class="text-gray-800 ${task.completed ? 'line-through text-gray-400' : ''} text-sm sm:text-base">
    ${task.text}
</p>
<div class="flex gap-2 flex-wrap mt-1 text-xs">
  ${task.priority ? `<span class="px-2 py-0.5 rounded-full ${task.priority === 'high' ? 'bg-red-100 text-red-700' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                    }">${task.priority} priority</span>` : ''}
  ${task.dueDate ? `<span class="text-purple-500">Due: ${task.dueDate}</span>` : ''}
</div>

                            <small class="text-gray-400 text-xs">${new Date(task.createdAt).toLocaleString()}</small>
                        </div>
                        
                        <div class="flex gap-1 sm:gap-2">
                            <button class="edit-btn p-1 sm:p-2 text-gray-400 hover:text-purple-600 rounded-full transition-colors" data-id="${task.id}">
                                <i class="fas fa-pencil-alt"></i>
                            </button>
                            <button class="delete-btn p-1 sm:p-2 text-gray-400 hover:text-red-500 rounded-full transition-colors" data-id="${task.id}">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    `;

            taskList.appendChild(taskElement);
        });

        // Add event listeners to new elements
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', function () {
                toggleTaskComplete(parseInt(this.dataset.id));
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                deleteTask(parseInt(this.dataset.id));
            });
        });

        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const taskId = parseInt(this.dataset.id);
                const taskElement = this.closest('.task-enter');
                const taskText = taskElement.querySelector('p');
                const currentText = tasks.find(t => t.id === taskId).text;

                // Replace text with input field
                taskText.innerHTML = `
                            <input type="text" value="${currentText}" class="w-full px-2 py-1 border-b border-gray-300 focus:outline-none focus:border-purple-500 text-sm sm:text-base">
                        `;

                const inputField = taskText.querySelector('input');
                inputField.focus();

                function saveEdit() {
                    editTask(taskId, inputField.value);
                }

                inputField.addEventListener('blur', saveEdit);
                inputField.addEventListener('keypress', function (e) {
                    if (e.key === 'Enter') {
                        saveEdit();
                    }
                });
            });
        });
    }

    // Update empty state visibility
    function updateEmptyState() {
        if (getFilteredTasks().length === 0) {
            emptyState.classList.add('show');
        } else {
            emptyState.classList.remove('show');
        }
    }

    // Update remaining task count
    function updateTaskCount() {
        const activeTasks = tasks.filter(task => !task.completed).length;
        remainingCount.textContent = `${activeTasks} ${activeTasks === 1 ? 'task' : 'tasks'} remaining`;
    }

    // Event listeners
    addTaskBtn.addEventListener('click', () => addTask(taskInput.value));

    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addTask(taskInput.value);
        }
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            // Update active button styles
            filterBtns.forEach(b => {
                // Reset all filter buttons to their inactive state styles
                b.classList.remove('bg-gradient-to-r', 'from-purple-700', 'to-indigo-400', 'text-white');

                if (b.dataset.filter === 'active') {
                    b.classList.add('bg-gradient-to-r', 'from-blue-50', 'to-purple-50', 'text-purple-600', 'border', 'border-purple-100', 'hover:from-blue-100', 'hover:to-purple-100');
                } else if (b.dataset.filter === 'completed') {
                    b.classList.add('bg-gradient-to-r', 'from-green-50', 'to-emerald-50', 'text-emerald-600', 'border', 'border-emerald-100', 'hover:from-green-100', 'hover:to-emerald-100');
                } else { // 'all' filter
                    b.classList.add('bg-gradient-to-r', 'from-blue-50', 'to-purple-50', 'text-purple-600', 'border', 'border-purple-100', 'hover:from-blue-100', 'hover:to-purple-100'); // Default inactive style
                }
            });
            searchInput.addEventListener('input', () => {
                renderTaskList();
                updateEmptyState();
            });


            // Set the clicked button to its active state
            this.classList.remove('bg-gradient-to-r', 'from-blue-50', 'to-purple-50', 'text-purple-600', 'border', 'border-purple-100', 'from-green-50', 'to-emerald-50', 'text-emerald-600', 'border', 'border-emerald-100', 'hover:from-blue-100', 'hover:to-purple-100', 'hover:from-green-100', 'hover:to-emerald-100');
            this.classList.add('bg-gradient-to-r', 'from-purple-700', 'to-indigo-400', 'text-white');

            // Update filter and re-render
            currentFilter = this.dataset.filter;
            renderTaskList();
            updateEmptyState();
        });
    });
    if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
    }

    // NEW: Event Listeners for the Modal
    closeModalBtn.addEventListener('click', () => {
        dueDateModal.querySelector('div').classList.remove('scale-100', 'opacity-100');
        dueDateModal.querySelector('div').classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            dueDateModal.classList.add('hidden');
        }, 300); // Match transition duration
    });

    dismissAllModalBtn.addEventListener('click', () => {
        // Simply close the modal - reminders will show again next time
        dueDateModal.querySelector('div').classList.remove('scale-100', 'opacity-100');
        dueDateModal.querySelector('div').classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            dueDateModal.classList.add('hidden');
        }, 300);
    });


    clearCompletedBtn.addEventListener('click', clearCompletedTasks);

    // Initialize the app
    init();
});
document.addEventListener('DOMContentLoaded', () => {
    const closeBtn = document.getElementById('closeBannerBtn');
    const banner = document.getElementById('reminderBanner');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            banner.classList.add('hidden');
        });
    }
});
