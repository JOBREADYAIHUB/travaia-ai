import React, { useState, useEffect, useRef } from 'react';
import { JobApplication, ApplicationStatus, SpeechGrammar } from '../types';
import { useLocalization } from '../contexts/LocalizationContext'; // Changed
import {
  suggestJobTitles,
  streamAnalyzeJobDescriptionContent,
} from '../services/geminiService';
import { LightbulbIcon, MicrophoneIcon } from './icons/Icons';
import { LoadingState } from './design-system';
import { Timestamp } from 'firebase/firestore';

declare global {
  interface SpeechRecognitionEventMap {
    audiostart: Event;
    soundstart: Event;
    speechstart: Event;
    speechend: Event;
    soundend: Event;
    audioend: Event;
    result: SpeechRecognitionResultEvent;
    nomatch: SpeechRecognitionResultEvent;
    error: SpeechRecognitionErrorEvent;
    start: Event;
    end: Event;
  }

  interface SpeechRecognition extends EventTarget {
    grammars: SpeechGrammarList;
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    maxAlternatives: number;
    serviceURI?: string;

    start(): void;
    stop(): void;
    abort(): void;

    onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
    onresult:
      | ((this: SpeechRecognition, ev: SpeechRecognitionResultEvent) => any)
      | null;
    ennomatch:
      | ((this: SpeechRecognition, ev: SpeechRecognitionResultEvent) => any)
      | null;
    onerror:
      | ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any)
      | null;
    onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
    onend: ((this: SpeechRecognition, ev: Event) => any) | null;

    addEventListener<K extends keyof SpeechRecognitionEventMap>(
      type: K,
      listener: (
        this: SpeechRecognition,
        ev: SpeechRecognitionEventMap[K],
      ) => any,
      options?: boolean | AddEventListenerOptions,
    ): void;
    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions,
    ): void;
    removeEventListener<K extends keyof SpeechRecognitionEventMap>(
      type: K,
      listener: (
        this: SpeechRecognition,
        ev: SpeechRecognitionEventMap[K],
      ) => any,
      options?: boolean | EventListenerOptions,
    ): void;
    removeEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions,
    ): void;
  }

  interface SpeechGrammarList {
    readonly length: number;
    item(index: number): SpeechGrammar;
    addFromURI(src: string, weight?: number): void;
    addFromString(string: string, weight?: number): void;
  }
  interface SpeechRecognitionResult {
    readonly isFinal: boolean;
    readonly length: number;
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }
  interface SpeechRecognitionResultList {
    readonly length: number;
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }
  interface SpeechRecognitionAlternative {
    readonly transcript: string;
    readonly confidence: number;
  }

  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
  interface SpeechRecognitionResultEvent extends Event {
    readonly resultIndex: number;
    readonly results: SpeechRecognitionResultList;
  }
  interface SpeechRecognitionErrorEvent extends Event {
    readonly error:
      | 'no-speech'
      | 'aborted'
      | 'audio-capture'
      | 'network'
      | 'not-allowed'
      | 'service-not-allowed'
      | 'bad-grammar'
      | 'language-not-supported';
    readonly message: string;
  }
}

interface JobFormProps {
  application?: JobApplication | null;
  onSubmit: (application: JobApplication) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  submitError?: string | null;
  onClearError?: () => void;
}

const getSafeDateString = (dateVal: string | Timestamp | undefined): string => {
  if (!dateVal) return '';
  if (typeof dateVal === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateVal)) {
      return dateVal;
    }
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
    return '';
  }
  if (typeof (dateVal as Timestamp)?.toDate === 'function') {
    return (dateVal as Timestamp).toDate().toISOString().split('T')[0];
  }
  return '';
};

