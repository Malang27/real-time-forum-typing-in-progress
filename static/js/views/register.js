import { navigateTo } from "./router.js"

export default async function() {
    addRegisterPageHtml()

    addRegisterFormFunctionality()
}

const addPasswordCheck = () => {
    var password = document.getElementById("password")
    var confirmPassword = document.getElementById("confirmPassword")

    confirmPassword.addEventListener("input", function() {
        if(password.value != confirmPassword.value) {
            document.getElementById("password-error").innerHTML = "Passwords don't match"
        } else if (password.value.length < 6){
            document.getElementById("password-error").innerHTML = "Password is too short"
        } else {
            document.getElementById("password-error").innerHTML = ""
        }
    })
}

const addRegisterFormFunctionality = () => {

    addNicknameCheck()
    addEmailCheck()
    addNameCheck()
    addAgeCheck()
    addPasswordCheck()

    const registerData = {}
    const registerForm = document.getElementById("registerForm")
    document.getElementById("login").addEventListener("click", (e)=>{
        e.preventDefault();
        navigateTo("/");
    })

    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault()
        var formData = new FormData(registerForm)

        if(isValid(formData.entries())) {
            for (var [key, value] of formData.entries()) {
                if(key === "age") {
                    value = parseInt(value)
                }
                if(key !== "confirmPassword") {
                    registerData[key] = value
                }
            }
    
            const options = {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(registerData)
            }
            try {
                const response = await fetch("/post-register", options)
                handleRegisterResponse(response)
            } catch (error) {
                console.error(error)
            }
        }
    })
}

const addNicknameCheck = () => {
    const nickname = document.getElementById("nickname")
    nickname.addEventListener("input", function() {
        document.getElementById("form-error").innerHTML = ""
        document.getElementById("nickname-error").innerHTML = ""
        if(nickname.value.length < 3) {
            document.getElementById("nickname-error").innerHTML = "Nickname is too short"
        } else if(!/^[A-Za-z\d\-_\.]+$/.test(nickname.value)) {
            document.getElementById("nickname-error").innerHTML = "Nickname contains invalid characters"
        }
    })
}

const addEmailCheck = () => {
    const email = document.getElementById("email")

    email.addEventListener("input", function() {
        document.getElementById("email-error").innerHTML = ""
        document.getElementById("form-error").innerHTML = ""
        if(!/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(email.value)) {
            document.getElementById("email-error").innerHTML = "Not a valid email address"
        }
    })
}

const addNameCheck = () => {
    const firstName = document.getElementById("firstName")
    const lastName = document.getElementById("lastName")

    firstName.addEventListener("input", function() {
        document.getElementById("form-error").innerHTML = ""
        if(firstName.value.length < 1) {
            document.getElementById("firstName-error").innerHTML = "First name is required"
        } else {
            document.getElementById("firstName-error").innerHTML = ""
        }
    })

    lastName.addEventListener("input", function() {
        document.getElementById("form-error").innerHTML = ""
        if(lastName.value.length < 1) {
            document.getElementById("lastName-error").innerHTML = "Last name is required"
        } else {
            document.getElementById("lastName-error").innerHTML = ""
        }
    })
}

const addAgeCheck = () => {
    const age = document.getElementById("age")

    age.addEventListener("input", function() {
        document.getElementById("form-error").innerHTML = ""
        if(age.value < 1 || age.value > 116) {
            document.getElementById("age-error").innerHTML = "Age needs to be between 1 and 116"
        } else {
            document.getElementById("age-error").innerHTML = ""
        }
    })
}

export const isValid = (formEntries) => {
    var isValid = true
    for (var [key, value] of formEntries) {
        if(!value) {
            document.getElementById("form-error").innerHTML = "All fields are required"
            isValid = false
        }
    }

    document.querySelectorAll('span[id*="error"]').forEach((errSpan) => {
        if(errSpan.textContent) {
            isValid = false
        }
    })
    return isValid
}

const handleRegisterResponse = async (response) => {
    if(response.ok) {
        navigateTo("/login")
    } else {
        const statusMsg = await response.text()
        if(statusMsg.includes("nickname")) {
            document.getElementById("nickname-error").innerHTML = "This nickname is not available"
        }
        if(statusMsg.includes("email")) {
            document.getElementById("email-error").innerHTML = "This email address is not available"
        }
    }
}

const addRegisterPageHtml = () => {
    document.querySelector("#app").innerHTML = `
    <div class="container-login">
    <div class="heading">
        <header style="font-size: 2.5vw;">Registration</header>
    </div>
    <form id="registerForm" class="loginForm">
        <input class="inputbox" name="nickname" id="nickname" placeholder="Nickname" maxlength="15"></input><br>
        <div class="errorMessage">
            <span id="nickname-error"></span>
        </div>

        <input class="inputbox" name="email" id="email" placeholder="Email"></input><br>
        <div class="errorMessage">
            <span id="email-error"></span>
        </div>

        <input class="inputbox" name="firstName" id="firstName" placeholder="First Name" type="text"></input><br>
        <div class="errorMessage">
            <span id="firstName-error"></span>
        </div>

        <input class="inputbox" name="lastName" id="lastName" placeholder="Last Name" type="text"></input><br>
        <div class="errorMessage">
            <span id="lastName-error"></span>
        </div>

        <input class="inputbox" name="age" id="age" placeholder="Age" type="number"></input><br>
        <div class="errorMessage">
            <span id="age-error"></span>
        </div>

        <select class="inputbox" name="gender" placeholder="Gender">
            <option>Male</option>
            <option>Female</option>
            <option>Other</option>
        </select><br>

        <input class="inputbox" name="password" placeholder="Password (min 6 characters)" type="password" id="password" maxlength="30"></input><br>
        <input class="inputbox" name="confirmPassword" type="password" placeholder="Confirm Password" id="confirmPassword" maxlength="30"></input><br>
        <div class="errorMessage">
            <span id="password-error"></span>
        </div>

        <div class="errorMessage">
            <span id="form-error"></span>
        </div>

        <button type="submit" class="button-33">Register</button>
        <button type="button" class="button-33" id="login">Login</button>
    </form>
</div>`
}
    
