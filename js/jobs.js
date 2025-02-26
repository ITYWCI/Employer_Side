    import {
        initializePage,
        db } from './auth.js';
    import { getInitials, createInitialsAvatar, populateUserNav } from './utils.js';
    import { 
        getAuth, 
        onAuthStateChanged,
        signOut
    } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
    import {
        getFirestore,
        collection,
        addDoc,
        getDocs,
        updateDoc,
        deleteDoc,
        doc,
        serverTimestamp,
        query,
        where,
        orderBy,
        limit
    } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Your Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBL-HNBhP3mkb4Bp2BUDy4FbJl3M15MxSY",
    authDomain: "ywci-website.firebaseapp.com",
    projectId: "ywci-website",
    storageBucket: "ywci-website.firebasestorage.app",
    messagingSenderId: "718233699603",
    appId: "1:718233699603:web:fca95cafc62593fc04c6e6",
    measurementId: "G-3JJ5BD37DG"
};

function hideLoader() {
    const loader = document.getElementById('loadingOverlay');
    if (loader) {
        loader.classList.add('hidden');
    }
}

async function initializeJobs() {
    try {
        // Wait for all data loading functions
        await populateUserNav();
        await loadJobsFromStorage();
        // Hide loader after everything is loaded
        hideLoader();
    } catch (error) {
        console.error("Error initializing jobs:", error);
        hideLoader(); // Hide loader even on error
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Save current URL if not on login page
    if (!window.location.pathname.includes('login.html')) {
        sessionStorage.setItem('lastVisitedUrl', window.location.pathname);
    }
    
    initializePage(initializeJobs);
});


// Make sure getDocs is available in the scope where loadJobsFromStorage is defined
async function loadJobsFromStorage() {
    try {
        const querySnapshot = await getDocs(collection(db, "jobs"));
        const jobs = [];
        querySnapshot.forEach((doc) => {
            jobs.push({
                id: doc.id,
                ...doc.data()
            });
        });

        // Rest of your loadJobsFromStorage function...
    } catch (error) {
        console.error("Error loading jobs: ", error);
        alert('Error loading jobs. Please refresh the page.');
    }
}
//End of Load Jobs From Storage

//Start of Filter Jobs
document.addEventListener('DOMContentLoaded', function() {
    // Get all filter elements
    const searchInput = document.getElementById('searchInput');
    const jobTypeFilter = document.getElementById('jobTypeFilter');
    const locationFilter = document.getElementById('locationFilter');
    const minSalary = document.getElementById('minSalary');
    const maxSalary = document.getElementById('maxSalary');
    const resetButton = document.getElementById('resetFilters');

    // Populate location filter with unique locations (sorted alphabetically)
    const locations = new Set();
    document.querySelectorAll('.job-location').forEach(location => {
        locations.add(location.textContent.trim());
    });

    // Convert Set to Array, sort it, and populate the select
    Array.from(locations)
        .sort((a, b) => a.localeCompare(b))
        .forEach(location => {
            const option = document.createElement('option');
            option.value = location;
            option.textContent = location;
            locationFilter.appendChild(option);
        });

    // Filter function
    function filterJobs() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedType = jobTypeFilter.value.toLowerCase();
        const selectedLocation = locationFilter.value.toLowerCase();
        const minSalaryValue = parseFloat(minSalary.value) || 0;
        const maxSalaryValue = parseFloat(maxSalary.value) || Infinity;

        let visibleJobs = 0;

        document.querySelectorAll('.job-card').forEach(card => {
            const title = card.querySelector('.job-title').textContent.toLowerCase();
            const typeElement = card.querySelector('.job-type');
            const location = card.querySelector('.job-location').textContent.toLowerCase();
            const salary = parseFloat(card.querySelector('.job-salary-sub').textContent.replace(/[^0-9.]/g, ''));
            const company = card.querySelector('.job-company').textContent.toLowerCase();
            const description = card.querySelector('.job-description').textContent.toLowerCase();

            let type = '';
            if (typeElement) {
                if (typeElement.classList.contains('full-time')) type = 'full time';
                else if (typeElement.classList.contains('part-time')) type = 'part time';
                else if (typeElement.classList.contains('probational')) type = 'probational';
                else if (typeElement.classList.contains('contractual')) type = 'contractual';
            }

            const matchesSearch = title.includes(searchTerm) ||
                company.includes(searchTerm) ||
                description.includes(searchTerm);
            const matchesType = selectedType === '' || type.includes(selectedType);
            const matchesLocation = selectedLocation === '' || location.includes(selectedLocation);
            const matchesSalary = salary >= minSalaryValue && salary <= maxSalaryValue;

            if (matchesSearch && matchesType && matchesLocation && matchesSalary) {
                card.style.display = '';
                card.style.opacity = '0';
                setTimeout(() => {
                    card.style.opacity = '1';
                }, 50);
                visibleJobs++;
            } else {
                card.style.display = 'none';
            }
        });

        // Show "No jobs found" if no jobs are visible
        document.getElementById('noResultsMessage').style.display = visibleJobs === 0 ? 'block' : 'none';
        document.getElementById('headerText-Job').style.display = visibleJobs === 0 ? 'block' : 'none';
    }

    // Add event listeners
    searchInput.addEventListener('input', filterJobs);
    jobTypeFilter.addEventListener('change', filterJobs);
    locationFilter.addEventListener('change', filterJobs);
    minSalary.addEventListener('input', filterJobs);
    maxSalary.addEventListener('input', filterJobs);

    // Reset filters
    resetButton.addEventListener('click', function() {
        searchInput.value = '';
        jobTypeFilter.value = '';
        locationFilter.value = '';
        minSalary.value = '';
        maxSalary.value = '';
        filterJobs();
    });

    // Add transition for smooth filtering
    const style = document.createElement('style');
    style.textContent = `
        .job-card {
            transition: opacity 0.3s ease-in-out;
        }
    `;
    document.head.appendChild(style);
});
//End of Filter Jobs

//Start of Undo/Redo    
// Initialize undo/redo stacks
const editor = document.getElementById('editor');
let undoStack = [''];
let redoStack = [];
let isUndoRedo = false;

// Make all functions globally available
window.getParentList = function(node) {
    while (node && node !== editor) {
        if (node.nodeName === 'UL' || node.nodeName === 'OL') {
            return node;
        }
        node = node.parentNode;
    }
    return null;
}
//End of Get Parent List

//Start of Get Current List Type
window.getCurrentListType = function() {
    const selection = window.getSelection();
    const node = selection.anchorNode;
    const list = getParentList(node);

    if (!list) return null;
    if (list.nodeName === 'OL') return 'number';
    if (list.className === 'dash') return 'dash';
    return 'bullet';
}
//End of Get Current List Type

//Start of Update List Buttons
window.updateListButtons = function() {
    const currentType = getCurrentListType();
    document.getElementById('bulletBtn')?.classList.toggle('active', currentType === 'bullet');
    document.getElementById('numberBtn')?.classList.toggle('active', currentType === 'number');
    document.getElementById('dashBtn')?.classList.toggle('active', currentType === 'dash');
}
//End of Update List Buttons

//Start of Format Text
window.formatText = function(command) {
    document.execCommand(command, false, null);
    if (!isUndoRedo) {
        undoStack.push(editor.innerHTML);
        redoStack = [];
    }
    editor.focus();
}
//End of Format Text

