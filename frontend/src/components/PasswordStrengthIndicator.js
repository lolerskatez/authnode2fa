import React from 'react';
import './PasswordStrengthIndicator.css';

const PasswordStrengthIndicator = ({ password, showRequirements = true }) => {
  // Calculate password strength
  const calculateStrength = (pwd) => {
    let score = 0;
    const checks = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      numbers: /\d/.test(pwd),
      special: /[!@#$%^&*()_+\-=[\]{};:"\\|,.<>/?]/.test(pwd),
      noCommon: !/(password|123456|qwerty|abc123|admin|letmein)/i.test(pwd),
      noSequential: !/(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(pwd)
    };

    // Score based on criteria met
    score += checks.length ? 2 : 0;
    score += checks.uppercase ? 1 : 0;
    score += checks.lowercase ? 1 : 0;
    score += checks.numbers ? 1 : 0;
    score += checks.special ? 1 : 0;
    score += checks.noCommon ? 1 : 0;
    score += checks.noSequential ? 1 : 0;

    // Determine strength level
    let strength = 'weak';
    let label = 'Weak';
    let color = '#e74c3c';

    if (score >= 7) {
      strength = 'strong';
      label = 'Strong';
      color = '#27ae60';
    } else if (score >= 5) {
      strength = 'medium';
      label = 'Medium';
      color = '#f39c12';
    }

    return {
      score,
      strength,
      label,
      color,
      checks
    };
  };

  const strength = calculateStrength(password);

  if (!password) {
    return null;
  }

  return (
    <div className="password-strength-indicator">
      <div className="strength-bar-container">
        <div
          className={`strength-bar strength-${strength.strength}`}
          style={{ width: `${(strength.score / 9) * 100}%` }}
        />
      </div>

      <div className="strength-label" style={{ color: strength.color }}>
        {strength.label}
      </div>

      {showRequirements && (
        <div className="strength-requirements">
          <div className={`requirement ${strength.checks.length ? 'met' : 'unmet'}`}>
            <i className={`fas fa-${strength.checks.length ? 'check' : 'times'}`}></i>
            At least 8 characters
          </div>
          <div className={`requirement ${strength.checks.uppercase ? 'met' : 'unmet'}`}>
            <i className={`fas fa-${strength.checks.uppercase ? 'check' : 'times'}`}></i>
            Uppercase letter
          </div>
          <div className={`requirement ${strength.checks.lowercase ? 'met' : 'unmet'}`}>
            <i className={`fas fa-${strength.checks.lowercase ? 'check' : 'times'}`}></i>
            Lowercase letter
          </div>
          <div className={`requirement ${strength.checks.numbers ? 'met' : 'unmet'}`}>
            <i className={`fas fa-${strength.checks.numbers ? 'check' : 'times'}`}></i>
            Number
          </div>
          <div className={`requirement ${strength.checks.special ? 'met' : 'unmet'}`}>
            <i className={`fas fa-${strength.checks.special ? 'check' : 'times'}`}></i>
            Special character
          </div>
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthIndicator;
