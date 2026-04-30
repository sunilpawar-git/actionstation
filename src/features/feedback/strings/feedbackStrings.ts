export const feedbackStrings = {
    title: 'Send Feedback',
    typeLabel: 'Type',
    types: {
        bug: 'Bug Report',
        feature: 'Feature Request',
        general: 'General',
    },
    messagePlaceholder: 'Describe your feedback\u2026',
    messageLabel: 'Message',
    submit: 'Send',
    submitting: 'Sending\u2026',
    successMessage: 'Thanks for your feedback!',
    errorMessage: 'Failed to send feedback. Please try again.',
    tooShort: 'Message must be at least 10 characters.',
    tooLong: 'Message must be at most 2000 characters.',
    closeLabel: 'Close feedback dialog',
} as const;
