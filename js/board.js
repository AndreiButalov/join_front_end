const BASE_URL = "http://127.0.0.1:8000/api/";

const usedIds = new Set();

let showEdit = true;
let todos = [];
let currentElement;
let namelist = [];
let colorList = [];
let initials = [];
let subtasks = [];
let selectedSubtasks = [];
let selectedNames = [];
let userSubtask = [];

/**
 * The function `saveTasksToServer` asynchronously saves tasks to a server using a PUT request with
 * error handling.
 */
async function saveTasksToServer(task) {
    const token = localStorage.getItem('authToken'); // Token holen

    const response = await fetch(`${BASE_URL}tasks/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${token}` // Token anhängen
        },
        body: JSON.stringify(task)
    });

    if (!response.ok) {
        pleaseLogin();
    }

    const data = await response.json();
    return data;
}



/**
 * The function `loadTasksFromServer` asynchronously fetches tasks data from a server and maps the
 * response to an array of todos.
 */
async function loadTasksFromServer() {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${BASE_URL}tasks/`, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.warn("Nicht autorisiert – Weiterleitung zur Login-Seite.");
                window.location.href = 'index.html';
                return;
            }
            throw new Error('Netzwerkantwort war nicht ok.');
        }

        const data = await response.json();
        todos = Object.keys(data).map(id => ({
            id,
            ...data[id]
        }));
    } catch (error) {
        console.error('Fehler beim Abrufen der Daten:', error);
    }
}




async function loadSubTasksFromServer() {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${BASE_URL}subtasks/`, {
            method: 'GET',
            headers: {
                'Authorization': `Token ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.warn("Nicht autorisiert – Weiterleitung zur Login-Seite.");
                window.location.href = 'index.html';
                return;
            }
            throw new Error('Netzwerkantwort war nicht ok.');
        }

        const data = await response.json();
        userSubtask = Object.keys(data).map(id => ({
            id,
            ...data[id]
        }));
    } catch (error) {
        console.error('Fehler beim Abrufen der Daten:', error);
    }
}



/**
 * The function `deleteTaskFromLocalStorage` deletes a task with a specific ID from local storage,
 * updates the task list, saves the updated tasks to the server, and initializes the board tasks.
 * @param id - The `id` parameter in the `deleteTaskFromLocalStorage` function represents the unique
 * identifier of the task that needs to be deleted from the local storage. This identifier is used to
 * find and remove the specific task from the `todos` array before saving the updated tasks to the
 * server and local storage.
 */
async function deleteTaskFromLocalStorage(id) {

    todos = todos.filter(todo => todo.id !== id);
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${BASE_URL}tasks/${id}/`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`
            },
        });

        if (!response.ok) {
            pleaseLogin();
        }

    } catch (error) {
        console.error('Error deleting task from server:', error);
    }

    initBoardTasks();
    closeShowTask();
}


async function deleteSubTaskFromLocalStorage(id) {

    userSubtask = userSubtask.filter(subtask => { subtask.id !== id })
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${BASE_URL}subtasks/${id}/`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`
            },
        });

        if (!response.ok) {
            throw new Error('Failed to delete task from server');
        }

    } catch (error) {
        console.error('Error deleting task from server:', error);
    }

    initBoardTasks();
    closeShowTask();
}


async function updateOnServer(id, updatedFields, path) {
    try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(BASE_URL + path + id + '/', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Token ${token}`
            },
            body: JSON.stringify(updatedFields)
        });

        if (!response.ok) {
            if (response.status === 401) {
                console.warn("Nicht autorisiert – bitte einloggen.");
                window.location.href = 'index.html';
                return;
            }
            throw new Error(`Update failed with status ${response.status}`);
        }
    } catch (error) {
        pleaseLogin();
    }
    await initBoardTasks();
}


/**
 * The function `initBoardTasks` loads tasks from the server and categorizes them into different
 * sections on a board based on their status.
 */
