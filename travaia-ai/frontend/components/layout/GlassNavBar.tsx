import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { useLocalization } from '../../contexts/LocalizationContext';
import { LanguageSelector } from '../common/LanguageSelector';
import '../../styles/glassmorphism.css';

interface NavItem {
  key: string;
  translationKey: string;
  to: string;
  icon?: string;
}

interface GlassNavBarProps {
  logo?: string;
  logoAlt?: string;
  navItems?: NavItem[];
}

/**
 * A modern glassmorphic navigation bar with full accessibility and internationalization support.
 * Implements responsive design and supports both LTR and RTL layouts.
 */
export const GlassNavBar: React.FC<GlassNavBarProps> = ({
  logo = '/logo.svg',
  logoAlt = 'Travaia',
  navItems = [],
}) => {
  const { t } = useTranslation();
  const { language } = useLocalization();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Default navigation items if none provided
  const defaultNavItems: NavItem[] = [
    {
      key: 'dashboard',
      translationKey: 'routes.dashboard',
      to: '/dashboard',
      icon: '📊',
    },
    { key: 'jobs', translationKey: 'routes.jobs', to: '/jobs', icon: '💼' },
    {
      key: 'interview',
      translationKey: 'routes.interview',
      to: '/interview',
      icon: '🎙️',
    },
    {
      key: 'analytics',
      translationKey: 'routes.analytics',
      to: '/analytics',
      icon: '📈',
    },
  ];

  const items = navItems.length > 0 ? navItems : defaultNavItems;

  return (
    <nav
      className="glass-nav sticky top-0 z-50"
      aria-label={t('common.mainNavigation')}
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <div className="flex items-center flex-shrink-0">
            <Link
              to="/"
              className="flex items-center"
              aria-label={t('common.homePage')}
            >
              <img
                src={logo}
                alt={logoAlt}
                className="h-8 w-auto"
                width="32"
                height="32"
              />
              <span className="ms-2 text-xl font-semibold text-gray-100">
                {t('aiSuite')}
              </span>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-4">
              {items.map((item) => (
                <Link
                  key={item.key}
                  to={item.to}
                  className="px-3 py-2 rounded-md text-sm font-medium glass-nav-item flex items-center"
                  aria-current={
                    location.pathname.startsWith(item.to) ? 'page' : undefined
                  }
                >
                  {item.icon && (
                    <span
                      className="me-2"
                      aria-hidden="true"
                      role="presentation"
                    >
                      {item.icon}
                    </span>
                  )}
                  {t(item.translationKey)}
                </Link>
              ))}
            </div>
          </div>

          {/* Right side items - common across all device sizes */}
          <div className="flex items-center">
            <LanguageSelector />

            {/* Profile dropdown could go here */}

            {/* Mobile menu button */}
            <button
              type="button"
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md glass-button ms-2"
              aria-controls="mobile-menu"
              aria-expanded="false"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <span className="sr-only">{t('common.toggleMenu')}</span>
              {/* Icon for menu */}
              {!mobileMenuOpen ? (
                <svg
                  className="h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              ) : (
                <svg
                  className="h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden glass-dropdown-menu" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {items.map((item) => (
              <Link
                key={item.key}
                to={item.to}
                className="block px-3 py-2 rounded-md text-base font-medium glass-nav-item flex items-center"
                aria-current={
                  location.pathname.startsWith(item.to) ? 'page' : undefined
                }
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.icon && (
                  <span className="me-2" aria-hidden="true" role="presentation">
                    {item.icon}
                  </span>
                )}
                {t(item.translationKey)}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Decorative glass elements */}
      <div className="glass-decoration-circle" aria-hidden="true"></div>
      <div className="glass-decoration-line" aria-hidden="true"></div>
    </nav>
  );
};

export default GlassNavBar;
