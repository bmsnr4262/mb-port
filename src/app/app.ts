import { Component, signal, HostListener, computed } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface Profile {
  name: string;
  title: string;
  tagline: string;
  location: string;
  email: string;
  phone: string;
}

interface Experience {
  years: number;
  projects: number;
}

interface About {
  intro: string;
  description: string;
  passion: string;
}

interface Education {
  period: string;
  degree: string;
  institution: string;
  gpa?: string;
  achievements?: string[];
}

interface Job {
  period: string;
  role: string;
  company: string;
  location: string;
  description: string;
  highlights: string[];
  technologies: string[];
}

interface Project {
  title: string;
  description: string;
  type: string;
  technologies: string[];
  liveUrl?: string;
  githubUrl?: string;
  featured?: boolean;
  gradient: string;
  emoji: string;
}

interface SkillCategory {
  title: string;
  icon: SafeHtml;
  skills: string[];
}

interface Social {
  name: string;
  url: string;
  icon: SafeHtml;
}

interface Certification {
  name: string;
  issuer: string;
  icon: string;
}

interface Stat {
  value: string;
  label: string;
}

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  isScrolled = signal(false);
  mobileMenuOpen = signal(false);
  currentYear = new Date().getFullYear();

  // ================================
  // PROFILE DATA - Madhan Sainath Reddy Bommidi
  // ================================
  
  profile = signal<Profile>({
    name: 'Madhan Sainath Reddy Bommidi',
    title: 'Full-Stack Developer',
    tagline: 'Full-Stack Developer with expertise in Angular, React, .NET Core, and Azure. I build scalable, high-performance web applications with intuitive UI/UX and secure REST APIs.',
    location: 'Hyderabad, India',
    email: 'bmsnr4262@gmail.com',
    phone: '+91-8712223899'
  });

  initials = computed(() => {
    const name = this.profile().name;
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return parts[0][0] + parts[parts.length - 1][0];
    }
    return name.substring(0, 2).toUpperCase();
  });

  experience = signal<Experience>({
    years: 1.5,
    projects: 4
  });

  about = signal<About>({
    intro: "I'm a passionate Full-Stack Developer with over 1.5 years of experience in building scalable, high-performance web applications using Angular, React, .NET Core, C#, SQL, and Azure.",
    description: "I specialize in crafting intuitive UI/UX, implementing clean architecture, and developing secure REST APIs. My journey in software development has been focused on delivering reliable solutions that are both performant and user-focused.",
    passion: "I'm committed to continuous improvement, writing maintainable code, and contributing effectively to agile teams. When I'm not coding, I'm exploring modern UI engineering patterns and staying updated with the latest technologies."
  });

  education = signal<Education[]>([
    {
      period: '2019 - 2023',
      degree: 'B.Tech in Computer Science',
      institution: 'CMR Technical Campus, Hyderabad',
      achievements: [
        'Specialized in Software Development',
        'Developed multiple academic projects using web technologies',
        'Active participant in technical events and hackathons'
      ]
    }
  ]);

  // Navigation links
  navLinks = [
    { id: 'about', label: 'About' },
    { id: 'skills', label: 'Skills' },
    { id: 'experience', label: 'Experience' },
    { id: 'projects', label: 'Projects' },
    { id: 'education', label: 'Education' }
  ];

  // Stats
  stats: Stat[] = [
    { value: '1.5+', label: 'Years Experience' },
    { value: '4+', label: 'Major Features Delivered' },
    { value: '50%', label: 'Performance Improvement' }
  ];

  // Interests / Strengths
  interests = [
    '🧠 Problem Solving',
    '🎨 UI/UX Design',
    '🚀 Performance Optimization',
    '🤝 Team Collaboration',
    '📚 Continuous Learning',
    '💻 Clean Code'
  ];

  // Work Experience
  experiences: Job[] = [
    {
      period: 'July 2024 - Present',
      role: 'Full-Stack Developer',
      company: 'Rmes India Private Limited',
      location: 'Hyderabad, India',
      description: 'Developing scalable web applications using Angular, React, and .NET Core. Building intuitive UI/UX workflows and secure REST APIs while collaborating with cross-functional teams in an agile environment.',
      highlights: [
        'Improved frontend performance by 50% through optimized API handling, lazy loading, and component restructuring',
        'Successfully delivered 4 major features independently',
        'Developed scalable web applications using Angular and React with reusable UI components',
        'Designed responsive and intuitive UI/UX workflows, improving user navigation and engagement',
        'Built and consumed secure REST APIs using .NET Core and C#',
        'Integrated PostgreSQL for complex query execution and optimized database operations',
        'Deployed applications and handled environment configurations using Azure services',
        'Implemented UX improvements that enhanced usability and reduced error rates'
      ],
      technologies: ['Angular', 'React', 'TypeScript', '.NET Core', 'C#', 'PostgreSQL', 'Azure', 'Git', 'Azure DevOps']
    }
  ];

  // Projects (You can update these with your actual projects)
  projects: Project[] = [
    {
      title: 'Enterprise Web Application',
      description: 'A scalable enterprise web application built with Angular featuring reusable UI components, optimized performance, and responsive design.',
      type: 'Web Application',
      technologies: ['Angular', 'TypeScript', '.NET Core', 'PostgreSQL'],
      featured: true,
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      emoji: '🏢'
    },
    {
      title: 'React Dashboard',
      description: 'A modern React-based dashboard with intuitive UI/UX workflows, real-time data visualization, and optimized API handling.',
      type: 'Web Application',
      technologies: ['React', 'TypeScript', 'REST APIs', 'Azure'],
      featured: true,
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      emoji: '📊'
    },
    {
      title: 'REST API Backend',
      description: 'Secure REST API backend built with .NET Core and C#, featuring Entity Framework integration and PostgreSQL database.',
      type: 'Backend Service',
      technologies: ['.NET Core', 'C#', 'Entity Framework', 'PostgreSQL'],
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      emoji: '⚙️'
    },
    {
      title: 'Azure Cloud Deployment',
      description: 'Cloud infrastructure setup and application deployment on Microsoft Azure with monitoring and environment configurations.',
      type: 'DevOps',
      technologies: ['Azure', 'Azure DevOps', 'CI/CD', 'Git'],
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      emoji: '☁️'
    },
    {
      title: 'Portfolio Website',
      description: 'A modern, responsive portfolio website built with Angular featuring smooth animations and dark theme design.',
      type: 'Personal Project',
      technologies: ['Angular', 'TypeScript', 'CSS3', 'Responsive Design'],
      githubUrl: 'https://github.com/bmsnr4262',
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      emoji: '🎨'
    },
    {
      title: 'UI Component Library',
      description: 'Reusable UI component library for Angular applications with consistent styling and accessibility features.',
      type: 'Open Source',
      technologies: ['Angular', 'TypeScript', 'SCSS', 'Storybook'],
      gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
      emoji: '🧩'
    }
  ];

  // Certifications
  certifications: Certification[] = [
    { name: 'React JS - Complete Guide', issuer: 'Frontend Web Development (2024)', icon: '⚛️' },
    { name: 'Secure Coding', issuer: 'Principles of Secure Application Development', icon: '🔒' },
    { name: 'Application Security', issuer: 'Complete Guide', icon: '🛡️' }
  ];

  // Skill categories with icons
  skillCategories: SkillCategory[];

  // Social links with icons
  socials: Social[];

  constructor(private sanitizer: DomSanitizer) {
    this.skillCategories = [
      {
        title: 'Frontend',
        icon: this.sanitizer.bypassSecurityTrustHtml('💻'),
        skills: ['Angular', 'React', 'TypeScript', 'HTML5', 'CSS3', 'Responsive Design', 'UI/UX Design']
      },
      {
        title: 'Backend',
        icon: this.sanitizer.bypassSecurityTrustHtml('⚙️'),
        skills: ['.NET Core', 'C#', 'REST APIs', 'Entity Framework']
      },
      {
        title: 'Database',
        icon: this.sanitizer.bypassSecurityTrustHtml('🗄️'),
        skills: ['SQL Server', 'PostgreSQL']
      },
      {
        title: 'Cloud & DevOps',
        icon: this.sanitizer.bypassSecurityTrustHtml('☁️'),
        skills: ['Microsoft Azure', 'Azure DevOps', 'Deployment', 'Monitoring', 'Configurations']
      },
      {
        title: 'Tools',
        icon: this.sanitizer.bypassSecurityTrustHtml('🛠️'),
        skills: ['Git', 'Postman', 'Figma', 'JIRA', 'Agile/Scrum']
      },
      {
        title: 'Strengths',
        icon: this.sanitizer.bypassSecurityTrustHtml('🌟'),
        skills: ['Analytical Thinking', 'Problem Solving', 'Clean Code', 'Teamwork', 'Quick Learner']
      }
    ];

    this.socials = [
      {
        name: 'LinkedIn',
        url: 'https://linkedin.com/in/madhan-sainath-reddy-bommidi-1a0516268',
        icon: this.sanitizer.bypassSecurityTrustHtml(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`)
      },
      {
        name: 'GitHub',
        url: 'https://github.com/bmsnr4262',
        icon: this.sanitizer.bypassSecurityTrustHtml(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>`)
      },
      {
        name: 'Email',
        url: 'mailto:bmsnr4262@gmail.com',
        icon: this.sanitizer.bypassSecurityTrustHtml(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>`)
      },
      {
        name: 'Phone',
        url: 'tel:+918712223899',
        icon: this.sanitizer.bypassSecurityTrustHtml(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`)
      }
    ];
  }

  @HostListener('window:scroll')
  onScroll() {
    this.isScrolled.set(window.scrollY > 50);
  }

  toggleMobileMenu() {
    this.mobileMenuOpen.update(v => !v);
  }

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
  }

  handleSubmit(event: Event) {
    event.preventDefault();
    // Handle form submission - you can integrate with your preferred email service
    // Examples: EmailJS, Formspree, Netlify Forms, or your own backend
    alert('Thank you for your message! I will get back to you soon.');
    (event.target as HTMLFormElement).reset();
  }
}