async function initBoardTasks() {
    getCurrentUserFromLocalStorage()
    await loadTasksFromServer();
    await loadGuestFromServer();
    await loadSubTasksFromServer();
    await loadUsersFromServer();

    let task = document.getElementById('board_to_do');
    let progress = document.getElementById('board_in_progress');
    let awaitFeedback = document.getElementById('board_await_feedback');
    let doneId = document.getElementById('board_done');

    let toDo = todos.filter(t => t['category'] == 'to_do');
    let inProgress = todos.filter(t => t['category'] == 'in_progress');
    let feedback = todos.filter(t => t['category'] == 'awaitt');
    let done = todos.filter(t => t['category'] == 'done');

    generateToDo(toDo, task, 'to do');
    generateToDo(inProgress, progress, 'in progress');
    generateToDo(feedback, awaitFeedback, 'await feedback');
    generateToDo(done, doneId, 'done');
}


/**
 * The function `generateToDo` populates a specified HTML element with to-do items from an array,
 * including rendering subtasks and progress bars.
 * @param arr - The `arr` parameter in the `generateToDo` function is an array that contains the tasks
 * to be displayed in a to-do list. Each element in the array represents a task object with properties
 * like `id`, `subtasks`, `selectedTask`, etc. The function iterates over this array
 * @param categorie_id - `categorie_id` is a DOM element that represents the container where the
 * generated to-do items will be displayed. The function `generateToDo` populates this container with
 * to-do items based on the input array and category information.
 * @param category - The `category` parameter in the `generateToDo` function is used to specify the
 * category of the to-do items being generated. It is likely used for rendering the to-do items in the
 * appropriate category section on the user interface.
 */
async function generateToDo(arr, categorie_id, category) {
    categorie_id.innerHTML = '';
    if (arr.length) {
        for (let i = 0; i < arr.length; i++) {
            const element = arr[i];

            categorie_id.innerHTML += renderHtmlToDo(element);
            let idSUb = document.getElementById(`idSUb${element.id}`);
            const result = filterByTask(userSubtask, element.id);

            if (result.length > 0) {
                idSUb.innerHTML = '';
                idSUb.innerHTML = renderHtmlProgressBarEmpty(result)
                if (result) {
                    idSUb.innerHTML = '';
                    idSUb.innerHTML += renderHtmlProgressBar(result);
                }
            }

            getInitialsArray(element);
            getCategorieBackGroundColor(element);
        }
    } else {
        generateNoTask(categorie_id, category);
    }
}


/**
 * The function `addTask` adds a new task to a specified column in a task management system.
 * @param column - The `column` parameter in the `addTask` function likely refers to the column or
 * section where the task is being added. This parameter is used to specify the location within the
 * task management system where the new task will be created.
 */
function addTask(column) {
    generateAddTasks(column);
    displayGreyBackground();
    slideInTask();
    initAddTask();
}


/**
 * The function `generateShowTask` populates a popup with information about a specific task, including
 * subtasks and user details.
 * @param id - The `id` parameter in the `generateShowTask` function is used to identify the specific
 * task or contact that needs to be displayed in the pop-up on the board. It is used to find the
 * corresponding task object in the `todos` array and then render the task details in the pop-up
 */
async function generateShowTask(id) {
    let boardPopUp = document.getElementById('boardPopUp');
    let contact = todos.find(obj => obj['id'] == id);
    boardPopUp.innerHTML = renderGenerateShowTaskHtml(contact, id);
    const result = filterByTask(userSubtask, contact.id);

    generateCheckBoxSubTask(contact, id, result)
    getshowTaskUserName(contact);
    getCategorieBackGroundColorShowTask(contact, id);
}


