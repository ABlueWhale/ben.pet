import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD_NC9haqKslyXFcJD14JYMNSHIi_1OkuE",
  authDomain: "bendotpet.firebaseapp.com",
  projectId: "bendotpet",
  storageBucket: "bendotpet.firebasestorage.app",
  messagingSenderId: "1091711278601",
  appId: "1:1091711278601:web:b1a0b2d3752e8f782a62d8",
  measurementId: "G-11RF3DDHN1",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// Function to generate a random key
const generateKey = (length: number): string => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(
    { length },
    () => characters[Math.floor(Math.random() * characters.length)]
  ).join("");
};

// Function to create a user key
const createUserKeys = async (): Promise<{
  publicKey: string;
  privateKey: string;
}> => {
  while (true) {
    // Generate a 20-character private key
    const privateKey = generateKey(20);
    const publicKey = privateKey.substring(0, 6);

    // Check if the key already exists in Firestore
    const docRef = doc(db, "users", privateKey);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // Save the private key as the document ID for uniqueness
      await setDoc(docRef, { publicKey });
      return { publicKey, privateKey };
    }
  }
};

// Export the function to make it accessible to the window object
export const handleSignUp = async () => {
  try {
    const { publicKey, privateKey } = await createUserKeys();
    // Store the private key in session storage instead of URL
    sessionStorage.setItem("userKey", privateKey);
    // Redirect without exposing the key in URL
    window.location.href = "/account/";
  } catch (error) {
    console.error("Error generating keys:", error);
    alert("Error generating keys. Please try again.");
  }
};

// Add a function to handle displaying keys on the account page
export function displayKeys() {
  if (window.location.pathname.includes("/account/")) {
    const privateKey = sessionStorage.getItem("userKey");
    const publicKeyElement = document.getElementById("publicKey");
    const privateKeyElement = document.getElementById("privateKey");
    const statusElement = document.getElementById("status");

    if (privateKey && publicKeyElement && privateKeyElement) {
      const truncatedKey = privateKey.substring(0, 6) + "...";
      publicKeyElement.textContent = privateKey.substring(0, 6);
      privateKeyElement.textContent = truncatedKey;

      // Add click handler for privateKey element
      privateKeyElement.addEventListener("click", async (e) => {
        e.stopPropagation();
        privateKeyElement.textContent = privateKeyElement.textContent.includes(
          "..."
        )
          ? privateKey
          : truncatedKey;

        // Copy to clipboard when expanded
        if (!privateKeyElement.textContent.includes("...")) {
          try {
            await navigator.clipboard.writeText(privateKey);
            if (statusElement) {
              statusElement.textContent = "COPIED KEY";
              statusElement.classList.add("visible");
              setTimeout(() => {
                statusElement.classList.remove("visible");
              }, 2000);
            }
          } catch (err) {
            console.error("FAILED TO COPY KEY", err);
          }
        }
      });

      // Add document click handler to collapse
      document.addEventListener("click", () => {
        privateKeyElement.textContent = truncatedKey;
      });
    }
  }
}

// Make sure displayKeys is called when the page loads
window.addEventListener("load", displayKeys);

// Make displayKeys available on the window object
declare global {
  interface Window {
    displayKeys: () => void;
  }
}
window.displayKeys = displayKeys;

// Make handleSignUp available on the window object
declare global {
  interface Window {
    handleSignUp: () => Promise<void>;
  }
}
window.handleSignUp = handleSignUp;

// Function to handle sign in
export const handleSignIn = async (privateKey: string): Promise<boolean> => {
  try {
    const docRef = doc(db, "users", privateKey);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      sessionStorage.setItem("userKey", privateKey);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error checking key:", error);
    return false;
  }
};

// Add these new exports for todo functionality
export const saveTodoTasks = async (
  tasks: { text: string; completed: boolean }[]
) => {
  const privateKey = sessionStorage.getItem("userKey");

  if (!privateKey) {
    // For unauthenticated users, save to localStorage instead
    localStorage.setItem("localTodoTasks", JSON.stringify(tasks));
    return true;
  }

  // For authenticated users, save to Firestore
  try {
    const docRef = doc(db, "users", privateKey);
    await setDoc(docRef, { tasks }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error saving tasks:", error);
    return false;
  }
};

export const loadTodoTasks = async () => {
  const privateKey = sessionStorage.getItem("userKey");

  if (!privateKey) {
    // For unauthenticated users, load from localStorage
    const localTasks = localStorage.getItem("localTodoTasks");
    return localTasks ? JSON.parse(localTasks) : [];
  }

  // For authenticated users, load from Firestore
  try {
    const docRef = doc(db, "users", privateKey);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists() && docSnap.data().tasks) {
      return docSnap.data().tasks;
    }
    return [];
  } catch (error) {
    console.error("Error loading tasks:", error);
    return [];
  }
};

// Add this new export
export const updateSignInLinks = () => {
  const userKey = sessionStorage.getItem("userKey");
  const signInLinks = document.querySelectorAll('a[href="/signin/"]');
  const todoLinks = document.querySelectorAll('a[href="/todo/"]');
  const registerLink = document.querySelector(".register-link");

  // Update sign in links
  signInLinks.forEach((link) => {
    if (userKey) {
      link.textContent = "ACCOUNT";
      link.href = "/account/";
    } else {
      link.textContent = "SIGN IN";
      link.href = "/signin/";
    }
  });

  // Ensure todo links always point to /todo/
  todoLinks.forEach((link) => {
    link.href = "/todo/";
  });

  // Hide register link if user is logged in
  if (registerLink) {
    registerLink.style.display = userKey ? "none" : "block";
  }
};
