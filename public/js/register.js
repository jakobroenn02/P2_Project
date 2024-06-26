const locationInput = document.querySelector(".register-location-input");
const locationsContainer = document.querySelector(".register-locations")
const locationElements = document.getElementsByClassName("register-location");
const submitButton = document.querySelector(".register-button");
const validityLocationsText = document.querySelector(".register-locations-validity");

let locations = getAllTextsFromLocations(locationElements)

// Get innerText of all locations
function getAllTextsFromLocations(elements) {
    let output = []
    for (let i = 0; i < elements.length; i++) {
        output.push(elements[i].innerText)
    }
    return output;
}

// Checks if location input is valid i.e. if it contains the predefined locations or not 
function isRegisterValid() {
    let isValid = true
    if (!locations.includes(locationInput.value)) {
        isValid = false;
    }
    return isValid;
}

// Checks for isValid state and disallows form submission if not valid
function updateValidityOfPage() {
    if (isRegisterValid()) {
        submitButton.classList.remove("register-button-disabled")
        submitButton.disabled = false;
        validityLocationsText.hidden = true

    } else {
        submitButton.classList.add("register-button-disabled")
        submitButton.disabled = true;
        validityLocationsText.hidden = false;
    }
}

// Search functionality for locations
locationInput.addEventListener("keyup", (e) => {
    for (let i = 0; i < locationElements.length; i++) {
        if (!locationElements[i].innerText.toLowerCase().includes(locationInput.value.toLowerCase())) {
            locationElements[i].hidden = true;
        } else {
            locationElements[i].hidden = false;
        }
    }
    updateValidityOfPage();
})

// Removes focus if clicked anywhere but on locations input field
locationInput.addEventListener("focusout", (e) => {
    locationsContainer.hidden = true;
    updateValidityOfPage();

})

// On registered input to locations input field, focuses on container
locationInput.addEventListener("focusin", (e) => {
    locationsContainer.hidden = false;

    for (let i = 0; i < locationElements.length; i++) {
        locationElements[i].hidden = false;
    }
})

for (let i = 0; i < locationElements.length; i++) {
    locationElements[i].addEventListener("mousedown", (e) => {
        locationInput.value = locationElements[i].innerText
    })
}


