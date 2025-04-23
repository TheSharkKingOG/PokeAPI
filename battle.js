// Constants
const API_BASE_URL = 'https://pokeapi.co/api/v2';
const CATCH_RATE_BASE = 0.3; // Base catch rate
const CATCH_RATE_BONUS = 0.1; // Bonus per health percentage below 50%

// DOM Elements
const wildPokemonImage = document.getElementById('wildPokemonImage');
const wildPokemonName = document.getElementById('wildPokemonName');
const catchBar = document.querySelector('.catch-bar');
const pokeball = document.querySelector('.pokeball');
const throwButton = document.getElementById('throwButton');
const runButton = document.getElementById('runButton');
const returnButton = document.getElementById('returnButton');
const resultModal = document.getElementById('resultModal');
const resultMessage = document.getElementById('resultMessage');
const closeButton = document.getElementById('closeButton');

// State
let currentPokemon = null;
let isCatching = false;

// Initialize the battle
async function initBattle() {
    try {
        // Get a random Pokémon (1-151 for Gen 1)
        const randomId = Math.floor(Math.random() * 151) + 1;
        const response = await fetch(`${API_BASE_URL}/pokemon/${randomId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch Pokémon data');
        }
        currentPokemon = await response.json();
        
        // Update UI
        wildPokemonImage.src = currentPokemon.sprites.front_default;
        wildPokemonName.textContent = currentPokemon.name.charAt(0).toUpperCase() + currentPokemon.name.slice(1);
        
        // Reset catch bar
        catchBar.style.width = '0%';
        
        // Enable buttons
        throwButton.disabled = false;
        runButton.disabled = false;
    } catch (error) {
        console.error('Error initializing battle:', error);
        showResult('Error loading Pokémon. Please try again.');
    }
}

// Calculate catch rate based on Pokémon's current HP
function calculateCatchRate() {
    // In a real game, this would use the Pokémon's current HP
    // For this demo, we'll use a random value between 0 and 100
    const currentHP = Math.random() * 100;
    const healthPercentage = currentHP / 100;
    
    // Higher catch rate when Pokémon has lower HP
    let catchRate = CATCH_RATE_BASE;
    if (healthPercentage < 0.5) {
        catchRate += (0.5 - healthPercentage) * CATCH_RATE_BONUS;
    }
    
    return Math.min(catchRate, 0.9); // Cap at 90%
}

// Throw Pokéball animation and catch attempt
async function throwPokeball() {
    if (isCatching) return;
    isCatching = true;
    
    // Disable buttons during catch attempt
    throwButton.disabled = true;
    runButton.disabled = true;
    
    // Add throwing animation
    pokeball.classList.add('throwing');
    
    // Wait for animation to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Calculate catch success
    const catchRate = calculateCatchRate();
    const catchSuccess = Math.random() < catchRate;
    
    // Animate catch bar
    catchBar.style.width = `${catchRate * 100}%`;
    
    // Show result after a delay
    setTimeout(async () => {
        if (catchSuccess) {
            // Update unlocked Pokémon in localStorage
            const unlockedPokemon = JSON.parse(localStorage.getItem('unlockedPokemon') || '[]');
            if (!unlockedPokemon.includes(currentPokemon.id)) {
                unlockedPokemon.push(currentPokemon.id);
                localStorage.setItem('unlockedPokemon', JSON.stringify(unlockedPokemon));
            }
            
            // Show success message and stats
            const statsMessage = `
                <h3>Congratulations! You caught ${currentPokemon.name.charAt(0).toUpperCase() + currentPokemon.name.slice(1)}!</h3>
                <div class="pokemon-stats">
                    <h4>Base Stats:</h4>
                    <ul>
                        ${currentPokemon.stats.map(stat => `
                            <li>${stat.stat.name.charAt(0).toUpperCase() + stat.stat.name.slice(1)}: ${stat.base_stat}</li>
                        `).join('')}
                    </ul>
                    <h4>Types:</h4>
                    <div class="types">
                        ${currentPokemon.types.map(type => `
                            <span class="type-badge type-${type.type.name}">${type.type.name}</span>
                        `).join('')}
                    </div>
                </div>
            `;
            
            // Clear previous content and set new content
            resultMessage.innerHTML = '';
            resultMessage.innerHTML = statsMessage;
            
            // Add a button to return to collection
            const returnButton = document.createElement('button');
            returnButton.className = 'battle-button';
            returnButton.textContent = 'Return to Collection';
            returnButton.onclick = () => window.location.href = 'index.html';
            resultMessage.appendChild(returnButton);
            
            // Show the modal
            resultModal.style.display = 'flex';
        } else {
            // Clear previous content
            resultMessage.innerHTML = '';
            resultMessage.textContent = `Oh no! ${currentPokemon.name.charAt(0).toUpperCase() + currentPokemon.name.slice(1)} broke free!`;
            resultModal.style.display = 'flex';
            
            // Reset for another attempt after a delay
            setTimeout(() => {
                resetCatch();
            }, 2000);
        }
    }, 1500);
}

// Run from battle
function runFromBattle() {
    const runSuccess = Math.random() > 0.5; // 50% chance to run
    if (runSuccess) {
        showResult('Got away safely!');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
    } else {
        showResult("Couldn't escape!");
        // Reset for another attempt
        resetCatch();
    }
}

// Reset catch attempt
function resetCatch() {
    isCatching = false;
    pokeball.classList.remove('throwing');
    catchBar.style.width = '0%';
    throwButton.disabled = false;
    runButton.disabled = false;
}

// Show result modal
function showResult(message) {
    // Clear previous content
    resultMessage.innerHTML = '';
    resultMessage.textContent = message;
    resultModal.style.display = 'flex';
}

// Close modal and start new battle
function closeModal() {
    resultModal.style.display = 'none';
    initBattle();
}

// Event Listeners
throwButton.addEventListener('click', throwPokeball);
runButton.addEventListener('click', runFromBattle);
closeButton.addEventListener('click', closeModal);
returnButton.addEventListener('click', () => {
    window.location.href = 'index.html';
});

// Initialize battle when page loads
document.addEventListener('DOMContentLoaded', initBattle); 