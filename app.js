const config = {
    API_KEY: "" 
};
const API_URL = 'https://v3.football.api-sports.io/status';

// Add this near the top of your file with your other constants
const LEAGUES = [
    { id: 39, name: "Premier League", logo: "https://media.api-sports.io/football/leagues/39.png" },
    { id: 140, name: "La Liga", logo: "https://media.api-sports.io/football/leagues/140.png" },
    { id: 78, name: "Bundesliga", logo: "https://media.api-sports.io/football/leagues/78.png" },
    { id: 135, name: "Serie A", logo: "https://media.api-sports.io/football/leagues/135.png" },
    { id: 61, name: "Ligue 1", logo: "https://media.api-sports.io/football/leagues/61.png" }
];

function validateFixtureData(fixture) {
    return fixture 
        && fixture.league 
        && fixture.league.id 
        && fixture.fixture 
        && fixture.teams 
        && fixture.goals;
}

// Fetch API status to check if the API key and server are working
async function checkApiStatus() {
    try {
        const response = await fetch(API_URL, {
            method: 'GET',
            headers: {
                'x-apisports-key': config.API_KEY
            }
        });

        if (!response.ok) {
            throw new Error(`API status check failed: ${response.status}`);
        }

        const data = await response.json();
        console.log('API Status Response:', data);

        // Check if the response contains the account information
        if (data && data.response) {
            console.log('API is active and responding');
            return true;
        } else {
            console.error('Invalid API status response:', data);
            return false;
        }
    } catch (error) {
        console.error('Error checking API status:', error);
        return false;
    }
}