/**
 * The function `updateSubtaskStatus` updates the status of a subtask for a given contact by adding or
 * removing it from the selected tasks list, saving the changes to local storage, sending the updated
 * tasks to the server, and initializing the board tasks.
 * @param contact - Contact is an object representing a user or a person. It likely contains
 * information such as name, email, phone number, and other details.
 * @param subtask - The `subtask` parameter in the `updateSubtaskStatus` function represents the
 * specific subtask that you want to update the status for. It is used to identify the subtask within
 * the `contact` object and determine whether it should be added to or removed from the `selectedTask`
 * array
 * @param isChecked - The `isChecked` parameter is a boolean value that indicates whether a subtask is
 * checked or not. If `isChecked` is `true`, it means the subtask is checked; if `isChecked` is
 * `false`, it means the subtask is not checked.
 */
async function updateSubtaskStatus(contact, subtaskContent, isChecked) {
    const result = filterByTask(userSubtask, contact.id);
    const targetSubtask = result.find(element => element.content === subtaskContent);

    if (targetSubtask) {
        const updatedFields = { is_done: isChecked };
        await updateOnServer(targetSubtask.id, updatedFields, 'subtasks/');
    }
}


/**
 * The function `getshowTaskUserName` populates the `show_task_user_name` element with user names and
 * initials from a given contact object.
 * @param contact - It seems like the information about the `contact` object is missing in your
 * message. Could you please provide the details or properties of the `contact` object so that I can
 * assist you further with the `getshowTaskUserName` function?
 */
function getshowTaskUserName(contact) {
    const showTaskUserName = document.getElementById('show_task_user_name');
    showTaskUserName.innerHTML = "";
    let selectedUserArray = getSelectedUsersArray(contact)
    selectedUserArray.forEach(gast => {
        const initial = getInitials(gast.name);
        showTaskUserName.innerHTML += `
            <div class="show_task_assigned_to_users">                
                <div class="board_task_user_initial show_task_user_initial" style="background-color: ${gast.color};">${initial}</div>
                <div>${gast.name}</div>
            </div>
        `;
    })
}


function getSelectedUsers(contact) {
    const guests = [];
    if (contact.assigned_user) {
        const gast = findeGastNachId(usersFromServer, contact.assigned_user);
        let userData = {
            id: gast.id,
            name: gast.user.username,
            color: gast.color
        }

        if (gast) guests.push(userData);
    }

    if (Array.isArray(contact.assigned_guests)) {
        contact.assigned_guests.forEach(id => {
            const gast = findeGastNachId(guesteArray, id);
            if (gast) guests.push(gast);
        });
    }

    return guests
}


function findeGastNachId(guesteArray, id) {
    return guesteArray.find(gast => gast.id === id);
}


/**
 * The `editTask` function retrieves a task by its ID, hides the task container, and populates a popup
 * with the task details for editing.
 * @param id - The `id` parameter in the `editTask` function is used to identify the specific task that
 * needs to be edited. It is passed to the function to locate the task within the `todos` array and
 * retrieve its details for editing.
 */
function editTask(id) {
    let contact = todos.find(obj => obj['id'] == id);
    let boardPopUp = document.getElementById('boardPopUp');
    let showTaskContainer = document.getElementById('showTaskContainer');

    showTaskContainer.style.display = 'none';
    boardPopUp.innerHTML += renderEditTaskHtml(contact);

    getcheckBoxesEdit(id);
    getContactPriorityEdit(contact);
    getContactInitialEdit(contact);
    getSubtaskEdit(contact);
    getCurrentTaskCategoryEdit(contact);
}


/**
 * The function `getContactPriorityEdit` sets the active class on the corresponding HTML element based
 * on the priority of a contact.
 * @param contact - The function `getContactPriorityEdit` takes a `contact` object as a parameter. The
 * `contact` object likely has a property called `priority` which specifies the priority level of the
 * contact. The function then selects elements with IDs 'urgent_edit', 'medium_edit', and 'low_edit'
 */
function getContactPriorityEdit(contact) {
    let urgent_edit = document.getElementById('urgent_edit');
    let medium_edit = document.getElementById('medium_edit');
    let low_edit = document.getElementById('low_edit');

    switch (contact.priority) {
        case 'Urgent':
            urgent_edit.classList.add('active');
            break;
        case 'Medium':
            medium_edit.classList.add('active');
            break
        case 'Low':
            low_edit.classList.add('active');
            break
    }
}


