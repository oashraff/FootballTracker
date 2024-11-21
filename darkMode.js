class DarkModeManager {
    constructor() {
        this.toggle = document.getElementById('darkModeToggle');
        this.isDarkMode = document.documentElement.classList.contains('dark');
        this.initialize();
    }

    initialize() {
        // Set initial state
        this.updateToggleState();

        // Add event listener
        this.toggle.addEventListener('click', () => this.toggleDarkMode());

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (!localStorage.theme) {
                this.setDarkMode(e.matches);
            }
        });
    }

    updateToggleState() {
        // Update ARIA attributes
        this.toggle.setAttribute('aria-checked', this.isDarkMode);
        
        // Update toggle appearance (handled by Tailwind classes)
        document.documentElement.classList.toggle('dark', this.isDarkMode);
    }

    toggleDarkMode() {
        this.setDarkMode(!this.isDarkMode);
    }

    setDarkMode(enabled) {
        this.isDarkMode = enabled;
        
        if (enabled) {
            localStorage.theme = 'dark';
            document.documentElement.classList.add('dark');
        } else {
            localStorage.theme = 'light';
            document.documentElement.classList.remove('dark');
        }

        this.updateToggleState();
        
        // Dispatch event for other components that might need to react to theme changes
        window.dispatchEvent(new CustomEvent('themeChanged', { 
            detail: { isDarkMode: enabled } 
        }));
    }
}

function toggleDarkMode(isDark) {
  document.body.classList.toggle('dark', isDark);
  
  // Update the toggle text
  const toggleText = document.querySelector('#darkModeToggle + span');
  toggleText.textContent = isDark ? 'Light mode' : 'Dark mode';
}

document.addEventListener('DOMContentLoaded', () => {
  const darkModeToggle = document.getElementById('darkModeToggle');
  
  // Set initial state
  const isDarkMode = localStorage.theme === 'dark' || 
    (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  toggleDarkMode(isDarkMode);
  darkModeToggle.classList.toggle('dark', isDarkMode);
  
  darkModeToggle.addEventListener('click', () => {
    const isDark = !document.body.classList.contains('dark');
    toggleDarkMode(isDark);
    darkModeToggle.classList.toggle('dark', isDark);
    
    // Save preference
    localStorage.theme = isDark ? 'dark' : 'light';
  });
});