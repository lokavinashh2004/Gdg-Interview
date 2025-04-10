 // Initialize Firebase with your config
 const firebaseConfig = {
    apiKey: "AIzaSyA-yoqHLTgNCMZdgT45KbdVIrNE3-NOshA",
    authDomain: "gdg-online-exam-33e57.firebaseapp.com",
    databaseURL: "https://gdg-online-exam-33e57-default-rtdb.firebaseio.com",
    projectId: "gdg-online-exam-33e57",
    storageBucket: "gdg-online-exam-33e57.firebasestorage.app",
    messagingSenderId: "765566968072",
    appId: "1:765566968072:web:be936d70ebf40421af4cbd"
  };
  
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  
  // Get Firestore instance
  const db = firebase.firestore();
  
  // Admin credentials - in a real application, these would be stored securely
  // and authenticated through Firebase Authentication
  const ADMIN_ID = "gdg";
  const ADMIN_PASSWORD = "1234"; // This should be more secure in a real app

  // Authentication state
  let isAuthenticated = false;

  // Check if user is already authenticated (via session storage)
  if (sessionStorage.getItem('isAdminAuthenticated') === 'true') {
      isAuthenticated = true;
      updateAdminUI(true);
  }
  
  // DOM Elements for Auth
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const loginForm = document.getElementById('login-form');
  const adminIdInput = document.getElementById('admin-id');
  const adminPasswordInput = document.getElementById('admin-password');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const loginStatus = document.getElementById('login-status');
  const adminStatus = document.getElementById('admin-status');
  const adminControls = document.getElementById('admin-controls');
  const actionsHeader = document.getElementById('actions-header');
  
  // Auth Event Listeners
  loginBtn.addEventListener('click', login);
  logoutBtn.addEventListener('click', logout);
  sidebarToggle.addEventListener('click', toggleSidebar);
  
  // Sidebar Toggle
  function toggleSidebar() {
      sidebar.classList.toggle('sidebar-hidden');
  }
  
  // Login Function
  function login() {
      const adminId = adminIdInput.value.trim();
      const password = adminPasswordInput.value.trim();
      
      if (!adminId || !password) {
          showStatusMessage(loginStatus, 'Please enter both Admin ID and Password', false);
          return;
      }
      
      // Simple client-side authentication
      // In a real app, this would be done securely on the server
      if (adminId === ADMIN_ID && password === ADMIN_PASSWORD) {
          isAuthenticated = true;
          sessionStorage.setItem('isAdminAuthenticated', 'true');
          updateAdminUI(true);
          adminPasswordInput.value = '';
          showStatusMessage(loginStatus, 'Login successful!', true);
      } else {
          showStatusMessage(loginStatus, 'Invalid Admin ID or Password', false);
      }
  }
  
  // Logout Function
  function logout() {
      isAuthenticated = false;
      sessionStorage.removeItem('isAdminAuthenticated');
      updateAdminUI(false);
  }
  
  // Update Admin UI based on authentication state
  function updateAdminUI(isLoggedIn) {
      // Update UI elements based on login state
      if (isLoggedIn) {
          adminStatus.textContent = 'Logged in as Admin';
          adminStatus.classList.add('logged-in');
          logoutBtn.style.display = 'block';
          loginForm.style.display = 'none';
          adminControls.style.display = 'block';
          actionsHeader.style.display = 'table-cell';
          
          // Show all admin-only elements
          const adminOnlyElements = document.querySelectorAll('.admin-only');
          adminOnlyElements.forEach(element => {
              element.style.display = element.tagName === 'TH' ? 'table-cell' : 'block';
          });
      } else {
          adminStatus.textContent = 'Not logged in';
          adminStatus.classList.remove('logged-in');
          logoutBtn.style.display = 'none';
          loginForm.style.display = 'block';
          adminControls.style.display = 'none';
          actionsHeader.style.display = 'none';
          
          // Hide all admin-only elements
          const adminOnlyElements = document.querySelectorAll('.admin-only');
          adminOnlyElements.forEach(element => {
              element.style.display = 'none';
          });
      }
      
      // Refresh scoreboard to update UI based on admin status
      updateScoreboard();
  }
  
  // Define skill categories
  const skills = [
      "technicalSkills",
      "communication",
      "selfIntro",
      "problemSolving",
      "teamworkLeadership"
  ];
  
  // Skill labels for display
  const skillLabels = {
      "technicalSkills": "Technical Skills",
      "communication": "Communication",
      "selfIntro": "Self Intro",
      "problemSolving": "Problem Solving",
      "teamworkLeadership": "Teamwork & Leadership"
  };
  
  // Store data
  let candidates = [];
  let scores = {};
  
  // DOM Elements
  const addCandidateBtn = document.getElementById('add-candidate-btn');
  const candidateNameInput = document.getElementById('candidate-name');
  const scoreboardBody = document.getElementById('scoreboard-body');
  const candidateStatus = document.getElementById('candidate-status');
  const loader = document.getElementById('loader');
  
  // Event Listeners
  addCandidateBtn.addEventListener('click', addCandidate);
  
  // Load data when page loads
  document.addEventListener('DOMContentLoaded', () => {
      fetchCandidates();
      fetchScores();
  });
  
  // Add Candidate Function
  function addCandidate() {
      const candidateName = candidateNameInput.value.trim();
      
      if (!candidateName) {
          showStatusMessage(candidateStatus, 'Please enter a candidate name', false);
          return;
      }
      
      // Add to Firestore
      db.collection('candidates').add({
          name: candidateName,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
      })
      .then(() => {
          candidateNameInput.value = '';
          showStatusMessage(candidateStatus, 'Candidate added successfully!', true);
          fetchCandidates(); // Refresh the list
      })
      .catch(error => {
          console.error('Error adding candidate:', error);
          showStatusMessage(candidateStatus, 'Error adding candidate. Please try again.', false);
      });
  }
  
  // Remove Candidate Function
  function removeCandidate(candidateId, candidateName) {
      // Check if admin is logged in
      if (!isAuthenticated) {
          alert('You must be logged in as an admin to remove candidates.');
          return;
      }
      
      // Confirm deletion
      if (!confirm(`Are you sure you want to remove ${candidateName}?`)) {
          return;
      }
      
      // Delete candidate document
      db.collection('candidates').doc(candidateId).delete()
          .then(() => {
              // Delete all scores for this candidate
              const batch = db.batch();
              
              // Batch delete all scores for this candidate
              skills.forEach(skill => {
                  const scoreDocId = `${candidateId}_${skill}`;
                  const scoreRef = db.collection('scores').doc(scoreDocId);
                  batch.delete(scoreRef);
              });
              
              // Commit the batch delete
              return batch.commit();
          })
          .then(() => {
              showStatusMessage(candidateStatus, 'Candidate removed successfully!', true);
          })
          .catch(error => {
              console.error('Error removing candidate:', error);
              showStatusMessage(candidateStatus, 'Error removing candidate. Please try again.', false);
          });
  }
  
  // Fetch Candidates from Firestore
  function fetchCandidates() {
      loader.style.display = 'block';
      
      db.collection('candidates')
          .orderBy('createdAt', 'desc')
          .onSnapshot(snapshot => {
              candidates = [];
              snapshot.forEach(doc => {
                  candidates.push({
                      id: doc.id,
                      name: doc.data().name
                  });
              });
              
              updateScoreboard();
              loader.style.display = 'none';
          }, error => {
              console.error('Error fetching candidates:', error);
              loader.style.display = 'none';
          });
  }
  
  // Fetch Scores from Firestore
  function fetchScores() {
      db.collection('scores')
          .onSnapshot(snapshot => {
              scores = {};
              snapshot.forEach(doc => {
                  scores[doc.id] = doc.data().score;
              });
              
              updateScoreboard();
          }, error => {
              console.error('Error fetching scores:', error);
          });
  }
  
  // Update Scoreboard Function
  function updateScoreboard() {
      scoreboardBody.innerHTML = '';
      
      // If no candidates, show message
      if (candidates.length === 0) {
          const row = document.createElement('tr');
          const colSpan = isAuthenticated ? 8 : 7;
          row.innerHTML = `
              <td colspan="${colSpan}" style="text-align: center;">
                  No candidates added yet.
              </td>
          `;
          scoreboardBody.appendChild(row);
          return;
      }
      
      // Generate rows for each candidate
      candidates.forEach(candidate => {
          const row = document.createElement('tr');
          
          // Get scores for all skills
          const skillScores = {};
          let totalScore = 0;
          let scoreCount = 0;
          
          skills.forEach(skill => {
              const scoreId = `${candidate.id}_${skill}`;
              const score = scores[scoreId] || '';
              skillScores[skill] = score;
              
              if (score !== '') {
                  totalScore += parseInt(score);
                  scoreCount++;
              }
          });
          
          // Format the total score
          const formattedTotal = scoreCount > 0 ? (totalScore / scoreCount).toFixed(1) : '-';
          
          // Start with candidate name cell
          let rowHtml = `<td>${candidate.name}</td>`;
          
          // Add cells for each skill
          skills.forEach(skill => {
              if (isAuthenticated) {
                  // If admin, show editable inputs
                  rowHtml += `
                      <td>
                          <input type="number" min="0" max="10" class="score-input" 
                              value="${skillScores[skill]}" 
                              data-candidate-id="${candidate.id}" 
                              data-skill="${skill}"
                              onchange="updateScore(this)">
                      </td>
                  `;
              } else {
                  // If public view, show just the score
                  const displayScore = skillScores[skill] ? `${skillScores[skill]}/10` : '-';
                  rowHtml += `
                      <td>${displayScore}</td>
                  `;
              }
          });
          
          // Add total score cell
          rowHtml += `<td class="total-score">${formattedTotal}</td>`;
          
          // Add action cell only for admins
          if (isAuthenticated) {
              rowHtml += `
                  <td class="actions-column">
                      <button class="delete-btn" onclick="removeCandidate('${candidate.id}', '${candidate.name}')">
                          Remove
                      </button>
                  </td>
              `;
          }
          
          row.innerHTML = rowHtml;
          scoreboardBody.appendChild(row);
      });
  }
  
  // Update Score Function
  function updateScore(inputElement) {
      // Check if admin is logged in
      if (!isAuthenticated) {
          alert('You must be logged in as an admin to update scores.');
          return;
      }
      
      const candidateId = inputElement.dataset.candidateId;
      const skill = inputElement.dataset.skill;
      const score = inputElement.value;
      
      // Validate score (0-10)
      if (score < 0 || score > 10) {
          alert('Score must be between 0 and 10');
          return;
      }
      
      // Create a unique document ID
      const docId = `${candidateId}_${skill}`;
      
      // Save to Firestore
      db.collection('scores').doc(docId).set({
          candidateId: candidateId,
          skill: skill,
          score: score,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      })
      .then(() => {
          // Update local scores object
          scores[docId] = score;
          
          // Update the total score display
          updateTotalScore(candidateId);
      })
      .catch(error => {
          console.error('Error updating score:', error);
          alert('Error saving score. Please try again.');
      });
  }
  
  // Update Total Score Display
  function updateTotalScore(candidateId) {
      let totalScore = 0;
      let scoreCount = 0;
      
      // Calculate total from all skills
      skills.forEach(skill => {
          const scoreId = `${candidateId}_${skill}`;
          if (scores[scoreId]) {
              totalScore += parseInt(scores[scoreId]);
              scoreCount++;
          }
      });
      
      // Format the total score
      const formattedTotal = scoreCount > 0 ? (totalScore / scoreCount).toFixed(1) : '-';
      
      // Find and update the total score cell in the table
      const candidateName = candidates.find(c => c.id === candidateId).name;
      const rows = scoreboardBody.querySelectorAll('tr');
      
      for (let i = 0; i < rows.length; i++) {
          const cells = rows[i].querySelectorAll('td');
          if (cells.length > 0 && cells[0].textContent === candidateName) {
              // Total score is always second-to-last cell
              const totalScoreIndex = isAuthenticated ? cells.length - 2 : cells.length - 1;
              cells[totalScoreIndex].textContent = formattedTotal;
              break;
          }
      }
  }
  
  // Helper function to show status messages
  function showStatusMessage(element, message, isSuccess) {
      element.textContent = message;
      element.className = 'status-message';
      element.classList.add(isSuccess ? 'status-success' : 'status-error');
      
      // Clear message after 3 seconds
      setTimeout(() => {
          element.textContent = '';
          element.className = 'status-message';
      }, 3000);
  }