
"use strict";

// ============================================
// VAULTCHECK - PASSWORD SECURITY FUNCTIONALITY
// ============================================

const $ = (id) => document.getElementById(id);

const passwordInput = $("password");
const togglePassword = $("togglePassword");
const clearButton = $("clearButton");

const scoreValue = $("scoreValue");
const strengthText = $("strengthText");
const feedback = $("feedback");
const scorePercent = $("scorePercent");
const strengthBar = $("strengthBar");
const strengthProgress = $("strengthProgress");
const gauge = $("gauge");

const lengthCount = $("lengthCount");
const criteriaCount = $("criteriaCount");
const varietyValue = $("varietyValue");
const entropyValue = $("entropyValue");
const warningValue = $("warningValue");
const lengthValue = $("lengthValue");
const suggestions = $("suggestions");

const passwordLength = $("passwordLength");
const lengthOutput = $("lengthOutput");
const generatedText = $("generatedText");
const generateButton = $("generateButton");
const copyButton = $("copyButton");
const actionMessage = $("actionMessage");
const toast = $("toast");
const themeButton = $("themeButton");

let generatedPassword = "";
let toastTimer;

// ============================================
// GENERAL HELPERS
// ============================================

function showMessage(message) {
    if (actionMessage) {
        actionMessage.textContent = message;
    }

    if (toast) {
        toast.textContent = message;
        toast.classList.add("show");

        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.classList.remove("show");
        }, 2500);
    }
}

function randomInt(max) {
    if (max <= 0) {
        throw new Error("Maximum must be positive.");
    }

    // Use browser cryptographic randomness.
    const limit = Math.floor(0x100000000 / max) * max;
    const array = new Uint32Array(1);

    do {
        crypto.getRandomValues(array);
    } while (array[0] >= limit);

    return array[0] % max;
}

function secureShuffle(items) {
    for (let i = items.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [items[i], items[j]] = [items[j], items[i]];
    }

    return items;
}

// ============================================
// PASSWORD ANALYZER
// Updates automatically while typing.
// ============================================

function analyzePassword() {
    if (!passwordInput) return;

    const password = passwordInput.value;
    const length = password.length;

    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const hasLength = length >= 8;

    const criteria = [
        ["length", hasLength],
        ["uppercase", hasUpper],
        ["lowercase", hasLower],
        ["number", hasNumber],
        ["special", hasSpecial]
    ];

    let passed = 0;

    criteria.forEach(([id, valid]) => {
        const item = $(id);
        if (!item) return;

        item.classList.toggle("valid", valid);

        const check = item.querySelector(".check");

        if (check) {
            check.textContent = valid ? "✓" : "○";
        }

        if (valid) passed++;
    });

    if (criteriaCount) {
        criteriaCount.textContent = `${passed} / 5`;
    }

    if (lengthCount) {
        lengthCount.textContent = `${length} / 128 characters`;
    }

    if (lengthValue) {
        lengthValue.textContent = `${length} chars`;
    }

    if (!length) {
        updateEmptyAnalysis();
        return;
    }

    // Character pool used for an approximate entropy estimate.
    let poolSize = 0;
    let variety = 0;

    if (hasLower) {
        poolSize += 26;
        variety++;
    }

    if (hasUpper) {
        poolSize += 26;
        variety++;
    }

    if (hasNumber) {
        poolSize += 10;
        variety++;
    }

    if (hasSpecial) {
        poolSize += 33;
        variety++;
    }

    if (varietyValue) {
        varietyValue.textContent = `${variety} types`;
    }

    const entropy = poolSize > 1
        ? Math.round(length * Math.log2(poolSize))
        : 0;

    if (entropyValue) {
        entropyValue.textContent = `${entropy} bits*`;
    }

    // Detect common patterns and repeated characters.
    const warnings = [];

    if (/(.)\1{2,}/i.test(password)) {
        warnings.push("Repeated characters");
    }

    if (
        /password|qwerty|admin|welcome|letmein|123456/i.test(password)
    ) {
        warnings.push("Common password pattern");
    }

    if (
        /0123|1234|2345|3456|4567|5678|6789|abcd|qwerty/i.test(password)
    ) {
        warnings.push("Predictable sequence");
    }

    if (warningValue) {
        warningValue.textContent = warnings.length
            ? warnings.join(", ")
            : "None detected";
    }

    // A simple educational heuristic, not a security guarantee.
    let score = 0;

    score += Math.min(length, 16) * 3;
    score += Math.min(Math.max(length - 16, 0), 16) * 1;

    if (hasUpper) score += 10;
    if (hasLower) score += 10;
    if (hasNumber) score += 10;
    if (hasSpecial) score += 15;

    if (length >= 12) score += 5;
    if (length >= 16) score += 5;

    score = Math.min(100, score);

    if (warnings.length) {
        score = Math.max(0, score - warnings.length * 12);
    }

    let rating;
    let message;
    let color;

    if (score < 25) {
        rating = "Very weak";
        message = "Your password needs significant improvement.";
        color = "#c65364";
    } else if (score < 45) {
        rating = "Weak";
        message = "Add more characters and variety.";
        color = "#d77b58";
    } else if (score < 65) {
        rating = "Fair";
        message = "You're making progress. Strengthen your password further.";
        color = "#b77a29";
    } else if (score < 85) {
        rating = "Strong";
        message = "Good work! Your password meets several security criteria.";
        color = "#278768";
    } else {
        rating = "Very strong";
        message = "Excellent variety and length. Avoid predictable patterns.";
        color = "#278768";
    }

    if (scoreValue) scoreValue.textContent = score;
    if (strengthText) strengthText.textContent = rating;
    if (feedback) feedback.textContent = message;
    if (scorePercent) scorePercent.textContent = `${score}%`;

    if (strengthBar) {
        strengthBar.style.width = `${score}%`;
        strengthBar.style.background = color;
    }

    if (gauge) {
        gauge.style.background =
            `conic-gradient(${color} ${score * 3.6}deg, var(--border) 0deg)`;
    }

    if (strengthProgress) {
        strengthProgress.setAttribute("aria-valuenow", String(score));
    }

    updateRecommendations({
        length,
        hasLength,
        hasUpper,
        hasLower,
        hasNumber,
        hasSpecial,
        warnings
    });
}

