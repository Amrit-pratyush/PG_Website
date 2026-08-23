document.addEventListener('DOMContentLoaded', () => {
  let cachedAdminPassword = '';
  let leadsData = [];

  // Filter functionality
  const filterBtns = document.querySelectorAll('.filter-btn');
  const roomCards = document.querySelectorAll('.room-card');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.getAttribute('data-filter');

      roomCards.forEach(card => {
        if (filter === 'all' || card.getAttribute('data-category') === filter) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      });
    });
  });

  // Select room button pre-fills room dropdown
  const selectRoomBtns = document.querySelectorAll('.select-room-btn');
  const roomTypeSelect = document.getElementById('roomType');

  selectRoomBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const room = btn.getAttribute('data-room');
      if (roomTypeSelect) {
        roomTypeSelect.value = room;
      }
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });

  // Modal helpers
  const modal = document.getElementById('confirmationModal');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const modalHeading = document.getElementById('modalHeading');
  const modalBody = document.getElementById('modalBody');

  function showModal(title, message) {
    if (modalHeading) modalHeading.textContent = title;
    if (modalBody) modalBody.textContent = message;
    if (modal) modal.classList.add('active');
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
      if (modal) modal.classList.remove('active');
    });
  }

  // Handle Form Submission
  const bookingForm = document.getElementById('bookingForm');
  if (bookingForm) {
    bookingForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const name = document.getElementById('name').value.trim();
      const phone = document.getElementById('phone').value.trim();
      const location = document.getElementById('location').value;
      const roomType = document.getElementById('roomType').value;
      const date = document.getElementById('visitDate').value;

      const payload = { name, phone, location, roomType, date };

      try {
        const response = await fetch('/api/inquire', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          showModal('Inquiry Submitted! 🎉', `Thank you ${name}! We received your request for ${location} (${roomType}) on ${date}. Our team will contact you shortly.`);
          bookingForm.reset();
          if (cachedAdminPassword) {
            fetchLeads(cachedAdminPassword);
          }
        } else {
          showModal('Error', 'Failed to submit inquiry. Please try again.');
        }
      } catch (err) {
        console.error(err);
        showModal('Error', 'Server connection error. Please try again.');
      }
    });
  }

  // Admin Drawer Elements
  const adminDrawer = document.getElementById('adminDrawer');
  const toggleAdminBtn = document.getElementById('toggleAdminBtn');
  const closeAdminBtn = document.getElementById('closeAdminBtn');
  const inquiryList = document.getElementById('inquiryList');
  const inquiryCount = document.getElementById('inquiryCount');
  const inquiryCountDrawer = document.getElementById('inquiryCountDrawer');
  const exportCsvBtn = document.getElementById('exportCsvBtn');

  if (toggleAdminBtn) {
    toggleAdminBtn.addEventListener('click', () => {
      adminDrawer.classList.add('active');
      if (!cachedAdminPassword) {
        renderAuthPrompt();
      } else {
        fetchLeads(cachedAdminPassword);
      }
    });
  }

  if (closeAdminBtn) {
    closeAdminBtn.addEventListener('click', () => {
      adminDrawer.classList.remove('active');
    });
  }

  function renderAuthPrompt() {
    inquiryList.innerHTML = `
      <div style="padding: 1.5rem; text-align: center;">
        <h4 style="color: #f1f5f9; margin-bottom: 0.5rem;">Admin Authentication</h4>
        <p style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 1.25rem;">Enter admin password to view and manage leads</p>
        <input type="password" id="adminPassInput" placeholder="Enter Admin Password" style="width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid #334155; background: #0f172a; color: #fff; margin-bottom: 1rem; box-sizing: border-box;" autocomplete="current-password" />
        <button id="authBtn" style="width: 100%; background: #3b82f6; color: #fff; border: none; padding: 0.75rem; border-radius: 8px; font-weight: 600; cursor: pointer;">Unlock Leads</button>
      </div>
    `;

    const authBtn = document.getElementById('authBtn');
    const adminPassInput = document.getElementById('adminPassInput');

    const handleAuth = () => {
      const pass = adminPassInput.value.trim();
      if (pass) {
        fetchLeads(pass);
      }
    };

    authBtn.addEventListener('click', handleAuth);
    adminPassInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleAuth();
    });
  }

  async function fetchLeads(password) {
    inquiryList.innerHTML = `<p style="padding: 1rem; color: #94a3b8; text-align: center;">Loading leads...</p>`;

    try {
      const response = await fetch('/api/leads', {
        headers: { 'Authorization': password }
      });

      if (response.status === 401) {
        renderAuthPrompt();
        alert('Incorrect password. Access denied.');
        cachedAdminPassword = '';
        return;
      }

      cachedAdminPassword = password;
      leadsData = await response.json();

      if (inquiryCount) inquiryCount.textContent = leadsData.length;
      if (inquiryCountDrawer) inquiryCountDrawer.textContent = leadsData.length;

      renderLeads(leadsData);
    } catch (err) {
      console.error(err);
      inquiryList.innerHTML = `<p style="padding: 1rem; color: #ef4444; text-align: center;">Failed to load leads.</p>`;
    }
  }

  function renderLeads(leads) {
    if (!leads || leads.length === 0) {
      inquiryList.innerHTML = `<p style="padding: 1.5rem; color: #94a3b8; text-align: center;">No leads recorded yet.</p>`;
      return;
    }

    inquiryList.innerHTML = leads.map(lead => `
      <div style="background: #1e293b; border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem; border: 1px solid #334155;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.4rem;">
          <strong style="color: #f8fafc; font-size: 1rem;">${escapeHtml(lead.name)}</strong>
          <span style="background: #0284c7; color: white; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">
            ${escapeHtml(lead.location || 'Main Branch')}
          </span>
        </div>
        <p style="margin: 0.25rem 0; color: #cbd5e1; font-size: 0.85rem;"><i class="fa-solid fa-phone" style="width: 16px; color: #38bdf8;"></i> <a href="tel:${lead.phone}" style="color: #38bdf8; text-decoration: none;">${escapeHtml(lead.phone)}</a></p>
        <p style="margin: 0.25rem 0; color: #cbd5e1; font-size: 0.85rem;"><i class="fa-solid fa-bed" style="width: 16px; color: #38bdf8;"></i> ${escapeHtml(lead.roomType)}</p>
        <p style="margin: 0.25rem 0; color: #cbd5e1; font-size: 0.85rem;"><i class="fa-solid fa-calendar-day" style="width: 16px; color: #38bdf8;"></i> Visit Date: <strong>${escapeHtml(lead.date)}</strong></p>
        <p style="margin: 0.25rem 0; color: #64748b; font-size: 0.75rem;"><i class="fa-solid fa-clock" style="width: 16px;"></i> Logged: ${escapeHtml(lead.timestamp)}</p>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; padding-top: 0.5rem; border-top: 1px solid #334155;">
          <select class="status-select" data-id="${lead.id}" style="background: #0f172a; color: #f8fafc; border: 1px solid #475569; padding: 0.3rem 0.5rem; border-radius: 4px; font-size: 0.8rem;">
            <option value="New" ${lead.status === 'New' ? 'selected' : ''}>New</option>
            <option value="Contacted" ${lead.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
            <option value="Visited" ${lead.status === 'Visited' ? 'selected' : ''}>Visited</option>
            <option value="Booked" ${lead.status === 'Booked' ? 'selected' : ''}>Booked</option>
            <option value="Closed" ${lead.status === 'Closed' ? 'selected' : ''}>Closed</option>
          </select>
          <button class="delete-lead-btn" data-id="${lead.id}" style="background: #ef4444; color: white; border: none; padding: 0.3rem 0.6rem; border-radius: 4px; font-size: 0.8rem; cursor: pointer;">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </div>
    `).join('');

    // Status change listener
    document.querySelectorAll('.status-select').forEach(sel => {
      sel.addEventListener('change', async (e) => {
        const leadId = e.target.getAttribute('data-id');
        const newStatus = e.target.value;
        await fetch(`/api/leads/${leadId}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': cachedAdminPassword
          },
          body: JSON.stringify({ status: newStatus })
        });
      });
    });

    // Delete lead listener
    document.querySelectorAll('.delete-lead-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const leadId = btn.getAttribute('data-id');
        if (confirm('Delete this inquiry permanently?')) {
          await fetch(`/api/leads/${leadId}`, {
            method: 'DELETE',
            headers: { 'Authorization': cachedAdminPassword }
          });
          fetchLeads(cachedAdminPassword);
        }
      });
    });
  }

  // CSV Export
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      if (!leadsData || leadsData.length === 0) {
        alert('No leads available to export.');
        return;
      }

      let csv = 'ID,Name,Phone,Branch Location,Room Type,Visit Date,Status,Timestamp\n';
      leadsData.forEach(l => {
        csv += `"${l.id}","${l.name}","${l.phone}","${l.location || 'Main Branch'}","${l.roomType}","${l.date}","${l.status}","${l.timestamp}"\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `PG_Leads_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});