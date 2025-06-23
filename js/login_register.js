const BASE_URL = 'http://127.0.0.1:8000/api/';
SetRememberData();
checkIsUserLoginFromLastSession();

/**
 * this function is used to show the signUp and to hide the login
 */
function showSignUpBox() {
    document.getElementById('login-section').classList.replace('d-center', 'd-none');
    document.getElementById('register-section').classList.replace('d-none', 'd-center');
    document.getElementById('signup-button-area').classList.replace('signUp', 'd-none');
    document.getElementById('signUp-mobile-section').classList.replace('signUp-mobile', 'd-none');
}

/**
 * this function is used to show the login and to hide the signup
 */

function showLoginBox() {
    document.getElementById('login-section').classList.replace('d-none', 'd-center');
    document.getElementById('register-section').classList.replace('d-center', 'd-none');
    document.getElementById('signup-button-area').classList.replace('d-none', 'signUp');
    document.getElementById('signUp-mobile-section').classList.replace('d-none', 'signUp-mobile');
    document.getElementById('login-section').classList.remove('fade-in');
    document.getElementById('register-section').classList.remove('fade-in');
    document.getElementById('signup-button-area').classList.remove('fade-in');
    document.getElementById('signup-button-area-mobile').classList.remove('fade-in');
}

/**
 * This function is used to check if the user has logged out in the last session and then redirect him to the login page or to the summery
 */

function checkIsUserLoginFromLastSession() {
    let localstorage = localStorage.getItem('currentUser');
    if (localstorage != null) {
        window.location.href = 'summary.html';
    }
}

/**
 * this function is used to load data from the databank
 * 
 * @param {string} path this is the path from the BASE_URL
 * @returns the JSON from download
 */