/**
 * The function `getContactInitialEdit` populates input fields with contact information and calls
 * another function to generate selected names.
 * @param contact - The `contact` parameter in the `getContactInitialEdit` function seems to represent
 * an object with properties like `title`, `description`, and `date`. These properties are used to
 * populate input fields in a form with IDs `task_title_edit`, `task_description_edit`, and
 * `task_date_edit
 */
function getContactInitialEdit(contact) {
    let task_title_edit = document.getElementById('task_title_edit');
    let task_description_edit = document.getElementById('task_description_edit');
    let task_date_edit = document.getElementById('task_date_edit');

    task_title_edit.value = contact.title;
    task_description_edit.value = contact.description;
    task_date_edit.value = contact.date;
    generateSelectedNames(contact);
}


/**
 * The function `generateSelectedNames` populates a specified HTML element with user initials and
 * background colors based on the provided contact data.
 * @param contact - It seems like you haven't provided the complete information about the `contact`
 * parameter. Could you please provide more details or the structure of the `contact` object so that I
 * can assist you better in completing the `generateSelectedNames` function?
 */
function generateSelectedNames(contact) {

    let task_edit_initial = document.getElementById('task_edit_initial');
    task_edit_initial.innerHTML = '';

    let selectedGuests = getSelectedUsersArray(contact);

    selectedGuests.forEach(gast => {
        let initial = getInitials(gast.name)
        task_edit_initial.innerHTML += `
                <div class="board_task_user_initial show_task_user_initial" style="background-color: ${gast.color};">${initial}</div>
                `;

    })
}


/**
 * The function `getSubtaskEdit` populates a specified HTML element with subtask information based on a
 * given contact object.
 * @param contact - The `contact` parameter in the `getSubtaskEdit` function seems to be an object that
 * contains information about a contact, including their subtasks. The function loops through the
 * subtasks of the contact and renders HTML elements based on the subtask data. If the contact has
 * subtasks, it
 */
function getSubtaskEdit(contact) {
    let task_subtasks_edit = document.getElementById('show_task_subtask_edit');
    task_subtasks_edit.innerHTML = '';
    const result = filterByTask(userSubtask, contact.id);
    if (result) {
        for (let i = 0; i < result.length; i++) {
            const element = result[i];
            task_subtasks_edit.innerHTML += rendergetSubtaskEditHtml(element, i, contact.id);
        }
    } else {
        task_subtasks_edit.innerHTML = '';
    }
}


function filterByTask(dataArray, taskId) {
    return dataArray.filter(item => item.task === taskId);
}


function getCurrentTaskCategoryEdit(contact) {
    let task_taskCategory_edit = document.getElementById('task_category_edit');
    let currentTaskCategory = contact.category;
    let options = task_taskCategory_edit.options
    for (let i = 0; i < options.length; i++) {
        if (options[i].value === currentTaskCategory) {
            options[i].selected = true;
        } else {
            options[i].selected = false;
        }
    }
}


/**
 * The function `showTaskEditSubtask` displays a specific subtask for editing within a task.
 * @param i - The parameter `i` in the `showTaskEditSubtask` function is likely representing the index
 * of the subtask within the `subtasks` array of the `contact` object.
 * @param id - The `id` parameter in the `showTaskEditSubtask` function is used to find the specific
 * task object in the `todos` array based on its `id` property. This allows the function to retrieve
 * the task details, including its subtasks, for further manipulation.
 */
function showTaskEditSubtask(i, id) {
    let subTask = userSubtask.find(obj => obj['id'] == id)
    let show_task_subtask_edit_btn = document.getElementById(`show_task_subtask_edit_btn${i}`);
    show_task_subtask_edit_btn.style.display = 'flex';
    let show_task_subtask_edit_input = document.getElementById(`show_task_subtask_edit_input${i}`);

    show_task_subtask_edit_input.value = subTask.content;
}