//Start of Toggle List
window.toggleList = function(type) {
    const currentType = getCurrentListType();

    // If current type matches clicked type, remove the list
    if (currentType === type) {
        if (type === 'number') {
            document.execCommand('insertOrderedList', false, null);
        } else {
            document.execCommand('insertUnorderedList', false, null);
        }
        updateListButtons();
        if (!isUndoRedo) {
            undoStack.push(editor.innerHTML);
            redoStack = [];
        }
        return;
    }

    // If there's a different type of list, first remove it
    if (currentType) {
        if (currentType === 'number') {
            document.execCommand('insertOrderedList', false, null);
        } else {
            document.execCommand('insertUnorderedList', false, null);
        }
    }

    // Apply the new list type
    if (type === 'number') {
        document.execCommand('insertOrderedList', false, null);
    } else {
        document.execCommand('insertUnorderedList', false, null);
        const list = getParentList(window.getSelection().anchorNode);
        if (list) {
            list.className = type === 'dash' ? 'dash' : '';
        }
    }

    updateListButtons();
    if (!isUndoRedo) {
        undoStack.push(editor.innerHTML);
        redoStack = [];
    }
    editor.focus();
}
//End of Toggle List

//Start of Perform Undo
window.performUndo = function() {
    if (undoStack.length > 1) {
        isUndoRedo = true;
        redoStack.push(undoStack.pop());
        editor.innerHTML = undoStack[undoStack.length - 1];
        isUndoRedo = false;
    }
}
//End of Perform Undo

//Start of Perform Redo
window.performRedo = function() {
    if (redoStack.length > 0) {
        isUndoRedo = true;
        const state = redoStack.pop();
        undoStack.push(state);
        editor.innerHTML = state;
        isUndoRedo = false;
    }
}
//End of Perform Redo

//Start of Add Event Listeners
if (editor) {
    editor.addEventListener('input', function(e) {
        if (!isUndoRedo) {
            undoStack.push(editor.innerHTML);
            redoStack = [];
        }
        updateListButtons();
    });

    document.addEventListener('selectionchange', updateListButtons);
}
//End of Add Event Listeners

//Start of Keyboard Shortcuts
// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
            case 'z':
                e.preventDefault();
                if (e.shiftKey) {
                    performRedo();
                } else {
                    performUndo();
                }
                break;
            case 'y':
                e.preventDefault();
                performRedo();
                break;
            case 'b':
                e.preventDefault();
                formatText('bold');
                break;
            case 'i':
                e.preventDefault();
                formatText('italic');
                break;
            case 'u':
                e.preventDefault();
                formatText('underline');
                break;
        }
    }
});
//End of Keyboard Shortcuts

//Start of Add CSS for Styling
const editorStyles = document.createElement('style');
editorStyles.textContent = `
    #editor ul {
        list-style-type: disc;
        margin-left: 20px;
        padding-left: 20px;
    }
    
    #editor ol {
        list-style-type: decimal;
        margin-left: 20px;
        padding-left: 20px;
    }
    
    #editor ul.dash {
        list-style-type: none;
    }
    
    #editor ul.dash li {
        position: relative;
        padding-left: 20px;
    }
    
    #editor ul.dash li:before {
        content: "-";
        position: absolute;
        left: 0;
    }
    
    .toolbar button.active {
        background-color: #e0e0e0;
    }
    .job-description ul {
        list-style-type: disc;
        margin-left: 10px;
        padding-left: 20px;
    }
    .job-description ol {
        list-style-type: disc;
        margin-left: 10px;
        padding-left: 20px;
    }
    
`;
document.head.appendChild(editorStyles);

// Initialize editor when page loads
window.onload = function() {
    if (editor) {
        undoStack = [editor.innerHTML];
        updateListButtons();
    }
};
//End of Add CSS for Styling

