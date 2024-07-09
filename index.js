"use strict";

(function () {
    window.addEventListener("load", init);

    const URL = "http://127.0.0.1:5000"
    const MONTH = 2592000000;

    async function init() {
        qs("#register form").addEventListener("submit", makeRegisterRequest);
        qs("#login form").addEventListener("submit", makeLoginRequest);
        qs("#login > button").addEventListener("click", displayRegister);
        qs("#register > button").addEventListener("click", displayLogin);
        qs("#textbox input").addEventListener("change", toggleSubmit);
        id("textbox").addEventListener("submit", makeRequest);
        id("signout-btn").addEventListener("click", signOut);
        id("clear-btn").addEventListener("click", clearHistory);

        await checkCookie();
    }
    
    async function clearHistory() {
        try {
            let params = new FormData();
            params.append("username", (await cookieStore.get("username")).value);
            let res = await fetch(URL + "/clear", {
                method: "POST",
                body: params
            });
            await statusCheck(res);
            await makeChatRequest();
            id("chat").innerHTML = "";
        } catch (err) {
            console.log(err);
            handleError("chat");
        }
    }

    async function checkCookie() {
        if (await cookieStore.get("username")) {
            await displayHome();
            if ((await cookieStore.get("username")).value === "test") {
                let fileInput = document.createElement("input");
                fileInput.type = "file";
                fileInput.id = "file-input";
                id("textbox").appendChild(fileInput);
                fileInput.addEventListener("change", feedQuestions);
            }
        } else {
            displayLogin();
        }
    }

    function displayLogin() {
        id("home").classList.add("hidden");
        id("login").classList.remove("hidden");
        id("register").classList.add("hidden");
    }

    async function signOut() {
        await cookieStore.delete("username");
        await checkCookie();
    }

    function displayRegister() {
        id("home").classList.add("hidden");
        id("login").classList.add("hidden");
        id("register").classList.remove("hidden");
    }

    async function displayHome() {
        id("home").classList.remove("hidden");
        id("login").classList.add("hidden");
        id("register").classList.add("hidden");
        id("chat").innerHTML = "";

        await makeChatRequest();
    }

    async function makeChatRequest() {
        try {
            let username = (await cookieStore.get("username")).value;
            let res = await fetch(URL + "/get-all-chat/" + username);
            await statusCheck(res);
            res = await res.json();
            populateSidebar(res);
        } catch (err) {
            console.log(err);
            handleError("chat");
        }
    }

    function populateSidebar(res) {
        id("sidebar").innerHTML = "";

        let data = {};
        
        for (let i = 0; i < res.length; i++) {
            let date = res[i][4];
            if (!data[date]) {
                data[date] = [];
            } 
            data[date].push(res[i]);
        }

        for (let date in data) {
            let dateTitle = document.createElement("h2");
            dateTitle.textContent = date;
            dateTitle.addEventListener("click", ()=> {
                populateChat(data[date]);
            });
            for (let i = 0; i < data[date].length; i++) {
                let queryTitle = document.createElement("h3");
                queryTitle.textContent = data[date][i][2];
                queryTitle.addEventListener("click", () => {
                    populateChat([data[date][i]]);
                });
                queryTitle.addEventListener("dblclick", async () => {
                    await deleteChat(data[date][i][0]);
                });
                id("sidebar").prepend(queryTitle);
            }
            id("sidebar").prepend(dateTitle);
        }
    }

    async function deleteChat(id) {
        try {
            let params = new FormData();
            params.append("id", id);
            let res = await fetch("URL + /delete", {
                method: "POST",
                body: params
            });
            await statusCheck(res);
            await makeChatRequest();
        } catch (err) {
            handleError("chat");
        }
    }
    function populateChat(res) {
        id("chat").innerHTML = "";
        for(let i = 0; i < res.length; i++) {
            let entry = res[i];
            displayEntry(entry[2], false);
            displayEntry(entry[3], true, JSON.parse(entry[5]));
        }
    }

    async function makeRegisterRequest(e) {
        try {
            e.preventDefault();
            let params = new FormData(qs("#register form"));
            let res = await fetch(URL + "/register", {
                method: "POST",
                body: params
            });
            await statusCheck(res);
            let username = qs("#register form input").value;
            cookieStore.set({
              name: "username",
              value: username,
              expires: Date.now() + MONTH
            });
            await displayHome();
        } catch (err) {
            console.log(err);
            displayLoginError();
        }
    }

    async function makeLoginRequest(e) {
        try {
            e.preventDefault();
            let params = new FormData(qs("#login form"));
            let res = await fetch(URL + "/login", {
                method: "POST",
                body: params
            });
            await statusCheck(res);
            let username = qs("#login form input").value;
            cookieStore.set({
              name: "username",
              value: username,
              expires: Date.now() + MONTH
            });
            await displayHome();
        } catch (err) {
            console.log(err);
            displayLoginError();
        }
    }

    function toggleSubmit() {
        let button = qs("#textbox button");
        if (this.value.replaceAll(" ", "")){
            button.disabled = false;
        } else {
            button.disabled = true;
        }
    }

    async function makeRequest(e) {
        try{
            e.preventDefault();
            let query = qs("#textbox input").value;
            displayEntry(query, false);
            let loading = displayLoading();
            qs("#textbox button").disabled = true;
            let username = (await cookieStore.get("username")).value;
            let params = new FormData();
            params.append("query", query);
            params.append("username", username);
            let res = await fetch(URL + "/getresponse", {
                method: "POST",
                body: params
            });
            await statusCheck(res);
            res = await res.json();
            let aiResponse = res[0];
            let links = res[1];
            loading.remove();
            displayEntry(aiResponse, true, links);

            qs("#textbox button").disabled = false;
            qs("#textbox input").value = "";
            await makeChatRequest();
        } catch (err) {
            console.log(err);
            handleError("chat");
        }
    }

    function displayLoading() {
        let resTextbox = document.createElement("article");
        let aiImage = document.createElement("img");
        aiImage.src = "AI.png";
        resTextbox.prepend(aiImage);

        let loadingImage = document.createElement("img");
        loadingImage.src = "loading.gif";
        resTextbox.appendChild(loadingImage);
        resTextbox.classList.add("chat-entry");
        resTextbox.classList.add("response");
        resTextbox.classList.add("shadow");

        id("chat").appendChild(resTextbox);
        id("chat").scrollTop = id("chat").scrollHeight;

        return resTextbox;
    }

    function displayEntry(res, response, links=null) {
        let resTextbox = document.createElement("article");
        let text = document.createElement("p");
        text.textContent = res;

        if (links) {
            // Create a text node for the initial text and the "References:" label
            text.appendChild(document.createTextNode("\nReferences: "));
            for (let i = 0; i < links.length; i++) {
                // Create a text node for the link index and description
                text.appendChild(document.createTextNode("\n" + (i + 1) + ") "));
        
                let urlElement = document.createElement("a");
                urlElement.href = links[i];
                urlElement.textContent = links[i];
                
                // Append the anchor element
                text.appendChild(urlElement);
            }
        }

        resTextbox.appendChild(text);
        resTextbox.classList.add("chat-entry");
        if (response) {
            resTextbox.classList.add("response");
            let img = document.createElement("img");
            img.src = "AI.png";
            resTextbox.prepend(img);
        } else {
            resTextbox.classList.add("question");
            let img = document.createElement("img");
            img.src = "user.png";
            resTextbox.appendChild(img);
        }
        resTextbox.classList.add("shadow");
        id("chat").appendChild(resTextbox);
    }

    async function feedQuestions(e) {
        try {
            e.preventDefault();
            let username = (await cookieStore.get("username")).value;
            let file = id("file-input").files[0];
            console.log(file);
            if (file) {
                let reader = new FileReader();
                reader.readAsText(file);
                reader.onload = function(e) {
                    console.log("inside");
                    let fileContent = e.target.result;
                    let lines = fileContent.split("\n");

                    lines.forEach(async (line, index) => {
                        let params = new FormData();
                        params.append("query", line);
                        params.append("username", username);
                        console.log(line);
                        let res = await fetch(URL + "/getresponse", {
                            method: "POST",
                            body: params
                        });
                        await statusCheck(res);
                    });
                }
            }
        } catch (err) {
            console.log(err);
            handleError("chat");
        }
    }

    function handleError(section) {
        let error = document.createElement("p");
        error.textContent = "An Error Occured. Try Again Later!";
        error.classList.add("error");
        id(section).appendChild(error);
    }

    function displayLoginError() {
        qs("#login p").classList.remove("hidden");
        qs("#register p").classList.remove("hidden");
        setTimeout(() => {
            qs("#login p").classList.add("hidden");
            qs("#register p").classList.add("hidden");
        }, 3000);
    }

    /**
     * Returns the element that has the ID attribute with the specified value.
     * @param {string} id - element ID.
     * @returns {object} - DOM object associated with id.
     */
    function id(id) {
        return document.getElementById(id);
    }

    /**
     * Returns first element matching selector.
     * @param {string} selector - CSS query selector.
     * @returns {object} - DOM object associated selector.
     */
    function qs(selector) {
        return document.querySelector(selector);
    }

    /**
     * Returns the array of elements that match the given CSS selector.
     * @param {string} query - CSS query selector
     * @returns {object[]} array of DOM objects matching the query.
     */
    function qsa(query) {
        return document.querySelectorAll(query);
    }

    /**
     * Helper function to return the response's result text if successful, otherwise
     * returns the rejected Promise result with an error status and corresponding text
     * @param {object} res - response to check for success/error
     * @return {object} - valid response if response was successful, otherwise rejected
     *                    Promise result
     */
    async function statusCheck(res) {
        if (!res.ok) {
        throw new Error(await res.text());
        }
        return res;
    }
})()
