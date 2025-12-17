const socket = io();

let currentQuestion = null;
let hasVoted = false;

// Join as user
socket.emit('user-join');

// Handle current state from server
socket.on('current-state', (data) => {
    currentQuestion = data.question;
    hasVoted = data.hasVoted;
    updateDisplay();
});

// Handle question changes
socket.on('question-changed', (data) => {
    currentQuestion = data.question;
    hasVoted = false;
    updateDisplay();
});

// Handle vote confirmation
socket.on('vote-confirmed', (data) => {
    hasVoted = true;
    updateDisplay();
    showVoteStatus('Vote recorded! Waiting for next question...');
});

// Handle vote errors
socket.on('vote-error', (data) => {
    alert(data.message);
});

// Update the display based on current state
function updateDisplay() {
    const waitingScreen = document.getElementById('waiting-screen');
    const questionScreen = document.getElementById('question-screen');
    const questionText = document.getElementById('question-text');
    const answersContainer = document.getElementById('answers-container');
    const voteStatus = document.getElementById('vote-status');
    
    if (!currentQuestion) {
        // Show waiting screen
        waitingScreen.classList.remove('hidden');
        questionScreen.classList.add('hidden');
    } else {
        // Show question screen
        waitingScreen.classList.add('hidden');
        questionScreen.classList.remove('hidden');
        
        questionText.textContent = currentQuestion.question;
        answersContainer.innerHTML = '';
        
        if (hasVoted) {
            // User has already voted, show waiting message
            answersContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">You have voted. Waiting for next question...</p>';
            voteStatus.textContent = 'Vote recorded! Waiting for next question...';
            voteStatus.style.display = 'block';
        } else {
            // Show answer options
            currentQuestion.answers.forEach(answer => {
                const answerBtn = document.createElement('button');
                answerBtn.className = 'answer-btn';
                answerBtn.textContent = answer.text;
                answerBtn.onclick = () => vote(answer.id);
                answersContainer.appendChild(answerBtn);
            });
            voteStatus.style.display = 'none';
        }
    }
}

// Handle voting
function vote(answerId) {
    if (hasVoted || !currentQuestion) return;
    
    socket.emit('vote', {
        questionId: currentQuestion.id,
        answerId: answerId
    });
}

// Show vote status message
function showVoteStatus(message) {
    const voteStatus = document.getElementById('vote-status');
    voteStatus.textContent = message;
    voteStatus.style.display = 'block';
}

// Handle disconnect
socket.on('disconnect', () => {
    socket.emit('user-leave');
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    socket.emit('user-leave');
    socket.disconnect();
});

