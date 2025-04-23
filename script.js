// Constants
const POKEMON_COUNT = 151; // First generation Pokémon
const API_BASE_URL = 'https://pokeapi.co/api/v2';

// DOM Elements
const pokemonGrid = document.getElementById('pokemonGrid');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const pokemonDetails = document.getElementById('pokemonDetails');
const closeDetails = document.getElementById('closeDetails');
const loading = document.getElementById('loading');
const startBattleBtn = document.getElementById('startBattleBtn');
const selectPokemonBtn = document.getElementById('selectPokemonBtn');
const selectForBattleBtn = document.getElementById('selectForBattle');
const battleArena = document.getElementById('battleArena');
const closeBattleBtn = document.getElementById('closeBattle');
const runButton = document.getElementById('runButton');
const fightButton = document.getElementById('fightButton');
const backButton = document.getElementById('backButton');
const moveButtons = document.getElementById('moveButtons');
const moveSelection = document.getElementById('moveSelection');
const battleMessage = document.getElementById('battleMessage');

// State
let pokemonList = [];
let playerPokemon = null;
let opponentPokemon = null;
let isBattleMode = false;
let isSelectingPokemon = false;
let typeChart = null;
let unlockedPokemon = new Set(); // Track unlocked Pokémon
let availablePokemon = []; // Pokémon available for battle

// Initialize the application
async function init() {
    showLoading();
    try {
        // Load unlocked Pokémon from localStorage
        loadUnlockedPokemon();
        
        // Fetch initial Pokémon list with retry mechanism
        await fetchPokemonListWithRetry();
        
        // Load type chart for damage calculation
        await loadTypeChart();
        
        // Generate available Pokémon for battle
        generateAvailablePokemon();
        
        // Display initial Pokémon grid
        await displayPokemonGrid();
    } catch (error) {
        console.error('Error initializing:', error);
        pokemonGrid.innerHTML = `
            <div class="error-message">
                <h3>Error loading Pokémon data</h3>
                <p>Please check your internet connection and try again.</p>
                <button onclick="init()">Retry</button>
            </div>
        `;
    } finally {
        hideLoading();
    }
}

