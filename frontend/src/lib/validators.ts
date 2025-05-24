/**
 * Validates an email address format
 */
export const validateEmail = (email: string): boolean => {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  };
  
  /**
   * Validates a password (min 8 chars, at least 1 uppercase, 1 number)
   */
  export const validatePassword = (password: string): boolean => {
    const re = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    return re.test(password);
  };
  
  /**
   * Validates a name (minimum 2 characters)
   */
  export const validateName = (name: string): boolean => {
    return name.trim().length >= 2;
  };
  
  /**
   * Checks if passwords match
   */
  export const passwordsMatch = (password: string, confirmPassword: string): boolean => {
    return password === confirmPassword;
  };