//Start of Job Modal
document.addEventListener('DOMContentLoaded', function() {
    // Modal setup
    const addJobModal = document.getElementById('addJobModal');
    const viewJobModal = document.getElementById('viewJobModal');
    const addButton = document.getElementById('addJobBtn');
    const uploadButton = document.querySelector('.submit-btn');
    const closeButtons = document.querySelectorAll('.close, .cancel-btn, .modal-close');
    const jobForm = document.getElementById('jobForm');
    const deleteButton = document.querySelector('.delete-button');
    const editButton = document.querySelector('.edit-button');
    const submitButton = document.querySelector('.submit-btn');
    const locationFilter = document.getElementById('locationFilter');
    let currentJobData = null;
    let isEditing = false;
    let editingJobIndex = -1;

    // Salary input validation
    const salaryConfidentialCheckbox = document.getElementById('salaryConfidential');
    const salaryRangeCheckbox = document.getElementById('salaryRange');
    const singleSalaryInput = document.getElementById('singleSalaryInput');
    const rangeSalaryInputs = document.getElementById('rangeSalaryInputs');
    const salaryInput = document.getElementById('salary');
    const minSalaryInput = document.getElementById('minSalary');
    const maxSalaryInput = document.getElementById('maxSalary');

    handleSalaryInputs();
    
// Function to format salary with commas
function formatSalary(value) {
    if (!value) return '₱0';
    // Remove any existing commas and the peso sign
    const numericValue = value.toString().replace(/[₱,]/g, '');
    // Format with commas
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Function to format the default salary input field
function formatSalaryInput(input) {
    let value = input.value.replace(/[^0-9]/g, '');
    if (value) {
        value = parseInt(value, 10).toLocaleString('en-US');
    }
    input.value = value;
}

// Function to validate salary range
function validateSalaryRange() {
    const salaryRangeCheckbox = document.getElementById('salaryRange');
    const jobMinSalary = document.getElementById('jobMinSalary');
    const jobMaxSalary = document.getElementById('jobMaxSalary');
    
    if (salaryRangeCheckbox.checked && jobMinSalary && jobMaxSalary) {
        // Remove commas and convert to numbers
        const minValue = parseInt(jobMinSalary.value.replace(/,/g, ''));
        const maxValue = parseInt(jobMaxSalary.value.replace(/,/g, ''));
        
        if (minValue >= maxValue) {
            alert('Minimum salary cannot be greater than or equal to maximum salary');
            return false;
        }
    }
    return true;
}

// Function to handle salary inputs
function handleSalaryInputs() {
    const salaryConfidentialCheckbox = document.getElementById('salaryConfidential');
    const salaryRangeCheckbox = document.getElementById('salaryRange');
    const singleSalaryInput = document.getElementById('singleSalaryInput');
    const rangeSalaryInputs = document.getElementById('rangeSalaryInputs');
    const salary = document.getElementById('salary');
    const jobMinSalary = document.getElementById('jobMinSalary');
    const jobMaxSalary = document.getElementById('jobMaxSalary');

    // Function to format and clean input
    function formatAndCleanInput(input) {
        // Remove all non-numeric characters
        let value = input.value.replace(/[^0-9]/g, '');
        // Format with commas if there's a value
        if (value) {
            value = parseInt(value).toLocaleString('en-US');
        }
        input.value = value;
    }

    // Add input event listeners for salary inputs
    [jobMinSalary, jobMaxSalary].forEach(input => {
        if (input) {
            // Prevent non-numeric input
            input.addEventListener('keypress', (e) => {
                if (!/^\d$/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete') {
                    e.preventDefault();
                }
            });

            // Format on input
            input.addEventListener('input', () => formatAndCleanInput(input));

            // Handle paste event
            input.addEventListener('paste', (e) => {
                e.preventDefault();
                const pastedText = (e.clipboardData || window.clipboardData).getData('text');
                const numericValue = pastedText.replace(/\D/g, '');
                if (numericValue) {
                    input.value = parseInt(numericValue).toLocaleString('en-US');
                }
            });
        }
    });

// Handle confidential checkbox
salaryConfidentialCheckbox?.addEventListener('change', function() {
    const isConfidential = this.checked;
    const isRange = salaryRangeCheckbox?.checked || false;
    
    // If range is not checked, disable the single salary input
    if (!isRange) {
        const salarySingleInput = document.getElementById('salary');
        if (salarySingleInput) salarySingleInput.disabled = isConfidential;
    }
    
    // Only disable min/max inputs if confidential is checked AND range is not checked
    if (isConfidential && !isRange) {
        if (jobMinSalary) {
            jobMinSalary.disabled = true;
            jobMinSalary.value = '';
        }
        if (jobMaxSalary) {
            jobMaxSalary.disabled = true;
            jobMaxSalary.value = '';
        }
    }
    
    // Clear single salary value if confidential
    if (isConfidential) {
        if (document.getElementById('salary')) document.getElementById('salary').value = '';
    }
});

// Handle salary range checkbox
salaryRangeCheckbox?.addEventListener('change', function() {
    const isRange = this.checked;
    const singleSalaryInput = document.getElementById('singleSalaryInput');
    const rangeSalaryInputs = document.getElementById('rangeSalaryInputs');
    
    // Toggle visibility of appropriate input sections
    if (singleSalaryInput) singleSalaryInput.style.display = isRange ? 'none' : 'block';
    if (rangeSalaryInputs) rangeSalaryInputs.style.display = isRange ? 'block' : 'none';
    
    // IMPORTANT: Always enable min/max inputs when range is checked
    if (isRange) {
        if (jobMinSalary) jobMinSalary.disabled = false;
        if (jobMaxSalary) jobMaxSalary.disabled = false;
        
        // Clear single salary value
        if (document.getElementById('salary')) document.getElementById('salary').value = '';
    } else {
        // Clear min/max values when switching to single
        if (jobMinSalary) jobMinSalary.value = '';
        if (jobMaxSalary) jobMaxSalary.value = '';
        
        // Check if we need to disable single input based on confidential state
        const isConfidential = salaryConfidentialCheckbox?.checked || false;
        const salarySingleInput = document.getElementById('salary');
        if (salarySingleInput && isConfidential) salarySingleInput.disabled = true;
    }
});

}
    
    // Add input event listeners for salary formatting
    if (salaryInput) {
        salaryInput.addEventListener('input', () => formatSalaryInput(salaryInput));
        salaryInput.addEventListener('focus', function() {
            this.value = this.value.replace(/,/g, '');
        });
        salaryInput.addEventListener('blur', function() {
            formatSalaryInput(this);
        });
    }
    
    if (minSalaryInput) {
        minSalaryInput.addEventListener('input', () => formatSalaryInput(minSalaryInput));
        minSalaryInput.addEventListener('focus', function() {
            this.value = this.value.replace(/,/g, '');
        });
        minSalaryInput.addEventListener('blur', function() {
            formatSalaryInput(this);
        });
    }
    
    if (maxSalaryInput) {
        maxSalaryInput.addEventListener('input', () => formatSalaryInput(maxSalaryInput));
        maxSalaryInput.addEventListener('focus', function() {
            this.value = this.value.replace(/,/g, '');
        });
        maxSalaryInput.addEventListener('blur', function() {
            formatSalaryInput(this);
        });
    }
    
    // Handle salary confidential checkbox
    if (salaryConfidentialCheckbox) {
        salaryConfidentialCheckbox.addEventListener('change', function() {
            if (this.checked) {
                salaryRangeCheckbox.checked = false;
                salaryInput.disabled = true;
                salaryInput.value = '';
                rangeSalaryInputs.style.display = 'none';
                singleSalaryInput.style.display = 'block';
                minSalaryInput.value = '';
                maxSalaryInput.value = '';
            } else {
                salaryInput.disabled = false;
            }
        });
    }
    
    // Handle salary range checkbox
    if (salaryRangeCheckbox) {
        salaryRangeCheckbox.addEventListener('change', function() {
            if (this.checked) {
                salaryConfidentialCheckbox.checked = false;
                singleSalaryInput.style.display = 'none';
                rangeSalaryInputs.style.display = 'block';
                salaryInput.value = '';
                minSalaryInput.disabled = false;
                maxSalaryInput.disabled = false;
            } else {
                singleSalaryInput.style.display = 'block';
                rangeSalaryInputs.style.display = 'none';
                minSalaryInput.value = '';
                maxSalaryInput.value = '';
            }
        });
    }
    
    // Function to get salary data for job submission
    function getSalaryData() {
        if (salaryConfidentialCheckbox?.checked) {
            return {
                isConfidential: true,
                salary: ' '  // Changed from 'Confidential' to a space
            };
        } else if (salaryRangeCheckbox?.checked) {
            const minSalary = minSalaryInput.value.replace(/,/g, '');
            const maxSalary = maxSalaryInput.value.replace(/,/g, '');
            return {
                isRange: true,
                minSalary: parseFloat(minSalary),
                maxSalary: parseFloat(maxSalary),
                salary: `₱${minSalary} - ₱${maxSalary}`
            };
        } else {
            const salary = salaryInput?.value.replace(/,/g, '') || '0';
            return {
                salary: `₱${salary}`
            };
        }
    }

    if (salaryInput) {
        salaryInput.addEventListener('input', function(e) {
            // Remove any non-numeric characters
            let value = this.value.replace(/[^0-9]/g, '');

            // Format the number with commas
            if (value) {
                value = parseInt(value, 10).toLocaleString('en-US');
            }

            // Update the input value
            this.value = value;
        });

        // Prevent non-numeric key presses
        salaryInput.addEventListener('keypress', function(e) {
            if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete') {
                e.preventDefault();
            }
        });

        // Clean up value when focus is lost
        salaryInput.addEventListener('blur', function() {
            let value = this.value.replace(/[^0-9]/g, '');
            if (value) {
                value = parseInt(value, 10).toLocaleString('en-US');
                this.value = value;
            }
        });

        // Remove commas when focus is gained
        salaryInput.addEventListener('focus', function() {
            this.value = this.value.replace(/,/g, '');
        });
    }
    //End of Salary Input Validation

    //Start of Format Salary
// Function to format salary with peso sign and commas
function formatSalary(value) {
    if (!value && value !== 0) return '₱0';
    return '₱' + value.toLocaleString('en-US');
}

// Function to format salary input field with peso sign
function formatSalaryInput(input) {
    let value = input.value.replace(/[^0-9]/g, '');
    if (value) {
        value = '₱' + parseInt(value, 10).toLocaleString('en-US');
    }
    input.value = value;
}

// Add input event listeners for salary formatting
[salaryInput, minSalaryInput, maxSalaryInput].forEach(input => {
    if (input) {
        input.addEventListener('input', () => formatSalaryInput(input));
        
        // Remove commas when focus is gained
        input.addEventListener('focus', function() {
            this.value = this.value.replace(/,/g, '');
        });
        
        // Format with commas when focus is lost
        input.addEventListener('blur', function() {
            formatSalaryInput(this);
        });
    }
});

// Handle salary confidential checkbox
salaryConfidentialCheckbox.addEventListener('change', function() {
    if (this.checked) {
        salaryRangeCheckbox.checked = false;
        salaryInput.disabled = true;
        salaryInput.value = '';
        rangeSalaryInputs.style.display = 'none';
        singleSalaryInput.style.display = 'block';
        minSalaryInput.value = '';
        maxSalaryInput.value = '';
    } else {
        salaryInput.disabled = false;
    }
});

// Handle salary range checkbox
salaryRangeCheckbox.addEventListener('change', function() {
    if (this.checked) {
        salaryConfidentialCheckbox.checked = false;
        singleSalaryInput.style.display = 'none';
        rangeSalaryInputs.style.display = 'block';
        salaryInput.value = '';
        minSalaryInput.disabled = false;
        maxSalaryInput.disabled = false;
    } else {
        singleSalaryInput.style.display = 'block';
        rangeSalaryInputs.style.display = 'none';
        minSalaryInput.value = '';
        maxSalaryInput.value = '';
    }
});

// Modify your existing job submission code to handle the new salary options
function getSalaryData() {
    if (salaryConfidentialCheckbox.checked) {
        return {
            isConfidential: true,
            salary: 'Confidential'
        };
    } else if (salaryRangeCheckbox.checked) {
        const minSalary = minSalaryInput.value.replace(/,/g, '');
        const maxSalary = maxSalaryInput.value.replace(/,/g, '');
        return {
            isRange: true,
            minSalary: parseFloat(minSalary),
            maxSalary: parseFloat(maxSalary),
            salary: `₱${minSalary} - ₱${maxSalary}`
        };
    } else {
        const salary = salaryInput.value.replace(/,/g, '');
        return {
            salary: `₱${salary}`
        };
    }

    }
    //End of Format Salary

    //Start of Add Click Handlers to All Job Cards
    const jobCards = document.querySelectorAll('.job-card');
    jobCards.forEach(card => {
        card.addEventListener('click', function() {
            const latestJob = getLatestJobFromStorage();
            if (latestJob) {
                openJobModal(latestJob);
            }
        });
    });
    //End of Add Click Handlers to All Job Cards

    //Start of Modal Functions
    function openModal(modal) {
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }
    //End of Open Modal

    //Start of Close Modal          
    function closeModal(modal) {
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';

            // Clear the editor and form if it's the add job modal
            if (modal === addJobModal) {
                // Reset modal title back to "Add a Job"
                const modalTitle = modal.querySelector('.modal-header h2');
                if (modalTitle) {
                    modalTitle.textContent = 'Add a Job';
                }

                if (editor) {
                    editor.innerHTML = '';
                }
                if (jobForm) {
                    jobForm.reset();
                }
                // Reset the submit button text
                if (submitButton) {
                    submitButton.textContent = 'Upload Job';
                    isEditing = false;
                    editingJobIndex = -1;
                }
            }
        }
    }
    //End of Close Modal
    function getFormattedLocation() {
        const region = document.getElementById('region');
        const province = document.getElementById('province');
        const city = document.getElementById('city');
    
        // Check if elements exist
        if (!region || !city) return '';
    
        // For Metro Manila (special case)
        if (region.value === '130000000') {
            return `${city.options[city.selectedIndex].text}, Metro Manila`;
        }
    
        // For other regions
        return `${city.options[city.selectedIndex].text}, ${province.options[province.selectedIndex].text}, ${region.options[region.selectedIndex].text}`;
    }
    
    // Populate location filter with unique locations
    function populateLocationFilter() {
        const jobs = [];
        const locationFilter = document.getElementById('locationFilter');

        // Get all unique locations from job cards
        const locations = new Set();
        locations.add(''); // Add empty option for "All Locations"

        document.querySelectorAll('.job-location').forEach(locationElement => {
            if (locationElement.textContent) {
                locations.add(locationElement.textContent.trim());
            }
        });

        // Get the current selected value
        const currentValue = locationFilter.value;

        // Clear existing options
        locationFilter.innerHTML = '';

        // Add "All Locations" option
        const allOption = document.createElement('option');
        allOption.value = '';
        allOption.textContent = 'All Locations';
        locationFilter.appendChild(allOption);

        // Add options to select
        Array.from(locations)
            .sort((a, b) => a.localeCompare(b))
            .forEach(location => {
                if (location) { // Skip empty location
                    const option = document.createElement('option');
                    option.value = location;
                    option.textContent = location;
                    locationFilter.appendChild(option);
                }
            });

        // Restore the selected value
        locationFilter.value = currentValue;
    }
    //End of Populate Location Filter   

    //Start of Filter Jobs
    // Filter function
    function filterJobs() {
        const searchInput = document.getElementById('searchInput');
        const jobTypeFilter = document.getElementById('jobTypeFilter');
        const locationFilter = document.getElementById('locationFilter');
        const minSalary = document.getElementById('minSalary');
        const maxSalary = document.getElementById('maxSalary');

        const searchTerm = searchInput.value.toLowerCase();
        const selectedType = jobTypeFilter.value.toLowerCase();
        const selectedLocation = locationFilter.value.toLowerCase();
        const minSalaryValue = parseFloat(minSalary.value) || 0;
        const maxSalaryValue = parseFloat(maxSalary.value) || Infinity;

        let visibleJobs = 0;

        document.querySelectorAll('.job-card').forEach(card => {
            const title = card.querySelector('.job-title').textContent.toLowerCase();
            const typeElement = card.querySelector('.job-type');
            const location = card.querySelector('.job-location').textContent.toLowerCase();
            const salary = parseFloat(card.querySelector('.job-salary-sub').textContent.replace(/[^0-9.]/g, ''));
            const company = card.querySelector('.job-company').textContent.toLowerCase();
            const description = card.querySelector('.job-description').textContent.toLowerCase();

            let type = '';
            if (typeElement) {
                if (typeElement.classList.contains('full-time')) type = 'full time';
                else if (typeElement.classList.contains('part-time')) type = 'part time';
                else if (typeElement.classList.contains('probational')) type = 'probational';
                else if (typeElement.classList.contains('contractual')) type = 'contractual';
            }

            const matchesSearch = title.includes(searchTerm) ||
                company.includes(searchTerm) ||
                description.includes(searchTerm);
            const matchesType = selectedType === '' || type.includes(selectedType);
            const matchesLocation = selectedLocation === '' || location.includes(selectedLocation);
            const matchesSalary = salary >= minSalaryValue && salary <= maxSalaryValue;

            if (matchesSearch && matchesType && matchesLocation && matchesSalary) {
                card.style.display = '';
                card.style.opacity = '0';
                setTimeout(() => {
                    card.style.opacity = '1';
                }, 50);
                visibleJobs++;
            } else {
                card.style.display = 'none';
            }
        });

        // Show "No jobs found" message if no jobs are visible
        const noResultsMessage = document.getElementById('noResultsMessage');
        const headerTextJob = document.getElementById('headerText-Job');

        if (noResultsMessage) {
            noResultsMessage.style.display = visibleJobs === 0 ? 'block' : 'none';
        }
        if (headerTextJob) {
            headerTextJob.style.display = visibleJobs === 0 ? 'block' : 'none';
        }
    }
    //End of Filter Jobs

    // Add event listener for location filter
    if (locationFilter) {
        locationFilter.addEventListener('change', filterJobs);
    }

    // Load jobs when page loads
    loadJobsFromStorage();

    // Add Job button click handler
    if (addButton) {
        addButton.addEventListener('click', function() {
            openModal(addJobModal);
        });
    }

    // Close buttons click handlers
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal);
        });
    });

    // Close modal on escape key    
    window.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            if (addJobModal.style.display === 'block') {
                closeModal(addJobModal);
            }
            if (viewJobModal.style.display === 'block') {
                closeModal(viewJobModal);
            }
        }
    });
    //End of Close Modal on Escape Key

    // Modify delete functionality
    if (deleteButton) {
        deleteButton.addEventListener('click', async function() {
            if (currentJobData) {
                const confirmDelete = confirm('Are you sure you want to delete this job?');

                if (confirmDelete) {
                    try {
                        // Delete the document from Firebase
                        await deleteDoc(doc(db, "jobs", currentJobData.id));

                        closeModal(viewJobModal);
                        window.location.reload();
                    } catch (error) {
                        console.error("Error deleting job: ", error);
                        alert('Error deleting job. Please try again.');
                    }
                }
            }
        });
    }
    //End of Modify Delete Functionality

    if (editButton) {
        editButton.addEventListener('click', async function() {
            if (currentJobData) {
                try {

                    // Change modal title to "Edit Job"
                const modalTitle = document.querySelector('#addJobModal .modal-header h2');
                if (modalTitle) {
                    modalTitle.textContent = 'Edit Job';
                }

                // Fill the form with current job data
                document.getElementById('jobTitle').value = currentJobData.title;
                document.getElementById('company').value = currentJobData.company;
                document.getElementById('salary').value = currentJobData.salary.replace('₱', '').replace(/,/g, '');
                document.getElementById('job-type').value = currentJobData.typeClass;
                editor.innerHTML = currentJobData.description;

                console.log("Current job location:", currentJobData.location);
                
                // Initialize location dropdowns
                await initializeLocationDropdowns(currentJobData.location);

    
                    if (currentJobData.isConfidential) {
                        
                    } else if (currentJobData.isRange) {
                        salaryRangeCheckbox.checked = true;
                        salaryConfidentialCheckbox.checked = false;
                        singleSalaryInput.style.display = 'none';
                        rangeSalaryInputs.style.display = 'block';
                        salaryInput.value = '';
                        
                        if (currentJobData.minSalary) {
                            jobMinSalary.value = currentJobData.minSalary.toLocaleString('en-US');
                        }
                        
                        if (currentJobData.maxSalary) {
                            jobMaxSalary.value = currentJobData.maxSalary.toLocaleString('en-US');
                        }
                    } else {
                        salaryConfidentialCheckbox.checked = false;
                        salaryRangeCheckbox.checked = false;
                        singleSalaryInput.style.display = 'block';
                        rangeSalaryInputs.style.display = 'none';
                        
                        if (currentJobData.salary) {
                            salaryInput.value = currentJobData.salary.toLocaleString('en-US');
                        }
                        jobMinSalary.value = '';
                        jobMaxSalary.value = '';
                    }

                    document.getElementById('job-type').value = currentJobData.typeClass;
                    editor.innerHTML = currentJobData.description;

                    // Initialize location dropdowns
                    await initializeLocationDropdowns(currentJobData.location);

                    // Change upload button text
                    submitButton.textContent = 'Apply Changes';
                    isEditing = true;

                    // Find the index of the job being edited
                    const jobs = JSON.parse(localStorage.getItem('jobs') || '[]');
                    editingJobIndex = jobs.findIndex(job =>
                        job.title === currentJobData.title &&
                        job.company === currentJobData.company &&
                        job.timestamp === currentJobData.timestamp
                    );

                    // Close view modal and open add modal
                    closeModal(viewJobModal);
                    openModal(addJobModal);

                } catch (error) {
                    console.error("Error in edit button handler:", error);
                }
            }
        });
    }
    //End of Edit Button Click Handler

    async function initializeLocationDropdowns(locationString) {
        try {
            console.log("Initializing with location:", locationString);

            if (!locationString) return;

            const locationParts = locationString.split(',').map(part => part.trim());
            console.log("Location parts:", locationParts);

            const cityName = locationParts[0];
            const provinceName = locationParts[1];
            const regionName = locationParts[2];
            const isNCR = locationParts[1] === 'Metro Manila';

            const regionSelect = document.getElementById('region');
            const provinceSelect = document.getElementById('province');
            const citySelect = document.getElementById('city');

            // First load regions
            const regionsResponse = await fetch('https://psgc.gitlab.io/api/regions/');
            const regions = await regionsResponse.json();

            // Populate regions
            regionSelect.innerHTML = '<option value="">Select Region</option>';
            regions.sort((a, b) => a.name.localeCompare(b.name)).forEach(region => {
                const option = new Option(region.name, region.code);
                if (isNCR && region.code === '130000000' || region.name === regionName) {
                    option.selected = true;
                }
                regionSelect.add(option);
            });

            if (isNCR) {
                // Handle NCR case
                provinceSelect.innerHTML = '<option value="ncr">Metro Manila</option>';
                provinceSelect.disabled = true;

                const ncrResponse = await fetch('https://psgc.gitlab.io/api/regions/130000000/cities-municipalities/');
                const ncrCities = await ncrResponse.json();

                citySelect.innerHTML = '<option value="">Select City</option>';
                ncrCities.sort((a, b) => a.name.localeCompare(b.name)).forEach(city => {
                    const option = new Option(city.name, city.code);
                    if (city.name === cityName) {
                        option.selected = true;
                    }
                    citySelect.add(option);
                });
                citySelect.disabled = false;
            } else {
                // Handle non-NCR case
                const selectedRegion = Array.from(regionSelect.options)
                    .find(option => option.text === regionName);

                if (selectedRegion) {
                    // Fetch provinces for selected region
                    const provincesResponse = await fetch(`https://psgc.gitlab.io/api/regions/${selectedRegion.value}/provinces/`);
                    const provinces = await provincesResponse.json();

                    // Populate provinces
                    provinceSelect.innerHTML = '<option value="">Select Province</option>';
                    provinceSelect.disabled = false;
                    provinces.sort((a, b) => a.name.localeCompare(b.name)).forEach(province => {
                        const option = new Option(province.name, province.code);
                        if (province.name === provinceName) {
                            option.selected = true;
                        }
                        provinceSelect.add(option);
                    });

                    // Find selected province
                    const selectedProvince = Array.from(provinceSelect.options)
                        .find(option => option.text === provinceName);

                    if (selectedProvince) {
                        // Fetch cities for selected province
                        const citiesResponse = await fetch(`https://psgc.gitlab.io/api/provinces/${selectedProvince.value}/cities-municipalities/`);
                        const cities = await citiesResponse.json();

                        // Populate cities
                        citySelect.innerHTML = '<option value="">Select City</option>';
                        citySelect.disabled = false;
                        cities.sort((a, b) => a.name.localeCompare(b.name)).forEach(city => {
                            const option = new Option(city.name, city.code);
                            if (city.name === cityName) {
                                option.selected = true;
                            }
                            citySelect.add(option);
                        });
                    }
                }
            }

            console.log("Final selections:", {
                region: regionSelect.selectedOptions[0]?.text,
                province: provinceSelect.selectedOptions[0]?.text,
                city: citySelect.selectedOptions[0]?.text
            });

        } catch (error) {
            console.error("Error initializing location dropdowns:", error);
            console.error("Error details:", error.message);
        }
    }
    //End of Initialize Location Dropdowns


    //Ensures cities are properly loaded
    async function loadNCRCities(selectedCity) {
        try {
            const response = await fetch('https://psgc.gitlab.io/api/regions/130000000/cities-municipalities/');
            const cities = await response.json();
            const citySelect = document.getElementById('city');

            citySelect.innerHTML = '<option value="">Select City</option>';
            cities.sort((a, b) => a.name.localeCompare(b.name)).forEach(city => {
                const option = new Option(city.name, city.code);
                if (city.name === selectedCity) {
                    option.selected = true;
                }
                citySelect.add(option);
            });
            citySelect.disabled = false;

            return true;
        } catch (error) {
            console.error("Error loading NCR cities:", error);
            return false;
        }
    }
    //End of Ensures cities are properly loaded

    //Start of Update the region change event listener
    document.getElementById('region').addEventListener('change', async function(e) {
        const provinceSelect = document.getElementById('province');
        const citySelect = document.getElementById('city');

        if (this.value === '130000000') { // NCR
            provinceSelect.innerHTML = '<option value="ncr">Metro Manila</option>';
            provinceSelect.disabled = true;

            // If we're editing and have a current city, pass it to loadNCRCities
            const currentCity = currentJobData?.location?.split(',')[0].trim();
            await loadNCRCities(currentCity);
        } else {
            provinceSelect.disabled = false;
            provinceSelect.innerHTML = '<option value="">Select Province</option>';
            citySelect.innerHTML = '<option value="">Select City/Municipality</option>';
            citySelect.disabled = true;
            if (this.value) {
                await fetchProvinces(this.value);
            }
        }
    });

    async function loadNCRCities(selectedCity) {
        try {
            const response = await fetch('https://psgc.gitlab.io/api/regions/130000000/cities-municipalities/');
            const cities = await response.json();
            const citySelect = document.getElementById('city');

            citySelect.innerHTML = '<option value="">Select City</option>';
            cities.sort((a, b) => a.name.localeCompare(b.name)).forEach(city => {
                const option = new Option(city.name, city.code);
                if (city.name === selectedCity) {
                    option.selected = true;
                }
                citySelect.add(option);
            });
            citySelect.disabled = false;

            return true;
        } catch (error) {
            console.error("Error loading NCR cities:", error);
            return false;
        }
    }

    // Add this new function to handle location dropdown population
    async function populateLocationDropdowns(locationString) {
        if (!locationString) return;

        const locationParts = locationString.split(',').map(part => part.trim());
        const cityName = locationParts[0];

        // Check if it's NCR
        const isNCR = locationParts[1] === 'Metro Manila';

        const regionSelect = document.getElementById('region');
        const provinceSelect = document.getElementById('province');
        const citySelect = document.getElementById('city');

        // For NCR
        if (isNCR) {
            // Find NCR in region dropdown
            for (let option of regionSelect.options) {
                if (option.text === 'National Capital Region') {
                    option.selected = true;
                    await fetchProvinces(option.value);
                    await fetchNCRCities();

                    // Wait for cities to load
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Select the city
                    for (let option of citySelect.options) {
                        if (option.text === cityName) {
                            option.selected = true;
                            break;
                        }
                    }
                    break;
                }
            }
        } else {
            // For other regions
            const regionName = locationParts[2];
            const provinceName = locationParts[1];

            // Select region
            for (let option of regionSelect.options) {
                if (option.text === regionName) {
                    option.selected = true;
                    await fetchProvinces(option.value);
                    break;
                }
            }

            // Wait for provinces to load
            await new Promise(resolve => setTimeout(resolve, 500));

            // Select province
            for (let option of provinceSelect.options) {
                if (option.text === provinceName) {
                    option.selected = true;
                    await fetchCities(option.value);
                    break;
                }
            }

            // Wait for cities to load
            await new Promise(resolve => setTimeout(resolve, 500));

            // Select city
            for (let option of citySelect.options) {
                if (option.text === cityName) {
                    option.selected = true;
                    break;
                }
            }
        }
    }

    // Modify the upload button handler
    if (uploadButton) {
        uploadButton.addEventListener('click', async function(e) {
            e.preventDefault();
    
            try {
                // Get form values
                const jobTitle = document.getElementById('jobTitle').value;
                const company = document.getElementById('company').value;
                const jobType = document.getElementById('job-type').value;
                const description = editor.innerHTML;
                const salaryConfidentialCheckbox = document.getElementById('salaryConfidential');
                const salaryRangeCheckbox = document.getElementById('salaryRange');
                const salary = document.getElementById('salary');
                const jobMinSalary = document.getElementById('jobMinSalary');
                const jobMaxSalary = document.getElementById('jobMaxSalary');
    
                // Validate required fields
                if (!jobTitle || !company || !jobType || !description) {
                    alert('Please fill in all required fields');
                    return;
                }
    
                // Prepare salary data
                let salaryData = {};
                if (salaryConfidentialCheckbox.checked) {
                    salaryData = {
                        isConfidential: true,
                        isRange: false
                    };
                } else if (salaryRangeCheckbox.checked) {
                    // Validate salary range
                    if (!validateSalaryRange()) {
                        return;
                    }
                    
                    // Clean and parse salary range values (remove peso sign and commas)
                    const minSalary = parseInt(jobMinSalary.value.replace(/[₱,]/g, ''));
                    const maxSalary = parseInt(jobMaxSalary.value.replace(/[₱,]/g, ''));
                    
                    salaryData = {
                        isConfidential: false,
                        isRange: true,
                        minSalary: minSalary,
                        maxSalary: maxSalary
                    };
                } else {
                    // Clean and parse single salary value (remove peso sign and commas)
                    const singleSalary = parseInt(salary.value.replace(/[₱,]/g, ''));
                    
                    salaryData = {
                        isConfidential: false,
                        isRange: false,
                        salary: singleSalary
                    };
                }
    
                // Create job data object
                const jobData = {
                    title: jobTitle,
                    company: company,
                    location: getFormattedLocation(),
                    description: description,
                    type: getJobTypeDisplay(jobType),
                    typeClass: jobType,
                    timestamp: isEditing ? currentJobData.timestamp : new Date().getTime(),
                    ...salaryData
                };
    
                // Save to database
                if (isEditing) {
                    const jobRef = doc(db, "jobs", currentJobData.id);
                    await updateDoc(jobRef, jobData);
                } else {
                    await addDoc(collection(db, "jobs"), jobData);
                }
    
                // Reset form and close modal
                resetForm();
                closeModal(addJobModal);
                window.location.reload();
            } catch (error) {
                console.error("Error saving job: ", error);
                alert('Error saving job. Please try again.');
            }
        });
    }

    function formatTimeAgo(timestamp) {
        const seconds = Math.floor((new Date().getTime() - timestamp) / 1000);

        if (seconds < 60) {
            return seconds <= 0 ? 'Just now' : `${seconds} second${seconds !== 1 ? 's' : ''} ago`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        } else if (seconds < 86400) {
            const hours = Math.floor(seconds / 3600);
            return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        } else {
            const days = Math.floor(seconds / 86400);
            return `${days} day${days !== 1 ? 's' : ''} ago`;
        }
    }

    // Function to reset the job form
