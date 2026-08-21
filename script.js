const API_URL = '/api';

// UI Elements
const bookingForm = document.getElementById('bookingForm');
const roomTypeSelect = document.getElementById('roomType');
const inquiryCountSpan = document.getElementById('inquiryCount');
const adminDrawer = document.getElementById('adminDrawer');
const toggleAdminBtn = document.getElementById('toggleAdminBtn');
const closeAdminBtn = document.getElementById('closeAdminBtn');
const inquiryList = document.getElementById('inquiryList');
const exportCsvBtn = document.getElementById('exportCsvBtn');

const modal = document.getElementById('confirmationModal');
const modalHeading = document.getElementById('modalHeading');
const modalBody = document.getElementById('modalBody');
const modalCloseBtn = document.getElementById('modalCloseBtn');

let currentAdminKey = sessionStorage.getItem('admin_token') || null;
let currentLeads = [];

const datePicker = document.getElementById('visitDate');
if (datePicker) {
  datePicker.min = new Date().toISOString().split('T')[0];
}

// Room Filters
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

// Select Room from Card
const selectRoomButtons = document.querySelectorAll('.select-room-btn');
selectRoomButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    roomTypeSelect.value = btn.getAttribute('data-room');
    document.getElementById('contact').scrollIntoView({ behavior: 'smooth' });
  });
});

// Admin Lead Fetching
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

    currentLeads = await res.json();
    inquiryCountSpan.textContent = currentLeads.length;

    if (currentLeads.length === 0) {
      inquiryList.innerHTML = '<p style="color: #94a3b8; text-align: center; margin-top: 1.5rem;">No leads in database yet.</p>';
      return;
    }

    inquiryList.innerHTML = currentLeads.map(lead => `
      <div class="lead-card" style="position: relative; background: #1e293b; padding: 1rem; border-radius: 8px; margin-bottom: 0.8rem; border-left: 4px solid #3b82f6;">
        <button class="btn-delete-lead" onclick="deleteLead(${lead.id})" title="Delete Lead" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: #ef4444; cursor: pointer;">
          <i class="fa-solid fa-trash"></i>
        </button>
        <h4 style="margin-bottom: 0.3rem; color: #f8fafc;">${escapeHTML(lead.name)}</h4>
        <p style="margin: 0.2rem 0; font-size: 0.85rem;"><i class="fa-solid fa-phone" style="color: #10b981;"></i> <a href="tel:${escapeHTML(lead.phone)}" style="color: #94a3b8; text-decoration: none;">${escapeHTML(lead.phone)}</a></p>
        <p style="margin: 0.2rem 0; font-size: 0.85rem;"><i class="fa-solid fa-bed" style="color: #3b82f6;"></i> ${escapeHTML(lead.roomType)}</p>
        <p style="margin: 0.2rem 0; font-size: 0.85rem;"><i class="fa-regular fa-calendar" style="color: #f59e0b;"></i> Visit: ${escapeHTML(lead.date)}</p>
        
        <div style="margin-top: 0.6rem; display: flex; justify-content: space-between; align-items: center;">
          <select onchange="updateLeadStatus(${lead.id}, this.value)" style="background: #0f172a; color: #e2e8f0; border: 1px solid #334155; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">
            <option value="New" ${lead.status === 'New' ? 'selected' : ''}>🟡 New</option>
            <option value="Contacted" ${lead.status === 'Contacted' ? 'selected' : ''}>🔵 Contacted</option>
            <option value="Visited" ${lead.status === 'Visited' ? 'selected' : ''}>🟢 Visited</option>
          </select>
          <small style="color: #64748b; font-size: 0.75rem;">${lead.timestamp}</small>
        </div>
      </div>
    `).join('');
  } catch (err) {
    inquiryList.innerHTML = '<p style="color: #ef4444; text-align: center;">Unable to connect to leads API.</p>';
  }
}

// Update Status Handler
window.updateLeadStatus = async function (id, status) {
  try {
    await fetch(`${API_URL}/leads/${id}/status`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': currentAdminKey 
      },
      body: JSON.stringify({ status })
    });
  } catch (err) {
    alert('Failed to update status.');
  }
};

// Export to CSV Handler
if (exportCsvBtn) {
  exportCsvBtn.addEventListener('click', () => {
    if (!currentLeads || currentLeads.length === 0) {
      alert('No leads available to export.');
      return;
    }

    const headers = ['ID', 'Name', 'Phone', 'Room Type', 'Visit Date', 'Status', 'Timestamp'];
    const csvRows = [headers.join(',')];

    currentLeads.forEach(lead => {
      const row = [
        lead.id,
        `"${lead.name.replace(/"/g, '""')}"`,
        `"${lead.phone}"`,
        `"${lead.roomType}"`,
        `"${lead.date}"`,
        `"${lead.status}"`,
        `"${lead.timestamp}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvData = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const csvUrl = URL.createObjectURL(csvData);
    const link = document.createElement('a');
    link.href = csvUrl;
    link.setAttribute('download', `UrbanNest_Leads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}

// Form Submit Handler
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
      modalBody.innerHTML = `Your visit request for <strong>${roomType}</strong> on <strong>${visitDate}</strong> has been saved.`;
      modal.classList.add('active');
      bookingForm.reset();
      if (currentAdminKey) fetchLeads();
    } else {
      alert(`Server returned an error (${res.status}). Please try again.`);
    }
  } catch (err) {
    alert('Network error submitting the form.');
  }
});

// Delete Lead Handler
window.deleteLead = async function (id) {
  if (!confirm('Are you sure you want to remove this lead?')) return;
  try {
    await fetch(`${API_URL}/leads/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': currentAdminKey }
    });
    fetchLeads();
  } catch (err) {
    alert('Failed to delete lead.');
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