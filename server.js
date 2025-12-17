const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const XLSX = require('xlsx');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

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

// Preprogrammed questions - Ordered to match speech flow: "KNOW WHO YOU ARE"
// Group 1: Impact Under Pressure - "Who are we when it matters?"
const GROUP_1_QUESTIONS = [
    'Who is our best player when winning actually matters? (Not talent. Impact.)',
    'Who do you trust most in the last two minutes of a close game?',
    'Who competes the hardest when things are going badly?'
];

// Group 2: Standards & Accountability - "Who protects the culture?"
const GROUP_2_QUESTIONS = [
    'Who sets the standard every day—practice, film, weight room, everything?',
    'Who demands that we play the way we\'re coached?',
    'Who holds teammates accountable in real time—not after the fact?'
];

// Group 3: Team-First Identity - "Who makes others better?"
const GROUP_3_QUESTIONS = [
    'Who is the best teammate on this team?',
    'Who leads when the coaches aren\'t around?'
];

// Group 4: Growth & Humility - "Who is still becoming?"
const GROUP_4_QUESTIONS = [
    'Who is most coachable when the feedback is hard?'
];

// Group 5: Identity Check - "The most important question"
const GROUP_5_QUESTIONS = [
    'If we lost one person and our identity changed, who would that be?'
];

// Combine all questions in speech flow order
const PREPROGRAMMED_QUESTIONS = [
    ...GROUP_1_QUESTIONS,
    ...GROUP_2_QUESTIONS,
    ...GROUP_3_QUESTIONS,
    ...GROUP_4_QUESTIONS,
    ...GROUP_5_QUESTIONS
];

// Initialize questions with preprogrammed questions
function initializeQuestions() {
    return PREPROGRAMMED_QUESTIONS.map((question, index) => {
        // Sort players alphabetically for each question
        const sortedPlayers = [...UAM_PLAYERS].sort((a, b) => a.localeCompare(b));
        
        return {
            id: `pre-${index}-${Date.now()}`,
            question: question,
            answers: sortedPlayers.map((player, answerIndex) => ({
                id: answerIndex.toString(),
                text: player
            })),
            createdAt: new Date().toISOString()
        };
    });
}

// In-memory storage
let questions = initializeQuestions();
let currentQuestionIndex = -1;
let votes = {}; // { questionId: { answerId: count } }
let activeUsers = new Set(); // Track users currently on the voting page
let userVotes = {}; // Track which users have voted: { userId: questionId }

// Serve admin page
app.get('/admin', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'admin.html');
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error sending admin.html:', err);
      res.status(500).send('Error loading admin page');
    }
  });
});

// Serve user page
app.get('/', (req, res) => {
  const filePath = path.join(__dirname, 'public', 'index.html');
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error sending index.html:', err);
      res.status(500).send('Error loading user page');
    }
  });
});

// API: Get all questions
app.get('/api/questions', (req, res) => {
  res.json(questions);
});

// API: Create a new question
app.post('/api/questions', (req, res) => {
  const { question, answers } = req.body;
  if (!question || !answers || !Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: 'Question and answers are required' });
  }
  
  // Sort answers alphabetically
  const sortedAnswers = [...answers].sort((a, b) => a.localeCompare(b));
  
  const newQuestion = {
    id: Date.now().toString(),
    question,
    answers: sortedAnswers.map((answer, index) => ({
      id: index.toString(),
      text: answer
    })),
    createdAt: new Date().toISOString()
  };
  
  questions.push(newQuestion);
  res.json(newQuestion);
});

// API: Delete a question
app.delete('/api/questions/:id', (req, res) => {
  const { id } = req.params;
  questions = questions.filter(q => q.id !== id);
  delete votes[id];
  res.json({ success: true });
});

// API: Get current question index
app.get('/api/current-question', (req, res) => {
  res.json({ index: currentQuestionIndex });
});

// API: Set current question
app.post('/api/current-question', (req, res) => {
  const { index } = req.body;
  if (index < -1 || index >= questions.length) {
    return res.status(400).json({ error: 'Invalid question index' });
  }
  
  currentQuestionIndex = index;
  
  // Reset votes for the new question
  if (index >= 0) {
    const questionId = questions[index].id;
    votes[questionId] = {};
    userVotes = {}; // Reset user votes
  }
  
  // Broadcast to all clients
  io.emit('question-changed', { 
    index: currentQuestionIndex,
    question: index >= 0 ? questions[index] : null
  });
  
  res.json({ success: true, index: currentQuestionIndex });
});