function updateEmptyAnalysis() {
    if (scoreValue) scoreValue.textContent = "0";
    if (strengthText) strengthText.textContent = "Waiting for input";
    if (feedback) {
        feedback.textContent = "Enter a password to begin your analysis.";
    }

    if (scorePercent) scorePercent.textContent = "0%";
    if (strengthBar) {
        strengthBar.style.width = "0%";
        strengthBar.style.background = "var(--accent)";
    }

    if (gauge) {
        gauge.style.background =
            "conic-gradient(var(--accent) 0deg, var(--border) 0deg)";
    }

    if (strengthProgress) {
        strengthProgress.setAttribute("aria-valuenow", "0");
    }

    if (varietyValue) varietyValue.textContent = "0 types";
    if (entropyValue) entropyValue.textContent = "0 bits*";
    if (warningValue) warningValue.textContent = "None";
    if (lengthValue) lengthValue.textContent = "0 chars";
    if (criteriaCount) criteriaCount.textContent = "0 / 5";

    ["length", "uppercase", "lowercase", "number", "special"]
        .forEach((id) => {
            const item = $(id);
            if (!item) return;

            item.classList.remove("valid");

            const check = item.querySelector(".check");
            if (check) check.textContent = "○";
        });

    if (suggestions) {
        suggestions.replaceChildren();

        const title = document.createElement("strong");
        title.textContent = "Recommendations";

        const paragraph = document.createElement("p");
        paragraph.textContent =
            "Your personalized recommendations will appear here.";

        suggestions.append(title, paragraph);
    }
}

function updateRecommendations(data) {
    if (!suggestions) return;

    const recommendations = [];

    if (!data.hasLength) {
        recommendations.push("Use at least 8 characters; longer is generally better.");
    }

    if (!data.hasUpper) {
        recommendations.push("Include uppercase letters.");
    }

    if (!data.hasLower) {
        recommendations.push("Include lowercase letters.");
    }

    if (!data.hasNumber) {
        recommendations.push("Add numbers.");
    }

    if (!data.hasSpecial) {
        recommendations.push("Consider adding special characters.");
    }

    if (data.length < 14) {
        recommendations.push("Consider using a longer password or passphrase.");
    }

    if (data.warnings.length) {
        recommendations.push(
            "Avoid common words, repeated characters and predictable sequences."
        );
    }

    if (!recommendations.length) {
        recommendations.push(
            "Your password meets all five checklist requirements. Make sure it is unique to this account."
        );
    }

    suggestions.replaceChildren();

    const title = document.createElement("strong");
    title.textContent = "Recommendations";

    const list = document.createElement("ul");

    recommendations.forEach((recommendation) => {
        const item = document.createElement("li");
        item.textContent = recommendation;
        list.appendChild(item);
    });

    suggestions.append(title, list);
}

