import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../../contexts/LanguageContext';
import { toast } from 'react-hot-toast';
import { formConfigAPI } from '../../../lib/api/api';

// Simple translation helper - basic word mapping
const translationMap = {
  // German to English
  de_to_en: {
    'Umzug': 'Move', 'Umzugsservice': 'Moving Service', 'Umzugsunternehmen': 'Moving Company',
    'Privat': 'Private', 'Geschäft': 'Business', 'Fernumzug': 'Long Distance Move',
    'Spezialtransport': 'Special Transport', 'Zimmer': 'Room', 'Wohnung': 'Apartment',
    'Haus': 'House', 'Etage': 'Floor', 'Erdgeschoss': 'Ground Floor', 'Aufzug': 'Elevator',
    'Straße': 'Street', 'Stadt': 'City', 'Vorname': 'First Name', 'Nachname': 'Last Name',
    'Telefon': 'Phone', 'E-Mail': 'Email', 'Adresse': 'Address', 'Weiter': 'Next',
    'Zurück': 'Back', 'Absenden': 'Submit', 'Bitte': 'Please', 'wählen': 'select',
    'eingeben': 'enter', 'erforderlich': 'required', 'optional': 'optional',
    'Ja': 'Yes', 'Nein': 'No', 'Herr': 'Mr.', 'Frau': 'Mrs.', 'PLZ': 'Postal Code',
    'Transport': 'Transport', 'Verpacken': 'Packing', 'Möbelmontage': 'Furniture Assembly',
    'Lagerung': 'Storage', 'Reinigung': 'Cleaning', 'Entsorgung': 'Disposal',
    'Klavier': 'Piano', 'Halteverbot': 'No Parking', 'Termin': 'Date', 'schnell': 'soon',
    'Monat': 'Month', 'flexibel': 'Flexible', 'Datum': 'Date', 'Kontakt': 'Contact',
    'Datenschutz': 'Privacy', 'Einverständnis': 'Consent', 'Angebot': 'Offer',
    'kostenlos': 'free', 'unverbindlich': 'non-binding', 'Vielen Dank': 'Thank You',
    'Zusammenfassung': 'Summary', 'Anfrage': 'Request', 'Leistungen': 'Services',
    'Größe': 'Size', 'Art': 'Type', 'aktuell': 'current', 'neu': 'new'
  },
  // English to German
  en_to_de: {
    'Move': 'Umzug', 'Moving Service': 'Umzugsservice', 'Moving Company': 'Umzugsunternehmen',
    'Private': 'Privat', 'Business': 'Geschäft', 'Long Distance': 'Fernumzug',
    'Special Transport': 'Spezialtransport', 'Room': 'Zimmer', 'Apartment': 'Wohnung',
    'House': 'Haus', 'Floor': 'Etage', 'Ground Floor': 'Erdgeschoss', 'Elevator': 'Aufzug',
    'Street': 'Straße', 'City': 'Stadt', 'First Name': 'Vorname', 'Last Name': 'Nachname',
    'Phone': 'Telefon', 'Email': 'E-Mail', 'Address': 'Adresse', 'Next': 'Weiter',
    'Back': 'Zurück', 'Submit': 'Absenden', 'Please': 'Bitte', 'select': 'wählen',
    'enter': 'eingeben', 'required': 'erforderlich', 'optional': 'optional',
    'Yes': 'Ja', 'No': 'Nein', 'Mr.': 'Herr', 'Mrs.': 'Frau', 'Postal Code': 'PLZ',
    'Transport': 'Transport', 'Packing': 'Verpacken', 'Furniture Assembly': 'Möbelmontage',
    'Storage': 'Lagerung', 'Cleaning': 'Reinigung', 'Disposal': 'Entsorgung',
    'Piano': 'Klavier', 'No Parking': 'Halteverbot', 'Date': 'Datum', 'soon': 'schnell',
    'Month': 'Monat', 'Flexible': 'flexibel', 'Contact': 'Kontakt',
    'Privacy': 'Datenschutz', 'Consent': 'Einverständnis', 'Offer': 'Angebot',
    'free': 'kostenlos', 'non-binding': 'unverbindlich', 'Thank You': 'Vielen Dank',
    'Summary': 'Zusammenfassung', 'Request': 'Anfrage', 'Services': 'Leistungen',
    'Size': 'Größe', 'Type': 'Art', 'current': 'aktuell', 'new': 'neu'
  }
};

// Auto-translate function
const autoTranslate = (text, fromLang) => {
  if (!text) return '';
  const map = fromLang === 'de' ? translationMap.de_to_en : translationMap.en_to_de;
  let result = text;

  // Sort keys by length (longest first) to avoid partial replacements
  const sortedKeys = Object.keys(map).sort((a, b) => b.length - a.length);

  for (const key of sortedKeys) {
    const regex = new RegExp(key, 'gi');
    result = result.replace(regex, map[key]);
  }

  return result;
};

// Bilingual Input Component
const BilingualInput = ({ label, value, onChange, type = 'text', multiline = false, placeholder }) => {
  const { isGerman } = useLanguage();
  const [activeTab, setActiveTab] = useState('de');

  const handleChange = (lang, newValue) => {
    const updatedValue = { ...value };
    updatedValue[lang] = newValue;

    // Auto-translate to the other language
    const otherLang = lang === 'de' ? 'en' : 'de';
    if (!updatedValue[otherLang] || updatedValue[otherLang] === autoTranslate(value[lang], lang)) {
      updatedValue[otherLang] = autoTranslate(newValue, lang);
    }

    onChange(updatedValue);
  };

  const InputComponent = multiline ? 'textarea' : 'input';

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
        {label}
      </label>
      <div className="flex space-x-1 mb-2">
        <button
          type="button"
          onClick={() => setActiveTab('de')}
          className={`px-3 py-1 text-xs rounded-t-lg transition-colors ${
            activeTab === 'de' ? 'bg-blue-500 text-white' : ''
          }`}
          style={activeTab !== 'de' ? { backgroundColor: 'var(--theme-bg-secondary, #e5e7eb)', color: 'var(--theme-muted)' } : {}}
        >
          DE 🇩🇪
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('en')}
          className={`px-3 py-1 text-xs rounded-t-lg transition-colors ${
            activeTab === 'en' ? 'bg-blue-500 text-white' : ''
          }`}
          style={activeTab !== 'en' ? { backgroundColor: 'var(--theme-bg-secondary, #e5e7eb)', color: 'var(--theme-muted)' } : {}}
        >
          EN 🇬🇧
        </button>
      </div>
      <InputComponent
        type={type}
        value={value?.[activeTab] || ''}
        onChange={(e) => handleChange(activeTab, e.target.value)}
        placeholder={placeholder?.[activeTab] || `Enter ${activeTab.toUpperCase()} text...`}
        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          multiline ? 'min-h-[80px] resize-y' : ''
        }`}
        style={{
          backgroundColor: 'var(--theme-input-bg)',
          borderColor: 'var(--theme-border)',
          color: 'var(--theme-text)'
        }}
        rows={multiline ? 3 : undefined}
      />
      <div className="flex justify-between text-xs" style={{ color: 'var(--theme-muted)' }}>
        <span>
          {activeTab === 'de' ? 'German' : 'English'} version
        </span>
        <span>
          {value?.[activeTab === 'de' ? 'en' : 'de'] ? '✓ Other language filled' : '○ Other language empty'}
        </span>
      </div>
    </div>
  );
};

// Reorder helper buttons component
const ReorderButtons = ({ index, total, onMoveUp, onMoveDown }) => (
  <div className="flex space-x-1">
    <button
      type="button"
      onClick={onMoveUp}
      disabled={index === 0}
      className={`p-1 rounded transition-colors ${index === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
      title="Move up"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    </button>
    <button
      type="button"
      onClick={onMoveDown}
      disabled={index === total - 1}
      className={`p-1 rounded transition-colors ${index === total - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-gray-200 dark:hover:bg-gray-700'}`}
      title="Move down"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  </div>
);