// API: Get votes for a question
app.get('/api/votes/:questionId', (req, res) => {
  const { questionId } = req.params;
  res.json(votes[questionId] || {});
});

// API: Get active user count
app.get('/api/active-users', (req, res) => {
  res.json({ count: activeUsers.size });
});

// API: Clear all votes
app.post('/api/clear-votes', (req, res) => {
  votes = {};
  userVotes = {};
  
  // Broadcast to all clients that votes are cleared
  io.emit('votes-cleared', {});
  
  res.json({ success: true, message: 'All votes cleared' });
});

// API: Reset questions to preprogrammed
app.post('/api/reset-questions', (req, res) => {
  questions = initializeQuestions();
  votes = {};
  userVotes = {};
  currentQuestionIndex = -1;
  
  // Broadcast to all clients
  io.emit('questions-reset', {
    questions: questions,
    index: currentQuestionIndex
  });
  
  res.json({ success: true, message: 'Questions reset to preprogrammed', questions: questions });
});

// API: Full reset (clear everything)
app.post('/api/full-reset', (req, res) => {
  questions = initializeQuestions();
  votes = {};
  userVotes = {};
  currentQuestionIndex = -1;
  activeUsers.clear();
  
  // Broadcast to all clients
  io.emit('full-reset', {
    questions: questions,
    index: currentQuestionIndex
  });
  
  res.json({ success: true, message: 'Full reset completed', questions: questions });
});