// ============================================
// SHOW / HIDE PASSWORD
// ============================================

if (togglePassword && passwordInput) {
    togglePassword.addEventListener("click", () => {
        const show = passwordInput.type === "password";

        passwordInput.type = show ? "text" : "password";
        togglePassword.textContent = show ? "Hide" : "Show";
        togglePassword.setAttribute(
            "aria-label",
            show ? "Hide password" : "Show password"
        );
    });
}

// ============================================
// CLEAR ANALYZER
// ============================================

if (clearButton && passwordInput) {
    clearButton.addEventListener("click", () => {
        passwordInput.value = "";
        analyzePassword();
        passwordInput.focus();
    });
}

if (passwordInput) {
    passwordInput.addEventListener("input", analyzePassword);
}

// ============================================
// PASSWORD GENERATOR
// ============================================

if (passwordLength && lengthOutput) {
    const updateLength = () => {
        lengthOutput.textContent = passwordLength.value;
    };

    passwordLength.addEventListener("input", updateLength);
    updateLength();
}

function generatePassword() {
    const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const lower = "abcdefghijklmnopqrstuvwxyz";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()-_=+[]{}:,.?";

    const excludeAmbiguous =
        $("excludeAmbiguous")?.checked ?? false;

    const removeAmbiguous = (characters) =>
        excludeAmbiguous
            ? characters.replace(/[O0Il1]/g, "")
            : characters;

    const groups = [];

    if ($("includeUpper")?.checked) {
        groups.push(removeAmbiguous(upper));
    }

    if ($("includeLower")?.checked) {
        groups.push(removeAmbiguous(lower));
    }

    if ($("includeNumbers")?.checked) {
        groups.push(removeAmbiguous(numbers));
    }

    if ($("includeSymbols")?.checked) {
        groups.push(symbols);
    }

    if (!groups.length) {
        generatedPassword = "";

        if (generatedText) {
            generatedText.textContent =
                "Select at least one character option.";
        }

        showMessage("Please select at least one character type.");
        return;
    }

    const length = Number(passwordLength?.value ?? 20);

    if (length < groups.length) {
        showMessage("Increase the password length for your selected options.");
        return;
    }

    // Start with one character from every selected category.
    const characters = groups.map((group) => {
        return group[randomInt(group.length)];
    });

    // Fill the remaining positions from the combined character pool.
    const pool = groups.join("");

    while (characters.length < length) {
        characters.push(pool[randomInt(pool.length)]);
    }

    generatedPassword = secureShuffle(characters).join("");

    if (generatedText) {
        generatedText.textContent = generatedPassword;
    }

    if (actionMessage) actionMessage.textContent = "";

    if (toast) toast.classList.remove("show");
}

if (generateButton) {
    generateButton.addEventListener("click", generatePassword);
}

// ============================================
// COPY GENERATED PASSWORD
// Copies only the generated password.
// ============================================

async function copyGeneratedPassword() {
    if (!generatedPassword) {
        showMessage("Generate a password before copying it.");
        return;
    }

    try {
        await navigator.clipboard.writeText(generatedPassword);
        showMessage("Generated password copied successfully!");
    } catch (error) {
        // Fallback for local development environments.
        const temporaryInput = document.createElement("textarea");

        temporaryInput.value = generatedPassword;
        temporaryInput.style.position = "fixed";
        temporaryInput.style.opacity = "0";

        document.body.appendChild(temporaryInput);
        temporaryInput.select();

        const copied = document.execCommand("copy");
        temporaryInput.remove();

        showMessage(
            copied
                ? "Generated password copied successfully!"
                : "Copy failed. Please select and copy the password manually."
        );
    }
}

if (copyButton) {
    copyButton.addEventListener("click", copyGeneratedPassword);
}

// ============================================
// THEME TOGGLE
// ============================================

if (themeButton) {
    themeButton.addEventListener("click", () => {
        const root = document.documentElement;

        const isDark = root.getAttribute("data-theme") === "dark";
        const newTheme = isDark ? "light" : "dark";

        root.setAttribute("data-theme", newTheme);
        themeButton.textContent = newTheme === "dark" ? "☀" : "☾";
        themeButton.setAttribute(
            "aria-label",
            newTheme === "dark" ? "Switch to light theme" : "Switch to dark theme"
        );
    });
}

// ============================================
// INITIALIZE
// ============================================

analyzePassword();

console.info("VaultCheck JavaScript initialized.");
