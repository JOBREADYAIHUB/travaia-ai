import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  HomeIcon,
  BriefcaseIcon,
  MicIcon,
  FolderIcon,
  BarChartIcon,
} from './icons/Icons';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassButton } from './design-system';

interface NavItem {
  pathKey: string;
  labelKey: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  subItems?: SubNavItem[];
  bgColorClass?: string;
}

interface SubNavItem {
  pathKey: string;
  labelKey: string;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
}

const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const navItems: NavItem[] = [
    {
      pathKey: 'routes.dashboard',
      labelKey: 'dashboard',
      icon: HomeIcon,
      bgColorClass: 'bg-blue-500/20',
    },
    {
      pathKey: 'routes.jobs',
      labelKey: 'jobApplicationTracker',
      icon: BriefcaseIcon,
      bgColorClass: 'bg-green-500/20',
    },
    {
      pathKey: 'routes.documents',
      labelKey: 'documentManager',
      icon: FolderIcon,
      bgColorClass: 'bg-yellow-500/20',
      subItems: [
        { pathKey: 'routes.resume', labelKey: 'resumeBuilder' },
        { pathKey: 'routes.document-editor', labelKey: 'documentEditor' },
      ],
    },
    {
      pathKey: 'routes.interview',
      labelKey: 'mockInterview',
      icon: MicIcon,
      bgColorClass: 'bg-purple-500/20',
    },
    {
      pathKey: 'routes.analytics',
      labelKey: 'analytics',
      icon: BarChartIcon,
      bgColorClass: 'bg-red-500/20',
    },
  ];

  const isActive = (pathKey: string) => {
    const translatedPath = `/${i18n.language}/${t(pathKey)}`;
    return location.pathname.startsWith(translatedPath);
  };

  const toggleExpand = (pathKey: string) => {
    setExpandedItem(expandedItem === pathKey ? null : pathKey);
  };

  const handleNavigate = (pathKey: string) => {
    const path = `/${i18n.language}/${t(pathKey)}`;
    navigate(path);
    setExpandedItem(null);
  };

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white/20 dark:bg-dark_card_bg/10 backdrop-blur-lg shadow-lg py-2 px-4 flex items-center justify-around ${i18n.dir() === 'rtl' ? 'rtl' : ''}`}
      aria-label={t('common.navigation')}
    >
      {navItems.map((item) => (
        <div key={item.pathKey} className="relative flex flex-col w-1/5">
          <div className="flex flex-col items-center">
            <GlassButton
              onClick={() =>
                item.subItems && item.subItems.length > 0
                  ? toggleExpand(item.pathKey)
                  : handleNavigate(item.pathKey)
              }
              className={`w-12 h-12 rounded-full flex items-center justify-center ${item.bgColorClass || 'bg-blue-500/20'} ${
                isActive(item.pathKey) || expandedItem === item.pathKey
                  ? 'ring-2 ring-primary/50'
                  : ''
              }`}
              aria-label={t(item.labelKey)}
            >
              <item.icon className="w-6 h-6" />
            </GlassButton>
            <span
              className="text-[10px] mt-1 font-medium truncate max-w-full px-1
              ${isActive(item.pathKey) || expandedItem === item.pathKey
                ? 'text-primary dark:text-blue-400'
                : 'text-neutral dark:text-gray-400'}
            "
            >
              {t(item.labelKey)}
            </span>
          </div>

          <AnimatePresence>
            {item.subItems &&
              item.subItems.length > 0 &&
              expandedItem === item.pathKey && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute bottom-full mb-2 bg-white dark:bg-dark_card_bg rounded-md shadow-lg p-2 min-w-[120px] z-40"
                  role="menu"
                  aria-labelledby={item.pathKey}
                >
                  {item.subItems.map((subItem) => (
                    <button
                      key={subItem.pathKey}
                      onClick={() => handleNavigate(subItem.pathKey)}
                      className={`block w-full text-left px-3 py-2 rounded-md text-sm ${isActive(subItem.pathKey) ? 'bg-primary/10 text-primary dark:text-blue-400' : 'text-neutral dark:text-gray-400 hover:bg-primary/5'}`}
                      aria-current={
                        isActive(subItem.pathKey) ? 'page' : undefined
                      }
                    >
                      {subItem.icon && (
                        <subItem.icon className="w-4 h-4 mr-2" />
                      )}
                      <span>{t(subItem.labelKey)}</span>
                    </button>
                  ))}
                </motion.div>
              )}
          </AnimatePresence>
        </div>
      ))}
    </nav>
  );
};

export default BottomNavigation;