function resetForm() {
    const jobForm = document.getElementById('jobForm');
    const editor = document.querySelector('.editor');
    const salaryInput = document.getElementById('salary');
    const jobMinSalary = document.getElementById('jobMinSalary');
    const jobMaxSalary = document.getElementById('jobMaxSalary');
    const salaryConfidentialCheckbox = document.getElementById('salaryConfidential');
    const salaryRangeCheckbox = document.getElementById('salaryRange');
    const singleSalaryInput = document.getElementById('singleSalaryInput');
    const rangeSalaryInputs = document.getElementById('rangeSalaryInputs');

    // Reset the form
    if (jobForm) jobForm.reset();
    
    // Reset the editor
    if (editor) editor.innerHTML = '';
    
    // Reset salary inputs
    if (salaryInput) salaryInput.value = '';
    if (jobMinSalary) jobMinSalary.value = '';
    if (jobMaxSalary) jobMaxSalary.value = '';
    
    // Reset checkboxes
    if (salaryConfidentialCheckbox) salaryConfidentialCheckbox.checked = false;
    if (salaryRangeCheckbox) salaryRangeCheckbox.checked = false;
    
    // Reset salary input visibility
    if (singleSalaryInput) singleSalaryInput.style.display = 'block';
    if (rangeSalaryInputs) rangeSalaryInputs.style.display = 'none';
    
    // Reset location dropdowns
    const region = document.getElementById('region');
    const province = document.getElementById('province');
    const city = document.getElementById('city');
    
    if (region) region.selectedIndex = 0;
    if (province) {
        province.selectedIndex = 0;
        province.disabled = true;
    }
    if (city) {
        city.selectedIndex = 0;
        city.disabled = true;
    }

    // Reset any validation states or error messages if they exist
    const errorMessages = document.querySelectorAll('.error-message');
    errorMessages.forEach(error => error.remove());

    // Reset the submit button text if it was changed
    const submitButton = document.getElementById('uploadButton');
    if (submitButton) submitButton.textContent = 'Upload Job';
}


    // Update the addJobCardToPage function to handle potential missing data
    function addJobCardToPage(jobData) {
        const container = document.querySelector('.container');
        const newJobCard = document.createElement('div');
        newJobCard.className = 'job-card';
    
        // Format salary display
        let salaryDisplay;
        if (jobData.isConfidential) {
            salaryDisplay = 'Salary is hidden for confidentiality reasons';
        } else if (jobData.isRange) {
            salaryDisplay = `₱${jobData.minSalary.toLocaleString('en-US')} - ₱${jobData.maxSalary.toLocaleString('en-US')}`;
        } else {
            salaryDisplay = `₱${jobData.salary.toLocaleString('en-US')}`;
        }
    
        // Clean up all data
        const cleanCompany = jobData.company.replace(/[•·]|\s+[•·]\s+/g, '').trim();
        const cleanLocation = jobData.location.replace(/[•·]|\s+[•·]\s+/g, '').trim();
    
        newJobCard.innerHTML = `
        <div class="job-header">
            <h2 class="job-title">${jobData.title}</h2>
            <span class="job-type ${jobData.typeClass}">${jobData.type}</span>
        </div>
        <div class="job-details">
            <div class="info-group">
                <div class="info-item">
                    <i class="fas fa-building"></i>
                    <span class="job-company">${cleanCompany}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span class="job-location">${cleanLocation}</span>
                </div>
                <div class="salary-item">
                    <span class="job-salary-sub">${salaryDisplay}</span>
                </div>
            </div>
        </div>
        <div class="job-description">${jobData.description}</div>
        <p class="job-time-added">${formatTimeAgo(jobData.timestamp)}</p>
    `;

        // Add click event to new job card
        newJobCard.addEventListener('click', () => {
            openJobModal(jobData);
        });

        // Insert at the beginning of the container (after header)
        const headerText = document.getElementById('headerText-Job');
        const noResultsMessage = document.getElementById('noResultsMessage');

        if (headerText && headerText.nextSibling) {
            container.insertBefore(newJobCard, noResultsMessage);
        } else {
            container.appendChild(newJobCard);
        }

        // Update location filter options
        populateLocationFilter();
    }

    // Update loadJobsFromStorage to include better error handling
    async function loadJobsFromStorage() {
        try {
            const querySnapshot = await getDocs(collection(db, "jobs"));
            const jobs = [];
            querySnapshot.forEach((doc) => {
                // Add validation for job data
                const jobData = doc.data();
                if (jobData) {
                    jobs.push({
                        id: doc.id,
                        ...jobData,
                        // Ensure required fields have default values
                        title: jobData.title || '',
                        company: jobData.company || '',
                        location: jobData.location || '',
                        salary: jobData.salary || '₱0',
                        description: jobData.description || '',
                        type: jobData.type || '',
                        typeClass: jobData.typeClass || '',
                        timestamp: jobData.timestamp || Date.now()
                    });
                }
            });

            const noResultsMessage = document.getElementById('noResultsMessage');
            const container = document.querySelector('.container');

            // Show/hide "No jobs found" message based on jobs array
            if (jobs.length === 0) {
                if (noResultsMessage) {
                    noResultsMessage.style.display = 'block';
                }
                populateLocationFilter();
                return;
            }

            // Hide the message if there are jobs found
            if (noResultsMessage) {
                noResultsMessage.style.display = 'none';
            }

            // Sort jobs by timestamp (newest first)
            jobs.sort((a, b) => b.timestamp - a.timestamp);

            // Clear existing job cards
            const existingCards = document.querySelectorAll('.job-card');
            existingCards.forEach(card => card.remove());

            // Add sorted jobs to page
            jobs.forEach(jobData => {
                try {
                    addJobCardToPage(jobData);
                } catch (error) {
                    console.error("Error adding job card:", error, jobData);
                }
            });

            // Update timestamps every minute
            setInterval(() => {
                document.querySelectorAll('.job-time-added').forEach((timeElement, index) => {
                    if (jobs[index]) {
                        timeElement.textContent = formatTimeAgo(jobs[index].timestamp);
                    }
                });
            }, 60000);

            // Populate location filter after loading jobs
            populateLocationFilter();
        } catch (error) {
            console.error("Error loading jobs: ", error);
            alert('Error loading jobs. Please refresh the page.');
        }
    }

    // Load saved jobs when page loads
    loadJobsFromStorage();

    function getJobTypeDisplay(type) {
        const types = {
            'full-time': 'Full Time',
            'part-time': 'Part Time',
            'contractual': 'Contractual',
            'probational': 'Probational'
        };
        return types[type] || type;
    }

    function saveJobToStorage(jobData) {
        let jobs = JSON.parse(localStorage.getItem('jobs') || '[]');
        jobs.push(jobData);
        localStorage.setItem('jobs', JSON.stringify(jobs));
    }

    function getLatestJobFromStorage() {
        return JSON.parse(localStorage.getItem('currentJob'));
    }

    // Function to open the job modal
    function openJobModal(jobData) {
        if (!viewJobModal) return;
    
        currentJobData = jobData;
    
        // Clean up all data by removing dots/dividers
        const cleanCompany = jobData.company.replace(/[•·]|\s+[•·]\s+/g, '').trim();
        const cleanLocation = jobData.location.replace(/[•·]|\s+[•·]\s+/g, '').trim();
    
        const titleElement = viewJobModal.querySelector('.modal-job-title');
        const companyInfoSection = viewJobModal.querySelector('.modal-company-info');
        const descriptionElement = viewJobModal.querySelector('.modal-description');
        const jobTypeSpan = viewJobModal.querySelector('.modal-job-type');
    
        if (titleElement) titleElement.textContent = jobData.title;
        
        // Update company info section with icons and clean data
        if (companyInfoSection) {
            companyInfoSection.innerHTML = `
                <div class="info-item">
                    <i class="fas fa-building"></i>
                    <span class="modal-company">${cleanCompany}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span class="modal-location">${cleanLocation}</span>
                </div>
                <div class="info-item">
                    <i class="fas fa-money-bill-wave"></i>
                    <span class="modal-salary">${jobData.isConfidential ? ' ' : 
                        jobData.isRange ? `${formatSalary(jobData.minSalary)} - ${formatSalary(jobData.maxSalary)}` : 
                        formatSalary(jobData.salary)}</span>
                </div>
            `;
        }
    
        if (descriptionElement) descriptionElement.innerHTML = jobData.description;
    
        if (jobTypeSpan) {
            jobTypeSpan.className = 'modal-job-type ' + jobData.typeClass;
            jobTypeSpan.textContent = jobData.type;
        }
    
        openModal(viewJobModal);
    }

    // ESC key handler
    window.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeModal(addJobModal);
            closeModal(viewJobModal);
        }
    });
});