/**
 * The function `addEditSubtask` updates a subtask for a specific task and saves the changes to local
 * storage and the server.
 * @param i - The parameter `i` in the `addEditSubtask` function represents the index of the subtask
 * within the `contact` object's subtasks array that you want to add or edit.
 * @param id - The `id` parameter in the `addEditSubtask` function is used to identify the specific
 * task in the `todos` array that needs to be updated. It is used to find the task object with the
 * matching `id` value in the `todos` array.
 */
async function addEditSubtask(i, id, contactId) {
    let contact = todos.find(obj => obj['id'] == contactId);
    let show_task_subtask_edit_input = document.getElementById(`show_task_subtask_edit_input${i}`).value;
    let subtaskValue = show_task_subtask_edit_input;

    const updatedFields = { content: subtaskValue }
    await updateOnServer(id, updatedFields, 'subtasks/');
    getSubtaskEdit(contact)
}


/**
 * The function `showTaskDeleteSubtask` deletes a subtask from a task, saves the updated task to local
 * storage, sends the updated tasks to the server, and then retrieves the edited subtask for display.
 * @param i - The parameter `i` in the `showTaskDeleteSubtask` function represents the index of the
 * subtask that needs to be deleted from the `subtasks` array of a task.
 * @param id - The `id` parameter in the `showTaskDeleteSubtask` function is used to identify the task
 * for which a subtask needs to be deleted. It is used to find the specific task object from the
 * `todos` array.
 */
async function showTaskDeleteSubtask(id) {
    await deleteSubTaskFromLocalStorage(id)
}


/**
 * The function `addNewSubTaskEdit` adds a new subtask to a task, saves it to local storage, sends it
 * to the server, and updates the UI.
 * @param id - The `id` parameter in the `addNewSubTaskEdit` function is used to identify the specific
 * task in the `todos` array that needs to be updated with a new subtask.
 */
async function addNewSubTaskEdit(id) {
    let contact = todos.find(obj => obj['id'] == id);
    let task_subtasks = document.getElementById('task_subtasks_edit');
    let task_subtasks_edit = task_subtasks.value
    if (!contact.subtasks) {
        contact.subtasks = [];
    }
    if (task_subtasks_edit) {
        contact.subtasks.push(task_subtasks_edit);
    }
    task_subtasks.value = '';
    await saveTasksToServer();
    getSubtaskEdit(contact);
    initBoardTasks();
}


/**
 * The function `upgradeTodos` updates a specific todo item by finding it in the `todos` array,
 * updating its details, guest information, and priority, saving the updates, and then reloading the
 * user interface.
 * @param id - The `id` parameter in the `upgradeTodos` function is used to identify the specific todo
 * item that needs to be upgraded. It is used to find the corresponding todo object in the `todos`
 * array based on the provided `id`.
 */
async function upgradeTodos(id) {
    const contact = todos.find(obj => obj.id == id);
    if (!contact) return;

    const updatedFields = {
        ...getUpdatedContactDetails(),
        ...getUpdatedPriority(),
        ...getUpdatedTaskCategory()
    };
    await updateOnServer(id, updatedFields, 'tasks/');
    reloadUI();
}


/**
 * The function `updateContactDetails` updates contact details based on input values from specific
 * elements in a form.
 * @param contact - The `contact` parameter is an object that represents a contact or task. It contains
 * the following properties:
 */

function getUpdatedContactDetails() {
    let userId = null;
    let contactsIds = [];
    selectedNames.forEach(name => {
        let gast = findeGastNachName(guesteArray, name);
        if (gast) {
            gast.id === user.id ? userId = gast.id : contactsIds.push(gast.id);
        } else {
            gast = usersFromServer.find(guest => guest.user.username === name);
            if (gast) {
                userId = gast.id;
            } else {
                console.warn(`Name "${name}" wurde weder in guesteArray noch in userFromServer gefunden.`);
            }
        }
    });

    return {
        title: document.getElementById('task_title_edit').value,
        description: document.getElementById('task_description_edit').value,
        date: document.getElementById('task_date_edit').value,
        assignedTo: document.getElementById('task_assignet_input_edit').value,
        assigned_guests: contactsIds,
        assigned_user: userId
    };
}