// Fetch Pokémon list with retry mechanism
async function fetchPokemonListWithRetry(maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(`${API_BASE_URL}/pokemon?limit=${POKEMON_COUNT}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            pokemonList = data.results;
            return;
        } catch (error) {
            console.error(`Attempt ${i + 1} failed:`, error);
            if (i === maxRetries - 1) {
                throw error;
            }
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
    }
}

// Load unlocked Pokémon from localStorage
function loadUnlockedPokemon() {
    try {
        const unlockedPokemonData = localStorage.getItem('unlockedPokemon');
        if (unlockedPokemonData) {
            const unlockedIds = JSON.parse(unlockedPokemonData);
            unlockedPokemon = new Set(unlockedIds);
            console.log('Loaded unlocked Pokémon:', unlockedPokemon);
        } else {
            unlockedPokemon = new Set();
            console.log('No unlocked Pokémon found in localStorage');
        }
    } catch (error) {
        console.error('Error loading unlocked Pokémon:', error);
        unlockedPokemon = new Set();
    }
}

// Save unlocked Pokémon to localStorage
function saveUnlockedPokemon() {
    try {
        localStorage.setItem('unlockedPokemon', JSON.stringify([...unlockedPokemon]));
    } catch (error) {
        console.error('Error saving unlocked Pokémon:', error);
    }
}

// Generate available Pokémon for battle
function generateAvailablePokemon() {
    try {
        // Filter out already unlocked Pokémon
        availablePokemon = pokemonList.filter(pokemon => {
            const id = parseInt(pokemon.url.split('/').slice(-2, -1)[0]);
            return !unlockedPokemon.has(id);
        });
        
        // If all Pokémon are unlocked, reset available Pokémon
        if (availablePokemon.length === 0) {
            availablePokemon = pokemonList;
        }
    } catch (error) {
        console.error('Error generating available Pokémon:', error);
        availablePokemon = pokemonList;
    }
}

// Load type chart for damage calculation
async function loadTypeChart() {
    try {
        const response = await fetch(`${API_BASE_URL}/type`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // Create a map of type relationships
        typeChart = {};
        
        // Fetch each type's damage relations
        const typePromises = data.results.map(async (type) => {
            try {
                const typeResponse = await fetch(type.url);
                if (!typeResponse.ok) {
                    throw new Error(`HTTP error! status: ${typeResponse.status}`);
                }
                const typeData = await typeResponse.json();
                
                typeChart[type.name] = {
                    doubleDamageTo: typeData.damage_relations.double_damage_to.map(t => t.name),
                    halfDamageTo: typeData.damage_relations.half_damage_to.map(t => t.name),
                    noDamageTo: typeData.damage_relations.no_damage_to.map(t => t.name)
                };
            } catch (error) {
                console.error(`Error loading type ${type.name}:`, error);
            }
        });
        
        await Promise.all(typePromises);
    } catch (error) {
        console.error('Error loading type chart:', error);
        // Initialize with empty type chart if there's an error
        typeChart = {};
    }
}

// Display Pokémon grid
async function displayPokemonGrid(filteredList = pokemonList) {
    try {
        pokemonGrid.innerHTML = '';
        
        for (const pokemon of filteredList) {
            try {
                const pokemonData = await fetchPokemonData(pokemon.url);
                const card = createPokemonCard(pokemonData);
                pokemonGrid.appendChild(card);
            } catch (error) {
                console.error(`Error loading Pokémon ${pokemon.name}:`, error);
                // Create a placeholder card for failed Pokémon
                const placeholderCard = createPlaceholderCard(pokemon.name);
                pokemonGrid.appendChild(placeholderCard);
            }
        }
    } catch (error) {
        console.error('Error displaying Pokémon grid:', error);
        pokemonGrid.innerHTML = `
            <div class="error-message">
                <h3>Error displaying Pokémon</h3>
                <p>Please try refreshing the page.</p>
            </div>
        `;
    }
}

// Create placeholder card for failed Pokémon
function createPlaceholderCard(name) {
    const card = document.createElement('div');
    card.className = 'pokemon-card error';
    
    const imageContainer = document.createElement('div');
    imageContainer.className = 'pokemon-image-container';
    
    const placeholder = document.createElement('div');
    placeholder.className = 'placeholder-image';
    placeholder.textContent = '?';
    
    const nameElement = document.createElement('h3');
    nameElement.textContent = name.charAt(0).toUpperCase() + name.slice(1);
    
    card.appendChild(imageContainer);
    imageContainer.appendChild(placeholder);
    card.appendChild(nameElement);
    
    return card;
}

// Fetch Pokémon data with retry mechanism
async function fetchPokemonData(url, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error(`Attempt ${i + 1} failed for ${url}:`, error);
            if (i === maxRetries - 1) {
                throw error;
            }
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
        }
    }
}

// Create Pokémon card
function createPokemonCard(pokemon) {
    const card = document.createElement('div');
    card.className = 'pokemon-card';
    
    // Check if Pokémon is unlocked
    const isUnlocked = unlockedPokemon.has(pokemon.id);
    
    if (!isUnlocked) {
        card.classList.add('locked');
    }
    
    const types = document.createElement('div');
    types.className = 'types';
    pokemon.types.forEach(type => {
        const typeBadge = document.createElement('span');
        typeBadge.className = `type-badge type-${type.type.name}`;
        typeBadge.textContent = type.type.name;
        types.appendChild(typeBadge);
    });
    
    card.appendChild(image);
    card.appendChild(name);
    card.appendChild(types);
    
    card.addEventListener('click', () => {
        if (isSelectingPokemon) {
            selectPokemonForBattle(pokemon);
        } else {
            showPokemonDetails(pokemon);
        }
    });
    
    return card;
}

// Show Pokémon details
async function showPokemonDetails(pokemon) {
    showLoading();
    
    // Fetch additional data
    const speciesData = await fetch(`${API_BASE_URL}/pokemon-species/${pokemon.id}`).then(res => res.json());
    
    // Update details modal
    document.getElementById('pokemonSprite').src = pokemon.sprites.front_default;
    document.getElementById('pokemonName').textContent = 
        pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1);
    
    // Update types
    const typesContainer = document.getElementById('pokemonTypes');
    typesContainer.innerHTML = '';
    pokemon.types.forEach(type => {
        const typeBadge = document.createElement('span');
        typeBadge.className = `type-badge type-${type.type.name}`;
        typeBadge.textContent = type.type.name;
        typesContainer.appendChild(typeBadge);
    });
    
    // Update stats
    const statsContainer = document.getElementById('pokemonStats');
    statsContainer.innerHTML = '';
    pokemon.stats.forEach(stat => {
        const statBar = document.createElement('div');
        statBar.className = 'stat-bar';
        
        const statName = document.createElement('span');
        statName.className = 'stat-name';
        statName.textContent = stat.stat.name;
        
        const statValue = document.createElement('div');
        statValue.className = 'stat-value';
        
        const statFill = document.createElement('div');
        statFill.className = 'stat-fill';
        statFill.style.width = `${(stat.base_stat / 255) * 100}%`;
        
        statValue.appendChild(statFill);
        statBar.appendChild(statName);
        statBar.appendChild(statValue);
        statsContainer.appendChild(statBar);
    });
    
    // Update abilities
    const abilitiesContainer = document.getElementById('pokemonAbilities');
    abilitiesContainer.innerHTML = '';
    pokemon.abilities.forEach(ability => {
        const abilityElement = document.createElement('div');
        abilityElement.textContent = ability.ability.name.replace('-', ' ');
        abilitiesContainer.appendChild(abilityElement);
    });
    
    // Show select for battle button if in battle mode
    if (isBattleMode && !playerPokemon) {
        selectForBattleBtn.classList.remove('hidden');
        selectForBattleBtn.onclick = () => selectPokemonForBattle(pokemon);
    } else {
        selectForBattleBtn.classList.add('hidden');
    }
    
    // Show details modal
    pokemonDetails.style.display = 'block';
    hideLoading();
}

// Search functionality
function searchPokemon() {
    const searchTerm = searchInput.value.toLowerCase();
    const filteredList = pokemonList.filter(pokemon => 
        pokemon.name.toLowerCase().includes(searchTerm)
    );
    displayPokemonGrid(filteredList);
}

// Battle functionality
function startBattle() {
    // Redirect to the battle page
    window.location.href = 'battle.html';
}

function cancelBattle() {
    isBattleMode = false;
    isSelectingPokemon = false;
    playerPokemon = null;
    opponentPokemon = null;
    selectPokemonBtn.disabled = true;
    startBattleBtn.textContent = 'Start Battle';
    startBattleBtn.onclick = startBattle;
    selectForBattleBtn.classList.add('hidden');
    pokemonDetails.style.display = 'none';
    battleArena.style.display = 'none';
}

async function selectPokemonForBattle(pokemon) {
    playerPokemon = {
        ...pokemon,
        currentHp: 100,
        maxHp: 100,
        level: 50
    };
    
    // Generate random opponent
    const randomId = Math.floor(Math.random() * POKEMON_COUNT) + 1;
    const opponentData = await fetchPokemonData(`${API_BASE_URL}/pokemon/${randomId}`);
    opponentPokemon = {
        ...opponentData,
        currentHp: 100,
        maxHp: 100,
        level: 50
    };
    
    // Start battle
    startPokemonBattle();
}

function startPokemonBattle() {
    // Update battle UI
    document.getElementById('playerPokemonName').textContent = 
        playerPokemon.name.charAt(0).toUpperCase() + playerPokemon.name.slice(1);
    document.getElementById('playerPokemonSprite').src = playerPokemon.sprites.front_default;
    document.getElementById('opponentPokemonName').textContent = 
        opponentPokemon.name.charAt(0).toUpperCase() + opponentPokemon.name.slice(1);
    document.getElementById('opponentPokemonSprite').src = opponentPokemon.sprites.front_default;
    
    // Update health bars
    updateHealthBars();
    
    // Show battle arena
    pokemonDetails.style.display = 'none';
    battleArena.style.display = 'block';
    
    // Show initial battle message
    battleMessage.textContent = `A wild ${opponentPokemon.name.charAt(0).toUpperCase() + opponentPokemon.name.slice(1)} appeared!`;
    
    // Show battle options
    moveSelection.classList.add('hidden');
    document.querySelector('.battle-options').classList.remove('hidden');
    
    // Reset run button
    runButton.textContent = 'RUN';
    runButton.onclick = attemptRun;
}

function updateHealthBars() {
    const playerHealthBar = document.getElementById('playerHealthBar');
    const playerHealthText = document.getElementById('playerHealthText');
    const opponentHealthBar = document.getElementById('opponentHealthBar');
    const opponentHealthText = document.getElementById('opponentHealthText');
    
    playerHealthBar.style.width = `${(playerPokemon.currentHp / playerPokemon.maxHp) * 100}%`;
    playerHealthText.textContent = `${playerPokemon.currentHp}/${playerPokemon.maxHp}`;
    
    opponentHealthBar.style.width = `${(opponentPokemon.currentHp / opponentPokemon.maxHp) * 100}%`;
    opponentHealthText.textContent = `${opponentPokemon.currentHp}/${opponentPokemon.maxHp}`;
}

function showMoveSelection() {
    document.querySelector('.battle-options').classList.add('hidden');
    moveSelection.classList.remove('hidden');
    
    // Create move buttons
    createMoveButtons();
}

function createMoveButtons() {
    moveButtons.innerHTML = '';
    
    // Get 4 random moves from the Pokémon's move list
    const moves = playerPokemon.moves
        .filter(move => move.version_group_details.some(detail => detail.version_group.name === 'red-blue'))
        .sort(() => 0.5 - Math.random())
        .slice(0, 4);
    
    moves.forEach(move => {
        const moveData = move.move;
        const button = document.createElement('button');
        button.className = 'move-button';
        
        const moveName = document.createElement('span');
        moveName.className = 'move-name';
        moveName.textContent = moveData.name.replace('-', ' ');
        
        const moveType = document.createElement('span');
        moveType.className = 'move-type';
        moveType.textContent = moveData.type || 'Normal';
        
        button.appendChild(moveName);
        button.appendChild(moveType);
        
        button.onclick = () => executeMove(moveData);
        moveButtons.appendChild(button);
    });
}

async function executeMove(move) {
    // Disable move buttons during animation
    const buttons = moveButtons.querySelectorAll('button');
    buttons.forEach(button => button.disabled = true);
    
    // Player's turn
    battleMessage.textContent = `${playerPokemon.name.charAt(0).toUpperCase() + playerPokemon.name.slice(1)} used ${move.name.replace('-', ' ')}!`;
    
    // Animate attack
    await animateAttack('player', 'opponent');
    
    // Calculate damage
    const damage = calculateDamage(playerPokemon, opponentPokemon, move);
    opponentPokemon.currentHp = Math.max(0, opponentPokemon.currentHp - damage);
    updateHealthBars();
    
    // Check if opponent is defeated
    if (opponentPokemon.currentHp <= 0) {
        endBattle('player');
        return;
    }
    
    // Opponent's turn
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Select opponent move
    const opponentMove = selectOpponentMove();
    battleMessage.textContent = `${opponentPokemon.name.charAt(0).toUpperCase() + opponentPokemon.name.slice(1)} used ${opponentMove.name.replace('-', ' ')}!`;
    
    // Animate opponent attack
    await animateAttack('opponent', 'player');
    
    // Calculate opponent damage
    const opponentDamage = calculateDamage(opponentPokemon, playerPokemon, opponentMove);
    playerPokemon.currentHp = Math.max(0, playerPokemon.currentHp - opponentDamage);
    updateHealthBars();
    
    // Check if player is defeated
    if (playerPokemon.currentHp <= 0) {
        endBattle('opponent');
        return;
    }
    
    // Re-enable move buttons
    buttons.forEach(button => button.disabled = false);
    battleMessage.textContent = 'What will you do?';
}

function selectOpponentMove() {
    // Get available moves for opponent
    const availableMoves = opponentPokemon.moves
        .filter(move => move.version_group_details.some(detail => detail.version_group.name === 'red-blue'))
        .map(move => move.move);
    
    // Select a random move
    return availableMoves[Math.floor(Math.random() * availableMoves.length)];
}

function calculateDamage(attacker, defender, move) {
    // Base damage calculation
    let damage = Math.floor(Math.random() * 20) + 10;
    
    // Apply type effectiveness if type chart is loaded
    if (typeChart) {
        const moveType = move.type || 'normal';
        const defenderTypes = defender.types.map(t => t.type.name);
        
        // Check for type effectiveness
        let effectiveness = 1;
        
        for (const defenderType of defenderTypes) {
            if (typeChart[moveType].doubleDamageTo.includes(defenderType)) {
                effectiveness *= 2;
            } else if (typeChart[moveType].halfDamageTo.includes(defenderType)) {
                effectiveness *= 0.5;
            } else if (typeChart[moveType].noDamageTo.includes(defenderType)) {
                effectiveness *= 0;
            }
        }
        
        damage *= effectiveness;
        
        // Add effectiveness message
        if (effectiveness > 1) {
            battleMessage.textContent += " It's super effective!";
        } else if (effectiveness < 1 && effectiveness > 0) {
            battleMessage.textContent += " It's not very effective...";
        } else if (effectiveness === 0) {
            battleMessage.textContent += " It had no effect!";
        }
    }
    
    return Math.floor(damage);
}

async function animateAttack(attacker, target) {
    const attackerElement = document.getElementById(`${attacker}PokemonSprite`);
    const targetElement = document.getElementById(`${target}PokemonSprite`);
    
    // Attacker animation
    attackerElement.classList.add('attack-animation');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    attackerElement.classList.remove('attack-animation');
    
    // Target animation
    targetElement.classList.add('shake');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    targetElement.classList.remove('shake');
    targetElement.classList.add('flash');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    targetElement.classList.remove('flash');
}

function attemptRun() {
    if (Math.random() > 0.5) {
        battleMessage.textContent = 'Got away safely!';
        setTimeout(() => {
            cancelBattle();
        }, 1500);
    } else {
        battleMessage.textContent = 'Couldn\'t escape!';
        
        // Opponent's turn after failed escape
        setTimeout(() => {
            const opponentMove = selectOpponentMove();
            battleMessage.textContent = `${opponentPokemon.name.charAt(0).toUpperCase() + opponentPokemon.name.slice(1)} used ${opponentMove.name.replace('-', ' ')}!`;
            
            animateAttack('opponent', 'player').then(() => {
                const opponentDamage = calculateDamage(opponentPokemon, playerPokemon, opponentMove);
                playerPokemon.currentHp = Math.max(0, playerPokemon.currentHp - opponentDamage);
                updateHealthBars();
                
                if (playerPokemon.currentHp <= 0) {
                    endBattle('opponent');
                } else {
                    battleMessage.textContent = 'What will you do?';
                }
            });
        }, 1500);
    }
}

function endBattle(winner) {
    const message = winner === 'player' 
        ? `You won! ${opponentPokemon.name.charAt(0).toUpperCase() + opponentPokemon.name.slice(1)} was defeated!` 
        : `You lost! ${playerPokemon.name.charAt(0).toUpperCase() + playerPokemon.name.slice(1)} was defeated!`;
    
    battleMessage.textContent = message;
    
    // Disable move buttons
    const buttons = moveButtons.querySelectorAll('button');
    buttons.forEach(button => button.disabled = true);
    
    // Show run button as "New Battle"
    runButton.textContent = 'NEW BATTLE';
    runButton.onclick = () => {
        cancelBattle();
        startBattle();
    };
}

// Loading state management
function showLoading() {
    loading.style.display = 'flex';
}

function hideLoading() {
    loading.style.display = 'none';
}

// Event listeners
searchButton.addEventListener('click', searchPokemon);
searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchPokemon();
    }
});

closeDetails.addEventListener('click', () => {
    pokemonDetails.style.display = 'none';
});

closeBattleBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to end the battle?')) {
        cancelBattle();
    }
});

fightButton.addEventListener('click', showMoveSelection);
backButton.addEventListener('click', () => {
    moveSelection.classList.add('hidden');
    document.querySelector('.battle-options').classList.remove('hidden');
});

startBattleBtn.addEventListener('click', startBattle);

// Initialize the application
init(); 