window.onload = function() {
    const savedContent = localStorage.getItem('editorContent');
    if (savedContent) {
        editor.innerHTML = savedContent;
        undoStack.push(savedContent);
    }
    updateListButtons();
};

// PSGC API Integration
async function fetchRegions() {
    try {
        const response = await fetch('https://psgc.gitlab.io/api/regions/');
        const regions = await response.json();
        const regionSelect = document.getElementById('region');

        regions.sort((a, b) => a.name.localeCompare(b.name)).forEach(region => {
            const option = new Option(region.name, region.code);
            regionSelect.add(option);
        });
    } catch (error) {
        console.error('Error fetching regions:', error);
    }
}

async function fetchProvinces(regionCode) {
    try {
        const provinceSelect = document.getElementById('province');

        // Special handling for NCR
        if (regionCode === '130000000') { // NCR's region code
            provinceSelect.innerHTML = '<option value="ncr">Metro Manila</option>';
            provinceSelect.disabled = true; // Disable province selection for NCR
            // Directly fetch NCR cities
            fetchNCRCities();
            return;
        }

        // Normal flow for other regions
        const response = await fetch(`https://psgc.gitlab.io/api/regions/${regionCode}/provinces/`);
        const provinces = await response.json();

        provinceSelect.innerHTML = '<option value="">Select Province</option>';
        provinces.sort((a, b) => a.name.localeCompare(b.name)).forEach(province => {
            const option = new Option(province.name, province.code);
            provinceSelect.add(option);
        });
        provinceSelect.disabled = false;
    } catch (error) {
        console.error('Error fetching provinces:', error);
    }
}

