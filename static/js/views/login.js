import { isValid } from "./register.js";
import { navigateTo } from "./router.js";
import { sendEvent } from "./ws.js";

export default async function () {
  addLoginPageHtml();

  addLoginFormFunctionality();
}

const addLoginFormFunctionality = () => {
  addNameOrEmailCheck();
  addPasswordCheck();

  const loginData = {};
  const loginForm = document.getElementById("loginForm");

  document.getElementById("Register").addEventListener("click", (e)=>{
    e.preventDefault();
    navigateTo("/register");
  })

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    var formData = new FormData(loginForm);

    if (isValid(formData.entries())) {
      for (var [key, value] of formData.entries()) {
        loginData[key] = value;
      }

      const options = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData),
      };
      try {
        const response = await fetch("/post-login", options);
        handleLoginResponse(response);
      } catch (error) {
        console.error(error);
      }
    }
  });
};

const addNameOrEmailCheck = () => {
  const nicknameOrEmail = document.getElementById("nicknameOrEmail");
  nicknameOrEmail.addEventListener("input", () => {
    document.getElementById("form-error").innerHTML = "";
    document.getElementById("nicknameOrEmail-error").innerHTML = "";
    if (nicknameOrEmail.value.length < 3) {
      document.getElementById("nicknameOrEmail-error").innerHTML =
        "Nickname or email is too short";
    }
  });
};

const addPasswordCheck = () => {
  const password = document.getElementById("password");
  password.addEventListener("input", () => {
    document.getElementById("form-error").innerHTML = "";
    document.getElementById("password-error").innerHTML = "";
    if (password.value.length < 6) {
      document.getElementById("password-error").innerHTML =
        "Password is too short";
    }
  });
};

const handleLoginResponse = async (response) => {
  if (response.ok) {
    const data = await response.json();
    localStorage.setItem("userData", JSON.stringify(data));
    //navigateTo("/")
    window.location.href = "/";
    sendEvent("update_chatbar_data", "updating chatbar, reason login");
  } else {
    const statusMsg = await response.text();
    document.getElementById("form-error").innerHTML = statusMsg.replace(
      "Login unsuccessful: ",
      ""
    );
  }
};

const addLoginPageHtml = () => {
  document.querySelector("#app").innerHTML =
    `<div class = "container-login">
    <div class="heading">
        <header style="font-size: 65px;">Welcome back!</header>
    </div>
<form id="loginForm" method="POST" class="loginForm">
    <input class="inputbox" id="nicknameOrEmail" name="nicknameOrEmail" placeholder="Nickname or Email"></input>
    <div class="errorMessage">
        <span id="nicknameOrEmail-error"></span>
    </div>

    <input class="inputbox" id="password" name="password" placeholder="Password" type="password" id="password" maxlength="30"></input>
    <div class="errorMessage">
        <span id="password-error"></span>
    </div>

    <div class="errorMessage">
        <span id="form-error"></span>
    </div>

    <button class="button-33" type="submit">Log in</button>
    <h1 style="text-align: center">or</h1>
    <button class="button-33" type="button" id="Register">Register</button>
</form>
</div>`;
};
