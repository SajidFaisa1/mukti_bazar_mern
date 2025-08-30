// Banking validation service for Bangladesh
export class BankingValidationService {
  
  // List of major Bangladeshi banks with their routing patterns
  static BANGLADESHI_BANKS = {
    'dutch_bangla': {
      name: 'Dutch-Bangla Bank Limited',
      accountPattern: /^\d{13}$/,
      routingPattern: /^1[0-9]{8}$/,
      swiftCode: 'DBBLBDDH'
    },
    'islami': {
      name: 'Islami Bank Bangladesh Limited',
      accountPattern: /^\d{13}$/,
      routingPattern: /^1[0-9]{8}$/,
      swiftCode: 'IBBLBDDH'
    },
    'brac': {
      name: 'BRAC Bank Limited',
      accountPattern: /^\d{13}$/,
      routingPattern: /^0[0-9]{8}$/,
      swiftCode: 'BRAKBDDH'
    },
    'eastern': {
      name: 'Eastern Bank Limited',
      accountPattern: /^\d{13}$/,
      routingPattern: /^1[0-9]{8}$/,
      swiftCode: 'EBLBBDDH'
    },
    'city': {
      name: 'City Bank Limited',
      accountPattern: /^\d{13}$/,
      routingPattern: /^2[0-9]{8}$/,
      swiftCode: 'CIBLBDDH'
    },
    'ab': {
      name: 'AB Bank Limited',
      accountPattern: /^\d{13}$/,
      routingPattern: /^2[0-9]{8}$/,
      swiftCode: 'ABBLBDDH'
    },
    'ncc': {
      name: 'NCC Bank Limited',
      accountPattern: /^\d{13}$/,
      routingPattern: /^1[0-9]{8}$/,
      swiftCode: 'NCCBBDDH'
    },
    'prime': {
      name: 'Prime Bank Limited',
      accountPattern: /^\d{13}$/,
      routingPattern: /^1[0-9]{8}$/,
      swiftCode: 'PRBLBDDH'
    },
    'southeast': {
      name: 'Southeast Bank Limited',
      accountPattern: /^\d{13}$/,
      routingPattern: /^1[0-9]{8}$/,
      swiftCode: 'SEBBBDDH'
    },
    'ucb': {
      name: 'United Commercial Bank Limited',
      accountPattern: /^\d{13}$/,
      routingPattern: /^2[0-9]{8}$/,
      swiftCode: 'UCBLBDDH'
    },
    'ific': {
      name: 'IFIC Bank Limited',
      accountPattern: /^\d{13}$/,
      routingPattern: /^2[0-9]{8}$/,
      swiftCode: 'IFICBDDH'
    },
    'mutual_trust': {
      name: 'Mutual Trust Bank Limited',
      accountPattern: /^\d{13}$/,
      routingPattern: /^1[0-9]{8}$/,
      swiftCode: 'MTBLBDDH'
    }
  };

  // Government banks
  static GOVERNMENT_BANKS = {
    'sonali': {
      name: 'Sonali Bank Limited',
      accountPattern: /^\d{11,13}$/,
      routingPattern: /^0[0-9]{8}$/,
      swiftCode: 'SONBBDDH'
    },
    'janata': {
      name: 'Janata Bank Limited',
      accountPattern: /^\d{11,13}$/,
      routingPattern: /^0[0-9]{8}$/,
      swiftCode: 'JANBBDDH'
    },
    'agrani': {
      name: 'Agrani Bank Limited',
      accountPattern: /^\d{11,13}$/,
      routingPattern: /^0[0-9]{8}$/,
      swiftCode: 'AGBKBDDH'
    },
    'rupali': {
      name: 'Rupali Bank Limited',
      accountPattern: /^\d{11,13}$/,
      routingPattern: /^0[0-9]{8}$/,
      swiftCode: 'RUPLBDDH'
    }
  };

  static ALL_BANKS = { ...this.BANGLADESHI_BANKS, ...this.GOVERNMENT_BANKS };

  /**
   * Validate bank account number format
   */
  static validateAccountNumber(accountNumber, bankName) {
    if (!accountNumber || !bankName) return false;
    
    const cleanAccountNumber = accountNumber.replace(/\s/g, '');
    const bankKey = this.findBankKey(bankName);
    
    if (!bankKey) return false;
    
    const bank = this.ALL_BANKS[bankKey];
    return bank.accountPattern.test(cleanAccountNumber);
  }

