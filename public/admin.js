const socket = io();

// UAM Men's Basketball Roster Players
const UAM_PLAYERS = [
    'Lamont Jackson',
    'Giancarlo Valdez',
    'Gianssen Valdez',
    'Felix Smedjeback',
    'Isaac Jackson',
    'Josh Smith',
    'Giancarlo Bastianoni',
    'Elem Shelby',
    'Jakob Zenon',
    'Charles Temple',
    'Bryson Hammond',
    'Tyler Webb',
    'Ashton Price',
    'Jackson Edwards'
];

let questions = [];
let currentQuestionIndex = -1;
let currentVotes = {};

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
    if (data.questionId === getCurrentQuestionId()) {
        currentVotes = data.votes;
        updateVotesDisplay();
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
    updateVotesDisplay();
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
            
            // Automatically set the new question as current
            const newIndex = questions.length - 1;
            await setCurrentQuestion(newIndex);
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

// Question navigation
document.getElementById('prev-question-btn').addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
        setCurrentQuestion(currentQuestionIndex - 1);
    }
});

document.getElementById('next-question-btn').addEventListener('click', () => {
    if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestion(currentQuestionIndex + 1);
    }
});

// Load questions from server
async function loadQuestions() {
    try {
        const response = await fetch('/api/questions');
        questions = await response.json();
        updateQuestionsList();
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
        updateCurrentQuestionDisplay();
        
        if (currentQuestionIndex >= 0) {
            loadVotes();
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
            updateCurrentQuestionDisplay();
            updateVotesDisplay();
        } else {
            alert('Failed to set current question');
        }
    } catch (error) {
        console.error('Error setting current question:', error);
        alert('Error setting current question');
    }
}

// Load votes for current question
async function loadVotes() {
    const questionId = getCurrentQuestionId();
    if (!questionId) return;
    
    try {
        const response = await fetch(`/api/votes/${questionId}`);
        currentVotes = await response.json();
        updateVotesDisplay();
    } catch (error) {
        console.error('Error loading votes:', error);
    }
}

// Get current question ID
function getCurrentQuestionId() {
    if (currentQuestionIndex >= 0 && questions[currentQuestionIndex]) {
        return questions[currentQuestionIndex].id;
    }
    return null;
}

// Update questions list display
function updateQuestionsList() {
    const container = document.getElementById('questions-list');
    container.innerHTML = '';
    
    if (questions.length === 0) {
        container.innerHTML = '<p style="color: #666;">No questions yet. Create one above!</p>';
        return;
    }
    
    questions.forEach((question, index) => {
        const item = document.createElement('div');
        item.className = `question-item ${index === currentQuestionIndex ? 'current' : ''}`;
        const isCurrent = index === currentQuestionIndex;
        item.innerHTML = `
            <div class="question-item-content">
                <h3>${question.question}</h3>
                <p>${question.answers.length} answer(s) ${isCurrent ? '<strong style="color: #006633;">(Currently Active)</strong>' : ''}</p>
            </div>
            <div class="question-item-actions">
                ${!isCurrent ? `<button class="activate-question-btn" onclick="activateQuestion(${index})">Set as Active</button>` : ''}
                <button class="delete-question-btn" onclick="deleteQuestion('${question.id}')">Delete</button>
            </div>
        `;
        container.appendChild(item);
    });
}

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
            
            // Adjust current question index if needed
            if (currentQuestionIndex >= questions.length) {
                currentQuestionIndex = questions.length - 1;
                if (currentQuestionIndex >= 0) {
                    await setCurrentQuestion(currentQuestionIndex);
                } else {
                    await setCurrentQuestion(-1);
                }
            } else {
                updateQuestionsList();
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
    
    if (currentQuestionIndex < 0) {
        display.textContent = 'No question selected';
        prevBtn.disabled = true;
        nextBtn.disabled = questions.length === 0;
    } else {
        const question = questions[currentQuestionIndex];
        display.textContent = `${currentQuestionIndex + 1} of ${questions.length}: ${question.question}`;
        prevBtn.disabled = currentQuestionIndex === 0;
        nextBtn.disabled = currentQuestionIndex === questions.length - 1;
    }
}

// Update votes display
function updateVotesDisplay() {
    const container = document.getElementById('current-votes-display');
    
    if (currentQuestionIndex < 0) {
        container.innerHTML = '<p style="color: #666;">No question selected</p>';
        return;
    }
    
    const question = questions[currentQuestionIndex];
    const totalVotes = Object.values(currentVotes).reduce((sum, count) => sum + count, 0);
    
    if (totalVotes === 0) {
        container.innerHTML = '<p style="color: #666;">No votes yet</p>';
        return;
    }
    
    let html = `<h3 style="margin-bottom: 15px;">Votes (${totalVotes} total)</h3>`;
    
    question.answers.forEach(answer => {
        const count = currentVotes[answer.id] || 0;
        const percentage = totalVotes > 0 ? (count / totalVotes * 100).toFixed(1) : 0;
        
        html += `
            <div class="vote-item">
                <div class="vote-item-text">${answer.text}</div>
                <div class="vote-item-count">${count}</div>
            </div>
            <div class="vote-bar">
                <div class="vote-bar-fill" style="width: ${percentage}%">${percentage}%</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
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
    if (currentQuestionIndex >= 0) {
        loadVotes();
    }
}, 2000);

// Initial load
loadActiveUsers();

