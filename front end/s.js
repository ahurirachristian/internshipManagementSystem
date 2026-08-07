// ===============================
// ELEMENTS
// ===============================

const modal = document.getElementById("companyModal");
const addBtn = document.getElementById("addBtn");
const closeBtn = document.getElementById("closeModal");

const form = document.getElementById("companyForm");

const steps = document.querySelectorAll(".form-step");
const indicators = document.querySelectorAll(".step");

const prevBtn = document.getElementById("prevBtn");
const nextBtn = document.getElementById("nextBtn");
const submitBtn = document.getElementById("submitBtn");

const tbody = document.querySelector("#companyTable tbody");

const companyName = document.getElementById("companyName");
const companyEmail = document.getElementById("companyEmail");
const country = document.getElementById("country");
const branch = document.getElementById("branch");
const website = document.getElementById("website");
const postalAddress = document.getElementById("postalAddress");
const physicalAddress = document.getElementById("physicalAddress");

const formTitle = document.getElementById("formTitle");

let currentStep = 0;
let editIndex = -1;

let companies = JSON.parse(localStorage.getItem("companies")) || [];


// =================================
// LOAD TABLE
// =================================

loadTable();


// =================================
// OPEN MODAL
// =================================

addBtn.onclick = () => {

    editIndex = -1;

    form.reset();

    formTitle.innerText = "Add Company";

    currentStep = 0;

    updateSteps();

    modal.style.display = "flex";

};


// =================================
// CLOSE MODAL
// =================================

closeBtn.onclick = () => {

    modal.style.display = "none";

};

window.onclick = function(e){

    if(e.target === modal){

        modal.style.display = "none";

    }

};


// =================================
// NEXT BUTTON
// =================================

nextBtn.onclick = () => {

    if(currentStep < steps.length-1){

        currentStep++;

        updateSteps();

    }

};


// =================================
// PREVIOUS BUTTON
// =================================

prevBtn.onclick = () => {

    if(currentStep > 0){

        currentStep--;

        updateSteps();

    }

};


// =================================
// UPDATE STEP DISPLAY
// =================================

function updateSteps(){

    steps.forEach(step=>step.classList.remove("active"));

    indicators.forEach(step=>step.classList.remove("active"));

    steps[currentStep].classList.add("active");

    indicators[currentStep].classList.add("active");

    prevBtn.style.display = currentStep===0 ? "none":"inline-block";

    nextBtn.style.display = currentStep===steps.length-1 ? "none":"inline-block";

    submitBtn.style.display = currentStep===steps.length-1 ? "inline-block":"none";

}

updateSteps();


// =================================
// SUBMIT FORM
// =================================
form.addEventListener("submit", function (e) {

    e.preventDefault();

    if (!companyName.value.trim()) {
        alert("Enter Company Name");
        currentStep = 0;
        updateSteps();
        return;
    }

    if (!companyEmail.value.trim()) {
        alert("Enter Company Email");
        currentStep = 0;
        updateSteps();
        return;
    }

    if (!website.value.trim()) {
        alert("Enter Website");
        currentStep = 1;
        updateSteps();
        return;
    }

    if (!postalAddress.value.trim()) {
        alert("Enter Postal Address");
        currentStep = 2;
        updateSteps();
        return;
    }

    if (!physicalAddress.value.trim()) {
        alert("Enter Physical Address");
        currentStep = 2;
        updateSteps();
        return;
    }

    const company = {
        name: companyName.value.trim(),
         country: country.value.trim(),
         branch:branch.value.trim(),
        email: companyEmail.value.trim(),
          website: website.value.trim(),
        postal: postalAddress.value.trim(),
        physical: physicalAddress.value.trim()
    };

    if (editIndex === -1) {
        companies.push(company);
    } else {
        companies[editIndex] = company;
    }

    localStorage.setItem("companies", JSON.stringify(companies));

    loadTable();

    form.reset();

    editIndex = -1;

    currentStep = 0;

    updateSteps();

    modal.style.display = "none";

});


   

// =================================
// LOAD TABLE
// =================================
function loadTable() {

    tbody.innerHTML = "";

    companies.forEach((company, index) => {

        let row = document.createElement("tr");

        row.innerHTML = `
            <td>${company.name}</td>
            <td>${company.country}</td>
            <td>${company.branch}</td>
            <td>${company.email}</td>
            <td>
                <a href="${company.website}" target="_blank">
                    ${company.website}
                </a>
            </td>
            <td>${company.postal}</td>
            <td>${company.physical}</td>
            <td>
                <button class="edit-btn" onclick="editCompany(${index})">
                    <i class="fa-solid fa-pen"></i>
                </button>

                <button class="delete-btn" onclick="deleteCompany(${index})">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;

        tbody.appendChild(row);

    });

}


     


// =================================
// SAVE
// =================================

function saveCompanies(){

    localStorage.setItem(

        "companies",

        JSON.stringify(companies)

    );

}


// =================================
// DELETE
// =================================

function deleteCompany(index){

    if(confirm("Delete this company?")){

        companies.splice(index,1);

        saveCompanies();

        loadTable();

    }

}


// =================================
// EDIT
// =================================

function editCompany(index){

    const company = companies[index];

    editIndex = index;

    companyName.value = company.name;

    companyEmail.value = company.email;
    country.value = company.country;

    website.value = company.website;

    postalAddress.value = company.postal;

    physicalAddress.value = company.physical;

    formTitle.innerText = "Edit Company";

    currentStep = 0;

    updateSteps();

    modal.style.display = "flex";

}