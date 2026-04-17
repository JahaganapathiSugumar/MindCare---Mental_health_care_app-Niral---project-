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
    return 'Full name is required';
  }

  if (trimmed.length < 2) {
    return 'Name must be at least 2 characters';
  }

  // Ignore spaces and punctuation commonly used in names when checking numeric-only input.
  const normalized = trimmed.replace(/[\s'\-.]/g, '');
  if (normalized.length > 0 && /^\d+$/.test(normalized)) {
    return 'Name cannot contain only numbers';
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
    errors.email = 'Email is required';
  } else if (!validateEmail(email)) {
    errors.email = 'Please enter a valid email';
  }

  if (!password) {
    errors.password = 'Password is required';
  } else if (!validatePassword(password)) {
    errors.password = 'Password must be at least 6 characters';
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password';
  } else if (!validatePasswordMatch(password, confirmPassword)) {
    errors.confirmPassword = 'Passwords do not match';
  }

  return errors;
};

// Validate all sign in fields
export const validateSignIn = (email, password) => {
  const errors = {};

  if (!email.trim()) {
    errors.email = 'Email is required';
  } else if (!validateEmail(email)) {
    errors.email = 'Please enter a valid email';
  }

  if (!password) {
    errors.password = 'Password is required';
  }

  return errors;
};

// Firebase to user-friendly error messages
export const getErrorMessage = (errorCode) => {
  const errorMessages = {
    'auth/user-not-found': 'No account found with this email',
    'auth/wrong-password': 'Incorrect password',
    'auth/invalid-email': 'Invalid email address',
    'auth/email-already-in-use': 'Email already registered',
    'auth/weak-password': 'Password is too weak',
    'auth/operation-not-allowed': 'Operation not allowed',
    'auth/too-many-requests': 'Too many failed attempts. Try again later.',
    'auth/network-request-failed': 'Network error. Check your connection.',
  };

  return errorMessages[errorCode] || 'An error occurred. Please try again.';
};