function findeGastNachName(guesteArray, name) {
    return guesteArray.find(gast => gast.name === name)
}


/**
 * The function `updatePriority` updates the priority and priority image of a contact based on a
 * user-defined priority value.
 * @param contact - The `contact` parameter seems to be an object representing a contact. It appears
 * that the function `updatePriority` is designed to update the priority of this contact based on the
 * value of `userPriority`. If `userPriority` is truthy, the function sets the `priority` property of
 * the
 */
function getUpdatedPriority() {
    if (userPriotity) {
        return {
            priority: userPriotity,
            priorityImg: getPriorityUpdateTodos(userPriotity)
        };
    }
    return {};
}

function getUpdatedTaskCategory() {
    return {
        category: document.getElementById('task_category_edit').value
    };
}

/**
 * The function `saveTaskUpdates` saves task updates to both local storage and the server
 * asynchronously.
 */
async function saveTaskUpdates() {
    await saveTasksToServer();
}


/**
 * The `reloadUI` function initializes adding tasks, initializes board tasks, and closes the task
 * display.
 */
function reloadUI() {
    initAddTask();
    initBoardTasks();
    closeShowTask();
}


/**
 * The function searches for a task on a board based on user input and updates the board accordingly.
 */
function searchTaskFromBoard() {
    let input_find_task = document.getElementById('input_find_task');
    input_find_task = input_find_task.value.toLowerCase();

    if (input_find_task) {
        const ids = ['board_to_do', 'board_in_progress', 'board_await_feedback', 'board_done'];
        const elements = ids.map(id => document.getElementById(id));
        elements.forEach(element => element.innerHTML = '');

        for (let i = 0; i < todos.length; i++) {
            const element = todos[i];
            if (element.title.toLowerCase().includes(input_find_task)) {
                let category = element.category;
                searchSwithId(category);
                let searchResult = document.getElementById(searchId);
                searchResult.innerHTML = renderHtmlToDo(element);
                getInitialsArray(element);
                getCategorieBackGroundColor(element);
            }
        }
    } else {
        initBoardTasks();
    }
}


/**
 * The function `getInitialsArray` populates a board with initials and colors, showing a limited number
 * of initials with circles and displaying the rest as a count.
 * @param element - The `element` parameter in the `getInitialsArray` function seems to represent an
 * object with properties like `initial`, `color`, and `id`. The function retrieves the initials and
 * colors arrays from the `element` object, sets a limit for the number of initials to display, and
 * then
 */
function getInitialsArray(element) {
    const { assigned_user: userId, assigned_guests: guestIds = [], id } = element;
    let guests = getSelectedUsersArray(element)
    const initialsArray = guests.map(g => getInitials(g.name));
    const colorsArray = guests.map(g => g.color || '#ccc');
    const showLimit = 3;
    const boardTaskInitial = document.getElementById(`board_task_initial${element.id}`);
    boardTaskInitial.innerHTML = '';

    initialsArray.forEach((initial, i) => {
        if (i < showLimit) {
            boardTaskInitial.innerHTML += createInitialBlock(initial, colorsArray[i]);
        } else if (i === showLimit) {
            boardTaskInitial.innerHTML += createRemainingPersonsBlock(initialsArray.length - showLimit);
        }
    });
}



function getSelectedUsersArray(element) {
    const { assigned_user: userId, assigned_guests: guestIds = [], id } = element;
    const guests = [];

    if (userId) {
        const user = usersFromServer.find(user => user.id === userId);
        let userDate = {
            id: user.id,
            name: user.user.username,
            color: user.color
        }
        if (user) guests.push(userDate);
    }
    guestIds.forEach(guestId => {
        const guest = findeGastNachId(guesteArray, guestId);
        if (guest) guests.push(guest);
    });

    return guests
}