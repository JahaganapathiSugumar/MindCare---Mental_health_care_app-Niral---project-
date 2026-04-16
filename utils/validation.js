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

// Validate full name - at least 2 characters
export const validateFullName = (name) => {
  return name.trim().length >= 2;
};

// Validate all sign up fields
export const validateSignUp = (fullName, email, password, confirmPassword) => {
  const errors = {};

  if (!validateFullName(fullName)) {
    errors.fullName = 'Name must be at least 2 characters';
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
