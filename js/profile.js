import { 
    initializePage, 
    auth, 
    db 
} from './auth.js';
import { 
    populateUserNav, 
    getInitials, 
    createInitialsAvatar 
} from './utils.js';
import { 
    collection, 
    query, 
    where, 
    getDocs,
    doc,
    updateDoc 
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

function hideLoader() {
    const loader = document.getElementById('loadingOverlay');
    if (loader) {
        loader.classList.add('hidden');
    }
}

async function initializeProfile() {
    try {
        const user = auth.currentUser;
        if (user) {
            const userData = await getEmployerData(user.email);
            if (userData) {
                await populateUserNav();
                populateProfilePage(userData);
                
                // Update profile image with initials
                const profileImage = document.getElementById('profileInitials');
                if (profileImage) {
                    profileImage.innerHTML = createInitialsAvatar(
                        userData.firstName || '', 
                        userData.lastName || '',
                        'large'
                    );
                }
                
                hideLoader();
            } else {
                console.error("User data not found");
                hideLoader();
                window.location.href = 'login.html';
            }
        }
    } catch (error) {
        console.error("Error initializing profile:", error);
        hideLoader();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initializePage(initializeProfile);
});

// Function to format full name
function formatFullName(firstName, middleName, lastName) {
    if (middleName && middleName.trim() !== "") {
        return `${firstName} ${middleName.charAt(0)}. ${lastName}`;
    } else {
        return `${firstName} ${lastName}`;
    }
}

// Function to get employer data
async function getEmployerData(email) {
    try {
        const employersRef = collection(db, "employers");
        const q = query(employersRef, where("email", "==", email.toLowerCase()));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            userData.id = querySnapshot.docs[0].id; // Save document ID for updates
            return userData;
        }
        return null;
    } catch (error) {
        console.error("Error fetching employer data:", error);
        return null;
    }
}

// Function to populate profile page
function populateProfilePage(userData) {
    // Update profile header with formatted full name and username
    const fullName = formatFullName(
        userData.firstName || '',
        userData.middleName || '',
        userData.lastName || ''
    );
    
    document.querySelector('.profile-name').textContent = fullName;
    document.querySelector('.profile-subtitle').textContent = 
        `${userData.username} | ${userData.email} - ${userData.role || 'Employer'}`;

    // Update form fields
    document.getElementById('username').value = userData.username || '';
    document.getElementById('email').value = userData.email || '';
    document.getElementById('firstName').value = userData.firstName || '';
    document.getElementById('lastName').value = userData.lastName || '';

    // Handle middle name field
    const middleNameInput = document.getElementById('middleName');
    if (!userData.middleName) {
        middleNameInput.value = '';
        middleNameInput.disabled = true;
        middleNameInput.style.backgroundColor = '#f9f9fc';
        middleNameInput.style.cursor = 'not-allowed';
        middleNameInput.style.color = '#6e707e';
    } else {
        middleNameInput.value = userData.middleName;
        middleNameInput.disabled = false;
        middleNameInput.style.backgroundColor = '';
        middleNameInput.style.cursor = '';
        middleNameInput.style.color = '';
    }

    // Update navbar name
    const navbarName = document.querySelector('.mr-2.d-none.d-lg-inline.text-gray-600.small');
    if (navbarName) {
        navbarName.textContent = `${userData.username}`;
    }
}

// Function to save profile changes
async function saveProfileChanges(e) {
    e.preventDefault();
    
    const form = document.getElementById('profile-form');
    const userData = {
        username: form.username.value.trim(),
        firstName: form.firstName.value.trim(),
        middleName: form.middleName.value.trim(),
        lastName: form.lastName.value.trim()
    };

    // Validate required fields
    if (!userData.firstName || !userData.lastName || !userData.username) {
        confirm('Username, First Name, and Last Name are required.');
        return;
    }

    try {
        const user = auth.currentUser;
        
        if (user) {
            const employersRef = collection(db, "employers");
            const q = query(employersRef, where("email", "==", user.email));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const employerDoc = querySnapshot.docs[0];
                await updateDoc(doc(db, "employers", employerDoc.id), userData);
                confirm('Profile updated successfully!');
                
                // Refresh the page to show updated data
                window.location.reload();
            }
        }
    } catch (error) {
        console.error("Error updating profile:", error);
        confirm('Failed to update profile. Please try again.');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializePage(initializeProfile);
    
    // Add form submit handler
    const profileForm = document.getElementById('profile-form');
    if (profileForm) {
        profileForm.addEventListener('submit', saveProfileChanges);
    }
});

