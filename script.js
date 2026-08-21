const API_URL = window.location.origin + '/api';

// UI Elements
const bookingForm = document.getElementById('bookingForm');
const roomTypeSelect = document.getElementById('roomType');
const inquiryCountSpan = document.getElementById('inquiryCount');
const adminDrawer = document.getElementById('adminDrawer');
const toggleAdminBtn = document.getElementById('toggleAdminBtn');
const closeAdminBtn = document.getElementById('closeAdminBtn');
const inquiryList = document.getElementById('inquiryList');

const modal = document.getElementById('confirmationModal');
const modalHeading = document.getElementById('modalHeading');
const modalBody = document.getElementById('modalBody');
const modalCloseBtn = document.getElementById('modalCloseBtn');

let currentAdminKey = sessionStorage.getItem('admin_token') || null;

// Set minimum date to today
const datePicker = document.getElementById('visitDate');
if (datePicker) {
  datePicker.min = new Date().toISOString().split('T')[0];
}

// 1. Room Filters
const filterButtons = document.querySelectorAll('.filter-btn');
const roomCards = document.querySelectorAll('.room-card');

filterButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    filterButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    const filterValue = btn.getAttribute('data-filter');
    roomCards.forEach((card) => {
      const category = card.getAttribute('data-category');
      if (filterValue === 'all' || filterValue === category) {
        card.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    });
  });
});

// 2. Room Select Binding
const selectRoomButtons = document.querySelectorAll('.select-room-btn');
selectRoomButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    roomTypeSelect.value = btn.getAttribute('data-room');
    document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
  });
});

// 3. Admin Passcode Gatekeeper & Lead Fetching
async function fetchLeads(promptPassword = false) {
  if (!currentAdminKey && promptPassword) {
    const password = prompt('Enter Admin Passcode (Default: admin@123):');
    if (!password) return;
    currentAdminKey = password;
    sessionStorage.setItem('admin_token', password);
  }

  if (!currentAdminKey) return;

  try {
    const res = await fetch(`${API_URL}/leads`, {
      headers: { 'Authorization': currentAdminKey }
    });

    if (res.status === 401) {
      sessionStorage.removeItem('admin_token');
      currentAdminKey = null;
      alert('Incorrect password! Access denied.');
      adminDrawer.classList.remove('open');
      return;
    }

    const leads = await res.json();
    inquiryCountSpan.textContent = leads.length;

    if (leads.length === 0) {
      inquiryList.innerHTML = '<p style="color: #94a3b8; text-align: center;">No leads in database yet.</p>';
      return;
    }

    inquiryList.innerHTML = leads.map(lead => `
      <div class="lead-card">
        <button class="btn-delete-lead" onclick="deleteLead(${lead.id})" title="Delete Lead">
          <i class="fa-solid fa-trash"></i>
        </button>
        <h4>${escapeHTML(lead.name)}</h4>
        <p><i class="fa-solid fa-phone"></i> ${escapeHTML(lead.phone)}</p>
        <p><i class="fa-solid fa-bed"></i> ${escapeHTML(lead.roomType)}</p>
        <p><i class="fa-regular fa-calendar"></i> Visit: ${escapeHTML(lead.date)}</p>
        <p><small style="color: #94a3b8;">Logged: ${lead.timestamp}</small></p>
      </div>
    `).join('');
  } catch (err) {
    inquiryList.innerHTML = '<p style="color: #ef4444; text-align: center;">Backend server offline. Run python app.py</p>';
  }
}

// 4. Form Submit Handler
bookingForm.addEventListener('submit', async function (e) {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const roomType = roomTypeSelect.value;
  const visitDate = document.getElementById('visitDate').value;

  if (!/^[0-9]{10}$/.test(phone)) {
    alert('Please enter a valid 10-digit mobile number.');
    return;
  }

  const payload = { name, phone, roomType, date: visitDate };

  try {
    const res = await fetch(`${API_URL}/inquire`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      modalHeading.textContent = `Thank You, ${name}!`;
      modalBody.innerHTML = `Your visit request for <strong>${roomType}</strong> on <strong>${visitDate}</strong> has been logged in the system.`;
      modal.classList.add('active');
      bookingForm.reset();
      if (currentAdminKey) fetchLeads();
    }
  } catch (err) {
    alert('Failed to connect to backend server. Run "python app.py" in VS Code.');
  }
});

// 5. Delete Lead API Call
window.deleteLead = async function (id) {
  if (!confirm('Are you sure you want to remove this lead?')) return;
  try {
    await fetch(`${API_URL}/leads/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': currentAdminKey }
    });
    fetchLeads();
  } catch (err) {
    alert('Failed to delete lead from server.');
  }
};

// UI Triggers
toggleAdminBtn.addEventListener('click', () => {
  adminDrawer.classList.toggle('open');
  if (adminDrawer.classList.contains('open')) {
    fetchLeads(true);
  }
});

closeAdminBtn.addEventListener('click', () => adminDrawer.classList.remove('open'));
modalCloseBtn.addEventListener('click', () => modal.classList.remove('active'));
modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.classList.remove('active');
});

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}