// API: Export data to Excel
app.get('/api/export-excel', (req, res) => {
  try {
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['UAM Live Voting - Export Summary'],
      [''],
      ['Export Date', new Date().toLocaleString()],
      ['Total Questions', questions.length],
      ['Active Question Index', currentQuestionIndex >= 0 ? currentQuestionIndex + 1 : 'None'],
      ['Total Active Users', activeUsers.size],
      ['']
    ];
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    
    // Questions and votes sheet
    const questionsData = [
      ['Question #', 'Question', 'Answer (Player)', 'Votes', 'Percentage', 'Total Votes for Question']
    ];
    
    questions.forEach((question, qIndex) => {
      const questionVotes = votes[question.id] || {};
      const totalVotes = Object.values(questionVotes).reduce((sum, count) => sum + count, 0);
      
      // Sort answers alphabetically
      const sortedAnswers = [...question.answers].sort((a, b) => a.text.localeCompare(b.text));
      
      sortedAnswers.forEach((answer, aIndex) => {
        const voteCount = questionVotes[answer.id] || 0;
        const percentage = totalVotes > 0 ? ((voteCount / totalVotes) * 100).toFixed(2) + '%' : '0%';
        
        questionsData.push([
          qIndex === 0 ? question.question : '', // Only show question in first row
          qIndex === 0 ? '' : '', // Empty column for alignment
          answer.text,
          voteCount,
          percentage,
          qIndex === 0 ? totalVotes : '' // Only show total in first row
        ]);
      });
      
      // Add empty row between questions
      if (qIndex < questions.length - 1) {
        questionsData.push(['', '', '', '', '', '']);
      }
    });
    
    const questionsSheet = XLSX.utils.aoa_to_sheet(questionsData);
    
    // Set column widths
    questionsSheet['!cols'] = [
      { wch: 15 }, // Question #
      { wch: 60 }, // Question
      { wch: 25 }, // Answer (Player)
      { wch: 10 }, // Votes
      { wch: 12 }, // Percentage
      { wch: 20 }  // Total Votes
    ];
    
    XLSX.utils.book_append_sheet(workbook, questionsSheet, 'Questions & Votes');
    
    // Detailed breakdown sheet (one per question)
    questions.forEach((question, qIndex) => {
      const questionVotes = votes[question.id] || {};
      const totalVotes = Object.values(questionVotes).reduce((sum, count) => sum + count, 0);
      
      const detailData = [
        [`Question ${qIndex + 1}: ${question.question}`],
        [''],
        ['Total Votes', totalVotes],
        [''],
        ['Player', 'Votes', 'Percentage', 'Rank']
      ];
      
      // Sort answers by vote count (descending) for ranking
      const sortedAnswers = question.answers
        .map(answer => ({
          ...answer,
          count: questionVotes[answer.id] || 0
        }))
        .sort((a, b) => {
          // First by vote count (descending)
          if (b.count !== a.count) return b.count - a.count;
          // Then alphabetically
          return a.text.localeCompare(b.text);
        });
      
      sortedAnswers.forEach((answer, rank) => {
        const voteCount = answer.count;
        const percentage = totalVotes > 0 ? ((voteCount / totalVotes) * 100).toFixed(2) + '%' : '0%';
        
        detailData.push([
          answer.text,
          voteCount,
          percentage,
          rank + 1
        ]);
      });
      
      const detailSheet = XLSX.utils.aoa_to_sheet(detailData);
      detailSheet['!cols'] = [
        { wch: 30 }, // Player
        { wch: 10 }, // Votes
        { wch: 12 }, // Percentage
        { wch: 8 }   // Rank
      ];
      
      // Use question number as sheet name (Excel sheet names are limited)
      const sheetName = `Q${qIndex + 1}`.substring(0, 31); // Excel limit is 31 chars
      XLSX.utils.book_append_sheet(workbook, detailSheet, sheetName);
    });
    
    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    
    // Set response headers
    const filename = `UAM_Voting_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    // Send file
    res.send(excelBuffer);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    res.status(500).json({ error: 'Failed to export data to Excel' });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Send current state to newly connected user
  socket.emit('current-state', {
    questionIndex: currentQuestionIndex,
    question: currentQuestionIndex >= 0 ? questions[currentQuestionIndex] : null,
    hasVoted: userVotes[socket.id] === (currentQuestionIndex >= 0 ? questions[currentQuestionIndex].id : null)
  });
  
  // User joins the voting page
  socket.on('user-join', () => {
    activeUsers.add(socket.id);
    io.emit('active-users-update', { count: activeUsers.size });
  });
  
  // User leaves the voting page
  socket.on('user-leave', () => {
    activeUsers.delete(socket.id);
    io.emit('active-users-update', { count: activeUsers.size });
  });
  
  // Handle vote
  socket.on('vote', (data) => {
    const { questionId, answerId } = data;
    
    // Check if question is current
    if (currentQuestionIndex < 0 || questions[currentQuestionIndex].id !== questionId) {
      return socket.emit('vote-error', { message: 'This question is not currently active' });
    }
    
    // Check if user already voted
    if (userVotes[socket.id] === questionId) {
      return socket.emit('vote-error', { message: 'You have already voted on this question' });
    }
    
    // Record vote
    if (!votes[questionId]) {
      votes[questionId] = {};
    }
    if (!votes[questionId][answerId]) {
      votes[questionId][answerId] = 0;
    }
    votes[questionId][answerId]++;
    userVotes[socket.id] = questionId;
    
    // Confirm vote to user
    socket.emit('vote-confirmed', { questionId, answerId });
    
    // Broadcast updated votes to admin
    io.emit('votes-updated', {
      questionId,
      votes: votes[questionId]
    });
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    activeUsers.delete(socket.id);
    delete userVotes[socket.id];
    io.emit('active-users-update', { count: activeUsers.size });
  });
});

// For IIS, iisnode handles the port, so we use process.env.PORTNODE or process.env.PORT
// If neither is set, use 3000 for local development
const PORT = process.env.PORTNODE || process.env.PORT || 3000;

// For IIS deployment, the server should listen on the port provided by iisnode
// For standalone Node.js, it listens on the specified port
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (process.env.PORTNODE) {
    console.log('Running under IIS/iisnode');
  } else {
    console.log(`Admin interface: http://localhost:${PORT}/admin`);
    console.log(`User interface: http://localhost:${PORT}/`);
  }
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Please use a different port.`);
    console.error('You can set a different port with: PORT=3001 node server.js');
  } else {
    console.error('Server error:', err);
  }
  // Don't exit on IIS - let iisnode handle it
  if (!process.env.PORTNODE) {
    process.exit(1);
  }
});

