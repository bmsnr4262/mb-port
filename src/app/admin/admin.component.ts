import { Component, signal, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

interface AdminUser {
  id: number;
  username: string;
  email: string;
}

interface TableInfo {
  name: string;
  displayName: string;
  icon: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {
  private readonly API_URL = 'https://mb-port-production.up.railway.app/api';
  private isBrowser: boolean;

  // Auth states
  isLoggedIn = signal(false);
  currentView = signal<'login' | 'signup' | 'verify' | 'dashboard'>('login');
  
  // Form data
  loginUsername = '';
  loginPassword = '';
  signupUsername = '';
  signupEmail = '';
  signupPassword = '';
  signupConfirmPassword = '';
  verifyEmail = '';
  verifyOtp = '';
  
  // UI states
  loading = signal(false);
  error = signal('');
  success = signal('');
  generatedOtp = signal('');
  
  // User data
  currentUser = signal<AdminUser | null>(null);
  
  // Dashboard data
  tables = signal<TableInfo[]>([]);
  selectedTable = signal<string>('');
  tableColumns = signal<string[]>([]);
  tableData = signal<any[]>([]);
  tableLoading = signal(false);
  
  // Stats
  stats = signal<any>(null);
  
  // Sidebar collapsed state
  sidebarCollapsed = signal(false);
  
  // Modal states
  showMessageModal = signal(false);
  selectedMessage = signal<any>(null);
  replyText = '';
  replySending = signal(false);
  replySuccess = signal(false);
  replyError = signal('');
  replyDetails = signal<any>(null);
  
  // Edit modal states
  showEditModal = signal(false);
  editingRecord = signal<any>(null);
  editFormData: any = {};
  editSaving = signal(false);
  editError = signal('');
  editSuccess = signal(false);
  
  // Computed: Get selected table display name
  get selectedTableDisplayName(): string {
    const table = this.tables().find(t => t.name === this.selectedTable());
    return table?.displayName || 'Dashboard';
  }

  // Web3Forms config for OTP email
  private readonly web3formsKey = '12694df3-42eb-4a6d-aaa5-1384c8c93dde';
  private readonly ownerEmail = 'bmsnr4262@gmail.com';

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      // Check if already logged in
      const savedUser = sessionStorage.getItem('adminUser');
      const savedToken = sessionStorage.getItem('adminToken');
      
      if (savedUser && savedToken) {
        this.currentUser.set(JSON.parse(savedUser));
        this.isLoggedIn.set(true);
        this.currentView.set('dashboard');
        this.loadDashboard();
      }
    }
  }

  // Switch between login and signup
  switchToSignup() {
    this.currentView.set('signup');
    this.clearMessages();
  }

  switchToLogin() {
    this.currentView.set('login');
    this.clearMessages();
  }

  clearMessages() {
    this.error.set('');
    this.success.set('');
  }

  // Login
  async login() {
    if (!this.loginUsername || !this.loginPassword) {
      this.error.set('Please enter username and password');
      return;
    }

    this.loading.set(true);
    this.clearMessages();

    try {
      const response = await fetch(`${this.API_URL}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: this.loginUsername,
          password: this.loginPassword
        })
      });

      const result = await response.json();

      if (result.success) {
        // Save session
        if (this.isBrowser) {
          sessionStorage.setItem('adminUser', JSON.stringify(result.user));
          sessionStorage.setItem('adminToken', result.token);
        }
        
        this.currentUser.set(result.user);
        this.isLoggedIn.set(true);
        this.currentView.set('dashboard');
        this.loadDashboard();
      } else {
        this.error.set(result.message || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      this.error.set('Connection error. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  // Signup
  async signup() {
    if (!this.signupUsername || !this.signupEmail || !this.signupPassword) {
      this.error.set('Please fill in all fields');
      return;
    }

    if (this.signupPassword !== this.signupConfirmPassword) {
      this.error.set('Passwords do not match');
      return;
    }

    if (this.signupPassword.length < 6) {
      this.error.set('Password must be at least 6 characters');
      return;
    }

    this.loading.set(true);
    this.clearMessages();

    try {
      const response = await fetch(`${this.API_URL}/admin/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: this.signupUsername,
          email: this.signupEmail,
          password: this.signupPassword
        })
      });

      const result = await response.json();

      if (result.success) {
        // Send OTP to owner's email
        await this.sendOtpToOwner(result.otp, this.signupUsername, this.signupEmail);
        
        this.generatedOtp.set(result.otp);
        this.verifyEmail = this.signupEmail;
        this.currentView.set('verify');
        this.success.set('Signup request submitted! OTP has been sent to the owner for approval.');
      } else {
        this.error.set(result.message || 'Signup failed');
      }
    } catch (err) {
      console.error('Signup error:', err);
      this.error.set('Connection error. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  // Send OTP to owner via Web3Forms
  async sendOtpToOwner(otp: string, username: string, email: string) {
    try {
      const formData = new FormData();
      formData.append('access_key', this.web3formsKey);
      formData.append('to', this.ownerEmail);
      formData.append('subject', `[ADMIN SIGNUP] New admin request from ${username}`);
      formData.append('message', `
New Admin Signup Request

Username: ${username}
Email: ${email}
Time: ${new Date().toLocaleString()}

APPROVAL OTP: ${otp}

This OTP is valid for 10 minutes.
Share this OTP with the user if you want to approve their admin access.
      `);

      await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData
      });

      console.log('OTP email sent to owner');
    } catch (err) {
      console.error('Failed to send OTP email:', err);
    }
  }

  // Verify OTP
  async verifyOTP() {
    if (!this.verifyEmail || !this.verifyOtp) {
      this.error.set('Please enter the OTP');
      return;
    }

    this.loading.set(true);
    this.clearMessages();

    try {
      const response = await fetch(`${this.API_URL}/admin/verify-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.verifyEmail,
          otp: this.verifyOtp
        })
      });

      const result = await response.json();

      if (result.success) {
        this.success.set('Account verified! You can now login.');
        this.currentView.set('login');
        this.loginUsername = this.signupUsername;
      } else {
        this.error.set(result.message || 'Verification failed');
      }
    } catch (err) {
      console.error('Verify error:', err);
      this.error.set('Connection error. Please try again.');
    } finally {
      this.loading.set(false);
    }
  }

  // Logout
  logout() {
    if (this.isBrowser) {
      sessionStorage.removeItem('adminUser');
      sessionStorage.removeItem('adminToken');
    }
    this.currentUser.set(null);
    this.isLoggedIn.set(false);
    this.currentView.set('login');
    this.loginUsername = '';
    this.loginPassword = '';
  }

  // Load dashboard data
  async loadDashboard() {
    await Promise.all([
      this.loadTables(),
      this.loadStats()
    ]);
  }

  // Load available tables
  async loadTables() {
    try {
      const response = await fetch(`${this.API_URL}/admin/tables`);
      const result = await response.json();
      
      if (result.success) {
        this.tables.set(result.data);
        // Select first table by default
        if (result.data.length > 0) {
          this.selectTable(result.data[0].name);
        }
      }
    } catch (err) {
      console.error('Failed to load tables:', err);
    }
  }

  // Load dashboard stats
  async loadStats() {
    try {
      const response = await fetch(`${this.API_URL}/admin/dashboard-stats`);
      const result = await response.json();
      
      if (result.success) {
        this.stats.set(result.data);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  // Select a table to view
  async selectTable(tableName: string) {
    this.selectedTable.set(tableName);
    this.tableLoading.set(true);

    try {
      const response = await fetch(`${this.API_URL}/admin/tables/${tableName}`);
      const result = await response.json();
      
      if (result.success) {
        this.tableColumns.set(result.columns);
        this.tableData.set(result.data);
      }
    } catch (err) {
      console.error('Failed to load table data:', err);
    } finally {
      this.tableLoading.set(false);
    }
  }

  // Refresh current table
  refreshTable() {
    if (this.selectedTable()) {
      this.selectTable(this.selectedTable());
    }
  }

  // Delete a record
  async deleteRecord(id: number) {
    if (!confirm('Are you sure you want to delete this record?')) {
      return;
    }

    try {
      const response = await fetch(`${this.API_URL}/admin/tables/${this.selectedTable()}/${id}`, {
        method: 'DELETE'
      });
      const result = await response.json();
      
      if (result.success) {
        this.refreshTable();
        this.loadStats();
      } else {
        alert(result.message || 'Failed to delete');
      }
    } catch (err) {
      console.error('Failed to delete record:', err);
      alert('Failed to delete record');
    }
  }

  // Toggle sidebar
  toggleSidebar() {
    this.sidebarCollapsed.update(v => !v);
  }

  // Navigate back to website
  goToWebsite() {
    this.router.navigate(['/']);
  }

  // Format date for display
  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('en-IN', { 
      dateStyle: 'medium', 
      timeStyle: 'short' 
    });
  }

  // Format cell value for display
  formatCellValue(value: any, column: string): string {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? '✅ Yes' : '❌ No';
    if (column.includes('_at') || column === 'created_at' || column === 'verified_at') {
      return this.formatDate(value);
    }
    if (typeof value === 'string' && value.length > 50) {
      return value.substring(0, 50) + '...';
    }
    return String(value);
  }

  // Open message modal
  viewMessage(row: any) {
    this.selectedMessage.set(row);
    this.showMessageModal.set(true);
    this.replyText = '';
    this.replySuccess.set(false);
    this.replyError.set('');
    
    // Mark as read if not already
    if (!row.is_read) {
      this.markMessageAsRead(row.id);
    }
  }

  // Close message modal
  closeMessageModal() {
    this.showMessageModal.set(false);
    this.selectedMessage.set(null);
    this.replyText = '';
    this.replySuccess.set(false);
    this.replyError.set('');
  }

  // Mark message as read
  async markMessageAsRead(id: number) {
    try {
      await fetch(`${this.API_URL}/contact-messages/${id}/read`, {
        method: 'PATCH'
      });
      this.refreshTable();
      this.loadStats();
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  }

  // Open edit modal
  editRecord(row: any) {
    this.editingRecord.set({ ...row });
    this.editFormData = { ...row };
    // Convert status_id to boolean for checkbox
    this.editFormData.status_active = this.editFormData.status_id === 1;
    this.showEditModal.set(true);
    this.editError.set('');
    this.editSuccess.set(false);
  }

  // Close edit modal
  closeEditModal() {
    this.showEditModal.set(false);
    this.editingRecord.set(null);
    this.editFormData = {};
    this.editError.set('');
    this.editSuccess.set(false);
  }

  // Save edited record
  async saveEditedRecord() {
    const record = this.editingRecord();
    if (!record) return;

    this.editSaving.set(true);
    this.editError.set('');

    try {
      // Convert checkbox to status_id
      const updateData: any = {
        status_id: this.editFormData.status_active ? 1 : 2
      };

      const response = await fetch(`${this.API_URL}/admin/tables/${this.selectedTable()}/${record.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();

      if (result.success) {
        this.editSuccess.set(true);
        setTimeout(() => {
          this.closeEditModal();
          this.refreshTable();
          this.loadStats();
        }, 1000);
      } else {
        this.editError.set(result.message || 'Failed to update record');
      }
    } catch (err) {
      console.error('Failed to update record:', err);
      this.editError.set('Failed to update record. Please try again.');
    } finally {
      this.editSaving.set(false);
    }
  }

  // Send reply to sender
  async sendReply() {
    const message = this.selectedMessage();
    if (!message || !this.replyText.trim()) {
      this.replyError.set('Please enter a reply message');
      return;
    }

    this.replySending.set(true);
    this.replyError.set('');

    try {
      // Send email via backend API
      const response = await fetch(`${this.API_URL}/send-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_email: message.sender_email,
          to_name: message.sender_name,
          subject: message.subject || 'Your Message',
          original_message: message.message,
          reply_message: this.replyText
        })
      });

      const result = await response.json();

      if (result.success) {
        // Mark as replied in database
        await fetch(`${this.API_URL}/contact-messages/${message.id}/replied`, {
          method: 'PATCH'
        });

        this.replySuccess.set(true);
        this.replyDetails.set(result.replyDetails || {
          to: `${message.sender_name} <${message.sender_email}>`,
          subject: `Re: ${message.subject || 'Your Message'}`,
          body: this.replyText
        });
        this.refreshTable();
        this.loadStats();
      } else {
        this.replyError.set(result.message || 'Failed to save reply. Please try again.');
      }
    } catch (err) {
      console.error('Failed to send reply:', err);
      this.replyError.set('Failed to send reply. Please try again.');
    } finally {
      this.replySending.set(false);
    }
  }
}
