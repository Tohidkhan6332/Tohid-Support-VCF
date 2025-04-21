document.addEventListener('DOMContentLoaded', () => {
  // Set current year in footer
  document.getElementById('year').textContent = new Date().getFullYear();
  
  const form = document.getElementById('uploadForm');
  const contactsList = document.getElementById('contactsList');
  const countSpan = document.getElementById('count');
  const phoneInput = document.getElementById('phone');
  const shareBtn = document.getElementById('shareBtn');

  // Load all contacts on page load
  loadContacts();
  
  // Theme switcher functionality
  const themeToggle = document.getElementById('themeToggle');
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  
  // Check for saved theme preference or use system preference
  const currentTheme = localStorage.getItem('theme') || 
                      (prefersDarkScheme.matches ? 'dark' : 'light');
  document.body.setAttribute('data-theme', currentTheme);
  
  themeToggle.addEventListener('click', function() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('name').value.trim();
    const countryCode = document.getElementById('countryCode').value;
    let phone = phoneInput.value.trim();

    // Validate all fields
    if (!name || !countryCode || !phone) {
      showAlert('Please fill in all fields', 'error');
      return;
    }

    // Process phone number - remove all non-digit characters
    phone = phone.replace(/\D/g, '');
    
    // Remove leading 0 if present (common in many countries)
    if (phone.startsWith('0')) {
      phone = phone.substring(1);
    }

    // Validate phone number length (6-10 digits)
    if (phone.length < 6 || phone.length > 10) {
      showAlert('Phone number should be 6-10 digits (without country code or leading zero)', 'error');
      phoneInput.focus();
      return;
    }

    try {
      // Check if contact exists first
      const checkResponse = await fetch('/check-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, country_code: countryCode })
      });
      
      const { exists } = await checkResponse.json();
      
      if (exists) {
        showAlert('This contact already exists in the system', 'error');
        return;
      }

      // If contact doesn't exist, proceed with upload
      const uploadResponse = await fetch('/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, country_code: countryCode })
      });
      
      const data = await uploadResponse.json();
      
      if (uploadResponse.ok) {
        showAlert('Contact added successfully!', 'success');
        form.reset();
        loadContacts();
      } else {
        throw new Error(data.error || 'Failed to add contact');
      }
    } catch (error) {
      console.error('Upload error:', error);
      showAlert(error.message || 'Failed to add contact. Please try again.', 'error');
    }
  });

  // Share functionality
  shareBtn.addEventListener('click', async function() {
    try {
      // First check if there are contacts to share
      const contactsCount = parseInt(countSpan.textContent);
      if (contactsCount === 0) {
        showAlert('No contacts available to share. Please add contacts first.', 'error');
        return;
      }

      // Check if Web Share API is supported
      if (navigator.share) {
        // For mobile devices with Web Share API
        await navigator.share({
          title: Tohid Support Contacts',
          text: 'Check out these contacts from Tohid Support',
          url: '/download',
        });
      } else {
        // Fallback for desktop browsers
        const shareUrl = window.location.origin + '/download';
        await navigator.clipboard.writeText(shareUrl);
        showAlert('Download link copied to clipboard!', 'success');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      if (error.name !== 'AbortError') {
        showAlert('Error sharing contacts. Please try again.', 'error');
      }
    }
  });

  // Load contacts function
  async function loadContacts() {
    try {
      const response = await fetch('/contacts');
      if (!response.ok) throw new Error('Network response was not ok');
      
      const contacts = await response.json();
      
      // Update count
      countSpan.textContent = contacts.length;
      
      // Clear and rebuild table
      contactsList.innerHTML = '';
      
      if (contacts.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.className = 'empty-row';
        emptyRow.innerHTML = `
          <td colspan="4">
            <div class="empty-state">
              <i class="fas fa-address-book"></i>
              <p>No contacts yet. Add your first contact!</p>
            </div>
          </td>`;
        contactsList.appendChild(emptyRow);
        return;
      }
      
      contacts.forEach((contact, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${index + 1}</td>
          <td>${contact.name}</td>
          <td>${contact.country_code}${contact.phone}</td>
          <td></td>`;
        contactsList.appendChild(row);
      });
    } catch (error) {
      console.error('Error loading contacts:', error);
      showAlert('Failed to load contacts. Please refresh the page.', 'error');
    }
  }

  // Show alert message
  function showAlert(message, type) {
    // Remove any existing alerts
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
      existingAlert.remove();
    }
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
      <span>${message}</span>
      <button class="close-alert">&times;</button>
    `;
    
    document.body.appendChild(alert);
    
    // Add close functionality
    setTimeout(() => {
      alert.style.animation = 'slideIn 0.3s ease reverse forwards';
      setTimeout(() => alert.remove(), 300);
    }, 5000);
    
    // Close button
    alert.querySelector('.close-alert').addEventListener('click', () => {
      alert.style.animation = 'slideIn 0.3s ease reverse forwards';
      setTimeout(() => alert.remove(), 300);
    });
  }
  
  // Prevent non-numeric input in phone field
  phoneInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '');
  });
});
