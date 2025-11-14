// --- UI Only: Timer Widget ---
function getProjectIdFromUrl() {
    const match = window.location.pathname.match(/\/edit\/([A-Za-z0-9]+)/);
    return match ? match[1] : null;
}

function formatTime(totalSeconds) {
    const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
}

function addTimerUI(targetElement) {
    // Inactivity timer: pause if no mouse movement for 30s, resume on movement
    let inactivityTimeoutId = null;
    let wasPausedByInactivity = false;
    function resetInactivityTimer() {
        if (inactivityTimeoutId) clearTimeout(inactivityTimeoutId);
        inactivityTimeoutId = setTimeout(() => {
            if (intervalId) {
                stopTimer();
                wasPausedByInactivity = true;
            }
        }, 30000);
    }
    document.addEventListener('mousemove', () => {
        resetInactivityTimer();
        if (wasPausedByInactivity) {
            const projectId = getProjectIdFromUrl();
            if (projectId) startTimerForProject(projectId);
            wasPausedByInactivity = false;
        }
    });
    resetInactivityTimer();
    // Pause/resume timer on tab visibility change
    let wasPausedByVisibility = false;
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (intervalId) {
                stopTimer();
                wasPausedByVisibility = true;
            }
        } else {
            if (wasPausedByVisibility) {
                // Resume timer for current project
                const projectId = getProjectIdFromUrl();
                if (projectId) startTimerForProject(projectId);
                wasPausedByVisibility = false;
            }
        }
    });
    // --- Create and Inject DOM Elements ---
    const wrapperDiv = document.createElement('div');
    wrapperDiv.id = 'yt-effects-timer-plugin-wrapper';
    wrapperDiv.style.display = 'flex';
    wrapperDiv.style.alignItems = 'center';

    const clockSVG = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="cursor: pointer; margin-left: 0px;">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
            <circle cx="12" cy="12" r="9"></circle>
            <polyline points="12 7 12 12 15 15"></polyline>
        </svg>
    `;
    const iconContainer = document.createElement('div');
    iconContainer.innerHTML = clockSVG;

    const timerDisplay = document.createElement('div');
    timerDisplay.style.display = 'none';
    // Toggle timer display on SVG click
    const svg = iconContainer.querySelector('svg');
    svg.addEventListener('click', () => {
        timerDisplay.style.display = timerDisplay.style.display === 'none' ? 'block' : 'none';
    });
    timerDisplay.style.marginLeft = '5px';
    timerDisplay.style.fontSize = '16px';
    timerDisplay.style.fontFamily = 'Roboto, Arial, sans-serif';
    
    wrapperDiv.appendChild(iconContainer);
    wrapperDiv.appendChild(timerDisplay);

    if (!targetElement) return;
    const referenceNode = targetElement.children[2];
    if (referenceNode) {
        targetElement.insertBefore(wrapperDiv, referenceNode);
    } else {
        targetElement.appendChild(wrapperDiv);
    }
    // No click-to-toggle logic: timer is always visible

    // Immediately update timer display on UI creation
    updateTimerDisplay();

    // --- Timer logic per project ---
    let intervalId = null;
    let lastProjectId = null;

    function updateTimerDisplay() {
        const projectId = getProjectIdFromUrl();
        if (!projectId) {
            timerDisplay.textContent = '00:00:00';
            return;
        }
        const storageKey = `ytEffectsTimer_${projectId}`;
        let seconds = 0;
        try {
            seconds = parseInt(localStorage.getItem(storageKey), 10);
            if (isNaN(seconds) || seconds < 0) seconds = 0;
        } catch (e) {
            seconds = 0;
        }
        timerDisplay.textContent = formatTime(seconds);
    }

    function startTimerForProject(projectId) {
        if (intervalId) clearInterval(intervalId);
        if (window.ytEffectsTimerIntervalId) {
            clearInterval(window.ytEffectsTimerIntervalId);
            window.ytEffectsTimerIntervalId = null;
        }
        if (window.ytEffectsTimerTimeoutId) {
            clearTimeout(window.ytEffectsTimerTimeoutId);
            window.ytEffectsTimerTimeoutId = null;
        }
        if (!projectId) return;
        const storageKey = `ytEffectsTimer_${projectId}`;
        // Delay timer start by 5 seconds
        window.ytEffectsTimerTimeoutId = setTimeout(() => {
            intervalId = setInterval(() => {
                let seconds = 0;
                try {
                    seconds = parseInt(localStorage.getItem(storageKey), 10);
                    if (isNaN(seconds) || seconds < 0) seconds = 0;
                } catch (e) {
                    seconds = 0;
                }
                seconds++;
                localStorage.setItem(storageKey, seconds.toString());
                timerDisplay.textContent = formatTime(seconds);
            }, 1000);
            window.ytEffectsTimerIntervalId = intervalId;
            window.ytEffectsTimerTimeoutId = null;
        }, 1000);
    }

    function stopTimer() {
        if (intervalId) clearInterval(intervalId);
        if (window.ytEffectsTimerIntervalId) {
            clearInterval(window.ytEffectsTimerIntervalId);
            window.ytEffectsTimerIntervalId = null;
        }
        if (window.ytEffectsTimerTimeoutId) {
            clearTimeout(window.ytEffectsTimerTimeoutId);
            window.ytEffectsTimerTimeoutId = null;
        }
        intervalId = null;
    }

    // Start timer automatically for the current project
    window.handleProjectChange = function handleProjectChange() {
        const projectId = getProjectIdFromUrl();
        if (projectId !== lastProjectId) {
            // Always clear any global timer/timeout before starting a new one
            if (window.ytEffectsTimerIntervalId) {
                clearInterval(window.ytEffectsTimerIntervalId);
                window.ytEffectsTimerIntervalId = null;
            }
            if (window.ytEffectsTimerTimeoutId) {
                clearTimeout(window.ytEffectsTimerTimeoutId);
                window.ytEffectsTimerTimeoutId = null;
            }
            stopTimer();
            updateTimerDisplay();
            if (projectId) {
                startTimerForProject(projectId);
                updateTimerDisplay(); // Ensure immediate visual update
            }
            lastProjectId = projectId;
        }
    }

    // Initial start
    window.handleProjectChange();

    // Watch for project changes (URL changes)
    setInterval(handleProjectChange, 500);
}

// --- SPA/MutationObserver logic to inject UI on dynamic page changes ---
let lastUrl = location.href;

function injectTimerIfNeeded() {
    const targetElement = document.querySelector('.ytEffectsEditorToolbarMenu');
    if (targetElement && !document.getElementById('yt-effects-timer-plugin-wrapper')) {
        addTimerUI(targetElement);
        // Immediately trigger timer logic for the new project
        if (typeof window.handleProjectChange === 'function') {
            window.handleProjectChange();
        }
    }
}

function checkUrlChange() {
    if (location.href !== lastUrl) {
        // If the project id after /edit/ changes, reload the page
        const prevProjectId = lastUrl.match(/\/edit\/([A-Za-z0-9]+)/);
        const newProjectId = location.pathname.match(/\/edit\/([A-Za-z0-9]+)/);
        lastUrl = location.href;
        if ((prevProjectId && newProjectId && prevProjectId[1] !== newProjectId[1]) || (!prevProjectId && newProjectId) || (prevProjectId && !newProjectId)) {
            window.location.reload();
            return;
        }
        // Remove old timer if present
        const existing = document.getElementById('yt-effects-timer-plugin-wrapper');
        if (existing) existing.remove();
        setTimeout(injectTimerIfNeeded, 1000); // Delay for DOM update
    }
}

// Monkey-patch history methods
const _pushState = history.pushState;
history.pushState = function() {
    _pushState.apply(this, arguments);
    checkUrlChange();
};
const _replaceState = history.replaceState;
history.replaceState = function() {
    _replaceState.apply(this, arguments);
    checkUrlChange();
};
window.addEventListener('popstate', checkUrlChange);

// Polling fallback for URL changes
setInterval(checkUrlChange, 500);

// Initial injection
injectTimerIfNeeded();