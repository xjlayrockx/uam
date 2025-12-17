const socket = io();

// UAM Men's Basketball Roster Players (alphabetically sorted)
const UAM_PLAYERS = [
    'Ashton Price',
    'Bryson Hammond',
    'Charles Temple',
    'Elem Shelby',
    'Felix Smedjeback',
    'Giancarlo Bastianoni',
    'Giancarlo Valdez',
    'Gianssen Valdez',
    'Isaac Jackson',
    'Jackson Edwards',
    'Jakob Zenon',
    'Josh Smith',
    'Lamont Jackson',
    'Tyler Webb'
];

let questions = [];
let currentQuestionIndex = -1;
let currentVotes = {};
let selectedQuestionIndex = -1; // For viewing stats
let allQuestionVotes = {}; // Store votes for all questions

// Initialize player checkboxes
function initializePlayerCheckboxes() {
    const container = document.getElementById('players-checkbox-container');
    container.innerHTML = '';
    
    UAM_PLAYERS.forEach((player, index) => {
        const checkboxRow = document.createElement('div');
        checkboxRow.className = 'player-checkbox-row';
        checkboxRow.innerHTML = `
            <label class="player-checkbox-label">
                <input type="checkbox" class="player-checkbox" value="${player}" checked>
                <span>${player}</span>
            </label>
        `;
        container.appendChild(checkboxRow);
    });
}

// Load initial data
initializePlayerCheckboxes();
loadQuestions();
loadCurrentQuestion();

// Socket events
socket.on('votes-updated', (data) => {
    // Update votes for the question
    const question = questions.find(q => q.id === data.questionId);
    if (question) {
        allQuestionVotes[data.questionId] = data.votes;
        
        // If this is the currently selected question, update display
        if (selectedQuestionIndex >= 0 && questions[selectedQuestionIndex].id === data.questionId) {
            currentVotes = data.votes;
            updateVotesDisplay();
        }
        
        // If this is the active question, update current votes
        if (currentQuestionIndex >= 0 && questions[currentQuestionIndex].id === data.questionId) {
            currentVotes = data.votes;
        }
        
        updateStats();
    }
});

socket.on('active-users-update', (data) => {
    document.getElementById('active-users-count').textContent = data.count;
});

socket.on('question-changed', (data) => {
    currentQuestionIndex = data.index;
    currentVotes = {};
    updateQuestionsList();
    updateCurrentQuestionDisplay();
    updateQuestionSelector();
    updateStats();
    
    // If viewing the active question, refresh votes
    if (selectedQuestionIndex === currentQuestionIndex) {
        loadVotesForQuestion(currentQuestionIndex);
    }
});

// Question form handling
document.getElementById('question-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const questionInput = document.getElementById('question-input');
    const playerCheckboxes = document.querySelectorAll('.player-checkbox:checked');
    
    const question = questionInput.value.trim();
    const answers = Array.from(playerCheckboxes)
        .map(checkbox => checkbox.value);
    
    if (question.length === 0) {
        alert('Please enter a question');
        return;
    }
    
    if (answers.length < 2) {
        alert('Please select at least 2 players as answer options');
        return;
    }
    
    try {
        const response = await fetch('/api/questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question, answers })
        });
        
        if (response.ok) {
            const newQuestion = await response.json();
            questions.push(newQuestion);
            questionInput.value = '';
            // Reset all checkboxes to checked
            document.querySelectorAll('.player-checkbox').forEach(cb => cb.checked = true);
            updateQuestionsList();
            updateQuestionSelector();
            updateStats();
            
            // Automatically set the new question as current and view it
            const newIndex = questions.length - 1;
            selectedQuestionIndex = newIndex;
            document.getElementById('question-selector').value = newIndex;
            await setCurrentQuestion(newIndex);
            loadVotesForQuestion(newIndex);
        } else {
            alert('Failed to create question');
        }
    } catch (error) {
        console.error('Error creating question:', error);
        alert('Error creating question');
    }
});

