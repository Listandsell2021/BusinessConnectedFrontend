import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import Button from './Button';

const LanguageToggle = () => {
  const { language, changeLanguage, isGerman } = useLanguage();

  return (
    <div className="flex items-center space-x-1">
      <Button
        onClick={() => changeLanguage('de')}
        variant={isGerman ? 'primary' : 'secondary'}
        size="sm"
        className="text-sm font-medium"
      >
        🇩🇪 DE
      </Button>
      
      <Button
        onClick={() => changeLanguage('en')}
        variant={!isGerman ? 'primary' : 'secondary'}
        size="sm"
        className="text-sm font-medium"
      >
        🇺🇸 EN
      </Button>
    </div>
  );
};

export default LanguageToggle;