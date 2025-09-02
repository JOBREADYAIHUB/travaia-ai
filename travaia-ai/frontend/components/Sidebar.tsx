import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { XIcon, LogoutIcon, UserCircleIcon, ChevronLeftIcon, ChevronRightIcon } from './icons/Icons';
import { ThemeSelector } from './ThemeSelector';
import LanguageSwitcher from './common/LanguageSwitcher';
import '../styles/toddler-glassmorphism.css';
import styles from './Sidebar.module.css';

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  isRecruiterView: boolean;
}

interface NavItem {
  pathKey: string;
  label: string;
  icon: React.ReactNode;
  color: string;
}

const Sidebar: React.FC<SidebarProps> = ({
  isSidebarOpen,
  setIsSidebarOpen,
  isRecruiterView,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { currentUser, logout } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const navLabels = {
    dashboard: t('dashboard'),
    jobApplicationTracker: t('jobApplicationTracker'),
    resumeBuilder: t('resumeBuilder'),
    mockInterview: t('mockInterview'),
    documentManager: t('documentManager'),
    documentArtisan: t('documentArtisan'),
    analyticsProgress: t('analyticsProgress'),
    userProfile: t('myProfile'),
    recruiterDashboard: t('recruiterDashboard'),
    candidateSimulations: t('candidateSimulations'),
    bulkInterviewAssignment: t('bulkInterviewAssignment'),
    customEvaluationRubrics: t('customEvaluationRubrics'),
    aiPoweredShortlisting: t('aiPoweredShortlisting'),
    aiSuite: t('aiSuite'),
    logoutButton: t('logoutButton'),
    toddlerUiDemo: t('toddlerUiDemo'),
  };

  const candidateNavItems: NavItem[] = [
    { pathKey: 'routes.dashboard', label: navLabels.dashboard, icon: '🏠', color: 'var(--toddler-red)' },
    { pathKey: 'routes.jobs', label: navLabels.jobApplicationTracker, icon: '💼', color: 'var(--toddler-orange)' },
    { pathKey: 'routes.resume-builder', label: navLabels.resumeBuilder, icon: '📄', color: 'var(--toddler-yellow)' },
    { pathKey: 'routes.interview', label: navLabels.mockInterview, icon: '🎤', color: 'var(--toddler-green)' },
    { pathKey: 'routes.documents', label: navLabels.documentManager, icon: '📁', color: 'var(--toddler-blue)' },
    { pathKey: 'routes.document-artisan', label: navLabels.documentArtisan, icon: '✨', color: 'var(--toddler-indigo)' },
    { pathKey: 'routes.analytics', label: navLabels.analyticsProgress, icon: '📊', color: 'var(--toddler-purple)' },
    { pathKey: 'routes.toddler-ui-demo', label: navLabels.toddlerUiDemo, icon: '✨', color: 'var(--toddler-teal)' },
  ];

  const recruiterNavItems: NavItem[] = [
    { pathKey: 'routes.recruiter.dashboard', label: navLabels.recruiterDashboard, icon: '🏠', color: 'var(--toddler-red)' },
    { pathKey: 'routes.recruiter.simulations', label: navLabels.candidateSimulations, icon: '👥', color: 'var(--toddler-orange)' },
    { pathKey: 'routes.recruiter.assignments', label: navLabels.bulkInterviewAssignment, icon: '📋', color: 'var(--toddler-yellow)' },
    { pathKey: 'routes.recruiter.rubrics', label: navLabels.customEvaluationRubrics, icon: '⚙️', color: 'var(--toddler-green)' },
    { pathKey: 'routes.recruiter.shortlisting', label: navLabels.aiPoweredShortlisting, icon: '🔍', color: 'var(--toddler-blue)' },
  ];

  const navItems = isRecruiterView ? recruiterNavItems : candidateNavItems;

  const isActive = (pathKey: string) => {
    // Handle hardcoded paths vs translation keys
    const path = pathKey.startsWith('routes.') ? t(pathKey) : pathKey;
    const translatedPath = `/${i18n.language}/${path}`;
    return location.pathname.includes(translatedPath);
  };

  const handleNavigate = (pathKey: string) => {
    // Handle hardcoded paths vs translation keys
    const path = pathKey.startsWith('routes.') ? t(pathKey) : pathKey;
    const translatedPath = `/${i18n.language}/${path}`;
    navigate(translatedPath);
    
    if (window.innerWidth < 768) {
      setIsSidebarOpen(false);
    }
  };

  // Position classes based on RTL/LTR
  const sidebarPositionClasses = i18n.dir() === 'rtl' ? 'right-0' : 'left-0';
  
  // Transform classes based on RTL/LTR and sidebar open state
  const sidebarTransformClasses = i18n.dir() === 'rtl' 
    ? isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
    : isSidebarOpen ? 'translate-x-0' : '-translate-x-full';
  const sidebarBorderClass = i18n.dir() === 'rtl' ? 'border-l' : 'border-r';

  // Width classes based on collapsed state
  const sidebarWidthClasses = isCollapsed
    ? 'w-20 sm:w-20'
    : 'w-72 sm:w-64';

  // Mobile top navigation bar shown when sidebar is collapsed/hidden on small screens
  const TopNavBar = () => (
    <div className="fixed top-0 left-0 right-0 z-30 md:hidden bg-white/80 dark:bg-dark_card_bg/80 backdrop-blur-md shadow-sm py-2 px-4 flex items-center justify-between">
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        aria-label={isSidebarOpen ? t('closeSidebar') : t('openSidebar')}
      >
        {isSidebarOpen ? 
          <XIcon className="w-6 h-6" /> : 
          <div className="text-2xl">🍔</div> /* Toddler-like hamburger menu */
        }
      </button>
      
      <div className="flex items-center space-x-3">
        <div className="md:hidden">
          <ThemeSelector />
        </div>
        <div className="md:hidden">
          <LanguageSwitcher dropdownPosition="bottom" showLabel={false} />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Show top nav bar only when sidebar is collapsed on small screens */}
      {(isCollapsed || !isSidebarOpen) && <TopNavBar />}
      
      <aside
        id="main-nav-sidebar"
        className={`${sidebarWidthClasses} bg-base_100 dark:bg-dark_card_bg text-neutral-700 dark:text-gray-100 p-3 space-y-2 flex flex-col
                  fixed inset-y-0 ${sidebarPositionClasses} z-40 transform transition-all duration-300 ease-in-out
                  md:translate-x-0 md:static md:shadow-lg ${sidebarBorderClass}
                  ${sidebarTransformClasses} md:flex ${i18n.dir() === 'rtl' ? 'flex-row-reverse' : ''}`}
        aria-label="Main navigation"
      >
        {/* Sidebar Header */}
        <div className="flex items-center overflow-hidden">
          {!isCollapsed && (
            <img
              src="https://firebasestorage.googleapis.com/v0/b/travaia-e1310.firebasestorage.app/o/appfiles%2Ftravaia_logo.png?alt=media&token=ce97e3bc-44e2-4e84-9a9d-d42c66f0b193"
              alt="Travaia Logo"
              className="object-contain transition-all duration-300 h-[54px] w-[200px] flex-shrink-0 drop-shadow-sm"
            />
          )}
          
          <div className="flex items-center ml-auto">
            {/* Collapse toggle button */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors hidden md:flex"
              aria-label={isCollapsed ? t('expandSidebar') : t('collapseSidebar')}
              aria-expanded={!isCollapsed}
            >
              {isCollapsed ? (
                <ChevronRightIcon className="w-5 h-5 text-neutral-700 dark:text-gray-300" />
              ) : (
                <ChevronLeftIcon className="w-5 h-5 text-neutral-700 dark:text-gray-300" />
              )}
            </button>
            
            {/* Mobile close button */}
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors md:hidden"
              aria-label={t('closeSidebar')}
            >
              <XIcon className="w-5 h-5 text-neutral-700 dark:text-gray-300" />
            </button>
          </div>
        </div>
        
        {/* Green separator line */}
        <div className="h-px bg-green-500 w-full mb-4 opacity-70 shadow-[0_1px_3px_rgba(0,255,0,0.2)]" />

        {/* Navigation Items */}
        <nav className="flex-grow overflow-y-auto sidebar-nav-scroll">
          <ul className="space-y-1.5">
            {navItems.map((item) => (
              <li key={item.pathKey}>
                <button
                  onClick={() => handleNavigate(item.pathKey)}
                  className={`w-full flex items-center px-3 py-2.5 rounded-xl transition-all duration-300
                    ${isCollapsed ? 'justify-center' : 'space-x-3'} 
                    ${isActive(item.pathKey) ? 'transform scale-[1.02]' : ''}`}
                  aria-current={isActive(item.pathKey) ? 'page' : undefined}
                >
                  <div
                    className={`${styles.navigationIcon} ${styles[`navigationIcon--${item.pathKey}`]} ${
                      isActive(item.pathKey) ? `${styles['navigationIcon--active']} glass-bounce` : ''
                    }`}
                  >
                    <div
                      className={`${styles.iconContent} ${isActive(item.pathKey) ? styles['iconContent--active'] : ''}`}
                      aria-hidden="true"
                    >
                      {item.icon}
                    </div>
                    
                    {/* Decorative inner circle */}
                    <div
                      className={`${styles.decorativeCircle} ${isActive(item.pathKey) ? styles['decorativeCircle--active'] : ''}`}
                      aria-hidden="true"
                    />
                  </div>
                  
                  {!isCollapsed && (
                    <span className="text-base font-medium truncate">
                      {item.label}
                    </span>
                  )}
                  
                  {/* Active indicator dot */}
                  {isActive(item.pathKey) && (
                    <div
                      className={`ml-auto ${styles.activeIndicator}`}
                      aria-hidden="true"
                    />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Profile Section */}
        <div className="px-2">
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-base_200 dark:hover:bg-slate-700/50 transition-all duration-200"
              aria-expanded={profileDropdownOpen}
              aria-haspopup="true"
              aria-controls="profile-dropdown"
            >
              <div 
                className={`relative ${styles.userAvatar} flex items-center justify-center text-white`}
              >
                {currentUser?.avatarUrl ? (
                  <img 
                    src={currentUser.avatarUrl} 
                    alt={currentUser.displayName || 'User profile'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  currentUser?.displayName ? (
                    <span className="text-lg font-medium">
                      {currentUser.displayName.charAt(0).toUpperCase()}
                    </span>
                  ) : (
                    <UserCircleIcon className="w-6 h-6 text-white" />
                  )
                )}
              </div>
              {!isCollapsed && (
                <div className="flex flex-col text-left">
                  <span className="text-base font-medium truncate max-w-[150px]">
                    {currentUser?.displayName || 'User'}
                  </span>
                  <span className="text-sm text-neutral-500 dark:text-gray-400 truncate max-w-[150px]">
                    {currentUser?.email || ''}
                  </span>
                </div>
              )}
            </button>
            
            {/* Profile Dropdown */}
            {profileDropdownOpen && (
              <div 
                ref={profileDropdownRef}
                className="absolute bottom-full left-0 mb-2 w-56 rounded-lg bg-white dark:bg-dark_card_bg shadow-lg ring-1 ring-black/5 dark:ring-white/10 z-50"
                role="menu"
                aria-orientation="vertical"
                aria-expanded="true"
                aria-labelledby="user-menu-button"
              >
                <button
                  onClick={() => {
                    handleNavigate('routes.profile');
                    setProfileDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center space-x-2"
                  role="menuitem"
                >
                  <UserCircleIcon className="w-4 h-4" />
                  <span>{navLabels.userProfile}</span>
                </button>
                
                {/* DEBUG: Firebase Token Button - Remove in production */}
                <button
                  onClick={async () => {
                    try {
                      const { getAuth } = await import('firebase/auth');
                      const auth = getAuth();
                      if (auth.currentUser) {
                        const token = await auth.currentUser.getIdToken();
                        // Copy to clipboard
                        await navigator.clipboard.writeText(token);
                        alert('Firebase ID Token copied to clipboard!\n\nToken (first 50 chars): ' + token.substring(0, 50) + '...');
                        console.log('Firebase ID Token:', token);
                      } else {
                        alert('No authenticated user found');
                      }
                    } catch (error) {
                      console.error('Error getting Firebase token:', error);
                      alert('Error getting Firebase token: ' + error);
                    }
                    setProfileDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center space-x-2 border-t border-gray-200 dark:border-gray-600"
                  role="menuitem"
                >
                  <span className="text-sm">🔑</span>
                  <span>Copy Firebase Token (DEBUG)</span>
                </button>
                
                <button
                  onClick={() => {
                    logout();
                    setProfileDropdownOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-slate-700 flex items-center space-x-2 border-t border-gray-200 dark:border-gray-600"
                  role="menuitem"
                >
                  <LogoutIcon className="w-4 h-4" />
                  <span>{navLabels.logoutButton}</span>
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Theme and Language selectors at the bottom */}
        <div
          className={`mt-auto pt-3 border-t border-gray-200 dark:border-neutral-700 space-y-4 ${
            i18n.dir() === 'rtl' ? 'text-right' : 'text-left'
          }`}
        >
          {/* Theme and Language selectors - display based on collapsed state */}
          {isCollapsed ? (
            <div className="px-2 mb-2 flex flex-col items-center gap-2">
              <div className="w-full flex justify-center">
                <ThemeSelector />
              </div>
              <div className="w-full flex justify-center">
                <LanguageSwitcher dropdownPosition="top" showLabel={false} />
              </div>
            </div>
          ) : (
            <div className="px-2 mb-2">
              <div className="flex flex-row items-center justify-between gap-2">
                <div className="flex-1 flex justify-center">
                  <ThemeSelector />
                </div>
                <div className="flex-1 flex justify-center">
                  <LanguageSwitcher dropdownPosition="top" showLabel={false} />
                </div>
              </div>
            </div>
          )}
          
          {!isCollapsed && (
            <div className="text-center text-[0.75rem] text-neutral-500 dark:text-gray-400/80 p-1.5">
              Travaia &copy; {new Date().getFullYear()}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;