async function loadData() {
    const token = localStorage.getItem('authToken');
    
    const response = await fetch(`${BASE_URL}auth/users`, {
        method: 'GET',
        headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (response.status === 401) {
        console.warn("Nicht autorisiert – Weiterleitung zur Login-Seite.");
        window.location.href = 'index.html';
        return;
    }

    const responseToJson = await response.json();
    return responseToJson;
}

/**
 * this function is used to upload data to the databank
 * 
 * @param {string} path this is the path from the BASE_URL
 * @param {*} data the data that you want to upload
 * @returns 
 */

async function postData(data) {
    try {
        const response = await fetch(`${BASE_URL}auth/register/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
    } catch (error) {
        console.error('Failed to save tasks to server:', error);
    }
}

/**
 * this function is used for the login
 */

async function login() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const rememberMe = document.getElementById('login-rememberme').checked;

    try {
        const response = await fetch(`${BASE_URL}auth/login/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });

        const result = await response.json();        

        if (response.ok) {
            localStorage.setItem('authToken', result.token);
            setCurrentUserInLocalStorage(result.user);
            if (rememberMe) {
                setEmailToLocalstorage(email);
            } else {
                removeEmailFromLocalstorage();
            }
            window.location.href = "summary.html";
        } else {
            if (result.error === "Falsches Passwort") {
                wrongPassword('show');
            } else {
                showLoginError(result.error);
            }
        }
    } catch (error) {
        // console.error('Login fehlgeschlagen:', error);
        // showLoginError("Ein Fehler ist aufgetreten. Bitte versuche es erneut.");
    }
}


function showLoginError(message) {
    const errorElement = document.getElementById('login-error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('d-none');
    }
}


/**
 * this function is used to login with the guest user
 */

async function guestLogin() {
    const guestEmail = 'gast@join.de';
    const guestPassword = '1234567';

    await loginWithCredentials(guestEmail, guestPassword);
}


async function loginWithCredentials(email, password) {
    try {
        const response = await fetch(`${BASE_URL}auth/login/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (!response.ok) {
            throw new Error("Login fehlgeschlagen");
        }
        const result = await response.json();
        localStorage.setItem('authToken', result.token);
        setCurrentUserInLocalStorage(result.user);
        window.location.href = "summary.html";
    } catch (error) {
        console.error('Gast Login fehlgeschlagen:', error);
    }
}

/**
 * this function is used to set a default user for the guestlogin
 */
function setDefaultUser(data) {
    const gastEintrag = data.find(item => item.user.username === "Gast");

    let defaultUser = {
        name: gastEintrag.user.username,
        email: gastEintrag.user.email,
        password: gastEintrag.user.password,
        color: gastEintrag.color,
    }
    localStorage.setItem('currentUser', JSON.stringify(defaultUser));
}

/**
 * this function is used to set the current user in localstorage
 * 
 * @param {*} data 
 */

function setCurrentUserInLocalStorage(data) {
    let user = {
        id: data.id,
        name: data.user.username,
        email: data.user.email,
        color: data.color,
    }

    localStorage.setItem('currentUser', JSON.stringify(user));
}


/**
 * this function is used to set the email to localstorage
 * 
 * @param {*} email 
 */

function setEmailToLocalstorage(email) {
    localStorage.setItem('login-name', email);
}

/**
 * this function is used to delete the email from localstorage
 */

function removeEmailFromLocalstorage() {
    localStorage.removeItem('login-name');
}

/**
 * this functios is used to get and set data from databank in the inputs from login if has the client check the remember box at last session
 */

async function SetRememberData() {
    const email = localStorage.getItem('login-name');
    if (email !== null) {
        const data = await loadData();
        const indexOfEmail = data.findIndex(element => element['email'] == email);
        const password = data[indexOfEmail]['password'];
        document.getElementById('login-email').value = email;
        document.getElementById('login-password').value = password;
        document.getElementById('login-rememberme').checked = true;
        setPasswordIconToEye('login');
    }
}

/**
 * this function is used to upload the data from registration formular to the databank
 */

async function register() {
    const name = document.getElementById('register-name').value
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register1-password').value;
    const passwordCheck = document.getElementById('register2-password').value;

    if (password !== passwordCheck) {
        noMatchingPassword('show');
        return;
    }

    let listOfUser = {
        color: randomContactColor(),
        username: name,
        email: email,
        password: password,
        repeated_password: passwordCheck
    };

    postData(listOfUser);
    signUpSuccesfullyInfoBox('show');
    setTimeout(() => { showLoginBox(); }, 2000);
    setTimeout(() => { signUpSuccesfullyInfoBox('hide'); }, 2000);
}

/**
 * this function is used to show or hide the password from input field
 * 
 * @param {string} id document id from the password field
 */

function togglePasswordVisibility(id) {
    const passwordField = document.getElementById(id + '-password');
    const toggleIcon = document.getElementById(id + '-password-icon');
    if (passwordField.type === "password") {
        passwordField.type = "text";

        toggleIcon.src = "./assets/img/password-show.png"; // Symbol zum Verbergen
    } else {
        passwordField.type = "password";
        toggleIcon.src = "./assets/img/password-hide.png";
    }
}

/**
 * this function is used to toggle icon in password inputfield between hide oder show icon
 * 
 * @param {*} id document id from the password field
 */

function togglePasswordIcon(id) {
    const passwordField = document.getElementById(id + '-password')
    if (passwordField.value.length == 0) {
        setPasswordIconToLock(id);
    } else {
        setPasswordIconToEye(id);
    }
}


/**
 * this function is used to set the icon from password inputfield to lock icon
 * 
 * @param {*} id document id from the password field
 */

function setPasswordIconToLock(id) {
    const toggleContainer = document.getElementById(id + '-password-icon-container');
    const toggleIcon = document.getElementById(id + '-password-icon');
    toggleIcon.src = './assets/img/lock.svg'
    toggleIcon.style.cursor = 'default';
    toggleContainer.onclick = null;
    toggleContainer.removeAttribute('onclick');
}

/**
 * this function is used to set the icon from password inputfield to eye icon
 * 
 * @param {*} id document id from the password field - 'login' or 'register'
 */

function setPasswordIconToEye(id) {
    const toggleContainer = document.getElementById(id + '-password-icon-container');
    const toggleIcon = document.getElementById(id + '-password-icon');
    const passwordField = document.getElementById(id + '-password');
    toggleIcon.style.cursor = 'pointer'
    toggleContainer.setAttribute('onclick', 'togglePasswordVisibility("' + id + '")');
    if (passwordField.type === 'password') {
        toggleIcon.src = "./assets/img/password-hide.png";
    } else {
        toggleIcon.src = "./assets/img/password-show.png";
    }
}

/**
 * this function is used to delete a user from databank
 * 
 * @param {string} username 
 */

async function deleteUser(username) {
    const users = await loadData('/users');
    for (let i = 0; i < users.length; i++) {
        const user = users[i];
        if (user['email'] == username) {
            users.splice(i, 1);
        };
    }
    postData('/users', users);
}

/**
 * this function is used to show the password is wrong
 * 
 * @param {string} val 'show' or 'hide' infotext
 */

function wrongPassword(val) {
    const wrongPassword = document.getElementById('wrong-password');
    const inputField = document.getElementById('login-password');
    if (val == 'show') {
        wrongPassword.style.display = 'block';
        inputField.style.borderColor = 'red';
    } else {
        wrongPassword.style.display = 'none';
        inputField.style.borderColor = '#d1d1d1';
    }
}


/**
 * this function is used to show the password no matching with the first password from inputfiel
 * 
 * @param {*} val 'show' or 'hide' infotext
 */

function noMatchingPassword(val) {
    const wrongPassword = document.getElementById('match-password');
    const inputField = document.getElementById('register2-password');
    if (val == 'show') {
        wrongPassword.style.display = 'block';
        inputField.style.borderColor = 'red';
    } else {
        wrongPassword.style.display = 'none';
        inputField.style.borderColor = '#d1d1d1';
    }
}

/**
 * this function is used to show a box that has the info the client registration is successfull
 * 
 * @param {string} val 'show' or 'hide' the infobox
 */

function signUpSuccesfullyInfoBox(val) {
    if (val == 'show') {
        document.getElementById('signup-succesfully-infobutton').style.display = 'flex'
    } else {
        document.getElementById('signup-succesfully-infobutton').style.display = 'none'
    }
}

/**
 * this function is used to generate a random color for the new user
 * 
 * @returns the contact color
 */

function randomContactColor() {
    return contactColor[randomNumber(1, 14)];
}

/**
 * this function is used to generate a random number for the randomContactColor function
 * 
 * @param {integer} min the min value
 * @param {integer} max the max value
 * @returns a random number between min and max value
 */

/**
 * this function is used to generate random number
 * @param {integer} min min value 
 * @param {integer} max max value
 * @returns a random value between the min value and max value
 */
function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

const contactColor = {
    1: "#FFBB2C",
    2: "#FF4646",
    3: "#FFE62C",
    4: "#C3FF2B",
    5: "#0038FF",
    6: "#FFC703",
    7: "#FC71FF",
    8: "#FFA35E",
    9: "#20D7C2",
    10: "#06BEE8",
    11: "#9327FF",
    12: "#6E52FF",
    13: "#FF5EB3",
    14: "#FF7A01",
};

function postTestData() {
    const users = [
        {
            'email': 'test1@example.de',
            'name': 'user1',
            'password': '123',
            'color': 'rgb(255, 187, 44)'
        },
        {
            'email': 'test2@example.de',
            'name': 'user2',
            'password': '123',
            'color': 'rgb(255, 70, 70)'
        },
        {
            'email': 'test3@example.de',
            'name': 'user3',
            'password': '123',
            'color': 'rgb(255, 230, 44)'
        }
    ];

    postData('/users', users);
}

/**
 * this function is used to generate the initials from name.
 * 
 * @param {*} contact 
 * @returns the first letter from first name and first letter from last name
 */

function getInitials(contact) {
    let rgx = new RegExp(/(\p{L}{1})\p{L}+/, 'gu');

    let initials = [...contact['name'].matchAll(rgx)] || [];

    initials = (
        (initials.shift()?.[1] || '') + (initials.pop()?.[1] || '')
    ).toUpperCase();

    return initials;
}