// Select all players
document.getElementById('select-all-players-btn').addEventListener('click', () => {
    document.querySelectorAll('.player-checkbox').forEach(cb => cb.checked = true);
});

// Deselect all players
document.getElementById('deselect-all-players-btn').addEventListener('click', () => {
    document.querySelectorAll('.player-checkbox').forEach(cb => cb.checked = false);
});

// Question selector
document.getElementById('question-selector').addEventListener('change', (e) => {
    const index = parseInt(e.target.value);
    if (index >= 0 && index < questions.length) {
        selectedQuestionIndex = index;
        loadVotesForQuestion(index);
    } else {
        selectedQuestionIndex = -1;
        updateVotesDisplay();
    }
});

// Question navigation
document.getElementById('prev-question-btn').addEventListener('click', () => {
    if (selectedQuestionIndex > 0) {
        selectedQuestionIndex--;
        document.getElementById('question-selector').value = selectedQuestionIndex;
        loadVotesForQuestion(selectedQuestionIndex);
    }
});

document.getElementById('next-question-btn').addEventListener('click', () => {
    if (selectedQuestionIndex < questions.length - 1) {
        selectedQuestionIndex++;
        document.getElementById('question-selector').value = selectedQuestionIndex;
        loadVotesForQuestion(selectedQuestionIndex);
    }
});

// Set as active button
document.getElementById('set-active-btn').addEventListener('click', () => {
    if (selectedQuestionIndex >= 0) {
        setCurrentQuestion(selectedQuestionIndex);
    }
});

// Load questions from server
async function loadQuestions() {
    try {
        const response = await fetch('/api/questions');
        questions = await response.json();
        updateQuestionsList();
        updateQuestionSelector();
        updateStats();
        
        // Load votes for all questions
        questions.forEach((q, index) => {
            loadVotesForQuestion(index, false);
        });
    } catch (error) {
        console.error('Error loading questions:', error);
    }
}

// Load current question from server
async function loadCurrentQuestion() {
    try {
        const response = await fetch('/api/current-question');
        const data = await response.json();
        currentQuestionIndex = data.index;
        updateQuestionSelector();
        updateCurrentQuestionDisplay();
        updateStats();
        
        // If there's a current question, select it for viewing
        if (currentQuestionIndex >= 0) {
            selectedQuestionIndex = currentQuestionIndex;
            document.getElementById('question-selector').value = currentQuestionIndex;
            loadVotesForQuestion(currentQuestionIndex);
        }
    } catch (error) {
        console.error('Error loading current question:', error);
    }
}

// Set current question
async function setCurrentQuestion(index) {
    try {
        const response = await fetch('/api/current-question', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ index })
        });
        
        if (response.ok) {
            currentQuestionIndex = index;
            currentVotes = {};
            updateQuestionsList();
            updateQuestionSelector();
            updateCurrentQuestionDisplay();
            updateStats();
            
            // If viewing this question, refresh votes
            if (selectedQuestionIndex === index) {
                loadVotesForQuestion(index);
            }
        } else {
            alert('Failed to set current question');
        }
    } catch (error) {
        console.error('Error setting current question:', error);
        alert('Error setting current question');
    }
}

// Load votes for a specific question
async function loadVotesForQuestion(index, updateDisplay = true) {
    if (index < 0 || index >= questions.length) return;
    
    const question = questions[index];
    try {
        const response = await fetch(`/api/votes/${question.id}`);
        const votes = await response.json();
        allQuestionVotes[question.id] = votes;
        
        if (updateDisplay) {
            currentVotes = votes;
            updateVotesDisplay();
        }
    } catch (error) {
        console.error('Error loading votes:', error);
    }
}

// Load votes for current question (legacy function)
async function loadVotes() {
    if (selectedQuestionIndex >= 0) {
        loadVotesForQuestion(selectedQuestionIndex);
    }
}