async function fetchNCRCities() {
    try {
        const response = await fetch('https://psgc.gitlab.io/api/regions/130000000/cities-municipalities/');
        const cities = await response.json();
        const citySelect = document.getElementById('city');

        citySelect.innerHTML = '<option value="">Select City</option>';
        cities.sort((a, b) => a.name.localeCompare(b.name)).forEach(city => {
            const option = new Option(city.name, city.code);
            citySelect.add(option);
        });
        citySelect.disabled = false;
    } catch (error) {
        console.error('Error fetching NCR cities:', error);
    }
}

async function fetchCities(provinceCode) {
    try {
        const response = await fetch(`https://psgc.gitlab.io/api/provinces/${provinceCode}/cities-municipalities/`);
        const cities = await response.json();
        const citySelect = document.getElementById('city');

        citySelect.innerHTML = '<option value="">Select City/Municipality</option>';
        cities.sort((a, b) => a.name.localeCompare(b.name)).forEach(city => {
            const option = new Option(city.name, city.code);
            citySelect.add(option);
        });
        citySelect.disabled = false;
    } catch (error) {
        console.error('Error fetching cities:', error);
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    fetchRegions();

    document.getElementById('region').addEventListener('change', (e) => {
        const regionCode = e.target.value;
        document.getElementById('city').disabled = true;
        document.getElementById('city').innerHTML = '<option value="">Select City/Municipality</option>';
        if (regionCode) {
            fetchProvinces(regionCode);
        }
        updateLocationValue();
    });

    document.getElementById('province').addEventListener('change', (e) => {
        const provinceCode = e.target.value;
        if (provinceCode) {
            fetchCities(provinceCode);
        }
        updateLocationValue();
    });

    document.getElementById('city').addEventListener('change', () => {
        updateLocationValue();
    });
});

