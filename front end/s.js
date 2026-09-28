// ===============================
// ELEMENTS
// ===============================

const API_BASE = "http://localhost:8082";

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
let editId = null;
let companies = [];


// =================================
// LOAD TABLE
// =================================

loadTable();


// =================================
// OPEN MODAL
// =================================

addBtn.onclick = async () => {

    editId = null;

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

form.addEventListener("submit", async function (e) {

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

    const body = {
        name: companyName.value.trim(),
        country: country.value.trim(),
        branch: branch.value.trim(),
        email: companyEmail.value.trim(),
        website: website.value.trim(),
        postalAddress: postalAddress.value.trim(),
        physicalAddress: physicalAddress.value.trim()
    };

    try {
        let response;
        if (editId === null) {
            response = await fetch(API_BASE + "/api/companies", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(body)
            });
        } else {
            response = await fetch(API_BASE + "/api/companies/" + editId, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(body)
            });
        }

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            alert(error.message || error.error || "Failed to save company");
            return;
        }

        await loadTable();

        form.reset();

        editId = null;

        currentStep = 0;

        updateSteps();

        modal.style.display = "none";

    } catch (error) {
        alert("Cannot reach the server. Make sure the backend is running on " + API_BASE + ".");
    }

});


// =================================
// LOAD TABLE
// =================================

async function loadTable() {

    try {
        const response = await fetch(API_BASE + "/api/companies", {
            method: "GET",
            credentials: "include"
        });

        if (response.ok) {
            companies = await response.json();
        } else if (response.status === 401 || response.status === 403) {
            companies = [];
        } else {
            companies = [];
        }
    } catch (error) {
        companies = [];
    }

    tbody.innerHTML = "";

    if (companies.length === 0) {
        const emptyRow = document.createElement("tr");
        emptyRow.className = "empty-row";
        emptyRow.innerHTML = `
            <td colspan="8">
                <div class="empty-state">
                    <div class="empty-icon">🏢</div>
                    <p class="empty-title">No companies yet</p>
                    <p class="empty-subtitle">Get started by adding your first company</p>
                    <button class="btn-primary" onclick="document.getElementById('addBtn').click()">+ Add Company</button>
                </div>
            </td>
        `;
        tbody.appendChild(emptyRow);
        return;
    }

    companies.forEach((company) => {

        let row = document.createElement("tr");

        row.innerHTML = `
            <td>${company.name}</td>
            <td>${company.location}</td>
            <td>${company.department}</td>
            <td>${company.email}</td>
            <td>
                <a href="${company.website}" target="_blank">
                    ${company.website}
                </a>
            </td>
            <td>${company.profile ? company.profile.split(" | ")[0] : ""}</td>
            <td>${company.profile ? company.profile.split(" | ")[1] : ""}</td>
            <td>
                <button class="edit-btn" onclick="editCompany(${company.id})">
                    <i class="fa-solid fa-pen"></i>
                </button>

                <button class="delete-btn" onclick="deleteCompany(${company.id})">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;

        tbody.appendChild(row);

    });

}


// =================================
// DELETE
// =================================

async function deleteCompany(id){

    if(confirm("Delete this company?")){

        try {
            const response = await fetch(API_BASE + "/api/companies/" + id, {
                method: "DELETE",
                credentials: "include"
            });

            if (response.ok || response.status === 204) {
                await loadTable();
            } else {
                alert("Failed to delete company");
            }
        } catch (error) {
            alert("Cannot reach the server. Make sure the backend is running on " + API_BASE + ".");
        }

    }

}


// =================================
// EDIT
// =================================

async function editCompany(id){

    const company = companies.find(c => c.id === id);

    if (!company) return;

    editId = id;

    companyName.value = company.name;
    companyEmail.value = company.email;
    country.value = company.location || "";
    branch.value = company.department || "";
    website.value = company.website || "";
    const parts = (company.profile || "").split(" | ");
    postalAddress.value = parts[0] || "";
    physicalAddress.value = parts[1] || "";

    formTitle.innerText = "Edit Company";

    currentStep = 0;

    updateSteps();

    modal.style.display = "flex";

}