// Delete button component
const DeleteButton = ({ onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
    title={label}
  >
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  </button>
);

// Field type selector component
const FieldTypeSelector = ({ value, onChange, isGerman }) => {
  const fieldTypes = [
    { value: 'text', label: 'Text' },
    { value: 'email', label: 'Email' },
    { value: 'tel', label: isGerman ? 'Telefon' : 'Phone' },
    { value: 'number', label: isGerman ? 'Nummer' : 'Number' },
    { value: 'textarea', label: 'Textarea' },
    { value: 'select', label: 'Select' },
    { value: 'date', label: isGerman ? 'Datum' : 'Date' },
    { value: 'group', label: isGerman ? 'Gruppe' : 'Group' }
  ];

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-2 py-1 text-xs rounded border"
      style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
    >
      {fieldTypes.map(type => (
        <option key={type.value} value={type.value}>{type.label}</option>
      ))}
    </select>
  );
};

// Step Editor Component
const StepEditor = ({ step, stepIndex, onUpdate, onDelete, onMoveUp, onMoveDown, totalSteps, isExpanded, onToggle }) => {
  const { isGerman } = useLanguage();

  const updateStepField = (field, value) => {
    onUpdate(stepIndex, { ...step, [field]: value });
  };

  const updateOption = (optionIndex, field, value) => {
    const newOptions = [...(step.options || [])];
    newOptions[optionIndex] = { ...newOptions[optionIndex], [field]: value };
    updateStepField('options', newOptions);
  };

  const deleteOption = (optionIndex) => {
    if (!window.confirm(isGerman ? 'Option wirklich löschen?' : 'Delete this option?')) return;
    const newOptions = [...(step.options || [])];
    newOptions.splice(optionIndex, 1);
    updateStepField('options', newOptions);
  };

  const moveOption = (fromIndex, direction) => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= (step.options?.length || 0)) return;
    const newOptions = [...(step.options || [])];
    [newOptions[fromIndex], newOptions[toIndex]] = [newOptions[toIndex], newOptions[fromIndex]];
    updateStepField('options', newOptions);
  };

  const updateField = (fieldIndex, field, value) => {
    const newFields = [...(step.fields || [])];
    newFields[fieldIndex] = { ...newFields[fieldIndex], [field]: value };
    updateStepField('fields', newFields);
  };

  const deleteField = (fieldIndex) => {
    if (!window.confirm(isGerman ? 'Feld wirklich löschen?' : 'Delete this field?')) return;
    const newFields = [...(step.fields || [])];
    newFields.splice(fieldIndex, 1);
    updateStepField('fields', newFields);
  };

  const moveField = (fromIndex, direction) => {
    const toIndex = fromIndex + direction;
    if (toIndex < 0 || toIndex >= (step.fields?.length || 0)) return;
    const newFields = [...(step.fields || [])];
    [newFields[fromIndex], newFields[toIndex]] = [newFields[toIndex], newFields[fromIndex]];
    updateStepField('fields', newFields);
  };

  const deleteSubField = (fieldIndex, subIndex) => {
    if (!window.confirm(isGerman ? 'Unterfeld wirklich löschen?' : 'Delete this subfield?')) return;
    const field = step.fields[fieldIndex];
    const newSubFields = [...(field.fields || [])];
    newSubFields.splice(subIndex, 1);
    updateField(fieldIndex, 'fields', newSubFields);
  };

  return (
    <div
      className="border rounded-lg overflow-hidden"
      style={{ borderColor: 'var(--theme-border)' }}
    >
      <div
        className="px-4 py-3 flex items-center justify-between transition-colors hover:bg-gray-50 dark:hover:bg-gray-800"
        style={{ backgroundColor: 'var(--theme-card-bg)' }}
      >
        <button
          type="button"
          onClick={onToggle}
          className="flex-1 flex items-center space-x-3 text-left"
        >
          <span className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
            {stepIndex + 1}
          </span>
          <div>
            <h4 className="font-medium" style={{ color: 'var(--theme-text)' }}>
              {step.title?.de || step.title?.en || `Step ${stepIndex + 1}`}
            </h4>
            <p className="text-xs" style={{ color: 'var(--theme-muted)' }}>
              {step.type} • {step.options?.length || step.fields?.length || 0} items
              {step.showFor && step.showFor.length > 0 && (
                <span className="ml-2 text-blue-500">
                  ({step.showFor.join(', ')})
                </span>
              )}
            </p>
          </div>
        </button>
        <div className="flex items-center space-x-2">
          <ReorderButtons
            index={stepIndex}
            total={totalSteps}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
          />
          <DeleteButton onClick={onDelete} label={isGerman ? 'Schritt löschen' : 'Delete step'} />
          <button
            type="button"
            onClick={onToggle}
            className="p-1"
          >
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: 'var(--theme-muted)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 space-y-4 border-t" style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg)' }}>
              {/* Step Title */}
              <div className="grid grid-cols-1 gap-4">
                <BilingualInput
                  label={isGerman ? 'Schritt-Titel' : 'Step Title'}
                  value={step.title}
                  onChange={(val) => updateStepField('title', val)}
                />
              </div>



              {/* Options (for radio/checkbox and other types with options) */}
              {(step.type === 'radio' || step.type === 'checkbox' || step.type === 'schedule' || step.type === 'businessServices' || step.type === 'transportType' || step.type === 'services' || step.type === 'propertyType') && (
                <div className="space-y-3">
                  <h5 className="font-medium text-sm" style={{ color: 'var(--theme-text)' }}>
                    {isGerman ? 'Optionen' : 'Options'} ({step.options?.length || 0})
                  </h5>
                  {step.options?.map((option, optIndex) => (
                    <div
                      key={option.id}
                      className="p-3 rounded-lg border space-y-2"
                      style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: 'var(--theme-bg-secondary)', color: 'var(--theme-muted)' }}>
                            ID: {option.id}
                          </span>
                          <input
                            type="text"
                            value={option.icon || ''}
                            onChange={(e) => updateOption(optIndex, 'icon', e.target.value)}
                            placeholder="Icon"
                            className="w-16 px-2 py-1 text-center text-lg border rounded"
                            style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-border)' }}
                          />
                        </div>
                        <div className="flex items-center space-x-1">
                          <ReorderButtons
                            index={optIndex}
                            total={step.options.length}
                            onMoveUp={() => moveOption(optIndex, -1)}
                            onMoveDown={() => moveOption(optIndex, 1)}
                          />
                          <DeleteButton onClick={() => deleteOption(optIndex)} label={isGerman ? 'Option löschen' : 'Delete option'} />
                        </div>
                      </div>
                      <BilingualInput
                        label={isGerman ? 'Label' : 'Label'}
                        value={option.label}
                        onChange={(val) => updateOption(optIndex, 'label', val)}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Fields (for form type and other types with fields) */}
              {(step.type === 'form' || step.type === 'schedule' || step.type === 'contact' || step.type === 'transportType' || step.type === 'services' || step.type === 'propertyType') && step.fields && step.fields.length > 0 && (
                <div className="space-y-3">
                  <h5 className="font-medium text-sm" style={{ color: 'var(--theme-text)' }}>
                    {isGerman ? 'Formularfelder' : 'Form Fields'} ({step.fields?.length || 0})
                  </h5>
                  {step.fields?.map((field, fieldIndex) => (
                    <div
                      key={field.id}
                      className="p-3 rounded-lg border space-y-2"
                      style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FieldTypeSelector
                            value={field.type}
                            onChange={(val) => updateField(fieldIndex, 'type', val)}
                            isGerman={isGerman}
                          />
                          <span className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: 'var(--theme-bg-secondary)', color: 'var(--theme-muted)' }}>
                            {field.id}
                          </span>
                          <label className="flex items-center space-x-1 text-xs">
                            <input
                              type="checkbox"
                              checked={field.required || false}
                              onChange={(e) => updateField(fieldIndex, 'required', e.target.checked)}
                              className="rounded"
                            />
                            <span className="text-red-500">{isGerman ? 'Pflicht' : 'Required'}</span>
                          </label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <ReorderButtons
                            index={fieldIndex}
                            total={step.fields.length}
                            onMoveUp={() => moveField(fieldIndex, -1)}
                            onMoveDown={() => moveField(fieldIndex, 1)}
                          />
                          <DeleteButton onClick={() => deleteField(fieldIndex)} label={isGerman ? 'Feld löschen' : 'Delete field'} />
                        </div>
                      </div>
                      <BilingualInput
                        label={isGerman ? 'Label' : 'Label'}
                        value={field.label}
                        onChange={(val) => updateField(fieldIndex, 'label', val)}
                      />
                      <BilingualInput
                        label={isGerman ? 'Platzhalter' : 'Placeholder'}
                        value={field.placeholder || { de: '', en: '' }}
                        onChange={(val) => updateField(fieldIndex, 'placeholder', val)}
                      />

                      {/* Nested fields for group type */}
                      {field.type === 'group' && (
                        <div className="ml-4 mt-2 pl-4 border-l-2 space-y-2" style={{ borderColor: 'var(--theme-border)' }}>
                          <p className="text-xs font-medium" style={{ color: 'var(--theme-muted)' }}>
                            {isGerman ? 'Unterfelder' : 'Subfields'} ({field.fields?.length || 0}):
                          </p>
                          {field.fields?.map((subField, subIndex) => (
                            <div key={subField.id} className="p-2 rounded space-y-2" style={{ backgroundColor: 'var(--theme-bg-secondary, #f3f4f6)' }}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <FieldTypeSelector
                                    value={subField.type || 'text'}
                                    onChange={(val) => {
                                      const newSubFields = [...field.fields];
                                      newSubFields[subIndex] = { ...newSubFields[subIndex], type: val };
                                      updateField(fieldIndex, 'fields', newSubFields);
                                    }}
                                    isGerman={isGerman}
                                  />
                                  <span className="text-xs font-mono" style={{ color: 'var(--theme-muted)' }}>{subField.id}</span>
                                </div>
                                <DeleteButton onClick={() => deleteSubField(fieldIndex, subIndex)} label={isGerman ? 'Unterfeld löschen' : 'Delete subfield'} />
                              </div>
                              <BilingualInput
                                label={`${isGerman ? 'Label' : 'Label'}`}
                                value={subField.label}
                                onChange={(val) => {
                                  const newSubFields = [...field.fields];
                                  newSubFields[subIndex] = { ...newSubFields[subIndex], label: val };
                                  updateField(fieldIndex, 'fields', newSubFields);
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Options for select type */}
                      {field.type === 'select' && (
                        <div className="ml-4 mt-2 pl-4 border-l-2 space-y-2" style={{ borderColor: 'var(--theme-border)' }}>
                          <p className="text-xs font-medium" style={{ color: 'var(--theme-muted)' }}>
                            {isGerman ? 'Auswahloptionen' : 'Select Options'} ({field.options?.length || 0}):
                          </p>
                          {field.options?.map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center space-x-2 p-2 rounded" style={{ backgroundColor: 'var(--theme-bg-secondary, #f3f4f6)' }}>
                              <input
                                type="text"
                                value={opt.value || ''}
                                onChange={(e) => {
                                  const newOptions = [...(field.options || [])];
                                  newOptions[optIdx] = { ...newOptions[optIdx], value: e.target.value };
                                  updateField(fieldIndex, 'options', newOptions);
                                }}
                                placeholder="Value"
                                className="flex-1 px-2 py-1 text-xs border rounded"
                                style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                              />
                              <input
                                type="text"
                                value={opt.label?.de || ''}
                                onChange={(e) => {
                                  const newOptions = [...(field.options || [])];
                                  newOptions[optIdx] = { ...newOptions[optIdx], label: { ...newOptions[optIdx].label, de: e.target.value } };
                                  updateField(fieldIndex, 'options', newOptions);
                                }}
                                placeholder="DE Label"
                                className="flex-1 px-2 py-1 text-xs border rounded"
                                style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                              />
                              <input
                                type="text"
                                value={opt.label?.en || ''}
                                onChange={(e) => {
                                  const newOptions = [...(field.options || [])];
                                  newOptions[optIdx] = { ...newOptions[optIdx], label: { ...newOptions[optIdx].label, en: e.target.value } };
                                  updateField(fieldIndex, 'options', newOptions);
                                }}
                                placeholder="EN Label"
                                className="flex-1 px-2 py-1 text-xs border rounded"
                                style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                              />
                              <DeleteButton
                                onClick={() => {
                                  const newOptions = [...(field.options || [])];
                                  newOptions.splice(optIdx, 1);
                                  updateField(fieldIndex, 'options', newOptions);
                                }}
                                label={isGerman ? 'Option löschen' : 'Delete option'}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Live Form Preview Component
const FormPreview = ({ config, previewLang, selectedMoveType, onMoveTypeChange }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState({});

  // Filter steps based on selected move type
  const filteredSteps = React.useMemo(() => {
    if (!config?.steps) return [];
    return config.steps.filter(step => {
      // If no showFor, show for all move types
      if (!step.showFor || step.showFor.length === 0) return true;
      // Otherwise, check if current move type is in showFor
      return step.showFor.includes(selectedMoveType);
    });
  }, [config?.steps, selectedMoveType]);

  const step = filteredSteps?.[currentStep];

  // Reset to valid step if current step is out of bounds
  React.useEffect(() => {
    if (filteredSteps && currentStep >= filteredSteps.length) {
      setCurrentStep(Math.max(0, filteredSteps.length - 1));
    }
  }, [filteredSteps?.length, currentStep]);

  // Reset step when move type changes
  React.useEffect(() => {
    setCurrentStep(0);
  }, [selectedMoveType]);

  if (!config || !config.steps || config.steps.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        {previewLang === 'de' ? 'Keine Formkonfiguration geladen' : 'No form configuration loaded'}
      </div>
    );
  }

  if (!step) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        {previewLang === 'de' ? 'Schritt nicht gefunden' : 'Step not found'}
      </div>
    );
  }

  const getText = (bilingualText) => {
    if (!bilingualText) return '';
    return bilingualText[previewLang] || bilingualText.de || bilingualText.en || '';
  };

  const handleOptionClick = (optionId) => {
    // For moveType step, change the global move type selection
    if (step.id === 'moveType') {
      onMoveTypeChange(optionId);
      return;
    }
    // Radio-like types (single selection)
    if (step.type === 'radio' || step.type === 'schedule' || step.type === 'transportType' || step.type === 'propertyType') {
      setSelectedOptions(prev => ({ ...prev, [step.id]: optionId }));
    // Checkbox-like types (multi selection)
    } else if (step.type === 'checkbox' || step.type === 'businessServices' || step.type === 'services') {
      setSelectedOptions(prev => {
        const current = prev[step.id] || [];
        if (current.includes(optionId)) {
          return { ...prev, [step.id]: current.filter(id => id !== optionId) };
        }
        return { ...prev, [step.id]: [...current, optionId] };
      });
    }
  };

  const isOptionSelected = (optionId) => {
    // For moveType step, always show the current selectedMoveType as selected
    if (step.id === 'moveType') {
      return optionId === selectedMoveType;
    }
    // Radio-like types (single selection)
    if (step.type === 'radio' || step.type === 'schedule' || step.type === 'transportType' || step.type === 'propertyType') {
      return selectedOptions[step.id] === optionId;
    }
    // Checkbox-like types (multi selection)
    return (selectedOptions[step.id] || []).includes(optionId);
  };

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        backgroundColor: 'var(--theme-card-bg)',
        borderColor: 'var(--theme-border)'
      }}
    >
      {/* Move Type Selector */}
      <div className="p-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg-secondary, #f9fafb)' }}>
        <span className="text-xs font-medium" style={{ color: 'var(--theme-muted)' }}>
          {previewLang === 'de' ? 'Vorschau für:' : 'Preview for:'}
        </span>
        <div className="flex gap-1">
          {[
            { id: 'private', label: { de: 'Privat', en: 'Private' } },
            { id: 'business', label: { de: 'Gewerbe', en: 'Business' } },
            { id: 'longDistance', label: { de: 'Fern', en: 'Long' } },
            { id: 'specialTransport', label: { de: 'Spezial', en: 'Special' } }
          ].map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => onMoveTypeChange(type.id)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                selectedMoveType === type.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {type.label[previewLang]}
            </button>
          ))}
        </div>
      </div>

      {/* Form Header */}
      <div className="p-4 border-b" style={{ borderColor: 'var(--theme-border)' }}>
        <h3 className="text-lg font-bold" style={{ color: 'var(--theme-text)' }}>
          {getText(config.title)}
        </h3>
        <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
          {getText(config.description)}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--theme-border)' }}>
        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--theme-muted)' }}>
          <span>{previewLang === 'de' ? 'Schritt' : 'Step'} {currentStep + 1} / {filteredSteps.length}</span>
          <span>{Math.round(((currentStep + 1) / filteredSteps.length) * 100)}%</span>
        </div>
        <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-blue-500 transition-all"
            style={{ width: `${((currentStep + 1) / filteredSteps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Content */}
      <div className="p-4 max-h-[500px] overflow-y-auto">
        <h4 className="text-lg font-semibold mb-4" style={{ color: 'var(--theme-text)' }}>
          {getText(step.title)}
          {step.required && <span className="text-red-500 ml-1">*</span>}
        </h4>

        {/* Options Preview - for radio, checkbox, and other types with options */}
        {(step.type === 'radio' || step.type === 'checkbox' || step.type === 'schedule' || step.type === 'businessServices' || step.type === 'transportType' || step.type === 'services' || step.type === 'propertyType') && step.options && (
          <div className="space-y-2">
            {step.options.length === 0 ? (
              <p className="text-center py-4 text-sm italic" style={{ color: 'var(--theme-muted)' }}>
                {previewLang === 'de' ? 'Keine Optionen definiert' : 'No options defined'}
              </p>
            ) : (
              step.options.map((option) => (
                <div
                  key={option.id}
                  onClick={() => handleOptionClick(option.id)}
                  className={`p-3 rounded-lg border flex items-center space-x-3 cursor-pointer transition-all ${
                    isOptionSelected(option.id) ? 'border-blue-500 bg-blue-500/10' : 'hover:border-blue-400'
                  }`}
                  style={{ borderColor: isOptionSelected(option.id) ? '#3b82f6' : 'var(--theme-border)' }}
                >
                  <div className={`w-5 h-5 rounded-${step.type === 'radio' || step.type === 'schedule' || step.type === 'transportType' || step.type === 'propertyType' ? 'full' : 'md'} border-2 flex items-center justify-center ${
                    isOptionSelected(option.id) ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                  }`}>
                    {isOptionSelected(option.id) && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      {option.icon && <span className="text-lg">{option.icon}</span>}
                      <span className={`font-medium ${isOptionSelected(option.id) ? 'text-blue-500' : ''}`} style={{ color: isOptionSelected(option.id) ? '#3b82f6' : 'var(--theme-text)' }}>
                        {getText(option.label)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Contact Step Preview */}
        {step.type === 'contact' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {step.fields?.find(f => f.id === 'salutation')?.options?.map((opt) => (
                <button key={opt.id} className="px-3 py-2 rounded-lg border text-sm" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}>
                  {getText(opt.label)}
                </button>
              ))}
            </div>
            {step.fields?.filter(f => f.id !== 'salutation' && f.type !== 'select').map((field) => (
              <div key={field.id}>
                <label className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                  {getText(field.label)}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <input
                  type={field.type || 'text'}
                  placeholder={getText(field.placeholder)}
                  className="w-full h-10 px-3 rounded-lg border mt-1"
                  style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                  readOnly
                />
              </div>
            ))}
          </div>
        )}

        {/* Further Info Step Preview */}
        {step.type === 'furtherInfo' && (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: 'var(--theme-muted)' }}>
              {previewLang === 'de'
                ? 'Gibt es besondere Anweisungen oder Anforderungen?'
                : 'Are there any special instructions or requirements?'}
            </p>
            <textarea
              placeholder={previewLang === 'de' ? 'Besondere Anweisungen eingeben...' : 'Enter special instructions...'}
              className="w-full px-3 py-2 rounded-lg border min-h-[100px]"
              style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
              readOnly
            />
          </div>
        )}

        {/* Form Fields Preview - Show ALL fields */}
        {step.type === 'form' && step.fields && (
          <div className="space-y-3">
            {step.fields.length === 0 ? (
              <p className="text-center py-4 text-sm italic" style={{ color: 'var(--theme-muted)' }}>
                {previewLang === 'de' ? 'Keine Felder definiert' : 'No fields defined'}
              </p>
            ) : (
              step.fields.map((field) => (
                <div key={field.id}>
                  {field.type === 'group' ? (
                    <div className="p-3 rounded-lg border" style={{ borderColor: 'var(--theme-border)' }}>
                      <p className="font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                        {getText(field.label)}
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        {field.fields?.map((subField) => (
                          <div key={subField.id}>
                            <label className="text-xs" style={{ color: 'var(--theme-muted)' }}>
                              {getText(subField.label)}
                            </label>
                            <input
                              type={subField.type || 'text'}
                              placeholder={getText(subField.placeholder)}
                              className="w-full h-8 px-2 text-sm rounded border"
                              style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                              readOnly
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : field.type === 'select' ? (
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                        {getText(field.label)}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <select
                        className="w-full h-10 px-3 rounded-lg border mt-1"
                        style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                      >
                        <option value="">{getText(field.placeholder) || (previewLang === 'de' ? 'Bitte wählen...' : 'Please select...')}</option>
                        {field.options?.map((opt, idx) => (
                          <option key={idx} value={opt.value}>{getText(opt.label)}</option>
                        ))}
                      </select>
                    </div>
                  ) : field.type === 'textarea' ? (
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                        {getText(field.label)}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <textarea
                        placeholder={getText(field.placeholder)}
                        className="w-full px-3 py-2 rounded-lg border mt-1 min-h-[80px]"
                        style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                        readOnly
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                        {getText(field.label)}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <input
                        type={field.type || 'text'}
                        placeholder={getText(field.placeholder)}
                        className="w-full h-10 px-3 rounded-lg border mt-1"
                        style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                        readOnly
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="p-4 border-t flex justify-between" style={{ borderColor: 'var(--theme-border)' }}>
        <button
          type="button"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className={`px-4 py-2 rounded-lg transition-colors ${
            currentStep === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
          style={{ color: 'var(--theme-text)' }}
        >
          {getText(config.buttonText?.back) || (previewLang === 'de' ? 'Zurück' : 'Back')}
        </button>
        <div className="flex space-x-1 items-center">
          {filteredSteps.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentStep(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                idx === currentStep ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setCurrentStep(Math.min(filteredSteps.length - 1, currentStep + 1))}
          disabled={currentStep === filteredSteps.length - 1}
          className={`px-4 py-2 rounded-lg text-white transition-colors ${
            currentStep === filteredSteps.length - 1
              ? 'bg-green-500'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {currentStep === filteredSteps.length - 1
            ? (getText(config.buttonText?.submit) || (previewLang === 'de' ? 'Absenden' : 'Submit'))
            : (getText(config.buttonText?.next) || (previewLang === 'de' ? 'Weiter' : 'Next'))
          }
        </button>
      </div>
    </div>
  );
};

// Main FormSettings Component
const FormSettings = () => {
  const { isGerman } = useLanguage();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewLang, setPreviewLang] = useState('de');
  const [expandedSteps, setExpandedSteps] = useState({});
  const [activeSection, setActiveSection] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedMoveType, setSelectedMoveType] = useState('private');

  // Filter steps based on selected move type for editing
  const filteredStepsForEdit = React.useMemo(() => {
    if (!config?.steps) return [];
    return config.steps.filter(step => {
      // If no showFor, show for all move types
      if (!step.showFor || step.showFor.length === 0) return true;
      // Otherwise, check if current move type is in showFor
      return step.showFor.includes(selectedMoveType);
    });
  }, [config?.steps, selectedMoveType]);

  // Get the original index in config.steps for a filtered step
  const getOriginalStepIndex = (filteredIndex) => {
    const filteredStep = filteredStepsForEdit[filteredIndex];
    return config?.steps?.findIndex(s => s.id === filteredStep.id) ?? -1;
  };

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      console.log('Loading form config...');
      const response = await formConfigAPI.getMovingConfig();
      console.log('Form config response:', response);
      if (response.data.success) {
        console.log('Setting config:', response.data.data);
        setConfig(response.data.data);
      } else {
        console.error('API returned success=false:', response.data);
        toast.error(isGerman ? 'Fehler beim Laden der Formkonfiguration' : 'Error loading form configuration');
      }
    } catch (error) {
      console.error('Error loading form config:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error(isGerman ? 'Fehler beim Laden der Formkonfiguration' : 'Error loading form configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await formConfigAPI.updateMovingConfig(config);
      if (response.data.success) {
        setConfig(response.data.data);
        setHasChanges(false);
        toast.success(isGerman ? 'Formkonfiguration gespeichert!' : 'Form configuration saved!');
      }
    } catch (error) {
      console.error('Error saving form config:', error);
      toast.error(isGerman ? 'Fehler beim Speichern' : 'Error saving configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!window.confirm(isGerman ? 'Möchten Sie wirklich alle Änderungen zurücksetzen?' : 'Are you sure you want to reset all changes?')) {
      return;
    }

    try {
      setSaving(true);
      const response = await formConfigAPI.resetMovingConfig();
      if (response.data.success) {
        setConfig(response.data.data);
        setHasChanges(false);
        toast.success(isGerman ? 'Formular zurückgesetzt!' : 'Form reset to default!');
      }
    } catch (error) {
      console.error('Error resetting form config:', error);
      toast.error(isGerman ? 'Fehler beim Zurücksetzen' : 'Error resetting configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = useCallback((field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  }, []);

  const updateStep = useCallback((stepIndex, stepData) => {
    setConfig(prev => {
      const newSteps = [...prev.steps];
      newSteps[stepIndex] = stepData;
      return { ...prev, steps: newSteps };
    });
    setHasChanges(true);
  }, []);

  const toggleStep = (stepIndex) => {
    setExpandedSteps(prev => ({
      ...prev,
      [stepIndex]: !prev[stepIndex]
    }));
  };

  const deleteStep = useCallback((stepIndex) => {
    const { isGerman: german } = { isGerman };
    if (!window.confirm(german ? 'Schritt wirklich löschen?' : 'Delete this step?')) return;
    setConfig(prev => {
      const newSteps = [...prev.steps];
      newSteps.splice(stepIndex, 1);
      return { ...prev, steps: newSteps };
    });
    setHasChanges(true);
  }, [isGerman]);

  const moveStep = useCallback((fromIndex, direction) => {
    const toIndex = fromIndex + direction;
    setConfig(prev => {
      if (toIndex < 0 || toIndex >= prev.steps.length) return prev;
      const newSteps = [...prev.steps];
      [newSteps[fromIndex], newSteps[toIndex]] = [newSteps[toIndex], newSteps[fromIndex]];
      return { ...prev, steps: newSteps };
    });
    setHasChanges(true);
    // Update expanded state to follow the moved step
    setExpandedSteps(prev => {
      const newExpanded = { ...prev };
      const wasFromExpanded = newExpanded[fromIndex];
      const wasToExpanded = newExpanded[toIndex];
      newExpanded[fromIndex] = wasToExpanded;
      newExpanded[toIndex] = wasFromExpanded;
      return newExpanded;
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p style={{ color: 'var(--theme-text)' }}>
            {isGerman ? 'Formkonfiguration laden...' : 'Loading form configuration...'}
          </p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-lg font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
            {isGerman ? 'Formkonfiguration konnte nicht geladen werden' : 'Failed to load form configuration'}
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--theme-muted)' }}>
            {isGerman ? 'Bitte versuchen Sie es erneut oder prüfen Sie die Serververbindung.' : 'Please try again or check the server connection.'}
          </p>
          <p className="text-xs mb-4 font-mono" style={{ color: 'var(--theme-muted)' }}>
            API: {typeof window !== 'undefined' ? window.location.protocol + '//' + window.location.hostname + ':5000/api/form-config/moving' : ''}
          </p>
          <button
            onClick={loadConfig}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            {isGerman ? 'Erneut versuchen' : 'Try Again'}
          </button>
        </div>
      </div>
    );
  }

  const sections = [
    { id: 'general', label: isGerman ? 'Allgemein' : 'General' },
    { id: 'header', label: 'Header' },
    { id: 'footer', label: 'Footer' },
    { id: 'steps', label: isGerman ? 'Formularschritte' : 'Form Steps' },
    { id: 'buttons', label: isGerman ? 'Buttons' : 'Buttons' },
    { id: 'messages', label: isGerman ? 'Nachrichten' : 'Messages' }
  ];

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full max-w-[1800px] mx-auto">
      {/* Left: Editor Panel */}
      <div className="flex-1 min-w-0 xl:w-[60%] space-y-4">
        {/* Header with Save Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 pb-4 border-b" style={{ borderColor: 'var(--theme-border)' }}>
          <div>
            <h2 className="text-2xl font-bold flex items-center space-x-3" style={{ color: 'var(--theme-text)' }}>
              <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <span>{isGerman ? 'Formular-Editor' : 'Form Editor'}</span>
            </h2>
            <p className="text-sm mt-1 ml-13" style={{ color: 'var(--theme-muted)' }}>
              {isGerman ? 'Version' : 'Version'} {config?.version || 1} • {hasChanges ? (
                <span className="text-orange-500 font-medium">{isGerman ? 'Ungespeicherte Änderungen' : 'Unsaved changes'}</span>
              ) : (
                <span className="text-green-500">{isGerman ? 'Gespeichert' : 'Saved'}</span>
              )}
            </p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={handleReset}
              disabled={saving}
              className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors border hover:bg-gray-100 dark:hover:bg-gray-800"
              style={{ color: 'var(--theme-text)', borderColor: 'var(--theme-border)' }}
            >
              <span className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>{isGerman ? 'Zurücksetzen' : 'Reset'}</span>
              </span>
            </button>
            <motion.button
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium text-white transition-colors ${
                saving || !hasChanges ? 'opacity-50 cursor-not-allowed bg-gray-400' : 'bg-blue-500 hover:bg-blue-600 shadow-md'
              }`}
              whileHover={!saving && hasChanges ? { scale: 1.02 } : {}}
              whileTap={!saving && hasChanges ? { scale: 0.98 } : {}}
            >
              {saving ? (
                <span className="flex items-center space-x-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>{isGerman ? 'Speichern...' : 'Saving...'}</span>
                </span>
              ) : (
                <span className="flex items-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                  </svg>
                  <span>{isGerman ? 'Speichern' : 'Save'}</span>
                </span>
              )}
            </motion.button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex space-x-1 p-1 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary, #f3f4f6)' }}>
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-md transition-all ${
                activeSection === section.id
                  ? 'bg-white dark:bg-gray-800 text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>

        {/* Section Content */}
        <div className="min-h-[500px] max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
          <AnimatePresence mode="wait">
            {activeSection === 'general' && (
              <motion.div
                key="general"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div
                  className="p-4 rounded-lg border"
                  style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}
                >
                  <h3 className="font-medium mb-4" style={{ color: 'var(--theme-text)' }}>
                    {isGerman ? 'Formular-Kopfzeile' : 'Form Header'}
                  </h3>
                  <div className="space-y-4">
                    <BilingualInput
                      label={isGerman ? 'Formular-Titel' : 'Form Title'}
                      value={config?.title}
                      onChange={(val) => updateConfig('title', val)}
                    />
                    <BilingualInput
                      label={isGerman ? 'Formular-Beschreibung' : 'Form Description'}
                      value={config?.description}
                      onChange={(val) => updateConfig('description', val)}
                      multiline
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'header' && (
              <motion.div
                key="header"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Logo Settings */}
                <div
                  className="p-4 rounded-lg border"
                  style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}
                >
                  <h3 className="font-medium mb-4" style={{ color: 'var(--theme-text)' }}>
                    {isGerman ? 'Logo-Einstellungen' : 'Logo Settings'}
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-text)' }}>
                        {isGerman ? 'Logo URL' : 'Logo URL'}
                      </label>
                      <input
                        type="text"
                        value={config?.header?.logoUrl || ''}
                        onChange={(e) => updateConfig('header', { ...config?.header, logoUrl: e.target.value })}
                        placeholder="/logo/your-logo.svg"
                        className="w-full px-3 py-2 border rounded-lg"
                        style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                      />
                    </div>
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="showTrustpilot"
                        checked={config?.header?.showTrustpilot || false}
                        onChange={(e) => updateConfig('header', { ...config?.header, showTrustpilot: e.target.checked })}
                        className="rounded"
                      />
                      <label htmlFor="showTrustpilot" className="text-sm" style={{ color: 'var(--theme-text)' }}>
                        {isGerman ? 'Trustpilot anzeigen' : 'Show Trustpilot'}
                      </label>
                    </div>
                  </div>
                </div>

                {/* Header Stats */}
                <div
                  className="p-4 rounded-lg border"
                  style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}
                >
                  <h3 className="font-medium mb-4" style={{ color: 'var(--theme-text)' }}>
                    {isGerman ? 'Header-Statistiken' : 'Header Stats'}
                  </h3>
                  <div className="space-y-4">
                    {/* Moving Services Arranged */}
                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary, #f3f4f6)' }}>
                      <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                        {isGerman ? 'Vermittelte Umzugsservices' : 'Moving Services Arranged'}
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--theme-muted)' }}>
                            {isGerman ? 'Wert' : 'Value'}
                          </label>
                          <input
                            type="text"
                            value={config?.header?.stats?.movingServicesArranged?.value || ''}
                            onChange={(e) => updateConfig('header', {
                              ...config?.header,
                              stats: {
                                ...config?.header?.stats,
                                movingServicesArranged: {
                                  ...config?.header?.stats?.movingServicesArranged,
                                  value: e.target.value
                                }
                              }
                            })}
                            placeholder="29,365+"
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                          />
                        </div>
                        <BilingualInput
                          label={isGerman ? 'Beschriftung' : 'Label'}
                          value={config?.header?.stats?.movingServicesArranged?.label || { de: '', en: '' }}
                          onChange={(val) => updateConfig('header', {
                            ...config?.header,
                            stats: {
                              ...config?.header?.stats,
                              movingServicesArranged: {
                                ...config?.header?.stats?.movingServicesArranged,
                                label: val
                              }
                            }
                          })}
                        />
                      </div>
                    </div>

                    {/* Moving Professionals */}
                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary, #f3f4f6)' }}>
                      <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                        {isGerman ? 'Umzugsprofis' : 'Moving Professionals'}
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--theme-muted)' }}>
                            {isGerman ? 'Wert' : 'Value'}
                          </label>
                          <input
                            type="text"
                            value={config?.header?.stats?.movingProfessionals?.value || ''}
                            onChange={(e) => updateConfig('header', {
                              ...config?.header,
                              stats: {
                                ...config?.header?.stats,
                                movingProfessionals: {
                                  ...config?.header?.stats?.movingProfessionals,
                                  value: e.target.value
                                }
                              }
                            })}
                            placeholder="82+"
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                          />
                        </div>
                        <BilingualInput
                          label={isGerman ? 'Beschriftung' : 'Label'}
                          value={config?.header?.stats?.movingProfessionals?.label || { de: '', en: '' }}
                          onChange={(val) => updateConfig('header', {
                            ...config?.header,
                            stats: {
                              ...config?.header?.stats,
                              movingProfessionals: {
                                ...config?.header?.stats?.movingProfessionals,
                                label: val
                              }
                            }
                          })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'footer' && (
              <motion.div
                key="footer"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Footer Stats */}
                <div
                  className="p-4 rounded-lg border"
                  style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}
                >
                  <h3 className="font-medium mb-4" style={{ color: 'var(--theme-text)' }}>
                    {isGerman ? 'Footer-Statistiken' : 'Footer Stats'}
                  </h3>
                  <div className="space-y-4">
                    {/* Last Requested */}
                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary, #f3f4f6)' }}>
                      <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                        {isGerman ? 'Zuletzt angefragt' : 'Last Requested'}
                      </h4>
                      <div className="space-y-3">
                        <BilingualInput
                          label={isGerman ? 'Beschriftung' : 'Label'}
                          value={config?.footer?.stats?.lastRequested?.label || { de: '', en: '' }}
                          onChange={(val) => updateConfig('footer', {
                            ...config?.footer,
                            stats: {
                              ...config?.footer?.stats,
                              lastRequested: {
                                ...config?.footer?.stats?.lastRequested,
                                label: val
                              }
                            }
                          })}
                        />
                        <BilingualInput
                          label={isGerman ? 'Wert' : 'Value'}
                          value={config?.footer?.stats?.lastRequested?.value || { de: '', en: '' }}
                          onChange={(val) => updateConfig('footer', {
                            ...config?.footer,
                            stats: {
                              ...config?.footer?.stats,
                              lastRequested: {
                                ...config?.footer?.stats?.lastRequested,
                                value: val
                              }
                            }
                          })}
                        />
                      </div>
                    </div>

                    {/* Submitted Today */}
                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary, #f3f4f6)' }}>
                      <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                        {isGerman ? 'Heute abgeschickt' : 'Submitted Today'}
                      </h4>
                      <div className="space-y-3">
                        <BilingualInput
                          label={isGerman ? 'Beschriftung' : 'Label'}
                          value={config?.footer?.stats?.submittedToday?.label || { de: '', en: '' }}
                          onChange={(val) => updateConfig('footer', {
                            ...config?.footer,
                            stats: {
                              ...config?.footer?.stats,
                              submittedToday: {
                                ...config?.footer?.stats?.submittedToday,
                                label: val
                              }
                            }
                          })}
                        />
                        <div>
                          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--theme-muted)' }}>
                            {isGerman ? 'Anzahl' : 'Count'}
                          </label>
                          <input
                            type="text"
                            value={config?.footer?.stats?.submittedToday?.value || ''}
                            onChange={(e) => updateConfig('footer', {
                              ...config?.footer,
                              stats: {
                                ...config?.footer?.stats,
                                submittedToday: {
                                  ...config?.footer?.stats?.submittedToday,
                                  value: e.target.value
                                }
                              }
                            })}
                            placeholder="498"
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                          />
                        </div>
                        <BilingualInput
                          label={isGerman ? 'Suffix (z.B. "Anfragen")' : 'Suffix (e.g. "requests")'}
                          value={config?.footer?.stats?.submittedToday?.suffix || { de: '', en: '' }}
                          onChange={(val) => updateConfig('footer', {
                            ...config?.footer,
                            stats: {
                              ...config?.footer?.stats,
                              submittedToday: {
                                ...config?.footer?.stats?.submittedToday,
                                suffix: val
                              }
                            }
                          })}
                        />
                      </div>
                    </div>

                    {/* Secure & Protected */}
                    <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--theme-bg-secondary, #f3f4f6)' }}>
                      <h4 className="text-sm font-medium mb-3" style={{ color: 'var(--theme-text)' }}>
                        {isGerman ? 'Sicher & geschützt' : 'Secure & Protected'}
                      </h4>
                      <div className="space-y-3">
                        <BilingualInput
                          label={isGerman ? 'Beschriftung' : 'Label'}
                          value={config?.footer?.stats?.secureProtected?.label || { de: '', en: '' }}
                          onChange={(val) => updateConfig('footer', {
                            ...config?.footer,
                            stats: {
                              ...config?.footer?.stats,
                              secureProtected: {
                                ...config?.footer?.stats?.secureProtected,
                                label: val
                              }
                            }
                          })}
                        />
                        <BilingualInput
                          label={isGerman ? 'Wert' : 'Value'}
                          value={config?.footer?.stats?.secureProtected?.value || { de: '', en: '' }}
                          onChange={(val) => updateConfig('footer', {
                            ...config?.footer,
                            stats: {
                              ...config?.footer?.stats,
                              secureProtected: {
                                ...config?.footer?.stats?.secureProtected,
                                value: val
                              }
                            }
                          })}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Links */}
                <div
                  className="p-4 rounded-lg border"
                  style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}
                >
                  <h3 className="font-medium mb-4" style={{ color: 'var(--theme-text)' }}>
                    {isGerman ? 'Footer-Links' : 'Footer Links'}
                  </h3>
                  <div className="space-y-3">
                    {(config?.footer?.links || []).map((link, index) => (
                      <div
                        key={link.id || index}
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: 'var(--theme-bg-secondary, #f3f4f6)' }}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-mono px-2 py-1 rounded" style={{ backgroundColor: 'var(--theme-card-bg)', color: 'var(--theme-muted)' }}>
                            ID: {link.id}
                          </span>
                          <DeleteButton
                            onClick={() => {
                              if (!window.confirm(isGerman ? 'Link wirklich löschen?' : 'Delete this link?')) return;
                              const newLinks = [...(config?.footer?.links || [])];
                              newLinks.splice(index, 1);
                              updateConfig('footer', { ...config?.footer, links: newLinks });
                            }}
                            label={isGerman ? 'Link löschen' : 'Delete link'}
                          />
                        </div>
                        <div className="space-y-3">
                          <BilingualInput
                            label={isGerman ? 'Beschriftung' : 'Label'}
                            value={link.label || { de: '', en: '' }}
                            onChange={(val) => {
                              const newLinks = [...(config?.footer?.links || [])];
                              newLinks[index] = { ...newLinks[index], label: val };
                              updateConfig('footer', { ...config?.footer, links: newLinks });
                            }}
                          />
                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--theme-muted)' }}>
                              URL
                            </label>
                            <input
                              type="text"
                              value={link.url || ''}
                              onChange={(e) => {
                                const newLinks = [...(config?.footer?.links || [])];
                                newLinks[index] = { ...newLinks[index], url: e.target.value };
                                updateConfig('footer', { ...config?.footer, links: newLinks });
                              }}
                              placeholder="/page-url"
                              className="w-full px-3 py-2 border rounded-lg text-sm"
                              style={{ backgroundColor: 'var(--theme-input-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Copyright */}
                <div
                  className="p-4 rounded-lg border"
                  style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}
                >
                  <h3 className="font-medium mb-4" style={{ color: 'var(--theme-text)' }}>
                    Copyright
                  </h3>
                  <BilingualInput
                    label={isGerman ? 'Copyright-Text' : 'Copyright Text'}
                    value={config?.footer?.copyright || { de: '', en: '' }}
                    onChange={(val) => updateConfig('footer', { ...config?.footer, copyright: val })}
                  />
                </div>
              </motion.div>
            )}

            {activeSection === 'steps' && (
              <motion.div
                key="steps"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {/* Move Type Selector for Filtering Steps */}
                <div className="p-3 rounded-lg border mb-4" style={{ backgroundColor: 'var(--theme-bg-secondary, #f9fafb)', borderColor: 'var(--theme-border)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: 'var(--theme-text)' }}>
                      {isGerman ? 'Schritte anzeigen für:' : 'Show steps for:'}
                    </span>
                    <div className="flex gap-2">
                      {[
                        { id: 'private', label: { de: 'Privat', en: 'Private' } },
                        { id: 'business', label: { de: 'Gewerbe', en: 'Business' } },
                        { id: 'longDistance', label: { de: 'Fernumzug', en: 'Long-distance' } },
                        { id: 'specialTransport', label: { de: 'Spezial', en: 'Special' } }
                      ].map((type) => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setSelectedMoveType(type.id)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            selectedMoveType === type.id
                              ? 'bg-blue-500 text-white'
                              : 'bg-white text-gray-600 border hover:bg-gray-50'
                          }`}
                          style={selectedMoveType !== type.id ? { borderColor: 'var(--theme-border)' } : {}}
                        >
                          {type.label[isGerman ? 'de' : 'en']}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs mt-2" style={{ color: 'var(--theme-muted)' }}>
                    {isGerman
                      ? `${filteredStepsForEdit.length} Schritte für diesen Umzugstyp`
                      : `${filteredStepsForEdit.length} steps for this move type`}
                  </p>
                </div>

                {filteredStepsForEdit.map((step, filteredIndex) => {
                  const originalIndex = getOriginalStepIndex(filteredIndex);
                  return (
                    <StepEditor
                      key={step.id}
                      step={step}
                      stepIndex={originalIndex}
                      totalSteps={filteredStepsForEdit.length}
                      onUpdate={updateStep}
                      onDelete={() => deleteStep(originalIndex)}
                      onMoveUp={() => moveStep(originalIndex, -1)}
                      onMoveDown={() => moveStep(originalIndex, 1)}
                      isExpanded={expandedSteps[originalIndex]}
                      onToggle={() => toggleStep(originalIndex)}
                    />
                  );
                })}
              </motion.div>
            )}

            {activeSection === 'buttons' && (
              <motion.div
                key="buttons"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <div
                  className="p-4 rounded-lg border"
                  style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}
                >
                  <h3 className="font-medium mb-4" style={{ color: 'var(--theme-text)' }}>
                    {isGerman ? 'Button-Texte' : 'Button Text'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <BilingualInput
                      label={isGerman ? 'Weiter-Button' : 'Next Button'}
                      value={config?.buttonText?.next}
                      onChange={(val) => updateConfig('buttonText', { ...config?.buttonText, next: val })}
                    />
                    <BilingualInput
                      label={isGerman ? 'Zurück-Button' : 'Back Button'}
                      value={config?.buttonText?.back}
                      onChange={(val) => updateConfig('buttonText', { ...config?.buttonText, back: val })}
                    />
                    <BilingualInput
                      label={isGerman ? 'Absenden-Button' : 'Submit Button'}
                      value={config?.buttonText?.submit}
                      onChange={(val) => updateConfig('buttonText', { ...config?.buttonText, submit: val })}
                    />
                    <BilingualInput
                      label={isGerman ? 'Wird gesendet...' : 'Submitting...'}
                      value={config?.buttonText?.submitting}
                      onChange={(val) => updateConfig('buttonText', { ...config?.buttonText, submitting: val })}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activeSection === 'messages' && (
              <motion.div
                key="messages"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                {/* Summary Text */}
                <div
                  className="p-4 rounded-lg border"
                  style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}
                >
                  <h3 className="font-medium mb-4" style={{ color: 'var(--theme-text)' }}>
                    {isGerman ? 'Zusammenfassungs-Seite' : 'Summary Page'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <BilingualInput
                      label={isGerman ? 'Titel' : 'Title'}
                      value={config?.summaryText?.title}
                      onChange={(val) => updateConfig('summaryText', { ...config?.summaryText, title: val })}
                    />
                    <BilingualInput
                      label={isGerman ? 'Untertitel' : 'Subtitle'}
                      value={config?.summaryText?.subtitle}
                      onChange={(val) => updateConfig('summaryText', { ...config?.summaryText, subtitle: val })}
                    />
                  </div>
                </div>

                {/* Thank You Text */}
                <div
                  className="p-4 rounded-lg border"
                  style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}
                >
                  <h3 className="font-medium mb-4" style={{ color: 'var(--theme-text)' }}>
                    {isGerman ? 'Danke-Seite' : 'Thank You Page'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <BilingualInput
                      label={isGerman ? 'Titel' : 'Title'}
                      value={config?.thankYouText?.title}
                      onChange={(val) => updateConfig('thankYouText', { ...config?.thankYouText, title: val })}
                    />
                    <BilingualInput
                      label={isGerman ? 'Nachricht' : 'Message'}
                      value={config?.thankYouText?.message}
                      onChange={(val) => updateConfig('thankYouText', { ...config?.thankYouText, message: val })}
                      multiline
                    />
                  </div>
                </div>

                {/* Validation Messages */}
                <div
                  className="p-4 rounded-lg border"
                  style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}
                >
                  <h3 className="font-medium mb-4" style={{ color: 'var(--theme-text)' }}>
                    {isGerman ? 'Validierungsmeldungen' : 'Validation Messages'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <BilingualInput
                      label={isGerman ? 'Pflichtfeld' : 'Required Field'}
                      value={config?.validationMessages?.required}
                      onChange={(val) => updateConfig('validationMessages', { ...config?.validationMessages, required: val })}
                    />
                    <BilingualInput
                      label={isGerman ? 'E-Mail ungültig' : 'Invalid Email'}
                      value={config?.validationMessages?.email}
                      onChange={(val) => updateConfig('validationMessages', { ...config?.validationMessages, email: val })}
                    />
                    <BilingualInput
                      label={isGerman ? 'Telefon ungültig' : 'Invalid Phone'}
                      value={config?.validationMessages?.phone}
                      onChange={(val) => updateConfig('validationMessages', { ...config?.validationMessages, phone: val })}
                    />
                    <BilingualInput
                      label={isGerman ? 'Option wählen' : 'Select Option'}
                      value={config?.validationMessages?.selectOption}
                      onChange={(val) => updateConfig('validationMessages', { ...config?.validationMessages, selectOption: val })}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right: Live Preview Panel */}
      <div className="w-full xl:w-[500px] 2xl:w-[550px] flex-shrink-0">
        <div
          className="sticky top-4 p-5 rounded-xl border shadow-lg"
          style={{ backgroundColor: 'var(--theme-card-bg)', borderColor: 'var(--theme-border)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg" style={{ color: 'var(--theme-text)' }}>
              {isGerman ? 'Live-Vorschau' : 'Live Preview'}
            </h3>
            <div className="flex space-x-1">
              <button
                type="button"
                onClick={() => setPreviewLang('de')}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  previewLang === 'de' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                DE
              </button>
              <button
                type="button"
                onClick={() => setPreviewLang('en')}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  previewLang === 'en' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                EN
              </button>
            </div>
          </div>
          <FormPreview
            config={config}
            previewLang={previewLang}
            selectedMoveType={selectedMoveType}
            onMoveTypeChange={setSelectedMoveType}
          />
        </div>
      </div>
    </div>
  );
};

export default FormSettings;