// Add these event listeners after your dropdowns are created
document.getElementById('region').addEventListener('change', async function(e) {
    const provinceSelect = document.getElementById('province');
    const citySelect = document.getElementById('city');

    if (this.value === '130000000') { // NCR
        provinceSelect.innerHTML = '<option value="ncr">Metro Manila</option>';
        provinceSelect.disabled = true;

        try {
            const response = await fetch('https://psgc.gitlab.io/api/regions/130000000/cities-municipalities/');
            const cities = await response.json();

            citySelect.innerHTML = '<option value="">Select City</option>';
            cities.sort((a, b) => a.name.localeCompare(b.name)).forEach(city => {
                const option = new Option(city.name, city.code);
                citySelect.add(option);
            });
            citySelect.disabled = false;
        } catch (error) {
            console.error("Error loading NCR cities:", error);
        }
    } else {
        provinceSelect.disabled = false;
        provinceSelect.innerHTML = '<option value="">Select Province</option>';
        citySelect.innerHTML = '<option value="">Select City/Municipality</option>';
        citySelect.disabled = true;
        if (this.value) {
            await fetchProvinces(this.value);
        }
    }
});

document.getElementById('province').addEventListener('change', async function(e) {
    const citySelect = document.getElementById('city');
    citySelect.innerHTML = '<option value="">Select City/Municipality</option>';

    if (this.value && this.value !== 'ncr') {
        citySelect.disabled = false;
        try {
            const response = await fetch(`https://psgc.gitlab.io/api/provinces/${this.value}/cities-municipalities/`);
            const cities = await response.json();

            cities.sort((a, b) => a.name.localeCompare(b.name)).forEach(city => {
                const option = new Option(city.name, city.code);
                citySelect.add(option);
            });
        } catch (error) {
            console.error("Error loading cities:", error);
        }
    } else {
        citySelect.disabled = true;
    }
});

function updateLocationValue() {
    const region = document.getElementById('region');
    const province = document.getElementById('province');
    const city = document.getElementById('city');
    const locationInput = document.getElementById('location');

    const selectedRegion = region.options[region.selectedIndex].text;
    const selectedProvince = province.options[province.selectedIndex].text;
    const selectedCity = city.options[city.selectedIndex].text;

    // Special handling for NCR
    if (region.value === '130000000') {
        locationInput.value = `${selectedCity}, Metro Manila`;
    } else {
        const locationParts = [selectedCity, selectedProvince, selectedRegion]
            .filter(part => part && part !== 'Select Region' && part !== 'Select Province' && part !== 'Select City/Municipality');
        locationInput.value = locationParts.join(', ');
    }
}