// Get current question ID
function getCurrentQuestionId() {
    if (currentQuestionIndex >= 0 && questions[currentQuestionIndex]) {
        return questions[currentQuestionIndex].id;
    }
    return null;
}

// Update question selector dropdown
function updateQuestionSelector() {
    const selector = document.getElementById('question-selector');
    selector.innerHTML = '<option value="-1">-- Select a Question --</option>';
    
    questions.forEach((question, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${index + 1}. ${question.question}`;
        if (index === currentQuestionIndex) {
            option.textContent += ' (Active)';
        }
        selector.appendChild(option);
    });
    
    // Set selected value if viewing a question
    if (selectedQuestionIndex >= 0 && selectedQuestionIndex < questions.length) {
        selector.value = selectedQuestionIndex;
    }
}

// Update questions list display (compact version)
function updateQuestionsList() {
    const container = document.getElementById('questions-list');
    container.innerHTML = '';
    
    if (questions.length === 0) {
        container.innerHTML = '<p style="color: #666;">No questions yet. Create one above!</p>';
        return;
    }
    
    questions.forEach((question, index) => {
        const item = document.createElement('div');
        item.className = `question-item-compact ${index === currentQuestionIndex ? 'current' : ''}`;
        const isCurrent = index === currentQuestionIndex;
        const votes = allQuestionVotes[question.id] || {};
        const totalVotes = Object.values(votes).reduce((sum, count) => sum + count, 0);
        
        item.innerHTML = `
            <div class="question-item-content">
                <h3>${index + 1}. ${question.question}</h3>
                <p>${question.answers.length} players | ${totalVotes} votes ${isCurrent ? '<strong style="color: #006633;">(Active)</strong>' : ''}</p>
            </div>
            <div class="question-item-actions">
                <button class="view-question-btn" onclick="viewQuestion(${index})">View Stats</button>
                ${!isCurrent ? `<button class="activate-question-btn" onclick="activateQuestion(${index})">Set Active</button>` : ''}
                <button class="delete-question-btn" onclick="deleteQuestion('${question.id}')">Delete</button>
            </div>
        `;
        container.appendChild(item);
    });
}

// View question stats
window.viewQuestion = function(index) {
    selectedQuestionIndex = index;
    document.getElementById('question-selector').value = index;
    loadVotesForQuestion(index);
};

// Activate question (set as current)
window.activateQuestion = async function(index) {
    await setCurrentQuestion(index);
};

// Delete question
window.deleteQuestion = async function(questionId) {
    if (!confirm('Are you sure you want to delete this question?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/questions/${questionId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            questions = questions.filter(q => q.id !== questionId);
            delete allQuestionVotes[questionId];
            
            // Adjust current question index if needed
            if (currentQuestionIndex >= questions.length) {
                currentQuestionIndex = questions.length - 1;
                if (currentQuestionIndex >= 0) {
                    await setCurrentQuestion(currentQuestionIndex);
                } else {
                    await setCurrentQuestion(-1);
                }
            }
            
            // Adjust selected question index
            if (selectedQuestionIndex >= questions.length) {
                selectedQuestionIndex = questions.length - 1;
            }
            
            updateQuestionsList();
            updateQuestionSelector();
            updateStats();
            
            if (selectedQuestionIndex >= 0 && selectedQuestionIndex < questions.length) {
                loadVotesForQuestion(selectedQuestionIndex);
            } else {
                updateVotesDisplay();
            }
        } else {
            alert('Failed to delete question');
        }
    } catch (error) {
        console.error('Error deleting question:', error);
        alert('Error deleting question');
    }
};

// Update current question display
function updateCurrentQuestionDisplay() {
    const display = document.getElementById('current-question-display');
    const prevBtn = document.getElementById('prev-question-btn');
    const nextBtn = document.getElementById('next-question-btn');
    
    if (selectedQuestionIndex < 0 || selectedQuestionIndex >= questions.length) {
        display.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">Select a question to view statistics</p>';
        prevBtn.disabled = true;
        nextBtn.disabled = questions.length === 0;
    } else {
        const question = questions[selectedQuestionIndex];
        const isActive = selectedQuestionIndex === currentQuestionIndex;
        display.innerHTML = `
            <div class="selected-question-info">
                <h3>${question.question}</h3>
                <p>Question ${selectedQuestionIndex + 1} of ${questions.length}</p>
                ${isActive ? '<span class="active-badge">Currently Active</span>' : ''}
            </div>
        `;
        prevBtn.disabled = selectedQuestionIndex === 0;
        nextBtn.disabled = selectedQuestionIndex === questions.length - 1;
    }
}

// Update votes display with enhanced visualization
function updateVotesDisplay() {
    const container = document.getElementById('votes-display');
    
    if (selectedQuestionIndex < 0 || selectedQuestionIndex >= questions.length) {
        container.innerHTML = '<p style="color: #666; text-align: center; padding: 40px;">Select a question from the dropdown to view vote distribution</p>';
        return;
    }
    
    const question = questions[selectedQuestionIndex];
    const totalVotes = Object.values(currentVotes).reduce((sum, count) => sum + count, 0);
    
    if (totalVotes === 0) {
        container.innerHTML = `
            <div class="no-votes-message">
                <p style="color: #666; text-align: center; padding: 40px; font-size: 1.1em;">
                    No votes yet for this question
                </p>
            </div>
        `;
        return;
    }
    
    // Sort answers alphabetically by name, then by vote count for display
    const sortedAnswers = question.answers
        .map(answer => ({
            ...answer,
            count: currentVotes[answer.id] || 0,
            percentage: totalVotes > 0 ? (currentVotes[answer.id] || 0) / totalVotes * 100 : 0
        }))
        .sort((a, b) => {
            // First sort alphabetically by name
            const nameCompare = a.text.localeCompare(b.text);
            if (nameCompare !== 0) return nameCompare;
            // If names are equal (shouldn't happen), sort by count
            return b.count - a.count;
        });
    
    let html = `
        <div class="votes-header">
            <h3>Total Votes: <span class="vote-total">${totalVotes}</span></h3>
        </div>
        <div class="votes-chart">
    `;
    
    sortedAnswers.forEach((answer, index) => {
        const isTop = index === 0 && answer.count > 0;
        html += `
            <div class="vote-row ${isTop ? 'top-vote' : ''}">
                <div class="vote-row-header">
                    <span class="vote-player-name">${answer.text}</span>
                    <span class="vote-count-badge">${answer.count} votes</span>
                </div>
                <div class="vote-bar-container">
                    <div class="vote-bar" style="width: 100%;">
                        <div class="vote-bar-fill" style="width: ${answer.percentage}%;">
                            <span class="vote-percentage">${answer.percentage.toFixed(1)}%</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Update stats cards
function updateStats() {
    document.getElementById('total-questions').textContent = questions.length;
    document.getElementById('active-question-num').textContent = currentQuestionIndex >= 0 ? (currentQuestionIndex + 1) : '-';
    
    // Calculate total votes across all questions
    let totalVotesAll = 0;
    Object.values(allQuestionVotes).forEach(votes => {
        totalVotesAll += Object.values(votes).reduce((sum, count) => sum + count, 0);
    });
    document.getElementById('total-votes-count').textContent = totalVotesAll;
}

// Load active users count
async function loadActiveUsers() {
    try {
        const response = await fetch('/api/active-users');
        const data = await response.json();
        document.getElementById('active-users-count').textContent = data.count;
    } catch (error) {
        console.error('Error loading active users:', error);
    }
}

// Refresh votes periodically
setInterval(() => {
    // Refresh votes for selected question
    if (selectedQuestionIndex >= 0) {
        loadVotesForQuestion(selectedQuestionIndex);
    }
    
    // Refresh all question votes
    questions.forEach((q, index) => {
        loadVotesForQuestion(index, false);
    });
    
    updateStats();
}, 2000);

// Initial load
loadActiveUsers();