  /**
   * Validate routing number format
   */
  static validateRoutingNumber(routingNumber, bankName) {
    if (!routingNumber || !bankName) return false;
    
    const cleanRouting = routingNumber.replace(/\s/g, '');
    const bankKey = this.findBankKey(bankName);
    
    if (!bankKey) return false;
    
    const bank = this.ALL_BANKS[bankKey];
    return bank.routingPattern.test(cleanRouting);
  }

  /**
   * Find bank key from bank name
   */
  static findBankKey(bankName) {
    const normalizedName = bankName.toLowerCase();
    
    for (const [key, bank] of Object.entries(this.ALL_BANKS)) {
      if (bank.name.toLowerCase().includes(normalizedName) || 
          normalizedName.includes(key.replace('_', ' '))) {
        return key;
      }
    }
    return null;
  }

  /**
   * Get all bank names for dropdown
   */
  static getBankNames() {
    return Object.values(this.ALL_BANKS).map(bank => bank.name).sort();
  }

  /**
   * Validate complete banking information
   */
  static validateBankingInfo(bankingInfo) {
    const { accountNumber, bankName, routingNumber, branchName } = bankingInfo;
    const errors = {};

    // Validate account number
    if (!accountNumber) {
      errors.accountNumber = 'Account number is required';
    } else if (!this.validateAccountNumber(accountNumber, bankName)) {
      errors.accountNumber = 'Invalid account number format for selected bank';
    }

    // Validate bank name
    if (!bankName) {
      errors.bankName = 'Bank name is required';
    } else if (!this.findBankKey(bankName)) {
      errors.bankName = 'Please select a valid Bangladeshi bank';
    }

    // Validate routing number
    if (!routingNumber) {
      errors.routingNumber = 'Routing number is required';
    } else if (!/^\d{9}$/.test(routingNumber.replace(/\s/g, ''))) {
      errors.routingNumber = 'Routing number must be 9 digits';
    } else if (!this.validateRoutingNumber(routingNumber, bankName)) {
      errors.routingNumber = 'Invalid routing number for selected bank';
    }

    // Validate branch name
    if (!branchName || branchName.trim().length < 2) {
      errors.branchName = 'Branch name is required (minimum 2 characters)';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Advanced validation with API (if available)
   * This is a placeholder for future API integration
   */
  static async validateWithAPI(bankingInfo) {
    // Placeholder for Bangladesh Bank API or third-party validation
    // This would require API keys and proper implementation
    
    try {
      // Example structure for future implementation:
      // const response = await fetch('https://api.bangladesh-bank.gov.bd/validate', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(bankingInfo)
      // });
      
      // For now, return basic validation
      return this.validateBankingInfo(bankingInfo);
      
    } catch (error) {
      console.warn('API validation failed, using offline validation:', error);
      return this.validateBankingInfo(bankingInfo);
    }
  }

  /**
   * Format account number for display
   */
  static formatAccountNumber(accountNumber) {
    const clean = accountNumber.replace(/\s/g, '');
    // Format as: XXXX XXXX XXXXX for 13-digit accounts
    if (clean.length === 13) {
      return clean.replace(/(\d{4})(\d{4})(\d{5})/, '$1 $2 $3');
    }
    return clean;
  }

  /**
   * Format routing number for display
   */
  static formatRoutingNumber(routingNumber) {
    const clean = routingNumber.replace(/\s/g, '');
    // Format as: XXXX XXXXX for 9-digit routing
    if (clean.length === 9) {
      return clean.replace(/(\d{4})(\d{5})/, '$1 $5');
    }
    return clean;
  }

  /**
   * Get bank information by name
   */
  static getBankInfo(bankName) {
    const bankKey = this.findBankKey(bankName);
    if (!bankKey) return null;
    
    return {
      ...this.ALL_BANKS[bankKey],
      key: bankKey
    };
  }

  /**
   * Validate SWIFT code format (for international transfers)
   */
  static validateSWIFTCode(swiftCode) {
    // SWIFT code format: 4 letters (bank) + 2 letters (country) + 2 letters/digits (location) + optional 3 letters/digits (branch)
    const swiftPattern = /^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;
    return swiftPattern.test(swiftCode.toUpperCase());
  }

  /**
   * Check if account number passes basic checksum validation
   */
  static validateAccountChecksum(accountNumber) {
    // Basic Luhn algorithm for account number validation
    const digits = accountNumber.replace(/\D/g, '');
    let sum = 0;
    let alternate = false;
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits.charAt(i), 10);
      
      if (alternate) {
        digit *= 2;
        if (digit > 9) {
          digit = (digit % 10) + 1;
        }
      }
      
      sum += digit;
      alternate = !alternate;
    }
    
    return (sum % 10) === 0;
  }
}

export default BankingValidationService;
