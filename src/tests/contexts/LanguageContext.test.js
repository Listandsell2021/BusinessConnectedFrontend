import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { LanguageProvider, useLanguage } from '../../contexts/LanguageContext';

const TestComponent = () => {
  const { language, changeLanguage, t, isGerman, isEnglish } = useLanguage();
  
  return (
    <div>
      <span data-testid="current-language">{language}</span>
      <span data-testid="is-german">{isGerman.toString()}</span>
      <span data-testid="is-english">{isEnglish.toString()}</span>
      <span data-testid="translation">{t('auth.login')}</span>
      <button 
        data-testid="change-to-en" 
        onClick={() => changeLanguage('en')}
      >
        English
      </button>
      <button 
        data-testid="change-to-de" 
        onClick={() => changeLanguage('de')}
      >
        German
      </button>
    </div>
  );
};

describe('LanguageContext', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'navigator', {
      value: { language: 'en-US' },
      writable: true
    });
  });

  it('should throw error when used outside provider', () => {
    const TestComponentWithoutProvider = () => {
      useLanguage();
      return <div>Test</div>;
    };

    expect(() => render(<TestComponentWithoutProvider />)).toThrow(
      'useLanguage must be used within a LanguageProvider'
    );
  });

  it('should initialize with German as default', () => {
    Object.defineProperty(window, 'navigator', {
      value: { language: 'de-DE' },
      writable: true
    });

    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    expect(screen.getByTestId('current-language')).toHaveTextContent('de');
    expect(screen.getByTestId('is-german')).toHaveTextContent('true');
    expect(screen.getByTestId('is-english')).toHaveTextContent('false');
  });

  it('should initialize with English when browser language is English', () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    expect(screen.getByTestId('current-language')).toHaveTextContent('en');
    expect(screen.getByTestId('is-german')).toHaveTextContent('false');
    expect(screen.getByTestId('is-english')).toHaveTextContent('true');
  });

  it('should use saved language from localStorage', () => {
    localStorage.setItem('language', 'de');

    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    expect(screen.getByTestId('current-language')).toHaveTextContent('de');
  });

  it('should change language and save to localStorage', () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    act(() => {
      fireEvent.click(screen.getByTestId('change-to-de'));
    });

    expect(screen.getByTestId('current-language')).toHaveTextContent('de');
    expect(localStorage.setItem).toHaveBeenCalledWith('language', 'de');
  });

  it('should return correct translations', () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    const translationElement = screen.getByTestId('translation');
    expect(translationElement).toHaveTextContent('Login');

    act(() => {
      fireEvent.click(screen.getByTestId('change-to-de'));
    });

    expect(translationElement).toHaveTextContent('Anmelden');
  });

  it('should return key when translation is not found', () => {
    const TestComponentWithMissingKey = () => {
      const { t } = useLanguage();
      return <span data-testid="missing-key">{t('nonexistent.key')}</span>;
    };

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <LanguageProvider>
        <TestComponentWithMissingKey />
      </LanguageProvider>
    );

    expect(screen.getByTestId('missing-key')).toHaveTextContent('nonexistent.key');
    expect(consoleSpy).toHaveBeenCalledWith(
      'Translation key "nonexistent.key" not found for language "en"'
    );

    consoleSpy.mockRestore();
  });

  it('should handle nested translation keys', () => {
    const TestComponentWithNestedKey = () => {
      const { t } = useLanguage();
      return <span data-testid="nested-key">{t('auth.welcomeBack')}</span>;
    };

    render(
      <LanguageProvider>
        <TestComponentWithNestedKey />
      </LanguageProvider>
    );

    expect(screen.getByTestId('nested-key')).toHaveTextContent('Welcome back');
  });

  it('should ignore invalid language values in localStorage', () => {
    localStorage.setItem('language', 'invalid-lang');

    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    expect(screen.getByTestId('current-language')).toHaveTextContent('en');
  });
});