const JobForm: React.FC<JobFormProps> = ({
  application,
  onSubmit,
  onCancel,
}) => {
  const { translate, isRtl, language } = useLocalization(); // Changed

  const formLabels = {
    companyName: translate('companyName'),
    jobTitle: translate('jobTitle'),
    applicationDate: translate('applicationDate'),
    status: translate('status'),
    url: translate('url'),
    salary: translate('salary'),
    location: translate('location'),
    reminderDate: translate('reminderDate'),
    notes: translate('notes'),
    jobDescription: translate('jobDescription'),
    fieldRequired: translate('fieldRequired'),
    invalidDate: translate('invalidDate'),
    suggestJobTitles: translate('suggestJobTitles'),
    analyzeJobDescription: translate('analyzeJobDescription'),
    analysisResults: translate('analysisResults'),
    errorFetchingSuggestions: translate('errorFetchingSuggestions'),
    aiTipsError: translate('aiTipsError'),
    cancel: translate('cancel'),
    save: translate('save'),
  };

  const statusOptionsDisplay: { [key in ApplicationStatus]: string } = {
    [ApplicationStatus.Draft]: translate('draft') || 'Draft',
    [ApplicationStatus.Applied]: translate('applied') || 'Applied',
    [ApplicationStatus.InterviewScheduled]: translate('interviewScheduled') || 'Interview Scheduled',
    [ApplicationStatus.Interviewing]: translate('interviewing') || 'Interviewing',
    [ApplicationStatus.AssessmentPending]: translate('assessmentPending') || 'Assessment Pending',
    [ApplicationStatus.WaitingResponse]: translate('waitingResponse') || 'Waiting Response',
    [ApplicationStatus.OfferReceived]: translate('offerReceived') || 'Offer Received',
    [ApplicationStatus.Rejected]: translate('rejected') || 'Rejected',
    [ApplicationStatus.Hired]: translate('hired') || 'Hired',
  };

  const [formData, setFormData] = useState<Partial<JobApplication>>(() => {
    const defaultApplicationDate = new Date().toISOString().split('T')[0];
    const initial: Partial<JobApplication> = {
      companyName: '',
      jobTitle: '',
      applicationDate: defaultApplicationDate,
      status: ApplicationStatus.Draft,
      notes: { personalNotes: '', recruiterFeedback: '', interviewerComments: '' },
      jobDescription: '',
      url: '',
      salary: '',
      location: '',
      reminderDate: '',
    };
    if (application) {
      return {
        ...initial,
        ...application,
        applicationDate: getSafeDateString(
          (application.applicationDate as any) || defaultApplicationDate,
        ),
        reminderDate: getSafeDateString(application.reminderDate as any),
      };
    }
    return initial;
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [jobTitleSuggestions, setJobTitleSuggestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] =
    useState<boolean>(false);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState<boolean>(false);
  const [jobDescriptionAnalysis, setJobDescriptionAnalysis] =
    useState<string>('');
  const [isListeningNotes, setIsListeningNotes] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    if (
      typeof window.SpeechRecognition !== 'undefined' ||
      typeof window.webkitSpeechRecognition !== 'undefined'
    ) {
      const SpeechRecognitionAPI =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionAPI();
      if (recognitionRef.current) {
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = language; // Changed: Use language from context

        recognitionRef.current.onresult = (
          event: SpeechRecognitionResultEvent,
        ) => {
          const transcript = event.results[0][0].transcript;
          setFormData((prev) => {
            const currentNotes = typeof prev.notes === 'string' ? prev.notes : prev.notes?.personalNotes || '';
            return {
              ...prev,
              notes: typeof prev.notes === 'string' ? 
                currentNotes + transcript + ' ' : 
                { ...prev.notes, personalNotes: currentNotes + transcript + ' ' }
            };
          });
          setIsListeningNotes(false);
        };
        recognitionRef.current.onerror = (
          event: SpeechRecognitionErrorEvent,
        ) => {
          console.error(
            'Speech recognition error:',
            event.error,
            event.message,
          );
          setErrors((prev) => ({
            ...prev,
            notes: `${formLabels.aiTipsError}: Speech recognition error - ${event.error} (${event.message})`,
          }));
          setIsListeningNotes(false);
        };
        recognitionRef.current.onend = () => {
          setIsListeningNotes(false);
        };
      }
    }
    return () => {
      recognitionRef.current?.stop();
    };
  }, [language, formLabels.aiTipsError]); // Changed: Added language dependency

  const toggleListenNotes = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not supported in this browser.');
      return;
    }
    if (isListeningNotes) {
      recognitionRef.current.stop();
      setIsListeningNotes(false);
    } else {
      recognitionRef.current.lang = language; // Changed: Use language from context
      recognitionRef.current.start();
      setIsListeningNotes(true);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.companyName?.trim())
      newErrors.companyName = formLabels.fieldRequired;
    if (!formData.jobTitle?.trim())
      newErrors.jobTitle = formLabels.fieldRequired;
    if (!formData.applicationDate)
      newErrors.applicationDate = formLabels.fieldRequired;
    else if (isNaN(new Date(formData.applicationDate).getTime()))
      newErrors.applicationDate = formLabels.invalidDate;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      // Transform form data to match backend expected structure
      const transformedData: JobApplication = {
        id: application?.id || Date.now().toString(),
        userId: application?.userId || '',
        status: formData.status || ApplicationStatus.Draft,
        company: {
          name: formData.companyName || '',
          department: '',
          industry: '',
          website: formData.url || ''
        },
        role: {
          title: formData.jobTitle || '',
          jobType: 'Full-time',
          employmentMode: 'On-site'
        },
        // Legacy fields for backward compatibility
        companyName: formData.companyName,
        jobTitle: formData.jobTitle,
        jobDescription: formData.jobDescription,
        reminderDate: formData.reminderDate,
        source: 'Other',
        priority: 'Medium',
        tags: [],
        keyDates: {
          submissionDate: formData.applicationDate || new Date().toISOString().split('T')[0],
          interviewDates: [],
          nextAction: formData.reminderDate || ''
        },
        documents: [],
        notes: typeof formData.notes === 'string' ? 
          { personalNotes: formData.notes, recruiterFeedback: '', interviewerComments: '' } : 
          formData.notes || { personalNotes: '', recruiterFeedback: '', interviewerComments: '' },
        url: formData.url,
        salary: formData.salary,
        location: formData.location,
        createdAt: application?.createdAt,
        updatedAt: application?.updatedAt
      };
      onSubmit(transformedData);
    }
  };

  const handleSuggestJobTitles = async () => {
    if (!formData.jobTitle || formData.jobTitle.trim().length < 3) return;
    setIsLoadingSuggestions(true);
    setJobTitleSuggestions([]);
    setErrors((prev) => ({ ...prev, jobTitle: '' }));
    try {
      const suggestions = await suggestJobTitles(formData.jobTitle);
      setJobTitleSuggestions(suggestions);
    } catch (error) {
      console.error('Error fetching job title suggestions:', error);
      setErrors((prev) => ({
        ...prev,
        jobTitle: formLabels.errorFetchingSuggestions,
      }));
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleAnalyzeJobDescription = () => {
    if (!formData.jobDescription || formData.jobDescription.trim().length < 10)
      return;
    setIsLoadingAnalysis(true);
    setJobDescriptionAnalysis('');
    setErrors((prev) => ({ ...prev, jobDescription: '' }));

    streamAnalyzeJobDescriptionContent(
      formData.jobDescription,
      (chunk) => {
        try {
          const parsed = JSON.parse(chunk);
          if (parsed && parsed.analysis) {
            setJobDescriptionAnalysis((prev) => prev + parsed.analysis);
          } else {
            setJobDescriptionAnalysis((prev) => prev + chunk);
          }
        } catch (e) {
          setJobDescriptionAnalysis((prev) => prev + chunk);
        }
      },
      (errorMsg) => {
        setErrors((prev) => ({ ...prev, jobDescription: errorMsg }));
        setIsLoadingAnalysis(false);
      },
      () => setIsLoadingAnalysis(false),
    );
  };

  const formFieldsConfig: {
    name: keyof JobApplication;
    label: string;
    type: string;
    options?: ApplicationStatus[];
  }[] = [
    { name: 'companyName', label: formLabels.companyName, type: 'text' },
    { name: 'jobTitle', label: formLabels.jobTitle, type: 'text' },
    {
      name: 'applicationDate',
      label: formLabels.applicationDate,
      type: 'date',
    },
    {
      name: 'status',
      label: formLabels.status,
      type: 'select',
      options: Object.values(ApplicationStatus),
    },
    { name: 'url', label: formLabels.url, type: 'url' },
    { name: 'salary', label: formLabels.salary, type: 'text' },
    { name: 'location', label: formLabels.location, type: 'text' },
    { name: 'reminderDate', label: formLabels.reminderDate, type: 'date' },
    { name: 'notes', label: formLabels.notes, type: 'textarea' },
    {
      name: 'jobDescription',
      label: formLabels.jobDescription,
      type: 'textarea',
    },
  ];

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-6 p-2 animate-fadeIn ${isRtl ? 'text-right' : 'text-left'}`}
    >
      {formFieldsConfig.map((field) => (
        <div key={field.name}>
          <label
            htmlFor={field.name}
            className="block text-base sm:text-sm font-medium text-neutral dark:text-gray-300 mb-2 sm:mb-1"
          >
            {field.label}
            {['companyName', 'jobTitle', 'applicationDate'].includes(
              field.name,
            ) && <span className="text-red-500">*</span>}
          </label>
          <div className="relative">
            {field.type === 'textarea' ? (
              <textarea
                id={field.name}
                name={field.name}
                value={field.name === 'notes' ? 
                  (typeof formData.notes === 'string' ? formData.notes : formData.notes?.personalNotes || '') : 
                  (formData[field.name] as string) || ''}
                onChange={handleChange}
                rows={field.name === 'jobDescription' ? 5 : 3}
                className={`w-full p-4 sm:p-3 text-base sm:text-sm border rounded-lg shadow-sm focus:ring-2 focus:ring-primary dark:focus:ring-blue-500 focus:border-transparent outline-none transition-shadow bg-base_100 dark:bg-dark_input_bg dark:text-gray-200 ${errors[field.name] ? 'border-red-500' : 'border-base_300 dark:border-neutral-600'} ${isRtl ? 'text-right pr-12 sm:pr-10' : 'text-left pl-4 sm:pl-3'}`}
              />
            ) : field.type === 'select' ? (
              <select
                id={field.name}
                name={field.name}
                value={
                  typeof formData[field.name] === 'string'
                    ? formData[field.name]
                    : String(formData[field.name] || '')
                }
                onChange={handleChange}
                className={`w-full p-4 sm:p-3 text-base sm:text-sm border bg-white dark:bg-dark_input_bg dark:text-gray-200 rounded-lg shadow-sm focus:ring-2 focus:ring-primary dark:focus:ring-blue-500 focus:border-transparent outline-none transition-shadow ${errors[field.name] ? 'border-red-500' : 'border-base_300 dark:border-neutral-600'} ${isRtl ? 'text-right' : 'text-left'}`}
              >
                {field.options?.map((optionValue) => (
                  <option
                    key={optionValue}
                    value={optionValue}
                    className="dark:bg-dark_input_bg dark:text-gray-200"
                  >
                    {statusOptionsDisplay[optionValue]}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={field.type}
                id={field.name}
                name={field.name}
                value={
                  field.type === 'date'
                    ? getSafeDateString(formData[field.name])
                    : (formData[field.name] as string) || ''
                }
                onChange={handleChange}
                className={`w-full p-4 sm:p-3 text-base sm:text-sm border rounded-lg shadow-sm focus:ring-2 focus:ring-primary dark:focus:ring-blue-500 focus:border-transparent outline-none transition-shadow bg-base_100 dark:bg-dark_input_bg dark:text-gray-200 ${errors[field.name] ? 'border-red-500' : 'border-base_300 dark:border-neutral-600'} ${isRtl ? 'text-right' : 'text-left'}`}
              />
            )}
            {field.name === 'notes' && recognitionRef.current && (
              <button
                type="button"
                onClick={toggleListenNotes}
                className={`absolute top-1/2 -translate-y-1/2 p-3 sm:p-2 rounded-full hover:bg-base_200 dark:hover:bg-neutral-700 ${isRtl ? 'left-3 sm:left-2' : 'right-3 sm:right-2'} ${isListeningNotes ? 'text-red-500 animate-pulse' : 'text-primary dark:text-blue-400'}`}
                title={
                  isListeningNotes ? 'Stop listening' : 'Record note with voice'
                }
              >
                <MicrophoneIcon className="w-6 h-6 sm:w-5 sm:h-5" />
              </button>
            )}
          </div>
          {errors[field.name] && (
            <p className="text-red-500 text-sm sm:text-xs mt-2 sm:mt-1">
              {errors[field.name]}
            </p>
          )}

          {field.name === 'jobTitle' && (
            <>
              <button
                type="button"
                onClick={handleSuggestJobTitles}
                disabled={
                  isLoadingSuggestions ||
                  !formData.jobTitle ||
                  formData.jobTitle.trim().length < 3
                }
                className={`mt-3 sm:mt-2 p-1.5 sm:p-1 text-base sm:text-sm text-primary dark:text-blue-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center ${isRtl ? 'flex-row-reverse' : ''}`}
              >
                <LightbulbIcon
                  className={`w-5 h-5 sm:w-4 sm:h-4 text-accent dark:text-orange-400 ${isRtl ? 'ms-2 sm:ms-1' : 'me-2 sm:me-1'}`}
                />{' '}
                {formLabels.suggestJobTitles}{' '}
                {isLoadingSuggestions && (
                  <LoadingSpinner
                    size="sm"
                    className={`${isRtl ? 'me-2' : 'ms-2'}`}
                  />
                )}
              </button>
              {jobTitleSuggestions.length > 0 && (
                <ul
                  className={`mt-3 sm:mt-2 list-disc list-inside text-base sm:text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-dark_input_bg p-3 sm:p-2 rounded-md ${isRtl ? 'text-right ps-4' : 'text-left pe-4'}`}
                >
                  {jobTitleSuggestions.map((suggestion, index) => (
                    <li
                      key={index}
                      className="cursor-pointer hover:text-primary dark:hover:text-blue-400"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          jobTitle: suggestion,
                        }))
                      }
                    >
                      {suggestion}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {field.name === 'jobDescription' && (
            <>
              <button
                type="button"
                onClick={handleAnalyzeJobDescription}
                disabled={
                  isLoadingAnalysis ||
                  !formData.jobDescription ||
                  formData.jobDescription.trim().length < 10
                }
                className={`mt-3 sm:mt-2 p-1.5 sm:p-1 text-base sm:text-sm text-primary dark:text-blue-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center ${isRtl ? 'flex-row-reverse' : ''}`}
              >
                <LightbulbIcon
                  className={`w-5 h-5 sm:w-4 sm:h-4 text-accent dark:text-orange-400 ${isRtl ? 'ms-2 sm:ms-1' : 'me-2 sm:me-1'}`}
                />{' '}
                {formLabels.analyzeJobDescription}{' '}
                {isLoadingAnalysis && (
                  <LoadingSpinner
                    size="sm"
                    className={`${isRtl ? 'me-2' : 'ms-2'}`}
                  />
                )}
              </button>
              {jobDescriptionAnalysis && (
                <div className="mt-3 sm:mt-2 p-4 sm:p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-md">
                  <h4 className="text-base sm:text-sm font-semibold text-primary dark:text-blue-400 mb-2 sm:mb-1">
                    {formLabels.analysisResults}:
                  </h4>
                  <p className="text-sm sm:text-xs text-neutral dark:text-gray-300 whitespace-pre-wrap">
                    {jobDescriptionAnalysis}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      ))}

      <div
        className={`flex flex-col sm:flex-row justify-end gap-3 sm:gap-4 pt-6 sm:pt-4 ${isRtl ? 'sm:space-x-reverse sm:space-x-3' : 'sm:space-x-3'}`}
      >
        <button
          type="button"
          onClick={onCancel}
          className="w-full sm:w-auto px-6 py-4 sm:py-3 text-base sm:text-sm border border-base_300 dark:border-neutral-500 rounded-lg text-neutral dark:text-gray-300 hover:bg-base_200 dark:hover:bg-neutral-600 transition duration-150 shadow-sm"
        >
          {formLabels.cancel}
        </button>
        <button
          type="submit"
          className="w-full sm:w-auto px-6 py-4 sm:py-3 text-base sm:text-sm font-medium bg-primary hover:bg-blue-600 dark:hover:bg-blue-500 text-white font-semibold rounded-lg shadow-md transition duration-150 transform hover:scale-105"
        >
          {formLabels.save}
        </button>
      </div>
    </form>
  );
};

export default JobForm;