// Fetch fixtures for top 5 leagues (2020 season)
async function fetchFixtures() {
    const FIXTURES_URL = 'https://v3.football.api-sports.io/fixtures';
    const leagues = [39, 140, 78, 135, 61];
    const season = 2022;
    
    let allFixtures = [];
    
    try {
        // Fetch fixtures for each league
        for (const leagueId of leagues) {
            console.log(`Fetching fixtures for league ID: ${leagueId}`);
            
            // Instead of using current date, we'll fetch the entire season
            const url = `${FIXTURES_URL}?league=${leagueId}&season=${season}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'x-apisports-key': config.API_KEY
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            // Log rate limit info
            const rateLimit = {
                remaining: response.headers.get('x-ratelimit-remaining'),
                limit: response.headers.get('x-ratelimit-limit')
            };
            console.log('Rate limit info:', rateLimit);

            const data = await response.json();
            
            // Log the raw response to see what we're getting
            console.log('Raw API response:', data);

            // Check if we have valid response data
            if (!data.response) {
                console.error('Invalid response data:', data);
                throw new Error('Invalid API response format');
            }

            // Validate and add fixtures
            if (Array.isArray(data.response) && data.response.length > 0) {
                // Filter out any invalid fixtures
                const validFixtures = data.response.filter(validateFixtureData);
                
                if (validFixtures.length !== data.response.length) {
                    console.warn(`Found ${data.response.length - validFixtures.length} invalid fixtures`);
                }
                
                allFixtures = [...allFixtures, ...validFixtures];
                
                const leagueName = LEAGUES.find(l => l.id === leagueId)?.name;
                console.log(`Valid fixtures found for ${leagueName}: ${validFixtures.length}`);
            } else {
                console.log(`No valid fixtures found for league ${leagueId}`);
            }

            // Log the current state of allFixtures
            console.log('Current total fixtures:', allFixtures.length);

            // Add delay between requests
            await new Promise(resolve => setTimeout(resolve, 1200));
        }
        
        // Check if we got any fixtures
        if (allFixtures.length === 0) {
            throw new Error('No fixtures found for the specified season');
        }

        console.log(`Total fixtures loaded: ${allFixtures.length}`);
        return allFixtures;
        
    } catch (error) {
        console.error('Error in fetchFixtures:', error);
        throw error;
    }
}

// Group fixtures by league and then by month
function groupFixturesByLeague(fixtures) {
    const grouped = {};

    fixtures.forEach(fixture => {
        const leagueId = fixture.league.id;
        const date = new Date(fixture.fixture.date);
        const monthYear = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        
        if (!grouped[leagueId]) {
            grouped[leagueId] = {
                name: fixture.league.name,
                months: {}
            };
        }
        
        if (!grouped[leagueId].months[monthYear]) {
            grouped[leagueId].months[monthYear] = [];
        }
        
        grouped[leagueId].months[monthYear].push(fixture);
    });

    return grouped;
}

// Display leagues with toggle functionality
function displayLeagues(fixturesByLeague) {
    const leaguesContainer = document.getElementById('leagues-container');
    leaguesContainer.innerHTML = '';
    let activeMonthsContainer = null;
  
    Object.keys(fixturesByLeague).forEach(leagueId => {
        const league = fixturesByLeague[leagueId];
    
        const leagueCard = document.createElement('div');
        leagueCard.classList.add('league-card');
        leagueCard.innerHTML = `
          <div class="league-header p-4 
                      bg-blue-500 dark:bg-blue-600 
                      text-white rounded shadow cursor-pointer 
                      hover:bg-blue-600 dark:hover:bg-blue-700 
                      transition-colors duration-200">
            <h3>${league.name}</h3>
          </div>
          <div class="months-container hidden">
            <!-- Months will be added here -->
          </div>
        `;
        
        const leagueHeader = leagueCard.querySelector('.league-header');
        const monthsContainer = leagueCard.querySelector('.months-container');
        
        // Create month buttons
        Object.keys(league.months).forEach(monthYear => {
            const monthButton = document.createElement('div');
            monthButton.classList.add(
                'month-button', 'p-3', 
                'bg-gray-100', 'dark:bg-gray-700',
                'hover:bg-gray-200', 'dark:hover:bg-gray-600',
                'text-gray-900', 'dark:text-gray-100',
                'cursor-pointer', 'ml-4',
                'transition-colors', 'duration-200'
            );
            monthButton.textContent = monthYear;
            
            monthButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent league toggle when clicking month
                const currentlySelected = monthButton.classList.contains('selected');
                
                // Remove selection from all month buttons in this league
                monthsContainer.querySelectorAll('.month-button').forEach(btn => {
                    btn.classList.remove('selected', 'bg-blue-200');
                });
                
                if (!currentlySelected) {
                    monthButton.classList.add('selected', 'bg-blue-200');
                    displayFixtures(league.months[monthYear], league.name);
                } else {
                    // Clear fixtures when deselecting
                    document.getElementById('fixtures-container').innerHTML = '';
                }
            });
            
            monthsContainer.appendChild(monthButton);
        });
    
        leagueHeader.addEventListener('click', () => {
            // If there's an active container and it's different from the current one, hide it
            if (activeMonthsContainer && activeMonthsContainer !== monthsContainer) {
                activeMonthsContainer.classList.add('hidden');
            }
            
            // Toggle current months container
            monthsContainer.classList.toggle('hidden');
            
            // Update active container reference
            if (!monthsContainer.classList.contains('hidden')) {
                activeMonthsContainer = monthsContainer;
            } else {
                activeMonthsContainer = null;
                // Clear fixtures when collapsing league
                document.getElementById('fixtures-container').innerHTML = '';
            }
        });
    
        leaguesContainer.appendChild(leagueCard);
    });
}

// Display fixtures for a specific league
function displayFixtures(fixtures, leagueName) {
    const fixturesContainer = document.getElementById('fixtures-container');
    fixturesContainer.innerHTML = '';

    const leagueTitle = document.createElement('h2');
    leagueTitle.className = 'text-2xl font-bold mb-4 text-gray-900 dark:text-white';
    leagueTitle.textContent = `${leagueName} Fixtures`;
    fixturesContainer.appendChild(leagueTitle);
    
    fixtures.forEach(fixture => {
        // Format the date
        const date = new Date(fixture.fixture.date);
        const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Get the match status
        const status = fixture.fixture.status.long;

        // Format the score
        const score = fixture.score.fulltime.home !== null 
            ? `${fixture.score.fulltime.home} - ${fixture.score.fulltime.away}`
            : 'Not started';

        const fixtureElement = document.createElement('div');
        fixtureElement.className = 'mb-4';
        fixtureElement.innerHTML = `
            <div class="fixture-details p-4 
                        bg-white dark:bg-gray-800 
                        rounded-xl shadow-lg 
                        transition-colors duration-200">
                <p class="text-gray-900 dark:text-white">
                    <strong>${fixture.teams.home.name}</strong> vs 
                    <strong>${fixture.teams.away.name}</strong>
                </p>
                <p class="text-gray-600 dark:text-gray-300">
                    Match date: ${formattedDate}
                </p>
                <p class="text-gray-600 dark:text-gray-300">
                    Status: ${status}
                </p>
                <p class="text-gray-900 dark:text-white">
                    Score: ${score}
                </p>
            </div>
        `;
        
        fixturesContainer.appendChild(fixtureElement);
    });
}

// A function to handle score prediction
function predictScore(fixtureId) {
    const predictedScore = prompt('Enter your predicted score for this match (e.g., 2-1):');
    console.log(`Prediction for fixture ${fixtureId}: ${predictedScore}`);
}

// Call the checkApiStatus function when the page loads
document.addEventListener('DOMContentLoaded', checkApiStatus);

// Add this to your existing JavaScript code
let activeLeagueDropdown = null; // Keep track of the currently open dropdown

function toggleLeagueDropdown(leagueId) {
    const dropdownContent = document.getElementById(`dropdown-${leagueId}`);
    const previousDropdown = activeLeagueDropdown;
    
    // If there was a previously open dropdown and it's different from the current one, close it
    if (previousDropdown && previousDropdown !== dropdownContent) {
        previousDropdown.classList.add('hidden');
        // Remove active state from previous button if needed
        const previousButton = previousDropdown.parentElement.querySelector('button');
        if (previousButton) {
            previousButton.classList.remove('bg-blue-100', 'dark:bg-gray-600');
            previousButton.classList.add('bg-gray-50', 'dark:bg-gray-700');
        }
    }

    // Toggle current dropdown
    dropdownContent.classList.toggle('hidden');
    const button = dropdownContent.parentElement.querySelector('button');
    
    // Update button styling based on dropdown state
    if (!dropdownContent.classList.contains('hidden')) {
        activeLeagueDropdown = dropdownContent;
        button.classList.remove('bg-gray-50', 'dark:bg-gray-700');
        button.classList.add('bg-blue-100', 'dark:bg-gray-600');
    } else {
        activeLeagueDropdown = null;
        button.classList.remove('bg-blue-100', 'dark:bg-gray-600');
        button.classList.add('bg-gray-50', 'dark:bg-gray-700');
    }
}

// When creating league buttons, update the HTML structure to include the dropdown:
function createLeagueButton(league) {
    return `
        <div class="relative">
            <button 
                onclick="toggleLeagueDropdown('${league.id}')"
                class="flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-50 dark:bg-gray-700 
                       hover:bg-blue-50 dark:hover:bg-gray-600 transition-all duration-200 
                       hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 
                       focus:ring-blue-500">
                <img src="${league.logo}" class="w-6 h-6" alt="${league.name}">
                <span class="font-medium text-gray-900 dark:text-gray-100">${league.name}</span>
            </button>
            <div id="dropdown-${league.id}" 
                 class="hidden absolute z-10 mt-2 w-48 rounded-md shadow-lg 
                        bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5">
                <!-- Add your dropdown content here -->
                <div class="py-1">
                    <!-- Example dropdown items -->
                    <a href="#" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 
                                     hover:bg-gray-100 dark:hover:bg-gray-700">Fixtures</a>
                    <a href="#" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 
                                     hover:bg-gray-100 dark:hover:bg-gray-700">Table</a>
                    <a href="#" class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 
                                     hover:bg-gray-100 dark:hover:bg-gray-700">Stats</a>
                </div>
            </div>
        </div>
    `;
}

// Add this to your initialization code
document.addEventListener('click', (event) => {
    if (activeLeagueDropdown && !event.target.closest('.relative')) {
        const button = activeLeagueDropdown.parentElement.querySelector('button');
        activeLeagueDropdown.classList.add('hidden');
        button.classList.remove('bg-blue-100', 'dark:bg-gray-600');
        button.classList.add('bg-gray-50', 'dark:bg-gray-700');
        activeLeagueDropdown = null;
    }
});

// Add to your existing app.js
document.addEventListener('DOMContentLoaded', () => {
    // Initialize dark mode manager
    const darkMode = new DarkModeManager();
    
    // Your existing initialization code...
});

// Update your existing components to include dark mode styles
function createLeagueButton(league) {
    return `
        <button 
            onclick="toggleLeagueDropdown('${league.id}')"
            class="flex items-center space-x-2 px-4 py-2 rounded-lg
                   bg-white dark:bg-gray-800 
                   hover:bg-gray-50 dark:hover:bg-gray-700
                   shadow-sm dark:shadow-gray-900
                   transition-all duration-200 
                   focus:outline-none focus:ring-2 
                   focus:ring-blue-500 dark:focus:ring-blue-400">
            <img src="${league.logo}" class="w-6 h-6" alt="${league.name}">
            <span class="font-medium text-gray-900 dark:text-gray-100">${league.name}</span>
        </button>
    `;
}

// Update your fixtures display function to include dark mode styles
function createFixtureCard(fixture) {
    return `
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 
                    transition-all duration-200 hover:shadow-xl
                    dark:shadow-gray-900">
            <div class="flex justify-between items-center mb-4">
                <span class="text-sm font-medium text-gray-500 dark:text-gray-400">
                    ${fixture.date}
                </span>
                <span class="px-3 py-1 rounded-full text-sm font-medium 
                           ${getStatusClasses(fixture.status)}">
                    ${fixture.status}
                </span>
            </div>
            <!-- ... rest of your fixture card HTML ... -->
        </div>
    `;
}

// Helper function for status classes
function getStatusClasses(status) {
    const baseClasses = 'text-sm font-medium rounded-full px-2 py-1';
    switch (status.toLowerCase()) {
        case 'live':
            return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100`;
        case 'upcoming':
            return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100`;
        case 'finished':
            return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`;
        default:
            return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`;
    }
}

// Loader functions
function showLoader() {
  const loader = document.getElementById('loader');
  loader.classList.remove('loader-hidden');
}

function hideLoader() {
  const loader = document.getElementById('loader');
  loader.classList.add('loader-hidden');
}

// Use these functions when fetching data, for example:
// showLoader();
// fetch(url)
//   .then(response => response.json())
//   .then(data => {
//     // Process data
//     hideLoader();
//   })
//   .catch(error => {
//     console.error('Error:', error);
//     hideLoader();
//   });

let currentLeagueId = null;
let fixturesData = {};

// Add the fetchLeagues function
async function fetchLeagues() {
    return LEAGUES; // Return the predefined leagues array
}

let allFixtures = []; // Store all fixtures globally

// Update initialization flow
async function initializeApp() {
    try {
        showLoader();
        
        // Check API status
        const apiStatus = await checkApiStatus();
        if (!apiStatus) {
            throw new Error('Unable to connect to the API. Please check your API key and try again.');
        }
        
        // Then fetch fixtures
        allFixtures = await fetchFixtures();
        
        if (allFixtures.length > 0) {
            const leagues = await fetchLeagues();
            displayLeagues(leagues);
            hideLoader();
        } else {
            throw new Error('No fixtures were loaded');
        }
        
    } catch (error) {
        console.error('Error initializing app:', error);
        
        // Show user-friendly error message
        const container = document.getElementById('leagues-container');
        container.innerHTML = `
            <div class="error-message p-4 bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100 rounded-lg">
                <h3 class="font-bold mb-2">Error Loading Data</h3>
                <p>${error.message}</p>
                <p class="mt-2 text-sm">Please verify your API key is correct and has the necessary permissions.</p>
                <div class="mt-3">
                    <button onclick="location.reload()" 
                            class="px-4 py-2 bg-red-200 dark:bg-red-800 rounded hover:bg-red-300 dark:hover:bg-red-700 transition-colors">
                        Retry
                    </button>
                </div>
            </div>
        `;
        hideLoader();
    }
}
function displayLeagues(leagues) {
    const container = document.getElementById('leagues-container');
    container.innerHTML = '';
    
    leagues.forEach(league => {
        const button = document.createElement('button');
        button.className = 'league-button';
        button.innerHTML = `
            <img src="${league.logo}" style="width: 1.5rem; height: 1.5rem;" alt="${league.name}">
            <span>${league.name}</span>
        `;
        
        button.addEventListener('click', (event) => handleLeagueClick(event, league.id, league.name));
        container.appendChild(button);
    });
}

function handleLeagueClick(event, leagueId, leagueName) {
    // Update active state of league buttons
    document.querySelectorAll('.league-button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.currentTarget.classList.add('active');
    
    // Filter fixtures for selected league
    const leagueFixtures = allFixtures.filter(fixture => fixture.league.id === leagueId);
    const groupedFixtures = groupFixturesByMonth(leagueFixtures);
    
    displayMonthDropdown(groupedFixtures, leagueName);
}

function groupFixturesByMonth(fixtures) {
    const grouped = {};
    
    fixtures.forEach(fixture => {
        const date = new Date(fixture.fixture.date);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
        
        if (!grouped[monthKey]) {
            grouped[monthKey] = {
                name: monthName,
                fixtures: []
            };
        }
        
        grouped[monthKey].fixtures.push(fixture);
    });
    
    return grouped;
}

function displayMonthDropdown(groupedFixtures, leagueName) {
    const monthSelector = document.getElementById('month-selector');
    const dropdown = document.getElementById('month-dropdown');
    monthSelector.classList.remove('hidden');
    
    // Clear previous event listeners
    const newDropdown = dropdown.cloneNode(false);
    dropdown.parentNode.replaceChild(newDropdown, dropdown);
    
    // Reset dropdown
    newDropdown.innerHTML = '<option value="">Select Month</option>';
    
    // Add months to dropdown
    Object.entries(groupedFixtures).forEach(([monthKey, data]) => {
        const option = document.createElement('option');
        option.value = monthKey;
        option.textContent = data.name;
        newDropdown.appendChild(option);
    });
    
    // Clear fixtures container
    document.getElementById('fixtures-container').innerHTML = '';
    
    // Add event listener for month selection
    newDropdown.addEventListener('change', (e) => {
        const selectedMonth = e.target.value;
        if (selectedMonth && groupedFixtures[selectedMonth]) {
            displayFixtures(groupedFixtures[selectedMonth].fixtures, leagueName);
        } else {
            document.getElementById('fixtures-container').innerHTML = '';
        }
    });
}

function displayFixtures(fixtures, leagueName) {
    const container = document.getElementById('fixtures-container');
    container.innerHTML = '';

    const leagueTitle = document.createElement('h2');
    leagueTitle.className = 'text-2xl font-bold mb-4 text-gray-900 dark:text-white';
    leagueTitle.textContent = `${leagueName} Fixtures`;
    container.appendChild(leagueTitle);
    
    fixtures.forEach(fixture => {
        const date = new Date(fixture.fixture.date);
        const formattedDate = date.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const status = fixture.fixture.status.long;
        const score = fixture.score.fulltime.home !== null 
            ? `${fixture.score.fulltime.home} - ${fixture.score.fulltime.away}`
            : 'Not started';

        const fixtureElement = document.createElement('div');
        fixtureElement.className = 'mb-4';
        fixtureElement.innerHTML = `
            <div class="fixture-details p-4 
                        bg-white dark:bg-gray-800 
                        rounded-xl shadow-lg 
                        transition-colors duration-200">
                <p class="text-gray-900 dark:text-white">
                    <strong>${fixture.teams.home.name}</strong> vs 
                    <strong>${fixture.teams.away.name}</strong>
                </p>
                <p class="text-gray-600 dark:text-gray-300">
                    Match date: ${formattedDate}
                </p>
                <p class="text-gray-600 dark:text-gray-300">
                    Status: ${status}
                </p>
                <p class="text-gray-900 dark:text-white">
                    Score: ${score}
                </p>
            </div>
        `;
        
        container.appendChild(fixtureElement);
    });
}

// Initialize the app
document.addEventListener('DOMContentLoaded', initializeApp);

// Add this helper function to check API response
function logAPIResponse(response) {
    console.log('API Response Headers:', {
        remaining: response.headers.get('x-ratelimit-remaining'),
        limit: response.headers.get('x-ratelimit-limit'),
        reset: response.headers.get('x-ratelimit-reset')
    });
}

