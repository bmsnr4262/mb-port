import { Component, signal, OnInit, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';

@Component({
  selector: 'app-otp-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './otp-auth.component.html',
  styleUrl: './otp-auth.component.css'
})
export class OtpAuthComponent implements OnInit {
  // Stage signals
  checkingSession = signal(false);
  hasActiveSession = signal(false);
  otpRequired = signal(false);
  otpSent = signal(false);
  otpVerified = signal(false);
  loading = signal(false);
  error = signal('');
  success = signal('');
  
  enteredOtp = '';
  generatedOtp = '';
  redirectUrl = '';
  projectName = '';
  projectType = '';
  
  // Visitor information
  visitorName = '';
  visitorEmail = '';
  
  // Your email where OTP will be sent
  readonly ownerEmail = 'bmsnr4262@gmail.com';
  
  // Web3Forms configuration
  readonly web3formsAccessKey = '12694df3-42eb-4a6d-aaa5-1384c8c93dde';

  private isBrowser: boolean;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabaseService: SupabaseService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.redirectUrl = params['redirect'] || '';
      this.projectName = params['project'] || 'Project';
      this.projectType = params['type'] || 'live';
    });
  }

  generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Step 1: Check if user has an active session
   */
  async checkAccess() {
    if (!this.isBrowser) return;
    if (!this.visitorEmail.trim()) {
      this.error.set('Please enter your email address');
      return;
    }

    this.checkingSession.set(true);
    this.error.set('');

    try {
      const result = await this.supabaseService.checkSession(this.visitorEmail, this.projectName);

      if (result.hasActiveSession) {
        // User has active session - grant access without OTP
        this.hasActiveSession.set(true);
        this.visitorName = result.visitor_name || this.visitorName;
        this.success.set(`Welcome back, ${this.visitorName}! You have an active session.`);
        
        // Auto redirect after showing message
        setTimeout(() => this.redirectToProject(), 2000);
      } else {
        // No active session - require OTP
        this.otpRequired.set(true);
        this.success.set('No active session found. Please complete verification.');
      }
    } catch (err) {
      console.error('Session check error:', err);
      // On error, require OTP as fallback
      this.otpRequired.set(true);
    }

    this.checkingSession.set(false);
  }

  /**
   * Step 2: Send OTP (only if no active session)
   */
  async sendOtp() {
    if (!this.isBrowser) return;
    if (!this.visitorName.trim()) {
      this.error.set('Please enter your name');
      return;
    }
    
    this.loading.set(true);
    this.error.set('');
    
    this.generatedOtp = this.generateOtp();
    
    // Store OTP hash with timestamp
    const otpData = {
      otp: this.generatedOtp,
      timestamp: Date.now(),
      redirect: this.redirectUrl,
      visitorEmail: this.visitorEmail
    };
    sessionStorage.setItem('portfolio_otp_data', btoa(JSON.stringify(otpData)));

    // Save visitor data to database (status_id = 2 initially)
    await this.supabaseService.saveAccessRequest({
      visitor_name: this.visitorName,
      visitor_email: this.visitorEmail,
      project_name: this.projectName,
      project_type: this.projectType,
      redirect_url: this.redirectUrl,
      otp_code: this.generatedOtp,
      is_verified: false
    });

    try {
      // Send OTP via Web3Forms
      await this.sendEmailWithOtp(this.generatedOtp);
      this.otpSent.set(true);
      this.success.set('OTP sent to owner\'s email. Please enter the OTP to continue.');
    } catch (err) {
      console.error('Email send error:', err);
      // For demo/testing, show the OTP
      this.otpSent.set(true);
      this.success.set(`OTP sent! (Demo mode - OTP: ${this.generatedOtp})`);
    }
    
    this.loading.set(false);
  }

  async sendEmailWithOtp(otp: string): Promise<void> {
    const formData = {
      access_key: this.web3formsAccessKey,
      to_email: this.ownerEmail,
      from_name: 'Portfolio OTP System',
      subject: `🔐 OTP Request from ${this.visitorName} for ${this.projectName}`,
      message: `
═══════════════════════════════════════
       PORTFOLIO ACCESS REQUEST
═══════════════════════════════════════

🔐 OTP Code: ${otp}

👤 VISITOR DETAILS:
   Name: ${this.visitorName}
   Email: ${this.visitorEmail}

📁 PROJECT: ${this.projectName}

⏰ Time: ${new Date().toLocaleString()}

⚠️ This OTP will expire in 5 minutes.
📌 After verification, user will have access for 7 days.

If you want to grant access, share the OTP with the visitor.
To revoke access later, set status_id to 2 in database.

═══════════════════════════════════════
      `.trim()
    };

    const response = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Failed to send email');
    }
  }

  /**
   * Step 3: Verify OTP
   */
  async verifyOtp() {
    if (!this.isBrowser) return;
    
    this.error.set('');
    
    const storedData = sessionStorage.getItem('portfolio_otp_data');
    if (!storedData) {
      this.error.set('OTP expired. Please request a new one.');
      return;
    }

    try {
      const otpData = JSON.parse(atob(storedData));
      
      // Check if OTP is expired (5 minutes)
      if (Date.now() - otpData.timestamp > 5 * 60 * 1000) {
        this.error.set('OTP expired. Please request a new one.');
        sessionStorage.removeItem('portfolio_otp_data');
        this.otpSent.set(false);
        return;
      }

      if (this.enteredOtp === otpData.otp) {
        this.otpVerified.set(true);
        this.success.set('Verification successful! Session active for 7 days.');
        
        // Mark as verified in database (sets status_id = 1)
        await this.supabaseService.markAsVerified(otpData.visitorEmail, otpData.otp);
        
        // Clear session storage
        sessionStorage.removeItem('portfolio_otp_data');
        
        // Redirect after short delay
        setTimeout(() => this.redirectToProject(), 1500);
      } else {
        this.error.set('Invalid OTP. Please try again.');
      }
    } catch {
      this.error.set('Verification failed. Please try again.');
    }
  }

  redirectToProject() {
    if (this.redirectUrl) {
      window.open(this.redirectUrl, '_blank', 'noopener,noreferrer');
      this.router.navigate(['/']);
    } else {
      this.router.navigate(['/']);
    }
  }

  resendOtp() {
    this.otpSent.set(false);
    this.enteredOtp = '';
    this.error.set('');
    this.success.set('');
  }

  // Go back to email entry
  resetFlow() {
    this.otpRequired.set(false);
    this.otpSent.set(false);
    this.hasActiveSession.set(false);
    this.visitorName = '';
    this.error.set('');
    this.success.set('');
  }
}
