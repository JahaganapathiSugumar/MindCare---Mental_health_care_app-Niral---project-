import i18n from '../i18n';

// Email validation using regex
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

// Password validation - minimum 6 characters
export const validatePassword = (password) => {
  return password.length >= 6;
};

// Check if passwords match
export const validatePasswordMatch = (password, confirmPassword) => {
  return password === confirmPassword;
};

// Validate full name with a user-friendly error string for UI forms.
export const getFullNameValidationError = (name) => {
  const trimmed = (name || '').trim();

  if (!trimmed) {
    return i18n.t('validation.fullNameRequired');
  }

  if (trimmed.length < 2) {
    return i18n.t('validation.nameMinLength');
  }

  // Ignore spaces and punctuation commonly used in names when checking numeric-only input.
  const normalized = trimmed.replace(/[\s'\-.]/g, '');
  if (normalized.length > 0 && /^\d+$/.test(normalized)) {
    return i18n.t('validation.nameNumbersOnly');
  }

  return '';
};

// Validate full name using the detailed validator above.
export const validateFullName = (name) => {
  return !getFullNameValidationError(name);
};

// Validate all sign up fields
export const validateSignUp = (fullName, email, password, confirmPassword) => {
  const errors = {};

  const fullNameError = getFullNameValidationError(fullName);
  if (fullNameError) {
    errors.fullName = fullNameError;
  }

  if (!email.trim()) {
    errors.email = i18n.t('validation.emailRequired');
  } else if (!validateEmail(email)) {
    errors.email = i18n.t('validation.emailInvalid');
  }

  if (!password) {
    errors.password = i18n.t('validation.passwordRequired');
  } else if (!validatePassword(password)) {
    errors.password = i18n.t('validation.passwordMin');
  }

  if (!confirmPassword) {
    errors.confirmPassword = i18n.t('validation.confirmPasswordRequired');
  } else if (!validatePasswordMatch(password, confirmPassword)) {
    errors.confirmPassword = i18n.t('validation.passwordMismatch');
  }

  return errors;
};

// Validate all sign in fields
export const validateSignIn = (email, password) => {
  const errors = {};

  if (!email.trim()) {
    errors.email = i18n.t('validation.emailRequired');
  } else if (!validateEmail(email)) {
    errors.email = i18n.t('validation.emailInvalid');
  }

  if (!password) {
    errors.password = i18n.t('validation.passwordRequired');
  }

  return errors;
};

// Firebase to user-friendly error messages
export const getErrorMessage = (errorCode) => {
  const errorMessages = {
    'auth/user-not-found': i18n.t('auth.userNotFound', { defaultValue: 'No account found with this email' }),
    'auth/wrong-password': i18n.t('auth.incorrectPassword', { defaultValue: 'Incorrect password' }),
    'auth/invalid-email': i18n.t('auth.invalidEmail', { defaultValue: 'Invalid email address' }),
    'auth/email-already-in-use': i18n.t('auth.emailInUse', { defaultValue: 'Email already registered' }),
    'auth/weak-password': i18n.t('auth.weakPassword', { defaultValue: 'Password is too weak' }),
    'auth/operation-not-allowed': i18n.t('auth.operationNotAllowed', { defaultValue: 'Operation not allowed' }),
    'auth/too-many-requests': i18n.t('auth.tooManyRequests', { defaultValue: 'Too many failed attempts. Try again later.' }),
    'auth/network-request-failed': i18n.t('auth.networkError', { defaultValue: 'Network error. Check your connection.' }),
  };

  return errorMessages[errorCode] || i18n.t('auth.genericError', { defaultValue: 'An error occurred. Please try again.' });
};
